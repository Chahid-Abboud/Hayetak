<?php

use App\Models\Food;
use App\Models\User;
use App\Services\Ai\Context\PlannerContextBuilder;
use App\Services\Ai\Tools\SearchRecipesTool;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('applies ai block tags to impossible beverage anomalies', function () {
    $flaggedFood = Food::query()->create([
        'name' => 'Planet Smoothie (Bottled Berry)',
        'category' => 'beverage',
        'calories' => null,
        'protein_g' => 26,
        'carbs_g' => 12,
        'fat_g' => 9,
        'tags' => [],
        'allergens' => [],
        'diets_allowed' => ['general'],
        'ingredients' => ['berry blend'],
    ]);

    Food::query()->create([
        'name' => 'Greek Yogurt Berry Bowl',
        'category' => 'snack',
        'calories' => 260,
        'protein_g' => 23,
        'carbs_g' => 25,
        'fat_g' => 7,
        'tags' => [],
        'allergens' => ['milk'],
        'diets_allowed' => ['mediterranean', 'vegetarian'],
        'ingredients' => ['greek yogurt', 'berries'],
    ]);

    $this->artisan('ai:audit-food-catalog', [
        '--apply' => 1,
        '--out-dir' => 'tmp',
        '--limit' => 0,
    ])->assertExitCode(0);

    $flaggedFood->refresh();

    expect($flaggedFood->tags)->toContain('catalog_anomaly')
        ->and($flaggedFood->tags)->toContain('invalid_for_ai_seed')
        ->and($flaggedFood->tags)->toContain('invalid_for_ai_search')
        ->and($flaggedFood->tags)->toContain('catalog_reason:impossible_beverage_macros');
});

it('filters catalog anomalies from planner context and recipe search results', function () {
    $user = User::factory()->create([
        'age' => 31,
        'gender' => 'female',
        'height_cm' => 167,
        'weight_kg' => 68,
        'diet_name' => 'Mediterranean',
        'dietary_goal' => 'Maintain weight',
        'fitness_goal' => 'Stay active',
        'activity_level' => 'moderate',
        'workout_location' => 'home',
        'workout_days_per_week' => 3,
        'allergies' => [],
    ]);

    Food::query()->create([
        'name' => 'Planet Smoothie (Bottled Berry)',
        'category' => 'beverage',
        'calories' => null,
        'protein_g' => 26,
        'carbs_g' => 12,
        'fat_g' => 9,
        'tags' => [],
        'allergens' => [],
        'diets_allowed' => ['general'],
        'ingredients' => ['berry blend'],
    ]);

    Food::query()->create([
        'name' => 'Greek Yogurt Berry Bowl',
        'category' => 'snack',
        'calories' => 260,
        'protein_g' => 23,
        'carbs_g' => 25,
        'fat_g' => 7,
        'tags' => [],
        'allergens' => [],
        'diets_allowed' => ['mediterranean', 'vegetarian'],
        'ingredients' => ['greek yogurt', 'berries'],
    ]);

    $profile = [
        'dietary_goal' => 'Maintain weight',
        'fitness_goal' => 'Stay active',
        'diet_type' => 'Mediterranean',
        'allergies' => [],
        'medical_conditions' => [],
        'injury_history' => [],
        'available_equipment' => ['resistance band'],
        'preferred_workout_days' => ['monday', 'wednesday', 'friday'],
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
        'past_diet_failures' => [],
        'past_diet_failures_other' => null,
    ];

    $context = app(PlannerContextBuilder::class)->build($user, $profile, 14);
    $catalogJson = json_encode($context['meal_catalog_hints'], JSON_THROW_ON_ERROR);

    expect($catalogJson)->toContain('Greek Yogurt Berry Bowl')
        ->and($catalogJson)->not->toContain('Planet Smoothie (Bottled Berry)');

    $search = app(SearchRecipesTool::class)->execute($user, [
        'query' => 'berry',
        'limit' => 5,
    ]);

    $recipeNames = array_values(array_map(
        static fn (array $row): string => (string) ($row['name'] ?? ''),
        $search['recipes']
    ));

    expect($recipeNames)->toContain('Greek Yogurt Berry Bowl')
        ->and($recipeNames)->not->toContain('Planet Smoothie (Bottled Berry)');
});
