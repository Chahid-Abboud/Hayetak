<?php

use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use App\Services\Ai\Chat\UserProfileFactResolver;

it('resolves diet, allergy, medical, and injury facts from normalized profile tables', function () {
    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['peanut'],
        'medical_history' => 'asthma',
    ]);

    UserPref::query()->create([
        'user_id' => $user->id,
        'settings' => [
            'injury_history' => ['ankle sprain'],
            'available_equipment' => ['dumbbell'],
        ],
    ]);

    UserDietaryRestriction::query()->create([
        'user_id' => $user->id,
        'kind' => 'diet_type',
        'value' => 'Vegan',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);
    UserDietaryRestriction::query()->create([
        'user_id' => $user->id,
        'kind' => 'allergy',
        'value' => 'Sesame',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);
    UserMedicalHistory::query()->create([
        'user_id' => $user->id,
        'kind' => 'medical_condition',
        'value' => 'hypertension',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);
    UserMedicalHistory::query()->create([
        'user_id' => $user->id,
        'kind' => 'injury',
        'value' => 'shoulder impingement',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);

    $resolved = app(UserProfileFactResolver::class)->resolve($user->fresh());

    expect($resolved['diet_type'])->toBe('Vegan');
    expect($resolved['allergies'])->toContain('peanut', 'Sesame');
    expect($resolved['medical_conditions'])->toContain('asthma', 'hypertension');
    expect($resolved['injuries'])->toContain('ankle sprain', 'shoulder impingement');
    expect($resolved['available_equipment'])->toContain('dumbbell');
});
<<<<<<< HEAD

it('splits legacy combined medical and injury summaries without duplicating mixed strings', function () {
    $user = User::factory()->create([
        'medical_history' => 'Medical: Prediabetes. Injuries: Shoulder Impingement History',
    ]);

    UserMedicalHistory::query()->create([
        'user_id' => $user->id,
        'kind' => 'medical_condition',
        'value' => 'Diabetes',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);
    UserMedicalHistory::query()->create([
        'user_id' => $user->id,
        'kind' => 'injury',
        'value' => 'Medical: Prediabetes. Injuries: Shoulder Impingement History',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);
    UserMedicalHistory::query()->create([
        'user_id' => $user->id,
        'kind' => 'injury',
        'value' => 'Shoulder Impingement',
        'source' => 'profile_sync',
        'is_active' => true,
    ]);

    $resolved = app(UserProfileFactResolver::class)->resolve($user->fresh());

    expect($resolved['medical_conditions'])->toContain('Diabetes', 'Prediabetes')
        ->not->toContain('Medical: Prediabetes. Injuries: Shoulder Impingement History');
    expect($resolved['injuries'])->toContain('Shoulder Impingement History', 'Shoulder Impingement')
        ->not->toContain('Medical: Prediabetes. Injuries: Shoulder Impingement History');
});
=======
>>>>>>> origin/main
