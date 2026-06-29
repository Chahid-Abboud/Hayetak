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

it('always uses ollama as the planner provider', function () {
    $provider = app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_PLANNER);

    expect($provider)->toBe('ollama');
});

it('keeps planner on ollama even when hosted provider config is present', function () {
    config()->set('ai.planner.provider', 'openai');
    config()->set('ai.planner.hosted.enabled', true);

    $resolver = app(FeatureConfigResolver::class);

    expect($resolver->provider(FeatureConfigResolver::FEATURE_PLANNER))->toBe('ollama');
    expect($resolver->ollamaOnly(FeatureConfigResolver::FEATURE_PLANNER))->toBeTrue();
});

it('keeps local planner fallback available when enabled', function () {
    config()->set('ai.planner.local_fallback.enabled', true);

    $resolver = app(FeatureConfigResolver::class);

    expect($resolver->fallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER))->toBeFalse();
    expect($resolver->localFallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER))->toBeTrue();
});
