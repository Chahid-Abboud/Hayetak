<?php

use App\Models\Exercise;
use App\Models\Food;
use App\Models\PlaceLocal;
use App\Models\User;
use App\Services\Ai\Tools\CoachToolExecutor;

it('plans and executes required coach tools for nutrition and nearby prompts', function () {
    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['sesame'],
        'fitness_goal' => 'Build muscle',
    ]);

    Food::query()->create([
        'name' => 'Greek yogurt berry bowl',
        'category' => 'snack',
        'calories' => 260,
        'protein_g' => 24,
        'carbs_g' => 27,
        'fat_g' => 6,
        'ingredients' => ['greek yogurt', 'berries', 'chia seeds'],
        'allergens' => [],
        'diets_allowed' => ['mediterranean', 'vegetarian'],
    ]);

    PlaceLocal::query()->create([
        'name' => 'Nearby Gym',
        'category' => 'gym',
        'city' => 'Beirut',
        'address' => 'Main Street',
        'lat' => 33.89,
        'lng' => 35.50,
    ]);

    Exercise::query()->create([
        'name' => 'Bodyweight squat',
        'primary_muscle' => 'Quadriceps',
        'equipment' => 'Bodyweight',
        'difficulty' => 'Beginner',
        'home_friendly' => true,
    ]);

    $result = app(CoachToolExecutor::class)->planAndExecute(
        $user,
        'Suggest a dinner recipe, summarize my last 7 days, and suggest nearby gym options.',
        [
            'lat' => 33.8938,
            'lng' => 35.5018,
            'goal' => 'muscle gain',
            'available_ingredients' => ['berries', 'yogurt'],
        ],
        ['feature' => 'nutrition']
    );

    $toolNames = array_values(array_map(
        static fn (array $entry): string => (string) ($entry['name'] ?? ''),
        $result['results']
    ));

    expect($toolNames)->toContain('search_recipes');
    expect($toolNames)->toContain('summarize_last_7_days');
    expect($toolNames)->toContain('find_gyms_or_nutritionists');
    expect(collect($result['results'])->every(fn (array $entry) => (bool) ($entry['ok'] ?? false)))->toBeTrue();
});
