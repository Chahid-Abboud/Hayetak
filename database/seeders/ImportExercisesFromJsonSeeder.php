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

        DB::transaction(function () use ($items): void {
            foreach ($items as $exercise) {
                if (! empty($exercise['canonical_exercise_id']) && ! is_numeric($exercise['canonical_exercise_id'])) {
                    $exercise['canonical_exercise_id'] = null;
                }

                foreach (['tags', 'conditions', 'secondary_muscles', 'equipment_list', 'joint_stress', 'cues', 'common_mistakes'] as $key) {
                    if (! isset($exercise[$key]) || $exercise[$key] === '') {
                        $exercise[$key] = [];
                    }
                }

                $exists = DB::table('exercises')->where('name', $exercise['name'])->exists();

                DB::table('exercises')->updateOrInsert(
                    ['name' => $exercise['name']],
                    [
                        'primary_muscle' => $exercise['primary_muscle'] ?? null,
                        'equipment' => $exercise['equipment'] ?? null,
                        'difficulty' => $exercise['difficulty'] ?? null,
                        'demo_video' => $exercise['demo_video'] ?? null,
                        'demo_url' => $exercise['demo_url'] ?? null,
                        'intensity_level' => $exercise['intensity_level'] ?? null,
                        'description' => $exercise['description'] ?? null,
                        'movement_pattern' => $exercise['movement_pattern'] ?? null,
                        'exercise_type' => $exercise['exercise_type'] ?? null,
                        'mechanic' => $exercise['mechanic'] ?? null,
                        'plane' => $exercise['plane'] ?? null,
                        'home_friendly' => (bool) ($exercise['home_friendly'] ?? false),
                        'ai_summary' => $exercise['ai_summary'] ?? null,
                        'canonical_exercise_id' => $exercise['canonical_exercise_id'] ?? null,
                        'tags' => json_encode($exercise['tags']),
                        'conditions' => json_encode($exercise['conditions']),
                        'secondary_muscles' => json_encode($exercise['secondary_muscles']),
                        'equipment_list' => json_encode($exercise['equipment_list']),
                        'joint_stress' => json_encode($exercise['joint_stress'] ?? []),
                        'cues' => json_encode($exercise['cues'] ?? []),
                        'common_mistakes' => json_encode($exercise['common_mistakes'] ?? []),
                        'updated_at' => now(),
                    ] + ($exists ? [] : ['created_at' => now()])
                );
            }
        });
    }
}
