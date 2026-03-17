<?php

use App\Models\AiConversation;
use App\Models\User;

it('creates an ai conversation and stores both messages', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'fitness_goal' => 'fat loss',
        'diet_name' => 'high protein',
        'allergies' => ['peanuts'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'How should I adjust dinner if my protein is low?',
            'screen_context' => 'coach',
            'include_last_7_days' => true,
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('conversation.title', 'How should I adjust dinner if my protein is low?')
        ->assertJsonPath('user_message.role', 'user')
        ->assertJsonPath('assistant_message.role', 'assistant');

    $conversation = AiConversation::query()->firstOrFail();

    expect($conversation->user_id)->toBe($user->id);
    expect($conversation->messages()->count())->toBe(2);
});

it('prevents users from reading another users ai conversation', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $conversation = AiConversation::query()->create([
        'user_id' => $owner->id,
        'title' => 'Owner chat',
        'last_message_at' => now(),
    ]);

    $this->actingAs($intruder)
        ->getJson("/api/ai/conversations/{$conversation->id}/messages")
        ->assertForbidden();
});
