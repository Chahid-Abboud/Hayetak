<?php

use App\Models\Food;
use App\Services\Ai\FoodCatalog\PlannerFoodModel;
use Tests\TestCase;

uses(TestCase::class);

it('flags default meal types and weak planner metadata', function () {
    $food = new Food([
        'name' => 'Breakfast Protein Cup',
        'category' => 'Breakfast',
        'serving_size' => 1,
        'serving_unit' => 'serving',
        'calories' => 260,
        'protein_g' => 22,
        'carbs_g' => 18,
        'fat_g' => 9,
        'tags' => [],
        'allergens' => [],
        'diets_allowed' => [],
        'ingredients' => [],
        'meal_types' => ['breakfast', 'lunch', 'dinner', 'snack', 'drink'],
    ]);

    $audit = app(PlannerFoodModel::class)->inspectFood($food);

    expect($audit['planner_warnings'])->toContain('default_meal_types')
        ->and($audit['planner_warnings'])->toContain('meal_types_derived_from_category')
        ->and($audit['planner_warnings'])->toContain('generic_serving_unit')
        ->and($audit['planner_warnings'])->toContain('missing_constraint_metadata')
        ->and($audit['normalized_meal_types'])->toBe(['breakfast'])
        ->and($audit['planner_ready'])->toBeFalse();
});

it('accepts explicit meal typing and complete serving metadata', function () {
    $food = new Food([
        'name' => 'Greek Yogurt Berry Bowl',
        'category' => 'Breakfast',
        'serving_size' => 1,
        'serving_unit' => 'bowl',
        'calories' => 290,
        'protein_g' => 20,
        'carbs_g' => 26,
        'fat_g' => 10,
        'tags' => ['seeded'],
        'allergens' => ['milk'],
        'diets_allowed' => ['vegetarian', 'high-protein'],
        'ingredients' => ['greek yogurt', 'berries'],
        'meal_types' => ['breakfast', 'snack'],
    ]);

    $audit = app(PlannerFoodModel::class)->inspectFood($food);

    expect($audit['planner_warnings'])->toBe([])
        ->and($audit['normalized_meal_types'])->toBe(['breakfast', 'snack'])
        ->and($audit['planner_ready'])->toBeTrue();
});
