<?php

use App\Models\AiPlan;
use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\MealEntry;
<<<<<<< HEAD
use App\Models\Measurement;
=======
>>>>>>> origin/main
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
<<<<<<< HEAD
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
=======
>>>>>>> origin/main
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia as Assert;

it('hides technical planner metadata on non-admin ai planner and dashboard payloads', function () {
    $user = User::factory()->create();
    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'ollama',
        'model' => 'llama3.1:8b',
        'prompt_version' => 'hayetak_planner_v2',
        'schema_version' => 'hayetak_plan_v2',
        'output_json' => [
            'overview' => ['summary' => 'Generated from the structured planner flow.'],
            'diet' => ['daily_targets' => ['calories_kcal' => 1900], 'days' => []],
            'workout' => ['weekly_schedule' => []],
            'adaptive_review' => ['review_after_days' => 7],
            'ml_readiness' => ['notes' => 'Optional later experiment.'],
        ],
    ]);

    AiPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'type' => 'diet',
        'plan_json' => ['daily_targets' => ['calories_kcal' => 1900]],
        'version' => 1,
        'created_by' => $user->id,
        'generation_id' => 'generation-1',
    ]);

    AiPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'type' => 'workout',
        'plan_json' => ['weekly_schedule' => []],
        'version' => 1,
        'created_by' => $user->id,
        'generation_id' => 'generation-1',
    ]);

    $nutritionPlan = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Diet Plan v1',
        'goal' => 'Fat loss',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'targets_json' => ['calories_kcal' => 1900],
        'meta' => [],
    ]);

    $workoutPlan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Workout Plan v1',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'is_public' => false,
        'meta' => [],
    ]);

    NutritionPlanDay::query()->create([
        'nutrition_plan_id' => $nutritionPlan->id,
        'day_index' => 1,
        'date' => now()->toDateString(),
        'notes' => 'Test day',
    ]);

    WorkoutPlanDay::query()->create([
        'workout_plan_id' => $workoutPlan->id,
        'day_index' => 1,
        'name' => 'Full body',
        'notes' => null,
        'meta' => ['session_type' => 'train'],
    ]);

    $this->actingAs($user)
        ->get('/ai/planner')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ai/planner')
            ->where('generation.plan.overview.summary', 'Generated from the structured planner flow.')
            ->missing('generation.ai_request_id')
            ->missing('generation.provider')
            ->missing('generation.model')
            ->missing('generation.prompt_version')
            ->missing('generation.schema_version')
            ->missing('generation.plan.progress_prediction.model_name')
            ->missing('generation.plan.progress_prediction.inference_source')
            ->missing('nutritionPlan.ai_request')
            ->missing('workoutPlan.ai_request')
            ->missing('defaults.provider')
            ->missing('defaults.model')
            ->missing('defaults.prompt_version')
            ->missing('defaults.schema_version')
<<<<<<< HEAD
            ->missing('weightHistory')
            ->has('predictionSummary')
            ->has('comparisonWeights')
=======
>>>>>>> origin/main
        );

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('nutritionPlan.id', $nutritionPlan->id)
            ->where('workoutPlan.id', $workoutPlan->id)
            ->missing('nutritionPlan.ai_request')
            ->missing('workoutPlan.ai_request')
            ->where('coachSnapshot', null)
            ->has('predictionTrend')
        );
});

it('returns active ai and manual workout plans separately for planner and log pages', function () {
    $user = User::factory()->create();
    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'ollama',
        'model' => 'llama3.1:8b',
        'prompt_version' => 'hayetak_planner_v2',
        'schema_version' => 'hayetak_plan_v2',
    ]);

    $exercise = Exercise::query()->create([
        'name' => 'Bodyweight Squat',
        'primary_muscle' => 'Legs',
        'equipment' => 'Bodyweight',
    ]);

    $aiPlan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Workout Plan',
        'goal' => 'Strength',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'is_public' => false,
        'meta' => [],
    ]);
    $aiDay = WorkoutPlanDay::query()->create([
        'workout_plan_id' => $aiPlan->id,
        'day_index' => 1,
        'name' => 'AI Day',
        'meta' => ['session_type' => 'train'],
    ]);
    $aiDay->exercises()->attach($exercise->id, [
        'order_index' => 0,
        'sets' => 3,
        'reps_min' => 10,
        'reps_max' => 10,
        'rest_seconds' => 60,
        'rpe_target' => 7,
        'rir_target' => 0,
    ]);

    $manualPlan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => null,
        'name' => 'My Workout Draft',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 3,
        'is_active' => false,
        'is_public' => false,
        'meta' => ['source' => 'manual_builder_draft'],
    ]);
    $manualDay = WorkoutPlanDay::query()->create([
        'workout_plan_id' => $manualPlan->id,
        'day_index' => 1,
        'name' => 'Manual Day',
        'meta' => ['source' => 'manual_builder_draft'],
    ]);

    $this->actingAs($user)
        ->get('/workouts/plan')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('workouts/planner')
            ->where('activeAiPlan.id', $aiPlan->id)
            ->where('manualPlan.id', $manualPlan->id)
            ->where('recommendedAiDayId', $aiDay->id)
            ->missing('activeAiPlan.ai_request')
            ->missing('manualPlan.ai_request')
        );

    $this->actingAs($user)
        ->get('/workouts/log')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('workouts/log')
            ->where('aiPlan.id', $aiPlan->id)
            ->where('manualPlan.id', $manualPlan->id)
            ->where('recommendedAiDayId', $aiDay->id)
            ->where('recommendedManualDayId', $manualDay->id)
            ->missing('aiPlan.ai_request')
            ->missing('manualPlan.ai_request')
        );
});

it('stores the workout plan id when a workout session starts from a selected plan day', function () {
    $user = User::factory()->create();
    $plan = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Manual Plan',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 3,
        'is_active' => false,
        'is_public' => false,
        'meta' => ['source' => 'manual_builder_draft'],
    ]);
    $day = WorkoutPlanDay::query()->create([
        'workout_plan_id' => $plan->id,
        'day_index' => 1,
        'name' => 'Manual Day',
        'meta' => ['source' => 'manual_builder_draft'],
    ]);

    $this->actingAs($user)
        ->post('/workouts/log/start', [
            'workout_date' => now()->toDateString(),
            'workout_plan_day_id' => $day->id,
        ])
        ->assertRedirect('/workouts/log');

    $log = WorkoutLog::query()->firstOrFail();

    expect($log->workout_plan_id)->toBe($plan->id)
        ->and($log->workout_plan_day_id)->toBe($day->id);
});

it('logs planned meal substitutions and reports their status through the meal tracker day payload', function () {
    $user = User::factory()->create([
        'allergies' => ['Peanuts'],
        'diet_name' => 'Balanced',
    ]);

    $plannedFood = Food::query()->create([
        'name' => 'Greek Yogurt',
        'serving_size' => 1,
        'serving_unit' => 'cup',
        'calories' => 120,
        'protein_g' => 17,
        'carbs_g' => 6,
        'fat_g' => 4,
        'allergens' => [],
        'diets_allowed' => ['Balanced'],
    ]);
    $substituteFood = Food::query()->create([
        'name' => 'Cottage Cheese',
        'serving_size' => 1,
        'serving_unit' => 'cup',
        'calories' => 110,
        'protein_g' => 16,
        'carbs_g' => 5,
        'fat_g' => 4,
        'allergens' => [],
        'diets_allowed' => ['Balanced'],
    ]);

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'ollama',
        'model' => 'llama3.1:8b',
        'prompt_version' => 'hayetak_planner_v2',
        'schema_version' => 'hayetak_plan_v2',
    ]);

    $plan = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Diet Plan',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'targets_json' => ['calories_kcal' => 1800],
        'meta' => [],
    ]);

    $day = NutritionPlanDay::query()->create([
        'nutrition_plan_id' => $plan->id,
        'day_index' => 1,
        'date' => now()->toDateString(),
        'notes' => 'Breakfast focus',
    ]);

    $meal = NutritionPlanMeal::query()->create([
        'nutrition_plan_day_id' => $day->id,
        'meal_type' => 'breakfast',
        'order' => 1,
        'notes' => 'Protein breakfast bowl',
    ]);

    $item = NutritionPlanItem::query()->create([
        'nutrition_plan_meal_id' => $meal->id,
        'food_id' => $plannedFood->id,
        'servings' => 1,
        'grams' => null,
        'sort_order' => 1,
        'notes' => 'Keep this high protein',
    ]);

    $this->actingAs($user)
        ->postJson("/api/meal-tracker/planned-items/{$item->id}/log", [
            'food_id' => $substituteFood->id,
            'servings' => 1.5,
            'eaten_at' => now()->toDateString(),
        ])
        ->assertOk()
        ->assertJsonPath('status', 'logged_substitute');

    expect(MealEntry::query()->where('nutrition_plan_item_id', $item->id)->exists())->toBeTrue();

    $this->actingAs($user)
        ->getJson('/api/meal-tracker/day?date='.now()->toDateString())
        ->assertOk()
        ->assertJson(fn (AssertableJson $json) => $json
            ->where('planModeAvailable', true)
            ->missing('plannedDay.plan.source')
            ->where('plannedDay.meals.0.items.0.status', 'logged_substitute')
            ->where('entries.0.plan_tracking.status', 'logged_substitute')
            ->etc()
        );
});
<<<<<<< HEAD

it('accepts grams for foods and milliliters for drinks when logging meals', function () {
    $user = User::factory()->create();

    $solidFood = Food::query()->create([
        'name' => 'Grilled Chicken',
        'serving_size' => 100,
        'serving_unit' => 'g',
        'calories' => 165,
        'protein_g' => 31,
        'carbs_g' => 0,
        'fat_g' => 4,
    ]);

    $drink = Food::query()->create([
        'name' => 'Orange Juice',
        'serving_size' => 250,
        'serving_unit' => 'ml',
        'calories' => 110,
        'protein_g' => 2,
        'carbs_g' => 26,
        'fat_g' => 0,
    ]);

    $this->actingAs($user)
        ->postJson('/meal-entries', [
            'food_id' => $solidFood->id,
            'meal_type' => 'lunch',
            'grams' => 150,
            'eaten_at' => now()->toDateString(),
        ])
        ->assertOk();

    $this->actingAs($user)
        ->postJson('/meal-entries', [
            'food_id' => $drink->id,
            'meal_type' => 'drink',
            'milliliters' => 500,
            'eaten_at' => now()->toDateString(),
        ])
        ->assertOk();

    $entries = MealEntry::query()
        ->where('user_id', $user->id)
        ->orderBy('id')
        ->get();

    expect($entries)->toHaveCount(2)
        ->and((float) $entries[0]->servings)->toBe(1.5)
        ->and((float) $entries[1]->servings)->toBe(2.0);
});

it('filters plan substitution search results to foods that match the user diet', function () {
    if (! Schema::hasColumn('foods', 'meal_types')) {
        Schema::table('foods', function (Blueprint $table) {
            $table->json('meal_types')->nullable();
        });
    }

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'email_verified_at' => now(),
    ]);

    $plannedFood = Food::query()->create([
        'name' => 'Oatmeal Bowl',
        'serving_size' => 1,
        'serving_unit' => 'bowl',
        'calories' => 320,
        'protein_g' => 12,
        'carbs_g' => 48,
        'fat_g' => 8,
        'allergens' => [],
        'diets_allowed' => ['Balanced'],
        'meal_types' => ['breakfast'],
    ]);

    $allowedSubstitute = Food::query()->create([
        'name' => 'Yogurt Parfait',
        'serving_size' => 1,
        'serving_unit' => 'cup',
        'calories' => 300,
        'protein_g' => 14,
        'carbs_g' => 42,
        'fat_g' => 7,
        'allergens' => [],
        'diets_allowed' => ['balanced'],
        'meal_types' => ['breakfast'],
    ]);

    $blockedSubstitute = Food::query()->create([
        'name' => 'Keto Egg Plate',
        'serving_size' => 1,
        'serving_unit' => 'plate',
        'calories' => 310,
        'protein_g' => 18,
        'carbs_g' => 6,
        'fat_g' => 20,
        'allergens' => [],
        'diets_allowed' => ['Keto'],
        'meal_types' => ['breakfast'],
    ]);

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['source' => 'test'],
        'provider' => 'ollama',
        'model' => 'llama3.1:8b',
        'prompt_version' => 'hayetak_planner_v2',
        'schema_version' => 'hayetak_plan_v2',
    ]);

    $plan = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Diet Plan',
        'goal' => 'Consistency',
        'start_date' => now()->toDateString(),
        'duration_days' => 7,
        'is_active' => true,
        'targets_json' => ['calories_kcal' => 1800],
        'meta' => [],
    ]);

    $day = NutritionPlanDay::query()->create([
        'nutrition_plan_id' => $plan->id,
        'day_index' => 1,
        'date' => now()->toDateString(),
        'notes' => 'Breakfast focus',
    ]);

    $meal = NutritionPlanMeal::query()->create([
        'nutrition_plan_day_id' => $day->id,
        'meal_type' => 'breakfast',
        'order' => 1,
        'notes' => 'Protein breakfast bowl',
    ]);

    $item = NutritionPlanItem::query()->create([
        'nutrition_plan_meal_id' => $meal->id,
        'food_id' => $plannedFood->id,
        'servings' => 1,
        'grams' => null,
        'sort_order' => 1,
        'notes' => 'Keep this balanced',
    ]);

    $response = $this->actingAs($user)
        ->getJson("/api/foods/search?context=plan_substitution&nutrition_plan_item_id={$item->id}");

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $allowedSubstitute->id);

    expect(collect($response->json('data'))->pluck('id')->all())
        ->not->toContain($plannedFood->id)
        ->not->toContain($blockedSubstitute->id);
});

it('shows one predictor point per completed planner run instead of expanding a single run into repeated future windows', function () {
    $user = User::factory()->create();

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-01',
        'weight_kg' => 80.0,
        'notes' => 'Baseline check-in.',
    ]);

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-15',
        'weight_kg' => 79.4,
        'notes' => '14-day check-in.',
    ]);

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-28',
        'weight_kg' => 79.0,
        'notes' => '21-day check-in.',
    ]);

    $firstRequest = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['planning_constraints' => ['plan_horizon_days' => 14]],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 80.0,
                'expected_weight_change_kg' => -0.6,
                'projected_body_weight_kg' => 79.4,
                'feedback_adjustment' => [
                    'base_weekly_weight_change_kg' => -0.25,
                    'adjusted_weekly_weight_change_kg' => -0.3,
                    'feedback_sample_count' => 1,
                ],
            ],
        ],
    ]);
    $firstRequest->forceFill([
        'created_at' => '2026-05-01 09:00:00',
        'updated_at' => '2026-05-01 09:00:00',
    ])->save();

    $secondRequest = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['planning_constraints' => ['plan_horizon_days' => 21]],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 79.4,
                'expected_weight_change_kg' => -0.4,
                'projected_body_weight_kg' => 79.0,
                'feedback_adjustment' => [
                    'base_weekly_weight_change_kg' => -0.18,
                    'adjusted_weekly_weight_change_kg' => -0.133,
                    'feedback_sample_count' => 2,
                ],
            ],
        ],
    ]);
    $secondRequest->forceFill([
        'created_at' => '2026-05-08 09:00:00',
        'updated_at' => '2026-05-08 09:00:00',
    ])->save();

    $this->actingAs($user)
        ->get('/ai/planner')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ai/planner')
            ->has('predictionTrend', 2)
            ->where('predictionTrend.0.plan_date', '2026-05-01')
            ->where('predictionTrend.0.feedback_period_end_date', '2026-05-14')
            ->where('predictionTrend.0.actual_weight_date', '2026-05-15')
            ->where('predictionTrend.1.plan_date', '2026-05-08')
            ->where('predictionTrend.1.feedback_period_end_date', '2026-05-28')
            ->where('predictionTrend.1.actual_weight_date', '2026-05-28')
        );
});

it('excludes synthetic weigh-ins from planner predictor comparisons and summary counts', function () {
    $user = User::factory()->create();

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-01',
        'weight_kg' => 80.0,
        'notes' => 'Real baseline check-in.',
    ]);

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-15',
        'weight_kg' => 79.2,
        'notes' => 'synthetic_predictor_label',
    ]);

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-30',
        'weight_kg' => 79.0,
        'notes' => 'Real follow-up check-in.',
    ]);

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['planning_constraints' => ['plan_horizon_days' => 14]],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 80.0,
                'expected_weight_change_kg' => -0.6,
                'projected_body_weight_kg' => 79.4,
            ],
        ],
    ]);
    $request->forceFill([
        'created_at' => '2026-05-01 09:00:00',
        'updated_at' => '2026-05-01 09:00:00',
    ])->save();

    $this->actingAs($user)
        ->get('/ai/planner')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ai/planner')
            ->missing('weightHistory')
            ->has('comparisonWeights', 2)
            ->where('comparisonWeights.0.date', '2026-05-01')
            ->where('comparisonWeights.1.date', '2026-05-30')
            ->where('predictionTrend.0.actual_weight_kg', null)
            ->where('predictionTrend.0.actual_weight_date', null)
            ->where('predictionSummary.prediction_only', true)
            ->where('predictionSummary.real_weight_history_count', 2)
            ->where('predictionSummary.synthetic_weight_history_count', 1)
            ->where('predictionSummary.actual_comparison_available', true)
        );
});
=======
>>>>>>> origin/main
