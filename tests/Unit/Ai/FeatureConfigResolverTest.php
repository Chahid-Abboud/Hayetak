<?php

use App\Services\Ai\Runtime\FeatureConfigResolver;
use Tests\TestCase;

uses(TestCase::class);

it('caps planner ollama timeout and output budget to keep generation responsive', function () {
    config()->set('ai.planner.ollama.timeout', 999);
    config()->set('ai.planner.request_timeout_seconds', 999);
    config()->set('ai.planner.ollama.max_output_tokens', 9000);

    $settings = app(FeatureConfigResolver::class)->ollamaChat(FeatureConfigResolver::FEATURE_PLANNER);

    expect($settings['timeout'])->toBe(150);
    expect($settings['max_output_tokens'])->toBe(1400);
});

it('enforces practical minimum planner ollama timeout and output budget floors', function () {
    config()->set('ai.planner.ollama.timeout', 5);
    config()->set('ai.planner.request_timeout_seconds', 5);
    config()->set('ai.planner.ollama.max_output_tokens', 200);

    $settings = app(FeatureConfigResolver::class)->ollamaChat(FeatureConfigResolver::FEATURE_PLANNER);

    expect($settings['timeout'])->toBe(20);
    expect($settings['max_output_tokens'])->toBe(500);
});

it('forces planner provider to ollama in ollama-only mode', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.provider', 'openai');

    $provider = app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_PLANNER);

    expect($provider)->toBe('ollama');
});

it('disables planner fallbacks in ollama-only mode', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.fallback.enabled', true);
    config()->set('ai.planner.local_fallback.enabled', true);

    $resolver = app(FeatureConfigResolver::class);

    expect($resolver->fallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER))->toBeFalse();
    expect($resolver->localFallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER))->toBeFalse();
});
