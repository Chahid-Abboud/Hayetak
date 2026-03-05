<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportFoodsFromCsvSeeder extends Seeder
{
    private function enumArraySql(array $values, string $enumType): string
    {
        $values = array_values(array_unique(array_filter($values)));
        if (count($values) === 0) {
            $values = ['snack'];
        }

        $escaped = array_map(fn ($v) => "'".str_replace("'", "''", $v)."'", $values);

        return 'ARRAY['.implode(',', $escaped)."]::{$enumType}[]";
    }

    public function run(): void
    {
        $path = base_path('database/seeders/data/foods_clean_for_db_v2.csv');
        if (! file_exists($path)) {
            throw new \RuntimeException("Missing file: {$path}");
        }

        $fh = fopen($path, 'r');
        $header = fgetcsv($fh);

        DB::transaction(function () use ($fh, $header) {

            while (($row = fgetcsv($fh)) !== false) {
                $data = array_combine($header, $row);

                // meal_types is stored in CSV as JSON array (string)
                $mealTypes = json_decode($data['meal_types'] ?? '[]', true);
                if (! is_array($mealTypes) || count($mealTypes) === 0) {
                    $mealTypes = ['snack'];
                }
                $mealTypesSql = $this->enumArraySql($mealTypes, 'mealtypeenum');

                // jsonb columns: decode CSV JSON -> then re-encode to JSON string for PDO
                $tagsArr = $data['tags'] ? (json_decode($data['tags'], true) ?: []) : null;
                $allergensArr = json_decode($data['allergens'] ?? '[]', true) ?: [];
                $dietsArr = json_decode($data['diets_allowed'] ?? '[]', true) ?: [];
                $ingredientsArr = json_decode($data['ingredients'] ?? '[]', true) ?: [];

                DB::table('foods')->insert([
                    'id' => (int) $data['id'],
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

                    // ✅ jsonb must be JSON strings (not PHP arrays)
                    'tags' => $tagsArr === null ? null : json_encode($tagsArr),
                    'allergens' => json_encode($allergensArr),
                    'diets_allowed' => json_encode($dietsArr),
                    'ingredients' => json_encode($ingredientsArr),

                    // enum array
                    'meal_types' => DB::raw($mealTypesSql),

                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // reset foods sequence to max(id)
            DB::statement("SELECT setval('public.foods_id_seq1', (SELECT COALESCE(MAX(id),1) FROM foods), true)");
        });

        fclose($fh);
    }
}
