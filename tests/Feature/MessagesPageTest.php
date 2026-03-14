<?php

use App\Models\Conversation;
use App\Models\Message;
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
        ->assertJsonPath('message.sender_id', $client->id);

    expect($conversation->fresh()->updated_at->greaterThan($originalUpdatedAt))->toBeTrue();

    Carbon::setTestNow();
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
