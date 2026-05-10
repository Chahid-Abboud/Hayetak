<?php

use App\Models\User;
use Database\Seeders\AiPlannerAdversarialSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds the adversarial planner cohort with synced constraints', function () {
    $this->seed(AiPlannerAdversarialSeeder::class);

    $users = User::query()
        ->where('email', 'like', '%+attack%@hayetak.local')
        ->orderBy('email')
        ->get();

    expect($users)->toHaveCount(10);

    $glutenFree = $users->firstWhere('email', 'rana.moukalled+attack1@hayetak.local');
    expect($glutenFree)->not->toBeNull()
        ->and($glutenFree->diet_name)->toBe('Gluten-Free')
        ->and($glutenFree->prefs?->settings['available_equipment'] ?? [])->toContain('resistance band')
        ->and($glutenFree->medicalHistories()->where('value', 'like', '%Celiac disease%')->exists())->toBeTrue();

    $homeOnlyCombo = $users->firstWhere('email', 'noor.chehab+attack10@hayetak.local');
    expect($homeOnlyCombo)->not->toBeNull()
        ->and($homeOnlyCombo->workout_location)->toBe('home')
        ->and($homeOnlyCombo->prefs?->settings['available_equipment'] ?? [])->toBe(['bodyweight'])
        ->and($homeOnlyCombo->dietaryRestrictions()->where('value', 'Peanut')->exists())->toBeTrue()
        ->and($homeOnlyCombo->medicalHistories()->where('value', 'Wrist pain')->exists())->toBeTrue();
});
