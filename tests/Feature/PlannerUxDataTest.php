<?php

use App\Models\AiPlan;
use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia as Assert;

it('shows the latest ai planner generation and source metadata on the ai planner page and dashboard', function () {
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
            ->where('generation.provider', 'ollama')
            ->where('generation.model', 'llama3.1:8b')
            ->where('nutritionPlan.ai_request.provider', 'ollama')
            ->where('workoutPlan.ai_request.model', 'llama3.1:8b')
        );

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('nutritionPlan.ai_request.provider', 'ollama')
            ->where('workoutPlan.ai_request.model', 'llama3.1:8b')
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
            ->where('plannedDay.meals.0.items.0.status', 'logged_substitute')
            ->where('entries.0.plan_tracking.status', 'logged_substitute')
            ->etc()
        );
});
