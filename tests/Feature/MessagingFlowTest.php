<?php

use App\Models\Ai\AiPlan;
use App\Models\Appointment;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\ProfessionalClientAssignment;
use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Services\Messaging\WelcomeConversationService;
use Illuminate\Support\Str;

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

test('conversation context endpoint returns coaching context for authorized participants', function () {
    $client = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'allergies' => ['peanuts'],
        'has_medical_history' => true,
        'medical_history' => 'Knee irritation',
        'diet_name' => 'Mediterranean',
    ]);
    $trainer = approvedProfessional(User::ROLE_TRAINER);

    ProfessionalClientAssignment::query()->create([
        'professional_id' => $trainer->id,
        'client_id' => $client->id,
        'professional_role' => User::ROLE_TRAINER,
        'assigned_by' => $trainer->id,
        'notes' => 'Needs lower-body alternatives',
    ]);

    $food = Food::query()->create([
        'name' => 'Chicken bowl',
        'serving_size' => 1,
        'serving_unit' => 'plate',
        'calories' => 450,
    ]);

    MealEntry::query()->create([
        'user_id' => $client->id,
        'food_id' => $food->id,
        'meal_type' => 'lunch',
        'servings' => 1,
        'eaten_at' => now()->toDateString(),
    ]);

    WorkoutLog::query()->create([
        'user_id' => $client->id,
        'performed_at' => now(),
        'duration_min' => 35,
        'notes' => 'From plan',
    ]);

    AiPlan::query()->create([
        'user_id' => $client->id,
        'type' => 'combined',
        'plan_json' => ['week' => 1],
        'version' => 1,
        'created_by' => $trainer->id,
        'generation_id' => (string) Str::uuid(),
    ]);

    Appointment::query()->create([
        'client_id' => $client->id,
        'professional_id' => $trainer->id,
        'professional_role' => User::ROLE_TRAINER,
        'scheduled_at' => now()->addDay(),
        'status' => 'requested',
        'created_by' => $client->id,
    ]);

    $conversationResponse = $this
        ->actingAs($client)
        ->postJson('/api/messages/conversations', [
            'participant_id' => $trainer->id,
        ])
        ->assertCreated();

    $conversationId = data_get(
        $conversationResponse->json(),
        'conversation.id',
    );

    $this->actingAs($trainer)
        ->getJson("/api/messages/conversations/{$conversationId}/context")
        ->assertOk()
        ->assertJsonPath('data.peer.id', $client->id)
        ->assertJsonPath('data.safety.allergies.0', 'peanuts')
        ->assertJsonPath('data.relationship.assigned', true)
        ->assertJsonPath('data.activity.today.meals_logged', 1)
        ->assertJsonPath('data.appointments.upcoming_count', 1);
});

test('conversation context endpoint is forbidden for non participants', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);
    $trainer = approvedProfessional(User::ROLE_TRAINER);
    $intruder = User::factory()->create(['role' => User::ROLE_CLIENT]);

    $conversationResponse = $this
        ->actingAs($client)
        ->postJson('/api/messages/conversations', [
            'participant_id' => $trainer->id,
        ])
        ->assertCreated();

    $conversationId = data_get(
        $conversationResponse->json(),
        'conversation.id',
    );

    $this->actingAs($intruder)
        ->getJson("/api/messages/conversations/{$conversationId}/context")
        ->assertForbidden();
});
