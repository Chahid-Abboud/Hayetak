<?php

use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use App\Models\WorkoutPlanExercise;
use App\Services\Ai\Audit\PlannerAuditStructureValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('passes persisted structure validation when nutrition and workout plans match the new schema', function () {
    $validator = app(PlannerAuditStructureValidator::class);
    $user = User::factory()->create();
    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'local_fallback',
        'model' => 'hayetak-local-fallback-v1',
    ]);

    $foods = collect([
        'Greek Yogurt',
        'Chicken Breast',
        'Rice',
        'Apple',
    ])->map(fn (string $name) => Food::query()->create([
        'name' => $name,
        'serving_size' => 1,
        'serving_unit' => 'serving',
        'calories' => 100,
        'protein_g' => 10,
        'carbs_g' => 10,
        'fat_g' => 5,
    ]));

    $exercises = collect([
        'Bodyweight Squat',
        'Push Up',
        'Resistance Band Row',
        'Glute Bridge',
    ])->map(fn (string $name) => Exercise::query()->create([
        'name' => $name,
        'primary_muscle' => 'General',
        'equipment' => 'Bodyweight',
    ]));

    $nutritionPlan = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Diet Plan v1',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 14,
        'is_active' => true,
        'targets_json' => ['calories_kcal' => 1800, 'protein_g' => 130],
        'meta' => [
            'source' => 'ai_plans',
            'ai_plan_id' => 101,
        ],
    ]);

    foreach (range(1, 14) as $dayIndex) {
        $day = NutritionPlanDay::query()->create([
            'nutrition_plan_id' => $nutritionPlan->id,
            'day_index' => $dayIndex,
            'date' => now()->addDays($dayIndex - 1)->toDateString(),
        ]);

        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $order => $mealType) {
            $meal = NutritionPlanMeal::query()->create([
                'nutrition_plan_day_id' => $day->id,
                'meal_type' => $mealType,
                'order' => $order + 1,
                'notes' => null,
            ]);

            NutritionPlanItem::query()->create([
                'nutrition_plan_meal_id' => $meal->id,
                'food_id' => $foods[$order % $foods->count()]->id,
                'servings' => 1,
                'grams' => null,
                'sort_order' => 1,
                'notes' => null,
            ]);
        }
    }

    $workoutPlan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Workout Plan v1',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 14,
        'is_active' => true,
        'is_public' => false,
        'meta' => [
            'source' => 'ai_plans',
            'plan_horizon_days' => 14,
        ],
    ]);

    foreach (range(1, 7) as $dayIndex) {
        $isTrain = in_array($dayIndex, [1, 3, 5], true);
        $day = WorkoutPlanDay::query()->create([
            'workout_plan_id' => $workoutPlan->id,
            'day_index' => $dayIndex,
            'name' => $isTrain ? 'Full Body' : 'Recovery',
            'notes' => null,
            'meta' => [
                'day_label' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][$dayIndex - 1],
                'session_type' => $isTrain ? 'train' : 'rest',
                'location' => 'home',
            ],
        ]);

        if (! $isTrain) {
            continue;
        }

        foreach ($exercises as $order => $exercise) {
            WorkoutPlanExercise::query()->create([
                'workout_plan_day_id' => $day->id,
                'exercise_id' => $exercise->id,
                'order_index' => $order,
                'sets' => 3,
                'reps_min' => 8,
                'reps_max' => 12,
                'rest_seconds' => 60,
                'rpe_target' => 7,
                'rir_target' => null,
                'notes' => null,
            ]);
        }
    }

    $result = $validator->validatePersisted($user, [
        'persisted' => [
            'nutrition_plan_id' => $nutritionPlan->id,
            'workout_plan_id' => $workoutPlan->id,
        ],
    ], 14);

    expect($result['ok'])->toBeTrue()
        ->and($result['issue_count'])->toBe(0)
        ->and($result['warning_count'])->toBe(0);
});

it('reports persisted structure issues when the saved nutrition and workout plans do not match the expected schema', function () {
    $validator = app(PlannerAuditStructureValidator::class);
    $user = User::factory()->create();
    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'local_fallback',
        'model' => 'hayetak-local-fallback-v1',
    ]);

    $nutritionPlan = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'Broken Diet Plan',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'targets_json' => [],
        'meta' => ['source' => 'manual'],
    ]);

    $day = NutritionPlanDay::query()->create([
        'nutrition_plan_id' => $nutritionPlan->id,
        'day_index' => 1,
        'date' => now()->toDateString(),
    ]);

    NutritionPlanMeal::query()->create([
        'nutrition_plan_day_id' => $day->id,
        'meal_type' => 'breakfast',
        'order' => 1,
        'notes' => 'Planned items: unmatched breakfast',
    ]);

    $workoutPlan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'Broken Workout Plan',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'is_public' => false,
        'meta' => ['source' => 'manual'],
    ]);

    WorkoutPlanDay::query()->create([
        'workout_plan_id' => $workoutPlan->id,
        'day_index' => 2,
        'name' => 'Broken Day',
        'notes' => null,
        'meta' => [
            'session_type' => 'train',
            'unmatched_exercises' => ['Mystery Lift'],
        ],
    ]);

    $result = $validator->validatePersisted($user, [
        'persisted' => [
            'nutrition_plan_id' => $nutritionPlan->id,
            'workout_plan_id' => $workoutPlan->id,
        ],
    ], 14);

    expect($result['ok'])->toBeFalse()
        ->and($result['issue_count'])->toBeGreaterThan(0)
        ->and($result['warning_count'])->toBeGreaterThan(0)
        ->and(implode(' | ', $result['issues']))->toContain('Persisted nutrition plan duration is 7 instead of 14 days.')
        ->and(implode(' | ', $result['issues']))->toContain('Persisted workout plan has 1 day rows instead of 7.')
        ->and(implode(' | ', $result['warnings']))->toContain('unmatched');
});
