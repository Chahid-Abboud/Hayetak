<?php

use App\Models\Conversation;
use App\Models\MessageModeration;
use App\Models\User;

test('admin can list open message moderation items', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'verified' => true,
    ]);
    $sender = User::factory()->create();
    $recipient = User::factory()->create();
    $conversation = Conversation::query()->create(['created_by' => $sender->id]);
    $conversation->participants()->attach([$sender->id, $recipient->id]);

    MessageModeration::query()->create([
        'conversation_id' => $conversation->id,
        'sender_id' => $sender->id,
        'decision' => 'escalate',
        'severity' => 'medium',
        'categories' => ['medical_emergency'],
        'matched_terms' => ['medical_emergency' => ['chest pain']],
        'original_body' => 'I had chest pain during training.',
        'reason' => 'Sensitive safety issue.',
        'provider' => 'local_rules',
        'escalated_at' => now(),
    ]);

    $this->actingAs($admin)
        ->getJson('/api/admin/message-moderations?state=open')
        ->assertOk()
        ->assertJsonPath('stats.total', 1)
        ->assertJsonPath('items.0.decision', 'escalate');
});

test('admin can resolve a message moderation item', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'verified' => true,
    ]);
    $sender = User::factory()->create();
    $recipient = User::factory()->create();
    $conversation = Conversation::query()->create(['created_by' => $sender->id]);
    $conversation->participants()->attach([$sender->id, $recipient->id]);

    $moderation = MessageModeration::query()->create([
        'conversation_id' => $conversation->id,
        'sender_id' => $sender->id,
        'decision' => 'allow_flagged',
        'severity' => 'low',
        'categories' => ['health_sensitive'],
        'matched_terms' => ['health_sensitive' => ['diabetes']],
        'original_body' => 'I have diabetes and want to discuss my plan.',
        'reason' => 'Delivered with moderation visibility.',
        'provider' => 'local_rules',
    ]);

    $this->actingAs($admin)
        ->patchJson("/api/admin/message-moderations/{$moderation->id}/resolve", [
            'resolution' => 'resolved_safe',
            'notes' => 'Legitimate clinical follow-up.',
        ])
        ->assertOk()
        ->assertJsonPath('item.resolution', 'resolved_safe')
        ->assertJsonPath('item.resolution_notes', 'Legitimate clinical follow-up.');

    expect($moderation->fresh()->resolved_at)->not->toBeNull()
        ->and(data_get($moderation->fresh()->matched_terms, '_resolution_notes'))->toBe('Legitimate clinical follow-up.');
});
