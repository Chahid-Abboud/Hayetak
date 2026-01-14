<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegacyCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/legacy/hayetak_5-1-26.sql');

        if (!file_exists($path)) {
            $this->command?->error("SQL dump not found at: {$path}");
            return;
        }

        $this->command?->info("Importing catalog data from: {$path}");

        // Only import these tables (safe, no user data, no history)
        $allowed = [
            'INSERT INTO "public"."foods"',
            'INSERT INTO "public"."exercises"',
        ];

        DB::beginTransaction();

        try {
            $handle = fopen($path, 'r');
            if (!$handle) {
                throw new \RuntimeException("Cannot open SQL file.");
            }

            $imported = 0;
            $skipped = 0;

            while (($line = fgets($handle)) !== false) {
                $lineTrim = ltrim($line);

                // We only care about INSERT lines for foods/exercises
                $isAllowed = false;
                foreach ($allowed as $prefix) {
                    if (str_starts_with($lineTrim, $prefix)) {
                        $isAllowed = true;
                        break;
                    }
                }

                if (!$isAllowed) {
                    $skipped++;
                    continue;
                }

                // Fix MySQL-style escaping that breaks Postgres when standard_conforming_strings=on
                // Example: Farmer\'s Walk  ->  Farmer''s Walk
                $fixed = str_replace("\\'", "''", $lineTrim);

                // Execute the INSERT
                try {
                    DB::statement($fixed);
                    $imported++;
                } catch (\Throwable $e) {
                    // Log and continue (better than failing the whole import)
                    $this->command?->warn("Skipped one INSERT due to error: " . $e->getMessage());
                }
            }

            fclose($handle);

            // Reset sequences so future inserts don't collide with imported IDs
            $this->resetSequence('foods');
            $this->resetSequence('exercises');

            DB::commit();

            $this->command?->info("Done. Imported: {$imported}, Skipped lines: {$skipped}");
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function resetSequence(string $table): void
    {
        if (DB::getDriverName() !== 'pgsql') return;

        DB::statement("
            SELECT setval(
                pg_get_serial_sequence('{$table}', 'id'),
                COALESCE((SELECT MAX(id) FROM {$table}), 1),
                true
            )
        ");
    }
}
