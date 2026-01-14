<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportExercisesFromJsonSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('database/seeders/data/exercises_clean_for_db_v2.json');
        $items = json_decode(file_get_contents($path), true);

        DB::transaction(function () use ($items) {
            // If you want a clean import:
            // DB::table('exercises')->truncate();

            foreach ($items as $ex) {
                // canonical_exercise_id must be bigint or null
                if (!empty($ex['canonical_exercise_id']) && !is_numeric($ex['canonical_exercise_id'])) {
                    $ex['canonical_exercise_id'] = null;
                }

                // jsonb fields: keep arrays
                foreach (['tags','conditions','secondary_muscles','equipment_list','joint_stress','cues','common_mistakes'] as $k) {
                    if (!isset($ex[$k]) || $ex[$k] === '') $ex[$k] = [];
                }

                DB::table('exercises')->insert([
                    'name' => $ex['name'],
                    'primary_muscle' => $ex['primary_muscle'] ?? null,
                    'equipment' => $ex['equipment'] ?? null,
                    'difficulty' => $ex['difficulty'] ?? null,
                    'demo_video' => $ex['demo_video'] ?? null,
                    'demo_url' => $ex['demo_url'] ?? null,
                    'intensity_level' => $ex['intensity_level'] ?? null,
                    'description' => $ex['description'] ?? null,
                    'movement_pattern' => $ex['movement_pattern'] ?? null,
                    'exercise_type' => $ex['exercise_type'] ?? null,
                    'mechanic' => $ex['mechanic'] ?? null,
                    'plane' => $ex['plane'] ?? null,
                    'home_friendly' => (bool)($ex['home_friendly'] ?? false),
                    'ai_summary' => $ex['ai_summary'] ?? null,
                    'canonical_exercise_id' => $ex['canonical_exercise_id'] ?? null,

                    // jsonb
                    'tags' => json_encode($ex['tags']),
                    'conditions' => json_encode($ex['conditions']),
                    'secondary_muscles' => json_encode($ex['secondary_muscles']),
                    'equipment_list' => json_encode($ex['equipment_list']),
                    'joint_stress' => json_encode($ex['joint_stress'] ?? []),
                    'cues' => json_encode($ex['cues'] ?? []),
                    'common_mistakes' => json_encode($ex['common_mistakes'] ?? []),

                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }
}
