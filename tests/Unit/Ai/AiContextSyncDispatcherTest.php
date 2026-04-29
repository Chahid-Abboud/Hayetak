<?php

use App\Jobs\Ai\SyncUserAiContext;
use App\Support\Ai\AiContextSyncDispatcher;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Queue::fake();
    Cache::flush();

    config()->set('ai.chat.provider', 'self_hosted');
    config()->set('ai.chat.self_hosted.sync_during_tests', true);
    config()->set('ai.chat.self_hosted.context_sync.debounce_seconds', 8);
    config()->set('ai.chat.self_hosted.context_sync.unique_for_seconds', 120);
    config()->set('ai.chat.self_hosted.context_sync.queue', 'ai-context-sync');
});

it('debounces repeated context sync dispatches for the same user', function () {
    AiContextSyncDispatcher::dispatch(77);
    AiContextSyncDispatcher::dispatch(77);
    app()->terminate();

    Queue::assertPushed(SyncUserAiContext::class, 1);
    Queue::assertPushed(SyncUserAiContext::class, function (SyncUserAiContext $job) {
        return $job->userId === 77
            && $job->uniqueFor === 120;
    });
});

it('dispatches separate context sync jobs for different users', function () {
    AiContextSyncDispatcher::dispatch(101);
    AiContextSyncDispatcher::dispatch(202);
    app()->terminate();

    Queue::assertPushed(SyncUserAiContext::class, 2);
});
