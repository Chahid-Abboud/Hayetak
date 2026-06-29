<?php

use App\Models\Measurement;
use App\Models\User;

it('lets a user view only their own measurements', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-20',
        'weight_kg' => 92.5,
    ]);
    Measurement::query()->create([
        'user_id' => $other->id,
        'measured_at' => '2026-05-20',
        'weight_kg' => 70.0,
    ]);

    $response = $this->actingAs($user)->getJson('/api/measurements');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.weight_kg', 92.5)
        ->assertJsonPath('summary.total_measurements', 1);
});

it('lets a user save a measurement and updates profile weight or height', function () {
    $user = User::factory()->create([
        'weight_kg' => 100,
        'height_cm' => 180,
    ]);

    $this->actingAs($user)
        ->postJson('/api/measurements', [
            'measured_at' => '2026-05-21',
            'type' => 'weight',
            'value' => 96.4,
        ])
        ->assertCreated()
        ->assertJsonPath('measurement.weight_kg', 96.4);

    expect(Measurement::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and((float) $user->fresh()->weight_kg)->toBe(96.4);
});

it('lets a user delete their own measurement', function () {
    $user = User::factory()->create();
    $measurement = Measurement::query()->create([
        'user_id' => $user->id,
        'measured_at' => '2026-05-21',
        'weight_kg' => 96.4,
    ]);

    $this->actingAs($user)
        ->deleteJson("/api/measurements/{$measurement->id}")
        ->assertOk()
        ->assertJsonPath('ok', true);

    expect(Measurement::query()->whereKey($measurement->id)->exists())->toBeFalse();
});

it('blocks users from deleting another users measurement', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $measurement = Measurement::query()->create([
        'user_id' => $owner->id,
        'measured_at' => '2026-05-21',
        'weight_kg' => 96.4,
    ]);

    $this->actingAs($intruder)
        ->deleteJson("/api/measurements/{$measurement->id}")
        ->assertForbidden();

    expect(Measurement::query()->whereKey($measurement->id)->exists())->toBeTrue();
});
