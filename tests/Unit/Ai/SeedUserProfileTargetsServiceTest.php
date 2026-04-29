<?php

use App\Models\User;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;

it('builds gain-phase targets with realistic maintenance margins and workout settings', function () {
    $user = new User([
        'role' => User::ROLE_CLIENT,
        'gender' => 'male',
        'age' => 27,
        'height_cm' => 181,
        'weight_kg' => 78.0,
        'dietary_goal' => 'Calorie Surplus',
        'fitness_goal' => 'Build Muscle',
        'activity_level' => 'Very Active',
        'workout_days_per_week' => 5,
        'workout_location' => 'both',
    ]);
    $user->id = 101;

    $targets = (new SeedUserProfileTargetsService)->build($user, [
        ['kind' => 'injury', 'label' => 'Wrist Strain'],
    ]);

    expect($targets['goal_bucket'])->toBe('gain')
        ->and($targets['daily_goal_calories'])->toBeGreaterThan($targets['tdee_kcal'])
        ->and($targets['daily_goal_calories'] - $targets['tdee_kcal'])->toBeLessThanOrEqual(500)
        ->and($targets['daily_goal_protein_g'])->toBeGreaterThan(130)
        ->and($targets['available_equipment'])->toContain('Dumbbells')
        ->and($targets['preferred_workout_days'])->toHaveCount(5);
});

it('builds loss-phase targets without pushing calories beyond sane maintenance bounds', function () {
    $user = new User([
        'role' => User::ROLE_CLIENT,
        'gender' => 'female',
        'age' => 46,
        'height_cm' => 164,
        'weight_kg' => 82.0,
        'dietary_goal' => 'Calorie Deficit',
        'fitness_goal' => 'Lose Weight',
        'activity_level' => 'Lightly Active',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);
    $user->id = 102;

    $targets = (new SeedUserProfileTargetsService)->build($user, [
        ['kind' => 'medical_condition', 'label' => 'Hypertension'],
    ]);

    expect($targets['goal_bucket'])->toBe('loss')
        ->and($targets['tdee_kcal'] - $targets['daily_goal_calories'])->toBeLessThanOrEqual(500)
        ->and($targets['daily_goal_calories'])->toBeGreaterThanOrEqual(1250)
        ->and($targets['water_cups_per_day'])->toBeGreaterThanOrEqual(7)
        ->and($targets['daily_intake_floor_kcal'])->toBeLessThan($targets['tdee_kcal']);
});

it('polishes edge-case heavy gain personas into more realistic seeded goals', function () {
    $user = new User([
        'role' => User::ROLE_CLIENT,
        'gender' => 'male',
        'age' => 21,
        'height_cm' => 190,
        'weight_kg' => 136.0,
        'dietary_goal' => 'Calorie Surplus',
        'fitness_goal' => 'Build Muscle',
        'activity_level' => 'Very Active',
        'workout_days_per_week' => 6,
        'workout_location' => 'gym',
    ]);
    $user->id = 103;

    $adjustments = (new SeedUserProfileTargetsService)->personaAdjustments($user);

    expect($adjustments)->toMatchArray([
        'dietary_goal' => 'Calorie Deficit',
        'fitness_goal' => 'Lose Weight',
        'activity_level' => 'Moderately Active',
        'workout_days_per_week' => 4,
    ]);
});
