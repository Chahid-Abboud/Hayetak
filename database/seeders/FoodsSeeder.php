<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FoodsSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/foods.csv');
        if (!File::exists($path)) {
            $this->command?->error("CSV not found: $path");
            return;
        }

        // Real columns in your foods table (so we ignore extras cleanly)
        $tableCols = array_map('strtolower', DB::getSchemaBuilder()->getColumnListing('foods'));
        $hasId = in_array('id', $tableCols);

        // Read file
        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if (!$lines || count($lines) < 2) {
            $this->command?->warn('CSV is empty.');
            return;
        }

        // Handle UTF-8 BOM and normalize headers
        $first = ltrim($lines[0], "\xEF\xBB\xBF");
        $header = str_getcsv($first);
        $header = array_map(function ($h) {
            $h = trim($h);
            $h = preg_replace('/[^\pL\pN_]+/u', '_', $h);
            $h = preg_replace('/_+/', '_', $h);
            return strtolower(trim($h, '_'));
        }, $header);

        // Map possible header aliases -> table columns
        $aliases = [
            'name'            => ['name','food','food_name','title','dish','dish_name'],
            'category'        => ['category','meal_type','type'],
            'cuisine'         => ['cuisine','nationality','origin','country'],
            'serving_size'    => ['serving_size','serving','serving_amount','portion','quantity'],
            'serving_unit'    => ['serving_unit','unit','units'],
            'calories'        => ['calories','kcal','cals'],
            'protein_g'       => ['protein','protein_g','proteins','g_protein'],
            'carbs_g'         => ['carbs','carbohydrates','carbs_g','g_carbs'],
            'fat_g'           => ['fat','fats','fat_g','g_fat'],
            'fiber_g'         => ['fiber','fibre','fiber_g','g_fiber'],
            'sugar_g'         => ['sugar','sugars','sugar_g','g_sugar'],
            'sodium_mg'       => ['sodium','sodium_mg','mg_sodium'],
            'cholesterol_mg'  => ['cholesterol','cholesterol_mg','mg_cholesterol'],
            'id'              => ['id'],
            'created_at'      => ['created_at'],
            'updated_at'      => ['updated_at'],
        ];

        // Reverse index: header name -> canonical column
        $canon = [];
        foreach ($aliases as $to => $froms) {
            foreach ($froms as $f) $canon[$f] = $to;
        }

        // Build index map from CSV positions -> canonical column names
        $colIndex = [];
        foreach ($header as $i => $h) {
            $colIndex[$i] = $canon[$h] ?? $h; // keep unknown (will be filtered by $tableCols)
        }

        $now = Carbon::now();
        $batch = [];
        $inserted = 0;

        // Helpers
        $toFloat = fn($v) => ($v === '' || $v === null) ? null : (float)$v;
        $toInt   = fn($v) => ($v === '' || $v === null) ? null : (int)$v;

        for ($ln = 1; $ln < count($lines); $ln++) {
            $csv = str_getcsv($lines[$ln]);
            if (!$csv || (count($csv) === 1 && $csv[0] === null)) continue;

            $row = [];
            foreach ($csv as $i => $v) {
                $key = $colIndex[$i] ?? null;
                if (!$key) continue;
                $key = strtolower($key);
                if (!in_array($key, $tableCols)) continue; // skip unknown columns

                // cast
                if (in_array($key, ['id','sodium_mg','cholesterol_mg'])) {
                    $row[$key] = $toInt($v);
                } elseif (preg_match('/(calories|protein_g|carbs_g|fat_g|fiber_g|sugar_g|serving_size)$/', $key)) {
                    $row[$key] = $toFloat($v);
                } elseif (preg_match('/(_at|date)$/', $key)) {
                    $row[$key] = $v ? Carbon::parse($v) : null;
                } else {
                    $row[$key] = $v;
                }
            }

            if (!isset($row['name']) || $row['name'] === '') continue;

            // timestamps if available in table schema
            if (in_array('created_at', $tableCols) && empty($row['created_at'])) $row['created_at'] = $now;
            if (in_array('updated_at', $tableCols)) $row['updated_at'] = $now;

            $batch[] = $row;

            if (count($batch) === 1000) {
                $inserted += $this->flush($batch, $hasId);
                $batch = [];
            }
        }
        if ($batch) $inserted += $this->flush($batch, $hasId);

        // fix sequence
        if ($hasId) {
            DB::statement("
                SELECT setval(
                    pg_get_serial_sequence('foods','id'),
                    GREATEST((SELECT COALESCE(MAX(id),0) FROM foods)+1,1),
                    false
                )
            ");
        }

        $this->command?->info('✅ Foods upserted: '.$inserted);
    }

    private function flush(array $rows, bool $hasId): int
    {
        $useId = $hasId && collect($rows)->whereNotNull('id')->count() >= max(1, count($rows) * 0.5);
        $uniqueBy = $useId ? ['id'] : array_values(array_intersect(['name','category'], array_keys($rows[0])));
        if (!$uniqueBy) { DB::table('foods')->insertOrIgnore($rows); return count($rows); }
        $updateCols = array_values(array_diff(array_keys($rows[0]), ['id']));
        return DB::table('foods')->upsert($rows, $uniqueBy, $updateCols);
    }
}
