<?php

use App\Models\Appointment;
use App\Models\User;

function seedAppointment(
    User $client,
    User $professional,
    string $status,
    string $dateModifier,
): Appointment {
    return Appointment::query()->create([
        'client_id' => $client->id,
        'professional_id' => $professional->id,
        'professional_role' => $professional->role,
        'scheduled_at' => now()->modify($dateModifier),
        'status' => $status,
        'created_by' => $client->id,
    ]);
}

test('appointments index supports segmented status filtering with summary counts', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $trainer = User::factory()->create(['role' => User::ROLE_TRAINER]);

    seedAppointment($client, $trainer, 'requested', '+1 day');
    seedAppointment($client, $trainer, 'accepted', '+2 days');
    seedAppointment($client, $trainer, 'completed', '-2 days');
    seedAppointment($client, $trainer, 'declined', '-1 day');
    seedAppointment($client, $trainer, 'cancelled', '+4 days');

    $this->actingAs($client)
        ->getJson('/api/appointments?status=requested')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'requested')
        ->assertJsonPath('summary.by_status.requested', 1)
        ->assertJsonPath('summary.by_status.accepted', 1)
        ->assertJsonPath('summary.by_status.completed', 1)
        ->assertJsonPath('filters.status.0', 'requested');
});

test('appointments index honors role visibility and multiple status filters', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $otherClient = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $nutritionist = User::factory()->create(['role' => User::ROLE_NUTRITIONIST]);

    seedAppointment($client, $nutritionist, 'requested', '+1 day');
    seedAppointment($client, $nutritionist, 'accepted', '+2 days');
    seedAppointment($otherClient, $nutritionist, 'requested', '+1 day');

    $this->actingAs($client)
        ->getJson('/api/appointments?statuses_csv=requested,accepted')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('summary.by_status.requested', 1)
        ->assertJsonPath('summary.by_status.accepted', 1);
});
