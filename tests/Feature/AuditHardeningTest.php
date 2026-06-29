<?php

use App\Models\User;
use App\Services\Ai\Chat\ChatOrchestrator;

it('requires authentication for nearby places APIs', function (string $path) {
    $this->getJson($path)->assertUnauthorized();
})->with([
    '/api/places?lat=33.8938&lng=35.5018',
    '/api/places-local?lat=33.8938&lng=35.5018',
]);

it('rejects invalid nearby coordinates before querying providers', function (string $path) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson($path)
        ->assertUnprocessable();
})->with([
    '/api/places?lat=999&lng=35.5018',
    '/api/places-local?lat=33.8938&lng=999',
]);

it('does not expose internal stream exceptions to clients', function () {
    $user = User::factory()->create();

    $orchestrator = \Mockery::mock(ChatOrchestrator::class);
    $orchestrator->shouldReceive('handle')
        ->once()
        ->andThrow(new RuntimeException('secret provider failure with internal URL'));

    $this->app->instance(ChatOrchestrator::class, $orchestrator);

    $response = $this->actingAs($user)
        ->post('/api/ai/chat/stream', [
            'message' => 'Give me a safe dinner idea.',
            'screen_context' => 'coach',
        ], [
            'Accept' => 'text/event-stream',
        ]);

    $response->assertCreated();

    $stream = $response->streamedContent();

    expect($stream)
        ->toContain('event: error')
        ->toContain('AI Coach is temporarily unavailable right now.')
        ->not->toContain('secret provider failure')
        ->not->toContain('internal URL')
        ->not->toContain('"error"');
});
