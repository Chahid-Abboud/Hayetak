<?php

use App\Services\Ai\Runtime\FeatureConfigResolver;
use Tests\TestCase;

uses(TestCase::class);

it('resolves chat provider auto to stub in testing', function () {
    config()->set('ai.chat.provider', 'auto');
    config()->set('ai.chat.http.endpoint', 'https://example.com/chat');
    config()->set('ai.chat.self_hosted.ollama.base_url', 'http://ollama.local');

    $provider = app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_CHAT);

    expect($provider)->toBe('stub');
});

it('respects explicit self-hosted chat provider when configured', function () {
    config()->set('ai.chat.provider', 'self_hosted');

    $provider = app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_CHAT);

    expect($provider)->toBe('self_hosted');
});

it('rejects explicit openai chat provider and falls back to stub', function () {
    config()->set('ai.chat.provider', 'openai');

    $provider = app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_CHAT);

    expect($provider)->toBe('stub');
});
