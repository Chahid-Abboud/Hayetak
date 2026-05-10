<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageModeration;
use App\Models\AiPlan;
use App\Models\Appointment;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\ProfessionalClientAssignment;
use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function createApprovedProfessional(string $role): User
{
    $user = User::factory()->create([
        'role' => $role,
        'verified' => true,
    ]);

    ProfessionalVerification::factory()->create([
        'user_id' => $user->id,
        'role' => $role,
        'review_status' => 'approved',
    ]);

    return $user;
}

function createConversationWithMessages(User $first, User $second, array $messages = []): Conversation
{
    $conversation = Conversation::query()->create([
        'created_by' => $first->id,
    ]);

    $conversation->participants()->attach([$first->id, $second->id]);

    foreach ($messages as $message) {
        Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $message['sender_id'],
            'body' => $message['body'],
            'read_at' => $message['read_at'] ?? null,
            'created_at' => $message['created_at'] ?? now(),
            'updated_at' => $message['created_at'] ?? now(),
        ]);
    }

    $conversation->touch();

    return $conversation;
}

test('messages page can be rendered for authenticated users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('messages.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('messages/index'));
});

test('conversations endpoint returns threads ordered by most recently updated', function () {
    $user = User::factory()->create();
    $firstProfessional = createApprovedProfessional(User::ROLE_TRAINER);
    $secondProfessional = createApprovedProfessional(User::ROLE_NUTRITIONIST);

    $older = createConversationWithMessages($user, $firstProfessional, [
        ['sender_id' => $firstProfessional->id, 'body' => 'Older thread'],
    ]);

    Carbon::setTestNow(now()->addMinute());

    $newer = createConversationWithMessages($user, $secondProfessional, [
        ['sender_id' => $secondProfessional->id, 'body' => 'Newer thread'],
    ]);

    Carbon::setTestNow();

    $response = $this->actingAs($user)->getJson('/api/messages/conversations');

    $response->assertOk()
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id);
});

test('messages endpoint returns history and marks unread messages as read', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_NUTRITIONIST);

    $conversation = createConversationWithMessages($client, $professional, [
        ['sender_id' => $professional->id, 'body' => 'Welcome back'],
        ['sender_id' => $professional->id, 'body' => 'Please send your update'],
    ]);

    $response = $this
        ->actingAs($client)
        ->getJson("/api/messages/conversations/{$conversation->id}/messages");

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.body', 'Welcome back')
        ->assertJsonPath('data.1.body', 'Please send your update');

    expect(
        Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->count()
    )->toBe(0);

    expect(
        $conversation->participants()
            ->where('users.id', $client->id)
            ->first()?->pivot?->last_read_at
    )->not->toBeNull();
});

test('sending a message returns the created message and updates the conversation timestamp', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_TRAINER);

    Carbon::setTestNow('2026-03-14 10:00:00');
    $conversation = createConversationWithMessages($client, $professional);
    $originalUpdatedAt = $conversation->updated_at;
    Carbon::setTestNow('2026-03-14 10:01:00');

    $response = $this
        ->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", [
            'body' => 'Here is my latest update.',
        ]);

    $response->assertCreated()
        ->assertJsonPath('message.body', 'Here is my latest update.')
        ->assertJsonPath('message.sender_id', $client->id)
        ->assertJsonPath('moderation.decision', 'allow');

    expect($conversation->fresh()->updated_at->greaterThan($originalUpdatedAt))->toBeTrue();
    expect(MessageModeration::query()->count())->toBe(1);

    Carbon::setTestNow();
});

test('blocked messages are rejected and logged in moderation records', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_TRAINER);

    $conversation = createConversationWithMessages($client, $professional);

    $response = $this
        ->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", [
            'body' => 'I will kill you if you ignore me.',
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('ok', false)
        ->assertJsonPath('moderation.decision', 'hard_block');

    expect(Message::query()->where('conversation_id', $conversation->id)->count())->toBe(0)
        ->and(MessageModeration::query()->count())->toBe(1)
        ->and(MessageModeration::query()->first()?->decision)->toBe('hard_block');
});

test('sensitive health messages can be delivered while still being flagged', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_NUTRITIONIST);

    $conversation = createConversationWithMessages($client, $professional);

    $response = $this
        ->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", [
            'body' => 'I have diabetes and high cortisol, and I want to discuss my appointment plan.',
        ]);

    $response->assertCreated()
        ->assertJsonPath('moderation.decision', 'allow_flagged');

    expect(MessageModeration::query()->first()?->decision)->toBe('allow_flagged');
});

test('medical emergency style messages are delivered and escalated', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_TRAINER);

    $conversation = createConversationWithMessages($client, $professional);

    $response = $this
        ->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", [
            'body' => 'I had chest pain during training and need to update my session.',
        ]);

    $response->assertCreated()
        ->assertJsonPath('moderation.decision', 'escalate');

    expect(MessageModeration::query()->first()?->decision)->toBe('escalate')
        ->and(MessageModeration::query()->first()?->escalated_at)->not->toBeNull();
});

test('repeated identical messages escalate and then hard block', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_TRAINER);
    $conversation = createConversationWithMessages($client, $professional);

    $payload = ['body' => 'Please answer me now.'];

    $this->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", $payload)
        ->assertCreated()
        ->assertJsonPath('moderation.decision', 'allow');

    $this->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", $payload)
        ->assertCreated()
        ->assertJsonPath('moderation.decision', 'allow');

    $this->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", $payload)
        ->assertCreated()
        ->assertJsonPath('moderation.decision', 'escalate');

    $this->actingAs($client)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", $payload)
        ->assertStatus(422)
        ->assertJsonPath('moderation.decision', 'hard_block');
});

test('starting a conversation with the same participant reuses the existing thread', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_NUTRITIONIST);

    $existing = createConversationWithMessages($client, $professional, [
        ['sender_id' => $professional->id, 'body' => 'Existing conversation'],
    ]);

    $response = $this
        ->actingAs($client)
        ->postJson('/api/messages/conversations', [
            'participant_id' => $professional->id,
        ]);

    $response->assertOk()
        ->assertJsonPath('conversation.id', $existing->id);

    expect(Conversation::query()->count())->toBe(1);
});

test('conversation context gives professionals a safe client snapshot', function () {
    $professional = createApprovedProfessional(User::ROLE_NUTRITIONIST);
    $client = User::factory()->create([
        'diet_name' => 'Balanced',
        'dietary_goal' => 'Fat loss',
        'fitness_goal' => 'Walk 4 days per week',
        'allergies' => ['Peanuts'],
        'has_medical_history' => true,
        'medical_history' => 'Private details should stay hidden.',
        'workout_location' => 'home',
    ]);

    ProfessionalClientAssignment::query()->create([
        'professional_id' => $professional->id,
        'client_id' => $client->id,
        'professional_role' => 'nutritionist',
        'assigned_by' => $professional->id,
    ]);

    Appointment::query()->create([
        'client_id' => $client->id,
        'professional_id' => $professional->id,
        'professional_role' => 'nutritionist',
        'scheduled_at' => now()->addDay(),
        'status' => 'accepted',
        'created_by' => $client->id,
    ]);

    $food = Food::query()->create([
        'name' => 'Greek Yogurt',
        'serving_size' => 1,
        'serving_unit' => 'cup',
        'calories' => 120,
        'protein_g' => 17,
        'carbs_g' => 6,
        'fat_g' => 4,
    ]);

    MealEntry::query()->create([
        'user_id' => $client->id,
        'food_id' => $food->id,
        'meal_type' => 'breakfast',
        'servings' => 1,
        'eaten_at' => now(),
    ]);

    AiPlan::query()->create([
        'user_id' => $client->id,
        'type' => 'diet',
        'plan_json' => ['daily_targets' => ['calories_kcal' => 1800]],
        'version' => 2,
        'created_by' => $client->id,
        'generation_id' => 'context-test-plan',
    ]);

    $conversation = createConversationWithMessages($professional, $client, [
        ['sender_id' => $client->id, 'body' => 'Can we review my meals?'],
    ]);

    $response = $this
        ->actingAs($professional)
        ->getJson("/api/messages/conversations/{$conversation->id}/context");

    $response->assertOk()
        ->assertJsonPath('data.context_mode', 'client_summary')
        ->assertJsonPath('data.client_snapshot.diet_name', 'Balanced')
        ->assertJsonPath('data.client_snapshot.has_medical_history', true)
        ->assertJsonPath('data.activity.today.meals_logged', 1)
        ->assertJsonPath('data.plan.version', 2)
        ->assertJsonMissingPath('data.peer.email')
        ->assertJsonMissingPath('data.safety.medical_history');
});

test('conversation context gives clients a professional summary', function () {
    $client = User::factory()->create();
    $professional = createApprovedProfessional(User::ROLE_TRAINER);
    $professional->forceFill([
        'specialties' => ['Strength', 'Mobility'],
        'availability_text' => 'Weekdays after 5pm',
        'city' => 'Beirut',
    ])->save();

    $conversation = createConversationWithMessages($client, $professional, [
        ['sender_id' => $professional->id, 'body' => 'Let us review your plan.'],
    ]);

    $response = $this
        ->actingAs($client)
        ->getJson("/api/messages/conversations/{$conversation->id}/context");

    $response->assertOk()
        ->assertJsonPath('data.context_mode', 'professional_summary')
        ->assertJsonPath('data.professional_snapshot.role_label', 'Personal Trainer')
        ->assertJsonPath('data.professional_snapshot.city', 'Beirut')
        ->assertJsonPath('data.professional_snapshot.availability_text', 'Weekdays after 5pm')
        ->assertJsonPath('data.professional_snapshot.specialties.0', 'Strength')
        ->assertJsonMissingPath('data.peer.email');
});

test('users cannot read or send messages in conversations they do not belong to', function () {
    $owner = User::factory()->create();
    $other = createApprovedProfessional(User::ROLE_TRAINER);
    $intruder = User::factory()->create();

    $conversation = createConversationWithMessages($owner, $other, [
        ['sender_id' => $other->id, 'body' => 'Private message'],
    ]);

    $this->actingAs($intruder)
        ->getJson("/api/messages/conversations/{$conversation->id}/messages")
        ->assertForbidden();

    $this->actingAs($intruder)
        ->postJson("/api/messages/conversations/{$conversation->id}/messages", [
            'body' => 'I should not be here.',
        ])
        ->assertForbidden();
});
