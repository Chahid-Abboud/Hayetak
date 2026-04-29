<?php

use App\Models\User;
use App\Services\Ai\Validation\PlannerOutputValidator;
use App\Services\Ai\Validation\PlannerValidationException;
use Tests\TestCase;

uses(TestCase::class);

it('rejects planner outputs with low diet variety', function () {
    $validator = app(PlannerOutputValidator::class);
    $user = new User([
        'diet_name' => 'Balanced',
        'allergies' => [],
    ]);

    $payload = plannerValidatorPayload(false);
    $profile = [
        'allergies' => [],
        'injury_history' => [],
        'workout_location' => 'home',
        'available_equipment' => [],
    ];

    expect(fn () => $validator->validate($user, $payload, $profile, 14))
        ->toThrow(PlannerValidationException::class, "Diet variety is too low for 'breakfast'.");
});

it('accepts planner outputs with sufficient diet variety', function () {
    $validator = app(PlannerOutputValidator::class);
    $user = new User([
        'diet_name' => 'Balanced',
        'allergies' => [],
    ]);

    $payload = plannerValidatorPayload(true);
    $profile = [
        'allergies' => [],
        'injury_history' => [],
        'workout_location' => 'home',
        'available_equipment' => [],
    ];

    $validated = $validator->validate($user, $payload, $profile, 14);

    expect($validated)->toBeArray()
        ->and($validated['diet']['days'])->toHaveCount(14);
});

it('does not falsely treat meal_code keys as fish allergen hits', function () {
    $validator = app(PlannerOutputValidator::class);
    $user = new User([
        'diet_name' => 'Balanced',
        'allergies' => ['Fish'],
    ]);

    $payload = plannerValidatorPayload(true);
    $payload['diet']['meal_options']['lunch'][2]['items'][0]['name'] = 'Turkey quinoa salad';
    $payload['diet']['meal_options']['dinner'][0]['items'][0]['name'] = 'Chicken and potatoes';
    $payload['diet']['meal_options']['dinner'][1]['items'][0]['name'] = 'Lean beef stir-fry';
    $payload['diet']['meal_options']['dinner'][2]['items'][0]['name'] = 'Chicken veggie tray';

    foreach ($payload['diet']['days'] as &$day) {
        foreach ($day['meals'] as &$meal) {
            if (($meal['meal_code'] ?? null) === 'lunch' && str_contains(strtolower((string) ($meal['items'][0]['name'] ?? '')), 'tuna')) {
                $meal['items'][0]['name'] = 'Turkey quinoa salad';
            }
            if (($meal['meal_code'] ?? null) === 'dinner') {
                $meal['items'][0]['name'] = 'Chicken and potatoes';
            }
        }
    }

    $profile = [
        'allergies' => ['Fish'],
        'injury_history' => [],
        'workout_location' => 'home',
        'available_equipment' => [],
    ];

    $validated = $validator->validate($user, $payload, $profile, 14);

    expect($validated)->toBeArray()
        ->and($validated['diet']['days'])->toHaveCount(14);
});

function plannerValidatorPayload(bool $varied): array
{
    $days = [];

    $breakfastNames = $varied
        ? ['Greek yogurt bowl', 'Eggs with toast', 'Overnight oats']
        : ['Greek yogurt bowl', 'Greek yogurt bowl', 'Greek yogurt bowl'];
    $lunchNames = $varied
        ? ['Chicken rice plate', 'Turkey quinoa bowl', 'Tuna pasta salad']
        : ['Chicken rice plate', 'Chicken rice plate', 'Chicken rice plate'];
    $dinnerNames = $varied
        ? ['Baked fish and potatoes', 'Lean beef stir-fry', 'Chicken veggie tray']
        : ['Baked fish and potatoes', 'Baked fish and potatoes', 'Baked fish and potatoes'];
    $snackNames = $varied
        ? ['Greek yogurt and berries cup', 'Apple with nut butter', 'Protein shake']
        : ['Greek yogurt and berries cup', 'Greek yogurt and berries cup', 'Greek yogurt and berries cup'];

    for ($i = 1; $i <= 14; $i++) {
        $days[] = [
            'day_index' => $i,
            'theme' => 'Balanced day',
            'meals' => [
                [
                    'meal_code' => 'breakfast',
                    'title' => 'Breakfast',
                    'target_kcal' => 600,
                    'items' => [[
                        'name' => $breakfastNames[($i - 1) % count($breakfastNames)],
                        'portion' => '1 serving',
                        'calories_kcal' => 600,
                        'protein_g' => 40,
                        'carbs_g' => 55,
                        'fat_g' => 18,
                    ]],
                ],
                [
                    'meal_code' => 'lunch',
                    'title' => 'Lunch',
                    'target_kcal' => 700,
                    'items' => [[
                        'name' => $lunchNames[($i - 1) % count($lunchNames)],
                        'portion' => '1 serving',
                        'calories_kcal' => 700,
                        'protein_g' => 55,
                        'carbs_g' => 70,
                        'fat_g' => 22,
                    ]],
                ],
                [
                    'meal_code' => 'dinner',
                    'title' => 'Dinner',
                    'target_kcal' => 600,
                    'items' => [[
                        'name' => $dinnerNames[($i - 1) % count($dinnerNames)],
                        'portion' => '1 serving',
                        'calories_kcal' => 600,
                        'protein_g' => 45,
                        'carbs_g' => 50,
                        'fat_g' => 20,
                    ]],
                ],
                [
                    'meal_code' => 'snack',
                    'title' => 'Snack',
                    'target_kcal' => 180,
                    'items' => [[
                        'name' => $snackNames[($i - 1) % count($snackNames)],
                        'portion' => '1 serving',
                        'calories_kcal' => 180,
                        'protein_g' => 14,
                        'carbs_g' => 18,
                        'fat_g' => 6,
                    ]],
                ],
            ],
        ];
    }

    $weekly = [];
    $labels = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];
    foreach (range(1, 7) as $dayIndex) {
        $weekly[] = [
            'day_index' => $dayIndex,
            'day_label' => $labels[$dayIndex],
            'session_type' => 'train',
            'focus' => 'Full Body',
            'location' => 'home',
            'duration_min' => 40,
            'warmup' => ['march in place'],
            'exercises' => [
                [
                    'name' => 'Bodyweight Squat',
                    'sets' => 3,
                    'reps' => '10-12',
                    'rest_sec' => 90,
                    'rpe' => 7.0,
                    'equipment' => 'Bodyweight',
                ],
                [
                    'name' => 'Incline Push Up',
                    'sets' => 3,
                    'reps' => '8-12',
                    'rest_sec' => 90,
                    'rpe' => 7.0,
                    'equipment' => 'Bodyweight',
                ],
                [
                    'name' => 'Resistance Band Row',
                    'sets' => 3,
                    'reps' => '10-12',
                    'rest_sec' => 90,
                    'rpe' => 7.0,
                    'equipment' => 'Resistance Band',
                ],
                [
                    'name' => 'Dead Bug',
                    'sets' => 3,
                    'reps' => '8-10',
                    'rest_sec' => 90,
                    'rpe' => 6.0,
                    'equipment' => 'Bodyweight',
                ],
            ],
            'cooldown' => ['easy breathing'],
            'safety_notes' => ['pain-free range only'],
        ];
    }

    return [
        'overview' => ['summary' => 'test', 'key_constraints' => [], 'assumptions' => []],
        'safety' => ['hard_rules_observed' => [], 'food_avoidances' => [], 'exercise_cautions' => []],
        'diet' => [
            'daily_targets' => [
                'calories_kcal' => 2000,
                'protein_g' => 140,
                'carbs_g' => 200,
                'fat_g' => 70,
                'fiber_g' => 30,
                'water_ml' => 2500,
            ],
            'meal_options' => [
                'breakfast' => collect(range(0, 2))->map(fn (int $index) => [
                    'title' => 'Breakfast option '.($index + 1),
                    'target_kcal' => 600,
                    'items' => [[
                        'name' => $breakfastNames[$index],
                        'portion' => '1 serving',
                        'calories_kcal' => 600,
                        'protein_g' => 40,
                        'carbs_g' => 55,
                        'fat_g' => 18,
                    ]],
                ])->all(),
                'lunch' => collect(range(0, 2))->map(fn (int $index) => [
                    'title' => 'Lunch option '.($index + 1),
                    'target_kcal' => 700,
                    'items' => [[
                        'name' => $lunchNames[$index],
                        'portion' => '1 serving',
                        'calories_kcal' => 700,
                        'protein_g' => 55,
                        'carbs_g' => 70,
                        'fat_g' => 22,
                    ]],
                ])->all(),
                'dinner' => collect(range(0, 2))->map(fn (int $index) => [
                    'title' => 'Dinner option '.($index + 1),
                    'target_kcal' => 600,
                    'items' => [[
                        'name' => $dinnerNames[$index],
                        'portion' => '1 serving',
                        'calories_kcal' => 600,
                        'protein_g' => 45,
                        'carbs_g' => 50,
                        'fat_g' => 20,
                    ]],
                ])->all(),
                'snack' => collect(range(0, 2))->map(fn (int $index) => [
                    'title' => 'Snack option '.($index + 1),
                    'target_kcal' => 180,
                    'items' => [[
                        'name' => $snackNames[$index],
                        'portion' => '1 serving',
                        'calories_kcal' => 180,
                        'protein_g' => 14,
                        'carbs_g' => 18,
                        'fat_g' => 6,
                    ]],
                ])->all(),
            ],
            'days' => $days,
        ],
        'workout' => [
            'weekly_schedule' => $weekly,
        ],
        'adaptive_review' => [
            'review_after_days' => 14,
            'checkpoints' => [],
            'replanning_triggers' => [],
            'next_data_to_collect' => [],
        ],
        'ml_readiness' => [
            'candidate_features' => [],
            'candidate_targets' => [],
            'notes' => 'test',
        ],
    ];
}
