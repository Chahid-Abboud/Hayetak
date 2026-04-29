<?php

use App\Models\Ai\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\UserHistoryBackfillSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('spaces seeded measurement dates roughly every 4 to 7 days', function () {
    $seeder = new UserHistoryBackfillSeeder();

    $todayProperty = new ReflectionProperty($seeder, 'today');
    $todayProperty->setAccessible(true);
    $todayProperty->setValue($seeder, CarbonImmutable::parse('2026-04-20'));

    $measurementEndProperty = new ReflectionProperty($seeder, 'measurementEndCeiling');
    $measurementEndProperty->setAccessible(true);
    $measurementEndProperty->setValue($seeder, CarbonImmutable::parse('2026-04-20'));

    $measurementMinGapProperty = new ReflectionProperty($seeder, 'measurementMinGapDays');
    $measurementMinGapProperty->setAccessible(true);
    $measurementMinGapProperty->setValue($seeder, 4);

    $measurementMaxGapProperty = new ReflectionProperty($seeder, 'measurementMaxGapDays');
    $measurementMaxGapProperty->setAccessible(true);
    $measurementMaxGapProperty->setValue($seeder, 7);

    $method = new ReflectionMethod($seeder, 'measurementDates');
    $method->setAccessible(true);

    /** @var array<int, CarbonImmutable> $dates */
    $dates = $method->invoke($seeder, CarbonImmutable::parse('2026-04-01'), CarbonImmutable::parse('2026-04-20'));
    $dateStrings = array_map(
        static fn (CarbonImmutable $date): string => $date->toDateString(),
        $dates
    );
    $diffs = [];
    for ($index = 1; $index < count($dates); $index++) {
        $diffs[] = (int) $dates[$index - 1]->diffInDays($dates[$index]);
    }

    expect($dateStrings[0])->toBe('2026-04-01')
        ->and($dateStrings[array_key_last($dateStrings)])->toBe('2026-04-20')
        ->and($diffs)->not->toBeEmpty()
        ->and(min($diffs))->toBeGreaterThanOrEqual(4)
        ->and(max($diffs))->toBeLessThanOrEqual(7);
});

it('marks demo-user predictor rows as synthetic during export', function () {
    $demoUser = User::factory()->create([
        'email' => 'demo.user@hayetak.local',
        'weight_kg' => 84.0,
        'age' => 34,
        'gender' => 'male',
        'height_cm' => 178,
    ]);

    $realUser = User::factory()->create([
        'email' => 'member@company.com',
        'weight_kg' => 69.0,
        'age' => 29,
        'gender' => 'female',
        'height_cm' => 166,
    ]);

    $generatedAt = now()->subDays(20)->startOfDay();

    foreach ([$demoUser, $realUser] as $user) {
        $request = AiRequest::query()->create([
            'user_id' => $user->id,
            'type' => 'plan_generator',
            'status' => 'completed',
            'input_context_json' => [
                'profile' => [
                    'weight_kg' => (float) $user->weight_kg,
                    'age' => (int) $user->age,
                    'gender' => (string) $user->gender,
                    'height_cm' => (int) $user->height_cm,
                    'diet_type' => 'Mediterranean',
                    'workout_location' => 'home',
                    'workout_days_per_week' => 3,
                    'dietary_goal' => 'Calorie Deficit',
                    'fitness_goal' => 'Lose Weight',
                ],
                'planning_constraints' => [
                    'plan_horizon_days' => 14,
                ],
            ],
            'output_json' => [
                'diet' => [
                    'daily_targets' => [
                        'calories_kcal' => 1900,
                        'protein_g' => 130,
                        'carbs_g' => 190,
                        'fat_g' => 60,
                    ],
                    'days' => [],
                ],
                'workout' => [
                    'weekly_schedule' => [],
                ],
                'progress_prediction' => [
                    'horizon_days' => 14,
                    'baseline_weight_kg' => (float) $user->weight_kg,
                    'expected_weight_change_kg' => -0.8,
                    'projected_body_weight_kg' => round(((float) $user->weight_kg) - 0.8, 2),
                ],
            ],
        ]);

        $request->forceFill([
            'created_at' => $generatedAt,
            'updated_at' => $generatedAt,
        ])->save();
    }

    DB::table('measurements')->insert([
        [
            'user_id' => $demoUser->id,
            'measured_at' => $generatedAt->subDay()->toDateString(),
            'weight_kg' => 84.0,
            'notes' => 'synthetic_seeded baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $demoUser->id,
            'measured_at' => $generatedAt->addDays(13)->toDateString(),
            'weight_kg' => 83.1,
            'notes' => 'synthetic_seeded follow-up check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $realUser->id,
            'measured_at' => $generatedAt->subDay()->toDateString(),
            'weight_kg' => 69.0,
            'notes' => 'Real baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $realUser->id,
            'measured_at' => $generatedAt->addDays(13)->toDateString(),
            'weight_kg' => 68.3,
            'notes' => 'Real follow-up check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_progress_predictor_export.jsonl';
    $csvPath = 'tmp/test_progress_predictor_export.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--include-unlabeled' => 0,
    ])->assertExitCode(0);

    $rows = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR))
        ->keyBy('user_id');

    expect($rows)->toHaveCount(2);

    $demoRow = $rows->get($demoUser->id);
    $realRow = $rows->get($realUser->id);

    expect($demoRow['is_demo_user'])->toBe(1)
        ->and($demoRow['is_synthetic_meal_window'])->toBe(1)
        ->and($demoRow['is_synthetic_weight_label'])->toBe(1)
        ->and($demoRow['is_synthetic_row'])->toBe(1);

    expect($realRow['is_demo_user'])->toBe(0)
        ->and($realRow['is_synthetic_meal_window'])->toBe(0)
        ->and($realRow['is_synthetic_weight_label'])->toBe(0)
        ->and($realRow['is_synthetic_row'])->toBe(0);
});

it('exports predictor features from the pre-plan history window and keeps future workout progress only as a label', function () {
    $user = User::factory()->create([
        'email' => 'member.predictor@company.com',
        'weight_kg' => 80.0,
        'age' => 33,
        'gender' => 'male',
        'height_cm' => 180,
    ]);

    $historyFood = Food::query()->create([
        'name' => 'Chicken rice bowl',
        'calories' => 600,
        'protein_g' => 40,
        'carbs_g' => 65,
        'fat_g' => 18,
    ]);
    $futureFood = Food::query()->create([
        'name' => 'Large pizza',
        'calories' => 1500,
        'protein_g' => 55,
        'carbs_g' => 150,
        'fat_g' => 65,
    ]);
    $exercise = Exercise::query()->create([
        'name' => 'Bench Press',
        'primary_muscle' => 'chest',
        'equipment' => 'barbell',
        'difficulty' => 'intermediate',
    ]);

    $generatedAt = CarbonImmutable::parse('2026-04-10 09:00:00');

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 80.0,
                'age' => 33,
                'gender' => 'male',
                'height_cm' => 180,
                'diet_type' => 'Mediterranean',
                'workout_location' => 'gym',
                'workout_days_per_week' => 4,
                'dietary_goal' => 'Calorie Deficit',
                'fitness_goal' => 'Lose Fat',
            ],
            'planning_constraints' => [
                'plan_horizon_days' => 14,
            ],
        ],
        'output_json' => [
            'diet' => [
                'daily_targets' => [
                    'calories_kcal' => 2200,
                    'protein_g' => 160,
                    'carbs_g' => 210,
                    'fat_g' => 70,
                ],
                'days' => [],
            ],
            'workout' => [
                'weekly_schedule' => [
                    [
                        'session_type' => 'train',
                        'exercises' => [
                            ['name' => 'Bench Press'],
                        ],
                    ],
                ],
            ],
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 80.0,
                'expected_weight_change_kg' => -0.9,
                'projected_body_weight_kg' => 79.1,
            ],
        ],
    ]);

    $request->forceFill([
        'created_at' => $generatedAt,
        'updated_at' => $generatedAt,
    ])->save();

    DB::table('measurements')->insert([
        [
            'user_id' => $user->id,
            'measured_at' => '2026-04-09',
            'weight_kg' => 80.0,
            'notes' => 'Baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-04-23',
            'weight_kg' => 78.8,
            'notes' => 'End check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    DB::table('meal_entries')->insert([
        [
            'user_id' => $user->id,
            'food_id' => $historyFood->id,
            'meal_type' => 'lunch',
            'servings' => 1,
            'eaten_at' => '2026-04-04',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'food_id' => $historyFood->id,
            'meal_type' => 'dinner',
            'servings' => 1,
            'eaten_at' => '2026-04-08',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'food_id' => $futureFood->id,
            'meal_type' => 'dinner',
            'servings' => 1,
            'eaten_at' => '2026-04-15',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $historyWorkoutId = DB::table('workout_logs')->insertGetId([
        'user_id' => $user->id,
        'performed_at' => '2026-04-07 08:00:00',
        'duration_min' => 40,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $futureBaselineWorkoutId = DB::table('workout_logs')->insertGetId([
        'user_id' => $user->id,
        'performed_at' => '2026-04-12 08:00:00',
        'duration_min' => 45,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $futureFinalWorkoutId = DB::table('workout_logs')->insertGetId([
        'user_id' => $user->id,
        'performed_at' => '2026-04-22 08:00:00',
        'duration_min' => 50,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('workout_log_sets')->insert([
        [
            'workout_log_id' => $historyWorkoutId,
            'exercise_id' => $exercise->id,
            'order_index' => 1,
            'weight_kg' => 50,
            'reps' => 5,
            'is_warmup' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'workout_log_id' => $futureBaselineWorkoutId,
            'exercise_id' => $exercise->id,
            'order_index' => 1,
            'weight_kg' => 50,
            'reps' => 5,
            'is_warmup' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'workout_log_id' => $futureFinalWorkoutId,
            'exercise_id' => $exercise->id,
            'order_index' => 1,
            'weight_kg' => 90,
            'reps' => 5,
            'is_warmup' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_progress_predictor_export_history_only.jsonl';
    $csvPath = 'tmp/test_progress_predictor_export_history_only.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--user-id' => $user->id,
        '--include-unlabeled' => 0,
    ])->assertExitCode(0);

    $rows = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR));

    expect($rows)->toHaveCount(1);

    $row = $rows->first();

    expect($row['meal_entry_count'])->toBe(2)
        ->and($row['meal_logged_days'])->toBe(2)
        ->and($row['actual_avg_calories'])->toBe(171.429)
        ->and($row['actual_avg_protein_g'])->toBe(11.429)
        ->and($row['workout_sessions'])->toBe(1)
        ->and($row['workout_set_count'])->toBe(1)
        ->and((float) $row['workout_volume_load_kg'])->toBe(250.0)
        ->and((float) $row['strength_baseline_index'])->toBe(50.0)
        ->and((float) $row['strength_final_index'])->toBe(50.0)
        ->and($row['strength_progress_pct'])->toBeNull()
        ->and((float) $row['label_strength_progress_pct'])->toBe(80.0);
});

it('backfills seeded planner request dates across supported horizons for predictor exports', function () {
    $user = User::factory()->create([
        'email' => 'predictor@clients.demo',
        'weight_kg' => 74.0,
        'age' => 30,
        'gender' => 'female',
        'height_cm' => 168,
        'role' => User::ROLE_CLIENT,
    ]);

    DB::table('measurements')->insert([
        [
            'user_id' => $user->id,
            'measured_at' => '2026-04-21',
            'weight_kg' => 74.0,
            'notes' => 'Latest check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    foreach ([14, 21, 28] as $horizon) {
        AiRequest::query()->create([
            'user_id' => $user->id,
            'type' => 'plan_generator',
            'status' => 'completed',
            'input_context_json' => [
                'profile' => [
                    'weight_kg' => 74.0,
                    'age' => 30,
                    'gender' => 'female',
                    'height_cm' => 168,
                    'diet_type' => 'Mediterranean',
                    'workout_location' => 'home',
                    'workout_days_per_week' => 3,
                    'dietary_goal' => 'Maintenance',
                    'fitness_goal' => 'Maintain',
                ],
                'planning_constraints' => [
                    'plan_horizon_days' => $horizon,
                ],
            ],
            'output_json' => [
                'diet' => [
                    'daily_targets' => [
                        'calories_kcal' => 2000,
                        'protein_g' => 120,
                        'carbs_g' => 210,
                        'fat_g' => 65,
                    ],
                    'days' => [],
                ],
                'workout' => [
                    'weekly_schedule' => [],
                ],
                'progress_prediction' => [
                    'horizon_days' => $horizon,
                    'baseline_weight_kg' => 74.0,
                    'expected_weight_change_kg' => 0.0,
                    'projected_body_weight_kg' => 74.0,
                ],
            ],
        ]);
    }

    $this->artisan('ai:backfill-seeded-predictor-requests')
        ->assertExitCode(0);

    $requests = AiRequest::query()
        ->where('user_id', $user->id)
        ->orderBy('id')
        ->get()
        ->mapWithKeys(static function (AiRequest $request): array {
            $output = is_array($request->output_json) ? $request->output_json : [];
            $horizon = (int) data_get($output, 'progress_prediction.horizon_days', 14);

            return [$horizon => $request->created_at?->format('Y-m-d H:i:s')];
        });

    expect($requests->get(14))->toBe('2026-04-08 09:00:00')
        ->and($requests->get(21))->toBe('2026-03-27 09:00:00')
        ->and($requests->get(28))->toBe('2026-03-15 09:00:00');
});
