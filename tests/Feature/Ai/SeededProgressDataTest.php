<?php

use App\Models\AiRequest;
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
    $seeder = new UserHistoryBackfillSeeder;

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

it('preserves imported measurements while clearing synthetic seeded measurements during history resets', function () {
    $user = User::factory()->create([
        'email' => 'planner+p9999@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
    ]);

    DB::table('measurements')->insert([
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-01',
            'weight_kg' => 82.4,
            'notes' => 'Imported planner checkpoint day 14.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-08',
            'weight_kg' => 82.1,
            'notes' => 'synthetic_seeded 4-7 day check-in for steady_progress.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $seeder = new UserHistoryBackfillSeeder;
    $method = new ReflectionMethod($seeder, 'resetSeededHistory');
    $method->setAccessible(true);
    $method->invoke($seeder, $user, []);

    $measurements = DB::table('measurements')
        ->where('user_id', $user->id)
        ->orderBy('measured_at')
        ->get(['measured_at', 'notes']);

    expect($measurements)->toHaveCount(1)
        ->and((string) $measurements->first()->measured_at)->toBe('2026-02-01')
        ->and((string) $measurements->first()->notes)->toContain('Imported planner checkpoint day 14.');
});

it('marks demo-user predictor rows as synthetic during export', function () {
    $demoUser = User::factory()->create([
        'email' => 'demo.user@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_SEEDED_DEMO,
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

it('keeps imported non-synthetic weight labels usable even for local planner emails', function () {
    $user = User::factory()->create([
        'email' => 'planner+p9002@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
        'weight_kg' => 77.0,
        'age' => 31,
        'gender' => 'male',
        'height_cm' => 179,
    ]);

    $generatedAt = CarbonImmutable::parse('2026-02-01 09:00:00');

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 77.0,
                'age' => 31,
                'gender' => 'male',
                'height_cm' => 179,
                'diet_type' => 'Mediterranean',
                'workout_location' => 'home',
                'workout_days_per_week' => 3,
                'dietary_goal' => 'Maintenance',
                'fitness_goal' => 'Maintain',
            ],
            'planning_constraints' => [
                'plan_horizon_days' => 14,
            ],
        ],
        'output_json' => [
            'diet' => [
                'daily_targets' => [
                    'calories_kcal' => 2200,
                    'protein_g' => 140,
                    'carbs_g' => 220,
                    'fat_g' => 70,
                ],
                'days' => [],
            ],
            'workout' => [
                'weekly_schedule' => [],
            ],
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 77.0,
                'expected_weight_change_kg' => -0.4,
                'projected_body_weight_kg' => 76.6,
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
            'measured_at' => '2026-02-01',
            'weight_kg' => 77.0,
            'notes' => 'Imported planner profile baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-14',
            'weight_kg' => 76.7,
            'notes' => 'Imported planner checkpoint day 14.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_progress_predictor_export_local_imported.jsonl';
    $csvPath = 'tmp/test_progress_predictor_export_local_imported.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--user-id' => $user->id,
        '--include-unlabeled' => 0,
    ])->assertExitCode(0);

    $row = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR))
        ->first();

    expect($row['is_demo_user'])->toBe(0)
        ->and($row['is_synthetic_meal_window'])->toBe(0)
        ->and($row['is_synthetic_weight_label'])->toBe(0)
        ->and($row['has_weight_label'])->toBe(1);
});

it('treats same-day imported measurement repairs as non-synthetic predictor labels', function () {
    $user = User::factory()->create([
        'email' => 'planner+p9003@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
        'weight_kg' => 90.0,
        'age' => 35,
        'gender' => 'male',
        'height_cm' => 182,
    ]);

    $generatedAt = CarbonImmutable::parse('2026-03-01 09:00:00');

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 90.0,
                'age' => 35,
                'gender' => 'male',
                'height_cm' => 182,
                'diet_type' => 'High Protein',
                'workout_location' => 'home',
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
                    'calories_kcal' => 2100,
                    'protein_g' => 160,
                    'carbs_g' => 190,
                    'fat_g' => 65,
                ],
                'days' => [],
            ],
            'workout' => [
                'weekly_schedule' => [],
            ],
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 90.0,
                'expected_weight_change_kg' => -0.6,
                'projected_body_weight_kg' => 89.4,
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
            'measured_at' => '2026-03-01',
            'weight_kg' => 90.3,
            'notes' => 'synthetic_seeded 4-7 day check-in for plateau.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-03-14',
            'weight_kg' => 89.8,
            'notes' => 'synthetic_seeded 4-7 day check-in for plateau.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    DB::table('measurements')
        ->where('user_id', $user->id)
        ->whereDate('measured_at', '2026-03-01')
        ->update([
            'weight_kg' => 90.0,
            'notes' => 'Imported planner profile baseline check-in.',
            'updated_at' => now(),
        ]);

    DB::table('measurements')
        ->where('user_id', $user->id)
        ->whereDate('measured_at', '2026-03-14')
        ->update([
            'weight_kg' => 89.5,
            'notes' => 'Imported planner checkpoint day 14.',
            'updated_at' => now(),
        ]);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_progress_predictor_export_duplicate_measurements.jsonl';
    $csvPath = 'tmp/test_progress_predictor_export_duplicate_measurements.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--user-id' => $user->id,
        '--include-unlabeled' => 0,
    ])->assertExitCode(0);

    $row = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR))
        ->first();

    expect((float) $row['baseline_weight_kg'])->toBe(90.0)
        ->and((float) $row['label_end_weight_kg'])->toBe(89.5)
        ->and($row['is_synthetic_weight_label'])->toBe(0);
});

it('prefers real imported baseline and end measurements over closer synthetic filler rows', function () {
    $user = User::factory()->create([
        'email' => 'planner+p9004@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
        'weight_kg' => 86.0,
        'age' => 34,
        'gender' => 'male',
        'height_cm' => 181,
    ]);

    $generatedAt = CarbonImmutable::parse('2026-02-20 09:00:00');

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 86.0,
                'age' => 34,
                'gender' => 'male',
                'height_cm' => 181,
                'diet_type' => 'High Protein',
                'workout_location' => 'home',
                'workout_days_per_week' => 4,
                'dietary_goal' => 'Maintenance',
                'fitness_goal' => 'Build Muscle',
            ],
            'planning_constraints' => [
                'plan_horizon_days' => 21,
            ],
        ],
        'output_json' => [
            'diet' => [
                'daily_targets' => [
                    'calories_kcal' => 2450,
                    'protein_g' => 175,
                    'carbs_g' => 225,
                    'fat_g' => 75,
                ],
                'days' => [],
            ],
            'workout' => [
                'weekly_schedule' => [],
            ],
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 86.0,
                'expected_weight_change_kg' => 0.3,
                'projected_body_weight_kg' => 86.3,
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
            'measured_at' => '2026-02-14',
            'weight_kg' => 85.8,
            'notes' => 'Imported planner checkpoint day 14.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-18',
            'weight_kg' => 86.1,
            'notes' => 'synthetic_seeded 4-7 day check-in for steady_progress.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-03-07',
            'weight_kg' => 86.4,
            'notes' => 'Imported planner checkpoint day 21.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-03-09',
            'weight_kg' => 86.5,
            'notes' => 'synthetic_seeded 4-7 day check-in for steady_progress.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_progress_predictor_export_prefers_real_measurements.jsonl';
    $csvPath = 'tmp/test_progress_predictor_export_prefers_real_measurements.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--user-id' => $user->id,
        '--include-unlabeled' => 0,
    ])->assertExitCode(0);

    $row = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR))
        ->first();

    expect((float) $row['baseline_weight_kg'])->toBe(85.8)
        ->and((float) $row['label_end_weight_kg'])->toBe(86.4)
        ->and($row['baseline_measurement_date'])->toBe('2026-02-14')
        ->and($row['end_measurement_date'])->toBe('2026-03-07')
        ->and($row['is_synthetic_weight_label'])->toBe(0);
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
        'email' => 'planner+p0058@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_SEEDED_DEMO,
        'weight_kg' => 74.0,
        'age' => 30,
        'gender' => 'female',
        'height_cm' => 168,
        'role' => User::ROLE_CLIENT,
    ]);

    DB::table('measurements')->insert([
        [
            'user_id' => $user->id,
            'measured_at' => '2026-05-11',
            'weight_kg' => 74.0,
            'notes' => 'Seeded predictor baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-05-25',
            'weight_kg' => 73.5,
            'notes' => 'Seeded predictor 14-day check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-06-01',
            'weight_kg' => 73.1,
            'notes' => 'Seeded predictor 21-day check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-06-08',
            'weight_kg' => 72.8,
            'notes' => 'Seeded predictor 28-day check-in.',
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

    expect($requests->get(14))->toBe('2026-05-11 09:00:00')
        ->and($requests->get(21))->toBe('2026-05-11 09:00:00')
        ->and($requests->get(28))->toBe('2026-05-11 09:00:00');
});

it('does not backfill imported planner dataset users that already carry real plan run timestamps', function () {
    $user = User::factory()->create([
        'email' => 'planner+p0068@hayetak.local',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
        'weight_kg' => 84.0,
        'age' => 32,
        'gender' => 'male',
        'height_cm' => 180,
        'role' => User::ROLE_CLIENT,
    ]);

    DB::table('user_prefs')->insert([
        'user_id' => $user->id,
        'units' => 'metric',
        'settings' => json_encode([
            'import_source' => 'planner_bare_minimum_zip_20260423',
            'profile_id' => 'P0068',
        ], JSON_THROW_ON_ERROR),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('measurements')->insert([
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-01',
            'weight_kg' => 84.0,
            'notes' => 'Imported planner profile baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => '2026-02-14',
            'weight_kg' => 83.5,
            'notes' => 'Imported planner checkpoint day 14.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    foreach ([
        14 => '2026-02-01 00:05:00',
        21 => '2026-02-08 00:05:00',
        28 => '2026-02-15 00:05:00',
    ] as $horizon => $createdAt) {
        AiRequest::query()->create([
            'user_id' => $user->id,
            'type' => 'plan_generator',
            'status' => 'completed',
            'input_context_json' => [
                'profile' => [
                    'weight_kg' => 84.0,
                    'age' => 32,
                    'gender' => 'male',
                    'height_cm' => 180,
                    'diet_type' => 'High Protein',
                    'workout_location' => 'home',
                    'workout_days_per_week' => 4,
                    'dietary_goal' => 'Maintenance',
                    'fitness_goal' => 'Build Muscle',
                ],
                'planning_constraints' => [
                    'plan_horizon_days' => $horizon,
                ],
            ],
            'output_json' => [
                'diet' => [
                    'daily_targets' => [
                        'calories_kcal' => 2400,
                        'protein_g' => 170,
                        'carbs_g' => 220,
                        'fat_g' => 75,
                    ],
                    'days' => [],
                ],
                'workout' => [
                    'weekly_schedule' => [],
                ],
                'progress_prediction' => [
                    'horizon_days' => $horizon,
                    'baseline_weight_kg' => 84.0,
                    'expected_weight_change_kg' => 0.2,
                    'projected_body_weight_kg' => 84.2,
                ],
            ],
            'usage_json' => [
                'import_source' => 'planner_bare_minimum_zip_20260423',
                'imported_plan_run_id' => 'R00'.$horizon,
            ],
        ]);

        AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->latest('id')
            ->firstOrFail()
            ->forceFill([
                'created_at' => CarbonImmutable::parse($createdAt),
                'updated_at' => CarbonImmutable::parse($createdAt),
            ])->save();
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

    expect($requests->get(14))->toBe('2026-02-01 00:05:00')
        ->and($requests->get(21))->toBe('2026-02-08 00:05:00')
        ->and($requests->get(28))->toBe('2026-02-15 00:05:00');
});
