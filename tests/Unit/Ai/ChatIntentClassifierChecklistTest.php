<?php

use App\Services\Ai\Chat\ChatIntentClassifier;

it('routes personalized checklist prompts toward personal-context-aware handling', function (string $prompt, array $expected) {
    $result = app(ChatIntentClassifier::class)->classify($prompt, []);

    expect($result['scope'])->toBe('in_domain');
    expect($result['feature'])->toBe($expected['feature']);

    if (array_key_exists('deterministic_action', $expected)) {
        expect($result['deterministic_action'])->toBe($expected['deterministic_action']);
    }

    if (($expected['prefer_hybrid_profile'] ?? false) === true) {
        expect(data_get($result, 'context_flags.prefer_hybrid_profile'))->toBeTrue();
    }

    if (($expected['include_last_7_days'] ?? false) === true) {
        expect(data_get($result, 'context_flags.include_last_7_days'))->toBeTrue();
    }
})->with([
    'saved weight lookup' => [
        'What weight do you have saved for me?',
        ['feature' => 'progress', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'protein recalculation' => [
        'Recalculate my daily protein intake based on my weight.',
        ['feature' => 'nutrition', 'deterministic_action' => 'protein_target', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'protein target suggestion' => [
        'What protein target does my current weight suggest?',
        ['feature' => 'nutrition', 'deterministic_action' => 'protein_target', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'meals today summary' => [
        'What do my meals today look like so far?',
        ['feature' => 'nutrition', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'can i train today' => [
        'Can I train today based on my recent workouts?',
        ['feature' => 'workout', 'include_last_7_days' => true],
    ],
    'what should i do after legs' => [
        'What should I do today if I trained legs yesterday?',
        ['feature' => 'workout', 'include_last_7_days' => true],
    ],
    'dinner fits allergies' => [
        'Suggest a dinner that fits my goal and allergies.',
        ['feature' => 'nutrition', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'my allergies' => [
        'What are my allergies?',
        ['feature' => 'nutrition', 'deterministic_action' => 'restriction_summary', 'prefer_hybrid_profile' => true],
    ],
    'diet type lookup' => [
        'What diet type do you have saved for me?',
        ['feature' => 'nutrition', 'deterministic_action' => 'restriction_summary', 'prefer_hybrid_profile' => true],
    ],
    'injuries lookup' => [
        'What injuries or medical conditions do you have saved for me?',
        ['feature' => 'nutrition', 'deterministic_action' => 'restriction_summary', 'prefer_hybrid_profile' => true],
    ],
    'recent progress calories' => [
        'Based on my recent progress, should I adjust calories?',
        ['feature' => 'progress', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'stale app data settings' => [
        'What app settings should I check if my data looks stale?',
        ['feature' => 'settings'],
    ],
    'breakfast from saved profile' => [
        'Based on my saved profile, what should my breakfast look like?',
        ['feature' => 'nutrition', 'prefer_hybrid_profile' => true, 'include_last_7_days' => true],
    ],
    'nearby support for goal' => [
        'What nearby support would fit my goal?',
        ['feature' => 'nearby'],
    ],
]);

it('routes general-guidance checklist prompts as in-domain coach questions', function (string $prompt, string $feature) {
    $result = app(ChatIntentClassifier::class)->classify($prompt, []);

    expect($result['scope'])->toBe('in_domain');
    expect($result['feature'])->toBe($feature);
    expect($result['deterministic_action'])->toBeNull();
})->with([
    'recovery tips' => ['What are good recovery tips after a hard workout?', 'wellness'],
    'balanced dinner' => ['What is a balanced dinner?', 'nutrition'],
    'high protein snacks' => ['What are healthy high-protein snacks?', 'nutrition'],
    'pre workout meals' => ['What are good pre-workout meals?', 'nutrition'],
    'post workout meals' => ['What are good post-workout meals?', 'nutrition'],
    'protein generally' => ['How much protein do people generally need?', 'nutrition'],
    'dehydration signs' => ['What are signs of dehydration?', 'wellness'],
    'sleep for recovery' => ['How can I improve sleep for recovery?', 'wellness'],
    'muscle soreness' => ['What causes muscle soreness?', 'wellness'],
    'balanced plate' => ['What does a balanced plate look like?', 'nutrition'],
    'healthy breakfast ideas' => ['What are healthy breakfast ideas?', 'nutrition'],
    'high fiber foods' => ['What are high-fiber foods?', 'nutrition'],
    'lean protein sources' => ['What are good lean protein sources?', 'nutrition'],
    'vegetarian protein sources' => ['What are good vegetarian protein sources?', 'nutrition'],
    'meal prep tips' => ['What are some meal prep tips?', 'nutrition'],
    'rest day' => ['What is a rest day?', 'wellness'],
    'stretches after training' => ['What are good stretches after training?', 'wellness'],
    'before cardio' => ['What should someone eat before cardio?', 'nutrition'],
    'simple workout routine' => ['How do I build a simple workout routine?', 'plans'],
    'update profile in app' => ['How do I update my profile in the app?', 'settings'],
]);

it('routes out-of-scope checklist prompts away from coach handling', function (string $prompt) {
    $result = app(ChatIntentClassifier::class)->classify($prompt, []);

    expect($result['scope'])->toBe('out_of_domain');
    expect($result['feature'])->toBe('out_of_scope');
})->with([
    'weather' => 'What is the weather today?',
    'nihilism' => 'Explain nihilism.',
    'capital of france' => 'What is the capital of France?',
    'election' => 'Who won the last election?',
    'bitcoin' => 'What is Bitcoin?',
    'translate' => 'Translate this sentence into Spanish.',
    'movie' => 'Recommend a movie.',
    'poem' => 'Write me a poem.',
    'quantum physics' => 'Explain quantum physics.',
    'world history' => 'Summarize world history.',
    'news today' => 'What happened in the news today?',
    'football game' => 'Who won last night’s football game?',
    'code a website' => 'Help me code a website.',
    'song lyrics' => 'Tell me song lyrics.',
    'resume' => 'Write my resume.',
]);

it('detects yesterday meal summaries and marks the requested day offset', function () {
    $result = app(ChatIntentClassifier::class)->classify("what about yesterday's meals?", []);

    expect($result['scope'])->toBe('in_domain');
    expect($result['feature'])->toBe('nutrition');
    expect($result['deterministic_action'])->toBe('meal_summary');
    expect(data_get($result, 'context_flags.requested_day_offset'))->toBe(-1);
});
