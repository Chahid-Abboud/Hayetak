<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ImportMySqlDumpSeeder extends Seeder
{
    /**
     * Path to the dump file.
     */
    protected string $dumpPath = 'database/seeders/data/hayetak.sql';

    /**
     * Optional: only import INSERTs for these tables.
     * (Keeps out cache/sessions/failed_jobs/etc.)
     */
 protected array $whitelist = [
    'users',
    'diets',
    'diet_items',
    'foods',
    'foods_lebanon',
    'meal_entries',
    'meal_logs',
    'meal_log_items',
    'exercises',
];

        // add more app tables if you want
        // 'workout_plans', 'workout_plan_exercises', 'workout_logs', ...

    public function run(): void
    {
        $fullPath = base_path($this->dumpPath);

        if (! File::exists($fullPath)) {
            $this->command->error("Dump not found at: {$fullPath}");
            return;
        }

        $this->command->info('Reading dump…');
        $sql = File::get($fullPath);

        // 1) Normalize line endings and collapse MySQL comments we don't need
        $sql = preg_replace('~/\*![0-9]{5}.*?\*/;?~s', '', $sql);   // /*!40101 SET ... */
        $sql = preg_replace('~-- .*?$~m', '', $sql);                // -- comments
        $sql = preg_replace('~^\s*#.*?$~m', '', $sql);              // # comments

        // 2) We only want INSERT statements (skip CREATE TABLE / ENGINE etc.)
        //    Grab multi-line INSERTs until the terminating semicolon.
        preg_match_all('~INSERT\s+INTO\s+.+?;~si', $sql, $matches);
        $statements = $matches[0] ?? [];

        if (empty($statements)) {
            $this->command->warn('No INSERT statements found.');
            return;
        }

        // Start a transaction for speed & atomicity
        DB::beginTransaction();
        try {
            $count = 0;

            foreach ($statements as $raw) {
                $clean = $this->transformToPostgres($raw);

                // Skip if table not in whitelist
                $table = $this->extractTableName($clean);
                if ($table && ! in_array($table, $this->whitelist, true)) {
                    continue;
                }

                // Run the INSERT in Postgres
                DB::unprepared($clean);
                $count++;
            }

            DB::commit();
            $this->command->info("Imported {$count} INSERT statements.");

            // Fix sequences so future inserts don't collide with explicit IDs
            $this->fixSequences();
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command->error('Import failed: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * Convert a MySQL INSERT statement to something Postgres accepts.
     */
    protected function transformToPostgres(string $stmt): string
    {
        $s = $stmt;

        // Remove MySQL backticks on identifiers (Postgres treats them as quotes)
        $s = str_replace('`', '"', $s); // we could also just strip them; quoting is safe.

        // Ensure table/column identifier case stays simple (optional).
        // Postgres lowercases unquoted identifiers; we used double-quotes, so keep as-is.

        // MySQL often escapes quotes as \', Postgres needs ''
        // Convert any \' inside string literals to ''
        // A quick-but-safe approach: replace \' with '' globally.
        // (The INSERTs here don't contain valid backslash escapes other than quote-escaping.)
        $s = str_replace("\\'", "''", $s);

        // Some dumps include \n or \t sequences; if present, convert them to real characters
        // only inside string literals would be ideal, but this is a pragmatic pass:
        $s = str_replace(['\\n', '\\r', '\\t'], ["\n", "\r", "\t"], $s);

        // MySQL TRUE/FALSE sometimes appear as 0/1 or '0'/'1'; leave as-is (Postgres will cast ints).
        // If you had b'0'/b'1' bit-literals, you’d convert them here.

        // MySQL INSERT IGNORE -> Postgres has no IGNORE; your dump uses plain INSERT.
        // If you had ON DUPLICATE KEY UPDATE, you'd need an UPSERT rewrite here.

        return $s;
    }

    /**
     * Extract the table name from a (now normalized) INSERT statement.
     * Works with: INSERT INTO "table" (...) VALUES ...
     */
    protected function extractTableName(string $stmt): ?string
    {
        if (preg_match('~INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?~i', $stmt, $m)) {
            return Str::of($m[1])->lower()->toString();
        }
        return null;
        }

    /**
     * After inserting explicit IDs, align PostgreSQL sequences to MAX(id).
     */
    protected function fixSequences(): void
    {
        $this->command->info('Fixing PostgreSQL sequences…');

        foreach ($this->whitelist as $table) {
            try {
                // Only fix if table exists *and* has an id column with a sequence
                $seqRow = DB::selectOne("
                    SELECT pg_get_serial_sequence('{$table}', 'id') AS seq
                ");
                if (! $seqRow || ! $seqRow->seq) {
                    continue;
                }

                DB::statement("
                    SELECT setval(
                        pg_get_serial_sequence('{$table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {$table}), 1),
                        TRUE
                    )
                ");
            } catch (\Throwable $e) {
                // Skip silently if table doesn't exist or has no id/sequence (keeps seeder resilient)
            }
        }

        $this->command->info('Sequences updated.');
    }
}
