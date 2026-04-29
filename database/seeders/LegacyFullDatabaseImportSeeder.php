<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class LegacyFullDatabaseImportSeeder extends Seeder
{
    /**
     * Tables that should never be restored from the old dump.
     * The app migrations already own these.
     *
     * @var array<int, string>
     */
    private array $skipTables = [
        'migrations',
    ];

    public function run(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('LegacyFullDatabaseImportSeeder only supports PostgreSQL dumps.');
        }

        $path = $this->resolveDumpPath();
        $statements = $this->readInsertStatements($path);

        if ($statements === []) {
            throw new RuntimeException("No INSERT statements were found in legacy dump: {$path}");
        }

        $tables = $this->targetTablesFromStatements($statements);

        if ($tables === []) {
            throw new RuntimeException('The legacy dump did not contain any importable tables for the current schema.');
        }

        $statementsByTable = $this->groupStatementsByTable($statements, $tables);
        $orderedTables = $this->orderTablesByDependencies(array_keys($statementsByTable));

        $this->command?->warn("Importing legacy snapshot from: {$path}");
        $this->command?->warn('This seeder truncates the imported tables before restoring the dump data.');
        $this->command?->info(sprintf('Restoring %d tables from %d INSERT statements.', count($tables), count($statements)));

        $quotedTables = implode(', ', array_map(fn (string $table) => "\"{$table}\"", $tables));

        DB::transaction(function () use ($quotedTables, $orderedTables, $statementsByTable): void {
            // The legacy dump contains backslash-escaped apostrophes like Child\'s Pose.
            // Enable legacy string parsing only for this import transaction.
            DB::statement("SET LOCAL standard_conforming_strings = off");
            DB::statement("TRUNCATE TABLE {$quotedTables} RESTART IDENTITY CASCADE");

            foreach ($orderedTables as $table) {
                foreach ($statementsByTable[$table] ?? [] as $statement) {
                    DB::unprepared($statement);
                }
            }
        });

        foreach ($tables as $table) {
            $this->syncSequence($table);
        }

        $this->command?->info('Legacy snapshot import complete.');
    }

    private function resolveDumpPath(): string
    {
        $candidates = array_filter([
            env('LEGACY_FULL_DUMP_PATH'),
            database_path('seeders/data/Hayetak_14_3_2026_content+structure.sql'),
            'C:\Users\User\Downloads\Hayetak_14_3_2026_content+structure.sql',
        ]);

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && File::exists($candidate)) {
                return $candidate;
            }
        }

        throw new RuntimeException(
            'Legacy SQL dump not found. Set LEGACY_FULL_DUMP_PATH or place the file under database/seeders/data/.'
        );
    }

    /**
     * @return array<int, string>
     */
    private function readInsertStatements(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException("Unable to open legacy dump: {$path}");
        }

        $statements = [];
        $buffer = '';
        $capturing = false;

        try {
            while (($line = fgets($handle)) !== false) {
                $trimmed = ltrim($line);

                if (! $capturing && str_starts_with($trimmed, 'INSERT INTO ')) {
                    $buffer = $line;
                    $capturing = ! str_contains($line, ';');

                    if (! $capturing) {
                        $statements[] = trim($buffer);
                        $buffer = '';
                    }

                    continue;
                }

                if ($capturing) {
                    $buffer .= $line;

                    if (str_contains($line, ';')) {
                        $statements[] = trim($buffer);
                        $buffer = '';
                        $capturing = false;
                    }
                }
            }
        } finally {
            fclose($handle);
        }

        return $statements;
    }

    /**
     * @param  array<int, string>  $statements
     * @return array<int, string>
     */
    private function targetTablesFromStatements(array $statements): array
    {
        $tables = [];

        foreach ($statements as $statement) {
            $table = $this->tableNameFromInsert($statement);

            if ($table === null || in_array($table, $this->skipTables, true)) {
                continue;
            }

            if (! Schema::hasTable($table)) {
                continue;
            }

            $tables[] = $table;
        }

        return array_values(array_unique($tables));
    }

    /**
     * @param  array<int, string>  $statements
     * @param  array<int, string>  $tables
     * @return array<string, array<int, string>>
     */
    private function groupStatementsByTable(array $statements, array $tables): array
    {
        $allowed = array_fill_keys($tables, true);
        $grouped = [];

        foreach ($statements as $statement) {
            $table = $this->tableNameFromInsert($statement);

            if ($table === null || ! isset($allowed[$table])) {
                continue;
            }

            $grouped[$table] ??= [];
            $grouped[$table][] = $statement;
        }

        return $grouped;
    }

    /**
     * @param  array<int, string>  $tables
     * @return array<int, string>
     */
    private function orderTablesByDependencies(array $tables): array
    {
        $dependencies = $this->tableDependencies($tables);
        $ordered = [];
        $remaining = $tables;

        while ($remaining !== []) {
            $ready = [];

            foreach ($remaining as $table) {
                $deps = $dependencies[$table] ?? [];
                $unresolved = array_intersect($deps, $remaining);

                if ($unresolved === []) {
                    $ready[] = $table;
                }
            }

            if ($ready === []) {
                // Fall back to the original order for any cyclic/unresolved remainder.
                foreach ($remaining as $table) {
                    if (! in_array($table, $ordered, true)) {
                        $ordered[] = $table;
                    }
                }

                break;
            }

            foreach ($ready as $table) {
                $ordered[] = $table;
                $remaining = array_values(array_filter($remaining, fn (string $candidate) => $candidate !== $table));
            }
        }

        return $ordered;
    }

    /**
     * @param  array<int, string>  $tables
     * @return array<string, array<int, string>>
     */
    private function tableDependencies(array $tables): array
    {
        if ($tables === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($tables), '?'));
        $bindings = [...$tables, ...$tables];

        $rows = DB::select(
            <<<SQL
            SELECT DISTINCT child.relname AS child_table, parent.relname AS parent_table
            FROM pg_constraint constraint_def
            JOIN pg_class child ON child.oid = constraint_def.conrelid
            JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
            JOIN pg_class parent ON parent.oid = constraint_def.confrelid
            JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
            WHERE constraint_def.contype = 'f'
              AND child_ns.nspname = 'public'
              AND parent_ns.nspname = 'public'
              AND child.relname IN ({$placeholders})
              AND parent.relname IN ({$placeholders})
            SQL,
            $bindings,
        );

        $dependencies = [];

        foreach ($tables as $table) {
            $dependencies[$table] = [];
        }

        foreach ($rows as $row) {
            $child = (string) $row->child_table;
            $parent = (string) $row->parent_table;

            if ($child === $parent) {
                continue;
            }

            $dependencies[$child][] = $parent;
            $dependencies[$child] = array_values(array_unique($dependencies[$child]));
        }

        return $dependencies;
    }

    private function tableNameFromInsert(string $statement): ?string
    {
        if (preg_match('/^INSERT INTO\s+"public"\."([^"]+)"/', $statement, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }

    private function syncSequence(string $table): void
    {
        if (! Schema::hasColumn($table, 'id')) {
            return;
        }

        $column = DB::selectOne(
            <<<'SQL'
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ?
              AND column_name = 'id'
            SQL,
            [$table],
        );

        $numericTypes = ['bigint', 'integer', 'smallint'];
        $dataType = is_object($column) ? (string) ($column->data_type ?? '') : '';

        if (! in_array($dataType, $numericTypes, true)) {
            return;
        }

        $sequence = DB::selectOne(
            "SELECT pg_get_serial_sequence(?, 'id') AS sequence_name",
            ["public.{$table}"],
        );

        $sequenceName = is_object($sequence) ? $sequence->sequence_name : null;

        if (! is_string($sequenceName) || $sequenceName === '') {
            return;
        }

        DB::statement(
            sprintf(
                "SELECT setval(%s, COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM \"%s\"",
                DB::getPdo()->quote($sequenceName),
                $table,
            ),
        );
    }
}
