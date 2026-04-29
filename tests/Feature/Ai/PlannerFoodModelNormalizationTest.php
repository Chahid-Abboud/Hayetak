<?php

use App\Models\Food;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');
});

it('replaces repetitive meal template macros and servings with food-model-backed values', function () {
    seedPlannerFoodModelCatalog();

    $user = User::factory()->create([
        'age' => 33,
        'gender' => 'female',
        'height_cm' => 167,
        'weight_kg' => 69,
        'diet_name' => 'Mediterranean',
        'dietary_goal' => 'Calorie Deficit',
        'fitness_goal' => 'Lose Weight',
        'activity_level' => 'moderate',
        'workout_days_per_week' => 4,
        'workout_location' => 'home',
        'allergies' => [],
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(repetitiveCompactPlannerPayload()),
            ],
            'prompt_eval_count' => 180,
            'eval_count' => 420,
        ], 200),
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'food_model_normalization_test'])
        ->assertCreated()
        ->assertJsonPath('ok', true);

    $plan = $response->json('plan');

    $breakfastNames = mealNames($plan['diet']['meal_options']['breakfast'] ?? []);
    $breakfastMacroTuples = mealMacroTuples($plan['diet']['meal_options']['breakfast'] ?? []);
    $lunchMacroTuples = mealMacroTuples($plan['diet']['meal_options']['lunch'] ?? []);
    $breakfastCalories = mealCalories($plan['diet']['meal_options']['breakfast'] ?? []);
    $lunchCalories = mealCalories($plan['diet']['meal_options']['lunch'] ?? []);
    $breakfastPortions = mealPortions($plan['diet']['meal_options']['breakfast'] ?? []);
    $lunchPortions = mealPortions($plan['diet']['meal_options']['lunch'] ?? []);

    expect($breakfastNames->every(fn (string $name): bool => ! str_contains(strtolower($name), 'option')))->toBeTrue()
        ->and($breakfastMacroTuples->unique()->count())->toBeGreaterThan(1)
        ->and($lunchMacroTuples->unique()->count())->toBeGreaterThan(1)
        ->and($breakfastCalories->unique()->count())->toBeGreaterThan(1)
        ->and($lunchCalories->unique()->count())->toBeGreaterThan(1)
        ->and($breakfastPortions->unique()->count())->toBeGreaterThan(1)
        ->and($lunchPortions->unique()->count())->toBeGreaterThan(1)
        ->and($breakfastPortions->every(fn (string $portion): bool => strtolower($portion) !== '2 serving'))->toBeTrue()
        ->and($lunchPortions->every(fn (string $portion): bool => strtolower($portion) !== '2 serving'))->toBeTrue();
});

function seedPlannerFoodModelCatalog(): void
{
    foreach ([
        ['name' => 'Greek Yogurt Fruit Bowl', 'category' => 'Breakfast', 'serving_size' => 1, 'serving_unit' => 'bowl', 'calories' => 290, 'protein_g' => 20, 'carbs_g' => 26, 'fat_g' => 10],
        ['name' => 'Turkey Sweet Potato Hash', 'category' => 'Breakfast', 'serving_size' => 1, 'serving_unit' => 'skillet', 'calories' => 390, 'protein_g' => 28, 'carbs_g' => 24, 'fat_g' => 18],
        ['name' => 'Chia Berry Breakfast Jar', 'category' => 'Breakfast', 'serving_size' => 1, 'serving_unit' => 'jar', 'calories' => 320, 'protein_g' => 12, 'carbs_g' => 32, 'fat_g' => 15],

        ['name' => 'Chicken Rice Spinach Plate', 'category' => 'Lunch', 'serving_size' => 1, 'serving_unit' => 'plate', 'calories' => 500, 'protein_g' => 37, 'carbs_g' => 43, 'fat_g' => 16],
        ['name' => 'Lentil Quinoa Power Bowl', 'category' => 'Lunch', 'serving_size' => 1, 'serving_unit' => 'bowl', 'calories' => 500, 'protein_g' => 23, 'carbs_g' => 58, 'fat_g' => 17],
        ['name' => 'Lemon Chicken Veg Plate', 'category' => 'Lunch', 'serving_size' => 1, 'serving_unit' => 'plate', 'calories' => 490, 'protein_g' => 39, 'carbs_g' => 22, 'fat_g' => 23],

        ['name' => 'Herb Salmon Carrot Plate', 'category' => 'Dinner', 'serving_size' => 1, 'serving_unit' => 'plate', 'calories' => 420, 'protein_g' => 33, 'carbs_g' => 18, 'fat_g' => 19],
        ['name' => 'Beef Vegetable Stew Bowl', 'category' => 'Dinner', 'serving_size' => 1, 'serving_unit' => 'bowl', 'calories' => 450, 'protein_g' => 33, 'carbs_g' => 18, 'fat_g' => 24],
        ['name' => 'Tofu Vegetable Stir Fry', 'category' => 'Dinner', 'serving_size' => 1, 'serving_unit' => 'plate', 'calories' => 430, 'protein_g' => 26, 'carbs_g' => 34, 'fat_g' => 19],

        ['name' => 'Protein Yogurt Cup', 'category' => 'Snack', 'serving_size' => 1, 'serving_unit' => 'cup', 'calories' => 190, 'protein_g' => 18, 'carbs_g' => 16, 'fat_g' => 5],
        ['name' => 'Turkey Roll Ups', 'category' => 'Snack', 'serving_size' => 3, 'serving_unit' => 'slices', 'calories' => 120, 'protein_g' => 20, 'carbs_g' => 2, 'fat_g' => 2],
        ['name' => 'Edamame Snack Bowl', 'category' => 'Snack', 'serving_size' => 1, 'serving_unit' => 'bowl', 'calories' => 180, 'protein_g' => 17, 'carbs_g' => 14, 'fat_g' => 7],
    ] as $food) {
        Food::query()->create($food);
    }
}

function repetitiveCompactPlannerPayload(): array
{
    return [
        'overview' => [
            'summary' => 'Compact planner payload with repetitive macros.',
        ],
        'safety' => [
            'hard_rules_observed' => ['Allergy and injury constraints applied'],
        ],
        'diet' => [
            'daily_targets' => [
                'calories_kcal' => 1800,
                'protein_g' => 130,
                'carbs_g' => 175,
                'fat_g' => 58,
                'fiber_g' => 28,
                'water_ml' => 2400,
            ],
            'meal_options' => [
                'breakfast' => repetitiveMealOptions('breakfast', 430, 35, 67, 16),
                'lunch' => repetitiveMealOptions('lunch', 610, 43, 81, 19),
                'dinner' => repetitiveMealOptions('dinner', 580, 38, 71, 17),
                'snack' => repetitiveMealOptions('snack', 180, 10, 20, 4),
            ],
            'grocery_list' => [],
            'meal_prep_notes' => [],
            'adherence_notes' => [],
        ],
        'workout' => [
            'weekly_schedule' => [
                [
                    'day_index' => 1,
                    'session_type' => 'train',
                    'focus' => 'Full Body',
                    'location' => 'home',
                    'duration_min' => 40,
                    'exercises' => [
                        [
                            'name' => 'Bodyweight Squat',
                            'sets' => 3,
                            'reps' => '10-12',
                            'rest_sec' => 60,
                            'rpe' => 7.0,
                            'equipment' => 'Bodyweight',
                        ],
                    ],
                ],
                [
                    'day_index' => 2,
                    'session_type' => 'recovery',
                    'focus' => 'Mobility',
                    'location' => 'home',
                    'duration_min' => 20,
                    'exercises' => [],
                ],
                [
                    'day_index' => 3,
                    'session_type' => 'rest',
                    'focus' => 'Rest',
                    'location' => 'home',
                    'duration_min' => 0,
                    'exercises' => [],
                ],
            ],
            'progression_rules' => [],
            'recovery_rules' => [],
            'coach_notes' => [],
        ],
        'adaptive_review' => [
            'review_after_days' => 14,
        ],
        'ml_readiness' => [
            'notes' => 'Compact template output for planner normalization regression coverage.',
        ],
    ];
}

function repetitiveMealOptions(string $mealCode, int $targetKcal, int $protein, int $carbs, int $fat): array
{
    return collect(range(1, 3))->map(function (int $index) use ($mealCode, $targetKcal, $protein, $carbs, $fat): array {
        return [
            'title' => ucfirst($mealCode).' option '.$index,
            'target_kcal' => $targetKcal,
            'items' => [[
                'name' => ucfirst($mealCode).' option '.$index,
                'portion' => $mealCode === 'snack' ? '1 serving' : '2 serving',
                'calories_kcal' => $targetKcal,
                'protein_g' => $protein,
                'carbs_g' => $carbs,
                'fat_g' => $fat,
            ]],
        ];
    })->all();
}

/**
 * @param  array<int, array<string, mixed>>  $meals
 */
function mealNames(array $meals): Collection
{
    return collect($meals)->map(fn (array $meal): string => (string) data_get($meal, 'items.0.name', ''));
}

/**
 * @param  array<int, array<string, mixed>>  $meals
 */
function mealMacroTuples(array $meals): Collection
{
    return collect($meals)->map(function (array $meal): string {
        $item = (array) data_get($meal, 'items.0', []);

        return implode('/', [
            (int) ($item['protein_g'] ?? 0),
            (int) ($item['carbs_g'] ?? 0),
            (int) ($item['fat_g'] ?? 0),
        ]);
    });
}

/**
 * @param  array<int, array<string, mixed>>  $meals
 */
function mealPortions(array $meals): Collection
{
    return collect($meals)->map(fn (array $meal): string => (string) data_get($meal, 'items.0.portion', ''));
}

/**
 * @param  array<int, array<string, mixed>>  $meals
 */
function mealCalories(array $meals): Collection
{
    return collect($meals)->map(fn (array $meal): int => (int) data_get($meal, 'items.0.calories_kcal', 0));
}
