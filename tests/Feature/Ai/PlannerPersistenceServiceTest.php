<?php

use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\User;
use App\Models\WorkoutPlan;
use App\Services\Ai\Persistence\PlannerPersistenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('syncs planner exercise aliases and persists workout days without unmatched exercises', function () {
    $user = User::factory()->create();
    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'local_fallback',
        'model' => 'hayetak-local-fallback-v1',
    ]);

    Exercise::query()->create([
        'name' => 'Lateral Raise Machine',
        'primary_muscle' => 'shoulders',
        'equipment' => 'machine',
        'difficulty' => 'beginner',
    ]);
    Exercise::query()->create([
        'name' => 'Lying Leg Curl',
        'primary_muscle' => 'hamstrings',
        'equipment' => 'machine',
        'difficulty' => 'beginner',
    ]);
    Exercise::query()->create([
        'name' => 'Seated Cable Row',
        'primary_muscle' => 'back',
        'equipment' => 'cable',
        'difficulty' => 'beginner',
    ]);
    Exercise::query()->create([
        'name' => 'Machine Chest Press',
        'primary_muscle' => 'chest',
        'equipment' => 'machine',
        'difficulty' => 'beginner',
    ]);

    $result = app(PlannerPersistenceService::class)->persist(
        $user,
        [
            'overview' => ['summary' => 'Test workout plan'],
            'safety' => ['exercise_cautions' => []],
            'adaptive_review' => ['review_after_days' => 21],
            'ml_readiness' => ['candidate_features' => []],
            'workout' => [
                'progression_rules' => [],
                'recovery_rules' => [],
                'coach_notes' => [],
                'weekly_schedule' => [
                    [
                        'day_index' => 1,
                        'day_label' => 'Monday',
                        'session_type' => 'train',
                        'focus' => 'Upper Body',
                        'location' => 'gym',
                        'duration_min' => 45,
                        'warmup' => [],
                        'cooldown' => [],
                        'safety_notes' => [],
                        'exercises' => [
                            ['name' => 'Machine Chest Press', 'sets' => 3, 'reps' => '8-12', 'rest_sec' => 75, 'rpe' => 7, 'equipment' => 'Machine'],
                            ['name' => 'Machine Lateral Raise', 'sets' => 3, 'reps' => '10-15', 'rest_sec' => 60, 'rpe' => 7, 'equipment' => 'Machine'],
                            ['name' => 'Chest Supported Row Machine', 'sets' => 3, 'reps' => '8-12', 'rest_sec' => 75, 'rpe' => 7, 'equipment' => 'Machine'],
                            ['name' => 'Leg Curl Machine', 'sets' => 3, 'reps' => '10-12', 'rest_sec' => 60, 'rpe' => 7, 'equipment' => 'Machine'],
                        ],
                    ],
                ],
            ],
        ],
        'test-generation-id',
        $request->id,
        'test_notes',
        $user->id,
        ['diet' => false, 'workout' => true]
    );

    $workoutPlan = WorkoutPlan::query()
        ->with(['days.exercises'])
        ->findOrFail($result['persisted']['workout_plan_id']);

    $day = $workoutPlan->days->firstOrFail();

    expect(Exercise::query()->where('name', 'Machine Lateral Raise')->exists())->toBeTrue()
        ->and(Exercise::query()->where('name', 'Leg Curl Machine')->exists())->toBeTrue()
        ->and(Exercise::query()->where('name', 'Chest Supported Row Machine')->exists())->toBeTrue()
        ->and($day->exercises)->toHaveCount(4)
        ->and(data_get($day->meta, 'unmatched_exercises', []))->toBe([]);
});
