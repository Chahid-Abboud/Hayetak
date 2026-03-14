<?php

use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Services\Messaging\WelcomeConversationService;

function approvedProfessional(string $role): User
{
    $user = User::factory()->create([
        'role' => $role,
        'verified' => true,
    ]);

    ProfessionalVerification::query()->create([
        'user_id' => $user->id,
        'role' => $role,
        'full_legal_name' => $user->name,
        'license_number' => fake()->unique()->numerify('LIC-#####'),
        'authority' => 'Health Authority',
        'country_state' => 'Beirut',
        'expiry_date' => now()->addYear()->toDateString(),
        'review_status' => 'approved',
    ]);

    return $user;
}

test('messages index bootstraps the hayetak team conversation for authenticated users', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->getJson('/api/messages/conversations');

    $response->assertOk();

    $peers = collect($response->json('data'))->pluck('peer.name')->filter()->values()->all();

    expect($peers)->toContain('Hayetak Team')
        ->and(
            User::query()->where('email', WelcomeConversationService::SYSTEM_EMAIL)->exists()
        )->toBeTrue();
});

test('clients can start a conversation with an approved professional from nearby', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $trainer = approvedProfessional(User::ROLE_TRAINER);

    $response = $this
        ->actingAs($client)
        ->postJson('/api/messages/conversations', [
            'participant_id' => $trainer->id,
        ]);

    $response->assertCreated()
        ->assertJsonPath('conversation.peer.id', $trainer->id);
});

test('clients can request appointments with approved professionals', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $nutritionist = approvedProfessional(User::ROLE_NUTRITIONIST);

    $response = $this
        ->actingAs($client)
        ->postJson('/api/appointments', [
            'professional_id' => $nutritionist->id,
            'professional_role' => User::ROLE_NUTRITIONIST,
            'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ]);

    $response->assertCreated()
        ->assertJsonPath('appointment.professional.id', $nutritionist->id)
        ->assertJsonPath('appointment.client.id', $client->id);
});
