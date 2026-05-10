<?php

use App\Models\AiRequest;
use App\Models\User;
use App\Services\Ai\PlannerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('stores planner gpu load options in the deep audit report when running planner-only mode', function () {
    $outDir = base_path('tmp/deep-audit-command-test');
    File::deleteDirectory($outDir);
    File::ensureDirectoryExists($outDir);

    $user = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'deep-audit-client@example.com',
        'diet_name' => 'Vegan',
        'allergies' => ['Peanut'],
        'workout_location' => 'home',
        'workout_days_per_week' => 3,
    ]);

    $plan = deepAuditPlannerPayload();

    $planner = \Mockery::mock(PlannerService::class);
    $planner->shouldReceive('latestPair')
        ->once()
        ->withArgs(fn (User $candidate): bool => $candidate->id === $user->id)
        ->andReturn(null);
    $planner->shouldReceive('generate')
        ->twice()
        ->andReturn(
            [
                'ai_request_id' => 101,
                'version' => 1,
                'provider' => 'stub',
                'model' => 'deep-audit-stub',
                'plan' => $plan,
                'quality' => [
                    'quality_percentage' => 96.0,
                    'passed_checks' => 12,
                    'total_checks' => 12,
                ],
            ],
            [
                'ai_request_id' => 102,
                'version' => 2,
                'provider' => 'stub',
                'model' => 'deep-audit-stub',
                'plan' => $plan,
                'quality' => [
                    'quality_percentage' => 95.0,
                    'passed_checks' => 12,
                    'total_checks' => 12,
                ],
            ],
        );

    $this->app->instance(PlannerService::class, $planner);

    $this->artisan('ai:deep-audit', [
        '--user-ids' => (string) $user->id,
        '--skip-chat' => 1,
        '--skip-predictor' => 1,
        '--planner-gpu-load' => 'low',
        '--planner-break-seconds' => 0,
        '--planner-horizon' => 14,
        '--out-dir' => 'tmp/deep-audit-command-test',
    ])->assertExitCode(0);

    $json = collect(File::files($outDir))
        ->first(fn ($file) => str_ends_with($file->getFilename(), '.json'));

    expect($json)->not->toBeNull();

    $payload = json_decode(File::get($json->getPathname()), true);

    expect(data_get($payload, 'run.options.planner_gpu_load'))->toBe('low')
        ->and(data_get($payload, 'planner.summary.gpu_load'))->toBe('low')
        ->and((int) data_get($payload, 'planner.summary.users_total'))->toBe(1)
        ->and((int) data_get($payload, 'planner.summary.users_success'))->toBe(1)
        ->and(data_get($payload, 'planner.users.0.logic_checks.regen_a.checks.weekly_schedule_has_7_days'))->toBeTrue();
});

it('falls back to synthetic seeded rows when predictor export would otherwise be empty', function () {
    $outDir = base_path('tmp/deep-audit-command-predictor-fallback');
    File::deleteDirectory($outDir);
    File::ensureDirectoryExists($outDir);

    $user = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'demo.predictor@hayetak.local',
        'weight_kg' => 84.0,
        'age' => 34,
        'gender' => 'male',
        'height_cm' => 178,
    ]);

    $generatedAt = CarbonImmutable::parse('2026-02-10 09:00:00');

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 84.0,
                'age' => 34,
                'gender' => 'male',
                'height_cm' => 178,
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
                'baseline_weight_kg' => 84.0,
                'expected_weight_change_kg' => -0.8,
                'projected_body_weight_kg' => 83.2,
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
            'measured_at' => $generatedAt->subDay()->toDateString(),
            'weight_kg' => 84.0,
            'notes' => 'synthetic_seeded baseline check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'measured_at' => $generatedAt->addDays(13)->toDateString(),
            'weight_kg' => 83.1,
            'notes' => 'synthetic_seeded follow-up check-in.',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $this->artisan('ai:deep-audit', [
        '--user-ids' => (string) $user->id,
        '--skip-chat' => 1,
        '--skip-planner' => 1,
        '--planner-horizon' => 14,
        '--out-dir' => 'tmp/deep-audit-command-predictor-fallback',
    ])->assertExitCode(0);

    $json = collect(File::files($outDir))
        ->first(fn ($file) => str_ends_with($file->getFilename(), '.json'));

    expect($json)->not->toBeNull();

    $payload = json_decode(File::get($json->getPathname()), true);

    expect((int) data_get($payload, 'predictor.dataset_export.exported_rows'))->toBeGreaterThan(0)
        ->and(data_get($payload, 'predictor.dataset_export.included_synthetic_rows'))->toBeTrue()
        ->and(data_get($payload, 'predictor.dataset_export.fallback_attempted'))->toBeTrue()
        ->and((string) data_get($payload, 'predictor.dataset_export.fallback_reason'))->toContain('synthetic seeded rows')
        ->and((string) data_get($payload, 'predictor.dataset_export.output'))->toContain('Fallback including synthetic seeded rows');
});

function deepAuditPlannerPayload(): array
{
    $meal = fn (string $mealCode, string $title, int $targetKcal, array $items): array => [
        'meal_code' => $mealCode,
        'title' => $title,
        'target_kcal' => $targetKcal,
        'items' => $items,
    ];

    $breakfast = $meal('breakfast', 'Protein Oats', 420, [[
        'name' => 'Protein oats bowl',
        'portion' => '1 bowl',
        'calories_kcal' => 420,
        'protein_g' => 29,
        'carbs_g' => 46,
        'fat_g' => 13,
    ]]);
    $lunch = $meal('lunch', 'Chicken Rice Bowl', 560, [[
        'name' => 'Chicken rice bowl',
        'portion' => '1 bowl',
        'calories_kcal' => 560,
        'protein_g' => 40,
        'carbs_g' => 54,
        'fat_g' => 18,
    ]]);
    $dinner = $meal('dinner', 'Salmon Plate', 540, [[
        'name' => 'Salmon vegetable plate',
        'portion' => '1 plate',
        'calories_kcal' => 540,
        'protein_g' => 38,
        'carbs_g' => 32,
        'fat_g' => 24,
    ]]);
    $snack = $meal('snack', 'Yogurt Cup', 180, [[
        'name' => 'Greek yogurt cup',
        'portion' => '1 cup',
        'calories_kcal' => 180,
        'protein_g' => 17,
        'carbs_g' => 12,
        'fat_g' => 5,
    ]]);

    $days = collect(range(1, 14))->map(fn (int $dayIndex): array => [
        'day_index' => $dayIndex,
        'meals' => [$breakfast, $lunch, $dinner, $snack],
    ])->all();

    $weeklySchedule = [
        ['day_index' => 1, 'day_label' => 'Monday', 'session_type' => 'train', 'focus' => 'Upper Body', 'exercises' => [['name' => 'Push Up']]],
        ['day_index' => 2, 'day_label' => 'Tuesday', 'session_type' => 'recovery', 'focus' => 'Mobility', 'exercises' => []],
        ['day_index' => 3, 'day_label' => 'Wednesday', 'session_type' => 'train', 'focus' => 'Lower Body', 'exercises' => [['name' => 'Goblet Squat']]],
        ['day_index' => 4, 'day_label' => 'Thursday', 'session_type' => 'rest', 'focus' => 'Rest', 'exercises' => []],
        ['day_index' => 5, 'day_label' => 'Friday', 'session_type' => 'train', 'focus' => 'Full Body', 'exercises' => [['name' => 'Dumbbell Row']]],
        ['day_index' => 6, 'day_label' => 'Saturday', 'session_type' => 'recovery', 'focus' => 'Walk', 'exercises' => []],
        ['day_index' => 7, 'day_label' => 'Sunday', 'session_type' => 'rest', 'focus' => 'Rest', 'exercises' => []],
    ];

    return [
        'overview' => ['summary' => 'Deep audit planner payload.'],
        'safety' => ['hard_rules_observed' => ['Allergy and injury constraints applied']],
        'diet' => [
            'daily_targets' => [
                'calories_kcal' => 1800,
                'protein_g' => 130,
                'carbs_g' => 170,
                'fat_g' => 58,
                'fiber_g' => 28,
                'water_ml' => 2400,
            ],
            'meal_options' => [
                'breakfast' => [$breakfast, $breakfast, $breakfast],
                'lunch' => [$lunch, $lunch, $lunch],
                'dinner' => [$dinner, $dinner, $dinner],
                'snack' => [$snack, $snack, $snack],
            ],
            'days' => $days,
            'grocery_list' => ['oats', 'rice', 'salmon'],
        ],
        'workout' => [
            'weekly_schedule' => $weeklySchedule,
        ],
        'adaptive_review' => ['review_after_days' => 14],
        'ml_readiness' => ['notes' => 'Ready'],
        'progress_prediction' => ['horizon_days' => 14],
    ];
}
