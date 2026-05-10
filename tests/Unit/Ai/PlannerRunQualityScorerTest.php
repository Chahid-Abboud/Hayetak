<?php

use App\Models\User;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

it('fails the planner audit when the diet leaks an allergen phrase', function () {
    $user = User::factory()->create([
        'allergies' => ['Peanut'],
        'diet_name' => 'Mediterranean',
    ]);

    $plan = plannerQualityPlanFixture();
    data_set($plan, 'diet.meal_options.snack.0.items.0.name', 'Peanut butter yogurt cup');
    data_set($plan, 'diet.days.0.meals.3.items.0.name', 'Peanut butter yogurt cup');

    $score = app(PlannerRunQualityScorer::class)->score($user, $plan, 14, [
        'allergies' => ['Peanut'],
        'diet_type' => 'Mediterranean',
    ]);

    expect(data_get($score, 'checks.allergy_leakage_absent'))->toBeFalse()
        ->and(data_get($score, 'checks.allergies_respected'))->toBeFalse()
        ->and(data_get($score, 'safety_findings.allergy_leaks.0.allergy'))->toBe('Peanut')
        ->and((string) data_get($score, 'safety_findings.allergy_leaks.0.matched_needle'))->toContain('peanut')
        ->and((float) $score['quality_percentage'])->toBeLessThan(100.0);
});

it('fails the planner audit when workouts leak injury-unsafe exercises from profile overrides', function () {
    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
    ]);

    $plan = plannerQualityPlanFixture();
    data_set($plan, 'workout.weekly_schedule.0.focus', 'Upper Body');
    data_set($plan, 'workout.weekly_schedule.0.exercises.0.name', 'Upright Row');

    $score = app(PlannerRunQualityScorer::class)->score($user, $plan, 14, [
        'injury_history' => ['Shoulder impingement'],
    ]);

    expect(data_get($score, 'checks.injury_unsafe_exercises_absent'))->toBeFalse()
        ->and(data_get($score, 'safety_findings.injury_conflicts.0.exercise'))->toBe('Upright Row')
        ->and(data_get($score, 'safety_findings.injury_conflicts.0.day_label'))->toBe('Monday')
        ->and((float) $score['quality_percentage'])->toBeLessThan(100.0);
});

it('fails the planner audit when a gluten-free profile gets gluten-containing foods', function () {
    $user = User::factory()->create([
        'diet_name' => 'Gluten-Free',
    ]);

    $plan = plannerQualityPlanFixture();
    data_set($plan, 'diet.meal_options.lunch.0.items.0.name', 'Chicken pasta plate');
    data_set($plan, 'diet.days.0.meals.1.items.0.name', 'Chicken pasta plate');

    $score = app(PlannerRunQualityScorer::class)->score($user, $plan, 14, [
        'diet_type' => 'Gluten-Free',
    ]);

    expect(data_get($score, 'checks.strict_diet_type_respected'))->toBeFalse()
        ->and(data_get($score, 'checks.diet_type_respected'))->toBeFalse()
        ->and(data_get($score, 'safety_findings.diet_type_leaks.0.diet_type'))->toBe('gluten-free')
        ->and((string) data_get($score, 'safety_findings.diet_type_leaks.0.matched_needle'))->toBe('pasta')
        ->and((float) $score['quality_percentage'])->toBeLessThan(100.0);
});

it('fails the planner audit when a home-only profile gets unavailable machine equipment', function () {
    $user = User::factory()->create([
        'workout_location' => 'home',
    ]);

    $plan = plannerQualityPlanFixture();
    data_set($plan, 'workout.weekly_schedule.0.exercises.0.name', 'Lat Pulldown');
    data_set($plan, 'workout.weekly_schedule.0.exercises.0.equipment', 'Cable Machine');

    $score = app(PlannerRunQualityScorer::class)->score($user, $plan, 14, [
        'workout_location' => 'home',
        'available_equipment' => ['bodyweight', 'resistance band'],
    ]);

    expect(data_get($score, 'checks.location_equipment_respected'))->toBeFalse()
        ->and(data_get($score, 'safety_findings.equipment_conflicts.0.exercise'))->toBe('Lat Pulldown')
        ->and(data_get($score, 'safety_findings.equipment_conflicts.0.equipment'))->toBe('Cable Machine')
        ->and((float) $score['quality_percentage'])->toBeLessThan(100.0);
});

it('fails the planner audit when a hypertension profile gets stimulant-heavy diet items', function () {
    $user = User::factory()->create([
        'medical_history' => 'Hypertension',
        'has_medical_history' => true,
    ]);

    $plan = plannerQualityPlanFixture();
    data_set($plan, 'diet.meal_options.snack.0.items.0.name', 'Energy drink recovery snack');
    data_set($plan, 'diet.days.0.meals.3.items.0.name', 'Energy drink recovery snack');

    $score = app(PlannerRunQualityScorer::class)->score($user, $plan, 14, [
        'medical_conditions' => ['Hypertension'],
    ]);

    expect(data_get($score, 'checks.medical_condition_conflicts_absent'))->toBeFalse()
        ->and(data_get($score, 'safety_findings.medical_condition_conflicts.0.medical_condition'))->toBe('hypertension')
        ->and((string) data_get($score, 'safety_findings.medical_condition_conflicts.0.matched_needle'))->toBe('energy drink')
        ->and((float) $score['quality_percentage'])->toBeLessThan(100.0);
});

function plannerQualityPlanFixture(): array
{
    $breakfast = [
        'title' => 'Greek Yogurt Fruit Bowl',
        'target_kcal' => 420,
        'items' => [[
            'name' => 'Greek yogurt fruit bowl',
            'portion' => '1 bowl',
            'calories_kcal' => 420,
            'protein_g' => 24,
            'carbs_g' => 42,
            'fat_g' => 12,
        ]],
    ];
    $lunch = [
        'title' => 'Chicken Rice Plate',
        'target_kcal' => 560,
        'items' => [[
            'name' => 'Chicken rice plate',
            'portion' => '1 plate',
            'calories_kcal' => 560,
            'protein_g' => 40,
            'carbs_g' => 52,
            'fat_g' => 16,
        ]],
    ];
    $dinner = [
        'title' => 'Salmon Veg Plate',
        'target_kcal' => 520,
        'items' => [[
            'name' => 'Salmon veg plate',
            'portion' => '1 plate',
            'calories_kcal' => 520,
            'protein_g' => 36,
            'carbs_g' => 30,
            'fat_g' => 22,
        ]],
    ];
    $snack = [
        'title' => 'Protein Yogurt Cup',
        'target_kcal' => 180,
        'items' => [[
            'name' => 'Protein yogurt cup',
            'portion' => '1 cup',
            'calories_kcal' => 180,
            'protein_g' => 17,
            'carbs_g' => 14,
            'fat_g' => 5,
        ]],
    ];

    $days = collect(range(1, 14))->map(fn (int $dayIndex): array => [
        'day_index' => $dayIndex,
        'meals' => [
            array_merge(['meal_code' => 'breakfast'], $breakfast),
            array_merge(['meal_code' => 'lunch'], $lunch),
            array_merge(['meal_code' => 'dinner'], $dinner),
            array_merge(['meal_code' => 'snack'], $snack),
        ],
    ])->all();

    return [
        'overview' => ['summary' => 'Scorer regression fixture'],
        'safety' => ['hard_rules_observed' => ['Allergy and injury constraints applied']],
        'diet' => [
            'meal_options' => [
                'breakfast' => [$breakfast, $breakfast, $breakfast],
                'lunch' => [$lunch, $lunch, $lunch],
                'dinner' => [$dinner, $dinner, $dinner],
                'snack' => [$snack, $snack, $snack],
            ],
            'days' => $days,
        ],
        'workout' => [
            'weekly_schedule' => [
                ['day_index' => 1, 'day_label' => 'Monday', 'session_type' => 'train', 'focus' => 'Push', 'exercises' => [['name' => 'Bench Press'], ['name' => 'Lateral Raise'], ['name' => 'Tricep Pressdown'], ['name' => 'Chest Fly']]],
                ['day_index' => 2, 'day_label' => 'Tuesday', 'session_type' => 'recovery', 'focus' => 'Recovery', 'exercises' => []],
                ['day_index' => 3, 'day_label' => 'Wednesday', 'session_type' => 'train', 'focus' => 'Pull', 'exercises' => [['name' => 'Lat Pulldown'], ['name' => 'Seated Row'], ['name' => 'Face Pull'], ['name' => 'Bicep Curl']]],
                ['day_index' => 4, 'day_label' => 'Thursday', 'session_type' => 'rest', 'focus' => 'Rest', 'exercises' => []],
                ['day_index' => 5, 'day_label' => 'Friday', 'session_type' => 'train', 'focus' => 'Legs', 'exercises' => [['name' => 'Leg Press'], ['name' => 'Romanian Deadlift'], ['name' => 'Walking Lunge'], ['name' => 'Calf Raise']]],
                ['day_index' => 6, 'day_label' => 'Saturday', 'session_type' => 'recovery', 'focus' => 'Recovery', 'exercises' => []],
                ['day_index' => 7, 'day_label' => 'Sunday', 'session_type' => 'rest', 'focus' => 'Rest', 'exercises' => []],
            ],
        ],
        'adaptive_review' => ['review_after_days' => 14],
        'ml_readiness' => ['notes' => 'Ready'],
        'progress_prediction' => ['horizon_days' => 14],
    ];
}
