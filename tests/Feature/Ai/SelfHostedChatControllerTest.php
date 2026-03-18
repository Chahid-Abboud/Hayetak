<?php

use App\Models\AiMessage;
use App\Models\User;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

it('uses personalized vector context for self-hosted chat when a relevant user match is found', function () {
    $user = User::factory()->create([
        'weight_kg' => 82,
        'fitness_goal' => 'muscle gain',
        'activity_level' => 'Very Active',
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    Http::fake([
        'http://ollama.local/api/embed' => Http::response([
            'model' => 'nomic-embed-text',
            'embeddings' => [[0.1, 0.2, 0.3]],
        ], 200),
        'http://qdrant.local/collections/*/points/query' => Http::response([
            'result' => [
                'points' => [[
                    'id' => 'profile-point',
                    'score' => 0.92,
                    'payload' => [
                        'user_id' => $user->id,
                        'doc_key' => 'profile',
                        'doc_type' => 'profile',
                        'text' => 'Current weight kg: 82. Goal: muscle gain. Activity level: Very Active.',
                    ],
                ]],
            ],
        ], 200),
        'http://ollama.local/api/chat' => function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.1.content', '');

            expect($content)->toContain('ACTIVE_PATH: personalized');
            expect($content)->toContain('Current weight kg: 82');
            expect($content)->toContain('Goal: muscle gain');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Using your saved weight of 82 kg and your muscle gain goal, a solid daily protein target is about 150 to 180 g.',
                ],
                'prompt_eval_count' => 120,
                'eval_count' => 40,
            ], 200);
        },
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Recalculate my daily protein intake based on my weight.',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('provider', 'self_hosted')
        ->assertJsonPath('model', 'llama3.1:8b');

    $assistantMessage = AiMessage::query()
        ->where('role', 'assistant')
        ->latest('id')
        ->firstOrFail();

    expect(data_get($assistantMessage->metadata, 'chat.chat_path'))->toBe('personalized');
    expect((float) data_get($assistantMessage->metadata, 'chat.context_score'))->toBe(0.92);

    Http::assertSent(function (HttpRequest $request) use ($user) {
        if (! str_contains($request->url(), '/points/query')) {
            return false;
        }

        return data_get($request->data(), 'filter.must.0.match.value') === $user->id
            && (float) data_get($request->data(), 'score_threshold') === 0.65;
    });
});

it('falls back to general guidance when no user context clears the similarity threshold', function () {
    $user = User::factory()->create();

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    Http::fake([
        'http://ollama.local/api/embed' => Http::response([
            'model' => 'nomic-embed-text',
            'embeddings' => [[0.3, 0.2, 0.1]],
        ], 200),
        'http://qdrant.local/collections/*/points/query' => Http::response([
            'result' => [
                'points' => [],
            ],
        ], 200),
        'http://ollama.local/api/chat' => function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.1.content', '');

            expect($content)->toContain('ACTIVE_PATH: fallback');
            expect($content)->toContain('No stored user context matched this question above the threshold.');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'I do not have enough matching saved data for a personalized calculation, so this is general guidance: many active adults aim for roughly 1.6 to 2.2 g of protein per kg of body weight.',
                ],
                'prompt_eval_count' => 90,
                'eval_count' => 35,
            ], 200);
        },
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'How much protein should I eat each day?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('provider', 'self_hosted');

    $assistantMessage = AiMessage::query()
        ->where('role', 'assistant')
        ->latest('id')
        ->firstOrFail();

    expect(data_get($assistantMessage->metadata, 'chat.chat_path'))->toBe('fallback');
    expect(data_get($assistantMessage->metadata, 'chat.context_score'))->toBeNull();
});
