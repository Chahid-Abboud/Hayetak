<?php

use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutPlan;
use App\Services\Ai\Seed\SeededPlanCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('removes legacy plan durations once seeded verification horizons exist', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'cleanup-target@example.com',
    ]);

    $legacyNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Legacy nutrition',
        'duration_days' => 252,
        'is_active' => false,
    ]);
    $keptNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Verification nutrition',
        'duration_days' => 28,
        'is_active' => true,
    ]);

    $legacyWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Legacy workout',
        'duration_days' => 7,
        'is_active' => false,
    ]);
    $keptWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Verification workout',
        'duration_days' => 21,
        'is_active' => true,
    ]);

    $result = app(SeededPlanCleanupService::class)->cleanupForUser($user);

    expect($result)->toMatchArray([
        'nutrition_deleted' => 1,
        'workout_deleted' => 1,
    ]);

    expect(NutritionPlan::query()->whereKey($legacyNutrition->id)->exists())->toBeFalse()
        ->and(NutritionPlan::query()->whereKey($keptNutrition->id)->exists())->toBeTrue()
        ->and(WorkoutPlan::query()->whereKey($legacyWorkout->id)->exists())->toBeFalse()
        ->and(WorkoutPlan::query()->whereKey($keptWorkout->id)->exists())->toBeTrue();
});

it('leaves legacy plans alone when no verification horizons exist yet', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'cleanup-wait@example.com',
    ]);

    $legacyNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Legacy nutrition only',
        'duration_days' => 252,
        'is_active' => true,
    ]);
    $legacyWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Legacy workout only',
        'duration_days' => 7,
        'is_active' => true,
    ]);

    $result = app(SeededPlanCleanupService::class)->cleanupForUser($user);

    expect($result)->toMatchArray([
        'nutrition_deleted' => 0,
        'workout_deleted' => 0,
    ]);

    expect(NutritionPlan::query()->whereKey($legacyNutrition->id)->exists())->toBeTrue()
        ->and(WorkoutPlan::query()->whereKey($legacyWorkout->id)->exists())->toBeTrue();
});

it('retains only the latest allowed duration plan per user after repeated generations', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'cleanup-dedup@example.com',
    ]);

    $olderNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Nutrition 21 old',
        'duration_days' => 21,
        'is_active' => false,
        'created_at' => now()->subDays(2),
        'updated_at' => now()->subDays(2),
    ]);
    $latestNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Nutrition 21 latest',
        'duration_days' => 21,
        'is_active' => false,
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);
    $keptOtherNutrition = NutritionPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Nutrition 28 latest',
        'duration_days' => 28,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $olderWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Workout 14 old',
        'duration_days' => 14,
        'is_active' => false,
        'created_at' => now()->subDays(3),
        'updated_at' => now()->subDays(3),
    ]);
    $latestWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Workout 14 latest',
        'duration_days' => 14,
        'is_active' => false,
        'created_at' => now()->subHours(8),
        'updated_at' => now()->subHours(8),
    ]);
    $keptOtherWorkout = WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'name' => 'Workout 28 latest',
        'duration_days' => 28,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $result = app(SeededPlanCleanupService::class)->cleanupForUser($user);

    expect($result)->toMatchArray([
        'nutrition_deleted' => 1,
        'workout_deleted' => 1,
    ]);

    expect(NutritionPlan::query()->whereKey($olderNutrition->id)->exists())->toBeFalse()
        ->and(NutritionPlan::query()->whereKey($latestNutrition->id)->exists())->toBeTrue()
        ->and(NutritionPlan::query()->whereKey($keptOtherNutrition->id)->exists())->toBeTrue()
        ->and(WorkoutPlan::query()->whereKey($olderWorkout->id)->exists())->toBeFalse()
        ->and(WorkoutPlan::query()->whereKey($latestWorkout->id)->exists())->toBeTrue()
        ->and(WorkoutPlan::query()->whereKey($keptOtherWorkout->id)->exists())->toBeTrue();
});
