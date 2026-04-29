<?php

use App\Models\User;
use App\Services\Ai\PlannerService;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);
});

it('enforces the daily cap on planner generation requests', function () {
    config()->set('ai.rate_limits.plan', '50,1');
    config()->set('ai.rate_limits.plan_daily_cap', 2);

    $user = User::factory()->create();
    clearAiRateLimiterKeys('plan', (int) $user->id);

    $this->mock(PlannerService::class, function ($mock) {
        $mock->shouldReceive('generate')->twice()->andReturn([
            'ok' => true,
            'ai_request_id' => 1,
            'generation_id' => 'rate-limit-test',
            'version' => 1,
            'plan' => ['overview' => ['summary' => 'stub plan']],
            'plans' => ['diet' => [], 'workout' => []],
            'persisted' => ['persisted' => false],
            'provider' => 'ollama',
            'model' => 'llama3.1:8b',
            'prompt_version' => 'test',
            'schema_version' => 'test',
            'usage' => [
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
            ],
        ]);
    });

    $this->actingAs($user)->postJson('/api/ai/plan', ['reason' => 'daily-cap-a'])->assertCreated();
    $this->actingAs($user)->postJson('/api/ai/plan', ['reason' => 'daily-cap-b'])->assertCreated();

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'daily-cap-c'])
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'AI_DAILY_CAP_REACHED');
});

it('enforces burst limits on chat requests', function () {
    config()->set('ai.rate_limits.chat', '2,1');
    config()->set('ai.rate_limits.chat_daily_cap', 200);

    $user = User::factory()->create();
    clearAiRateLimiterKeys('chat', (int) $user->id);

    $payload = [
        'message' => 'How should I balance protein today?',
        'screen_context' => 'coach',
    ];

    $this->actingAs($user)->postJson('/api/ai/chat', $payload)->assertCreated();
    $this->actingAs($user)->postJson('/api/ai/chat', $payload)->assertCreated();

    $this->actingAs($user)
        ->postJson('/api/ai/chat', $payload)
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'AI_RATE_LIMIT_EXCEEDED');
});

function clearAiRateLimiterKeys(string $feature, int $userId): void
{
    $identity = 'user:'.$userId;
    $date = now()->toDateString();

    RateLimiter::clear("ai:{$feature}:burst:{$identity}");
    RateLimiter::clear("ai:{$feature}:daily:{$date}:{$identity}");
}
