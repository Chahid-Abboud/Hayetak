<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportFoodsFromCsvSeeder extends Seeder
{
    private function textArraySql(array $values): string
    {
        $values = array_values(array_unique(array_filter(array_map(
            static fn ($value): string => strtolower(trim((string) $value)),
            $values
        ))));
        if ($values === []) {
            $values = ['snack'];
        }

        $escaped = array_map(fn ($value) => "'".str_replace("'", "''", $value)."'", $values);

        return 'ARRAY['.implode(',', $escaped).']::text[]';
    }

    public function run(): void
    {
        $path = base_path('database/seeders/data/foods_clean_for_db_v2.csv');
        if (! file_exists($path)) {
            throw new \RuntimeException("Missing file: {$path}");
        }

        $fh = fopen($path, 'r');
        $header = fgetcsv($fh);

        DB::transaction(function () use ($fh, $header): void {
            while (($row = fgetcsv($fh)) !== false) {
                $data = array_combine($header, $row);
                $mealTypes = json_decode($data['meal_types'] ?? '[]', true);
                if (! is_array($mealTypes) || $mealTypes === []) {
                    $mealTypes = ['snack'];
                }

                $tags = $data['tags'] ? (json_decode($data['tags'], true) ?: []) : null;
                $allergens = json_decode($data['allergens'] ?? '[]', true) ?: [];
                $dietsAllowed = json_decode($data['diets_allowed'] ?? '[]', true) ?: [];
                $ingredients = json_decode($data['ingredients'] ?? '[]', true) ?: [];
                $foodId = (int) $data['id'];
                $exists = DB::table('foods')->where('id', $foodId)->exists();

                DB::table('foods')->updateOrInsert(
                    ['id' => $foodId],
                    [
                        'name' => $data['name'],
                        'brand' => $data['brand'] ?: null,
                        'nationality' => $data['nationality'] ?: null,
                        'cuisine' => $data['cuisine'] ?: null,
                        'category' => $data['category'] ?: null,
                        'serving_size' => $data['serving_size'] !== '' ? $data['serving_size'] : null,
                        'serving_unit' => $data['serving_unit'] ?: null,
                        'calories' => $data['calories'] !== '' ? (int) $data['calories'] : null,
                        'protein_g' => $data['protein_g'] !== '' ? $data['protein_g'] : null,
                        'carbs_g' => $data['carbs_g'] !== '' ? $data['carbs_g'] : null,
                        'fat_g' => $data['fat_g'] !== '' ? $data['fat_g'] : null,
                        'fiber_g' => $data['fiber_g'] !== '' ? $data['fiber_g'] : null,
                        'sugar_g' => $data['sugar_g'] !== '' ? $data['sugar_g'] : null,
                        'sodium_mg' => $data['sodium_mg'] !== '' ? (int) $data['sodium_mg'] : null,
                        'cholesterol_mg' => $data['cholesterol_mg'] !== '' ? (int) $data['cholesterol_mg'] : null,
                        'tags' => $tags === null ? null : json_encode($tags),
                        'allergens' => json_encode($allergens),
                        'diets_allowed' => json_encode($dietsAllowed),
                        'ingredients' => json_encode($ingredients),
                        'meal_types' => DB::raw($this->textArraySql($mealTypes)),
                        'updated_at' => now(),
                    ] + ($exists ? [] : ['created_at' => now()])
                );
            }

            DB::statement("SELECT setval('public.foods_id_seq1', (SELECT COALESCE(MAX(id),1) FROM foods), true)");
        });

        fclose($fh);
    }
}
