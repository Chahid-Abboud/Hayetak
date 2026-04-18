<?php

use App\Models\AiMessage;
use App\Models\User;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

function fakeSelfHostedTransports(?callable $chatHandler = null, array $queryPoints = []): void
{
    Http::fake([
        'http://ollama.local/*' => function (HttpRequest $request) use ($chatHandler) {
            $url = $request->url();

            if (str_contains($url, '/api/embed') || str_contains($url, '/api/embeddings')) {
                return Http::response([
                    'model' => 'nomic-embed-text',
                    'embeddings' => [[0.1, 0.2, 0.3]],
                ], 200);
            }

            if (str_contains($url, '/api/chat')) {
                if ($chatHandler !== null) {
                    return $chatHandler($request);
                }

                return Http::response([
                    'model' => 'llama3.1:8b',
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Stubbed self-hosted chat reply.',
                    ],
                    'prompt_eval_count' => 90,
                    'eval_count' => 35,
                ], 200);
            }

            return Http::response([], 200);
        },
        'http://qdrant.local/*' => function (HttpRequest $request) use ($queryPoints) {
            $url = $request->url();

            if (str_contains($url, '/points/query') || str_contains($url, '/points/search')) {
                return Http::response([
                    'result' => [
                        'points' => $queryPoints,
                    ],
                ], 200);
            }

            return Http::response([
                'result' => ['status' => 'ok'],
            ], 200);
        },
    ]);
}

it('uses personalized vector context for self-hosted chat when a relevant user match is found', function () {
    $user = User::factory()->create([
        'weight_kg' => 82,
        'fitness_goal' => 'muscle gain',
        'activity_level' => 'Very Active',
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.chat.self_hosted.sync_during_tests', true);
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `personalized`');
            expect($content)->toContain('Current weight kg: 82');
            expect($content)->toContain('Goal: muscle gain');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Because your saved profile shows 82 kg with a muscle gain goal and a very active routine, a strong breakfast would be Greek yogurt, oats, berries, and eggs for a high-protein start.',
                ],
                'prompt_eval_count' => 120,
                'eval_count' => 40,
            ], 200);
        },
        [[
            'id' => 'profile-point',
            'score' => 0.92,
            'payload' => [
                'user_id' => $user->id,
                'doc_key' => 'profile',
                'doc_type' => 'profile',
                'text' => 'Current weight kg: 82. Goal: muscle gain. Activity level: Very Active.',
            ],
        ]],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Suggest a breakfast that fits my current weight and muscle gain goal.',
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

it('reindexes updated weight data and uses the saved weight for protein recalculation', function () {
    $user = User::factory()->create([
        'weight_kg' => 82,
        'fitness_goal' => 'muscle gain',
        'activity_level' => 'Very Active',
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.chat.self_hosted.sync_during_tests', true);
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports();

    $this
        ->actingAs($user)
        ->post('/settings/profile/measurements', [
            'date' => now()->toDateString(),
            'type' => 'weight',
            'value' => 90,
        ])
        ->assertRedirect();

    Http::assertSent(fn (HttpRequest $request) => str_contains($request->url(), '/points?wait=true'));

    $response = $this
        ->actingAs($user->fresh())
        ->postJson('/api/ai/chat', [
            'message' => 'Recalculate my daily protein intake in grams using my saved weight.',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'protein_target_calculator')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('saved weight of 90 kg')
        ->toContain('144-198 g')
        ->toContain('171 g of protein');

    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
});

it('treats greek yogurt snack requests as meal guidance instead of a protein-target calculation', function () {
    $user = User::factory()->create([
        'weight_kg' => 61,
        'diet_name' => 'Mediterranean',
        'fitness_goal' => 'Improve Endurance',
        'allergies' => ['Corn', 'Sesame'],
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `personalized`');
            expect($content)->toContain('Diet type: Mediterranean');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'A good high-protein snack is a Greek yogurt berry parfait with chia seeds. Per serving: 255 kcal, 24 g protein, 27 g carbs, 6 g fat.',
                ],
                'prompt_eval_count' => 120,
                'eval_count' => 40,
            ], 200);
        },
        [[
            'id' => 'profile-point',
            'score' => 0.91,
            'payload' => [
                'user_id' => $user->id,
                'doc_key' => 'profile',
                'doc_type' => 'profile',
                'text' => 'Current weight kg: 61. Goal: Improve Endurance. Diet type: Mediterranean. Allergies: Corn; Sesame.',
            ],
        ]],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'suggest a high-protein snack with Greek yogurt',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('feature', 'nutrition')
        ->assertJsonPath('assistant_message.metadata.chat.reason', null)
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Greek yogurt berry parfait')
        ->not->toContain('daily protein target');

    Http::assertSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
});

it('answers protein-gap questions from todays meals and saved profile without calling the self-hosted model', function () {
    $user = User::factory()->create([
        'weight_kg' => 61,
        'fitness_goal' => 'Improve Endurance',
        'activity_level' => 'Moderately Active',
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports();

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Based on my meals today, am I low on protein?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('feature', 'nutrition')
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'protein_gap_check')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('logged 0 g of protein so far')
        ->toContain('estimated daily protein range is 73-110 g')
        ->toContain('about 92 g as a practical target')
        ->toContain('still low on protein today by about 92 g');

    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
});

it('falls back to general guidance when no user context clears the similarity threshold', function () {
    $user = User::factory()->create();

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `general`');
            expect($content)->toContain('No vector-retrieved personal context matched this question above the threshold.');

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
        [],
    );

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

    expect(data_get($assistantMessage->metadata, 'chat.chat_path'))->toBe('general');
    expect(data_get($assistantMessage->metadata, 'chat.context_score'))->toBeNull();
});

it('refuses out-of-scope questions without calling the self-hosted model', function () {
    $user = User::factory()->create();

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports();

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Explain nihilism.',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'domain_guard');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('I can help with workouts, meals, macros, recovery, plans, progress');

    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/points/query'));
});

it('answers direct restriction questions from saved profile data without calling the self-hosted model', function () {
    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Avocado'],
        'medical_history' => 'Asthma',
    ]);

    $user->prefs()->create([
        'settings' => [
            'injuries' => ['Shoulder pain'],
        ],
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports();

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What are my allergies?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'restriction_summary');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Diet type: Mediterranean')
        ->toContain('Allergies: Avocado')
        ->toContain('Medical conditions: Asthma')
        ->toContain('Injuries: Shoulder pain');

    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
    Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/points/query'));
});

it('does not collapse injury-based exercise questions into a restriction summary', function () {
    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Corn', 'Sesame'],
        'medical_history' => 'shoulder injury',
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `general`');
            expect($content)->toContain('Medical conditions: shoulder injury');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Because of your saved shoulder history, start with gentle range-of-motion work like wall slides and shoulder blade squeezes, and avoid painful overhead loading until it feels settled.',
                ],
                'prompt_eval_count' => 90,
                'eval_count' => 35,
            ], 200);
        },
        [],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'my injury dates 7 months , what exercices may i do',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', null)
        ->assertJsonPath('feature', 'workout');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('wall slides')
        ->not->toContain('Here are the saved safety and diet details');

    Http::assertSent(fn (HttpRequest $request) => str_contains($request->url(), '/api/chat'));
});

it('treats meal requests that mention allergies as meal guidance instead of a restriction-summary shortcut', function () {
    $user = User::factory()->create([
        'allergies' => ['Avocado'],
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `general`');
            expect($content)->toContain('SAFETY_RULES:');
            expect($content)->toContain('Allergies: Avocado');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'A safe snack idea is Greek yogurt with berries and chia seeds, keeping it clear of avocado.',
                ],
                'prompt_eval_count' => 90,
                'eval_count' => 35,
            ], 200);
        },
        [],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Suggest a snack that avoids my allergies.',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'general');

    expect(data_get($response->json(), 'assistant_message.metadata.chat.reason'))->toBeNull();
    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('safe snack idea')
        ->not->toContain('Here are the saved safety and diet details');
});

it('answers recovery checklist prompts as general guidance when no user vector context matches', function () {
    $user = User::factory()->create();

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function (HttpRequest $request) {
            $content = (string) data_get($request->data(), 'messages.0.content', '');

            expect($content)->toContain('If the personalization mode is `general`');

            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'General recovery guidance: prioritize hydration, sleep, light mobility, and a balanced post-workout meal with protein and carbs.',
                ],
                'prompt_eval_count' => 80,
                'eval_count' => 25,
            ], 200);
        },
        [],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What are good recovery tips after a hard workout?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'general');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('hydration')
        ->toContain('sleep');
});

it('normalizes internal ai wording into plain english before showing the chatbot reply', function () {
    $user = User::factory()->create([
        'weight_kg' => 61,
    ]);

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');
    config()->set('ai.chat.self_hosted.qdrant.base_url', 'http://qdrant.local');
    config()->set('ai.usage_logging.enabled', false);

    fakeSelfHostedTransports(
        function () {
            return Http::response([
                'model' => 'llama3.1:8b',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Based on your PERSONAL_CONTEXT, your current weight is 61.00 kg. This information comes directly from your user profile.',
                ],
                'prompt_eval_count' => 70,
                'eval_count' => 20,
            ], 200);
        },
        [[
            'id' => 'profile-point',
            'score' => 0.95,
            'payload' => [
                'user_id' => $user->id,
                'doc_key' => 'profile',
                'doc_type' => 'profile',
                'text' => 'Current weight kg: 61.',
            ],
        ]],
    );

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'what is my current weight?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonMissingPath('assistant_message.content.PERSONAL_CONTEXT');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('based on your profile')
        ->toContain('61.00 kg')
        ->not->toContain('PERSONAL_CONTEXT')
        ->not->toContain('user profile.');
});
