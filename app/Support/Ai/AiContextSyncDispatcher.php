<?php

namespace App\Support\Ai;

use App\Jobs\Ai\SyncUserAiContext;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AiContextSyncDispatcher
{
    public static function dispatch(int $userId): void
    {
        $features = app(FeatureConfigResolver::class);

        if ($userId <= 0 || ! $features->usesSelfHostedChat()) {
            return;
        }

        if (app()->runningUnitTests() && ! $features->shouldSyncContextDuringTests()) {
            return;
        }

        $debounceSeconds = max(1, (int) config('ai.chat.self_hosted.context_sync.debounce_seconds', 8));
        $uniqueForSeconds = max(
            $debounceSeconds + 5,
            (int) config('ai.chat.self_hosted.context_sync.unique_for_seconds', 120)
        );
        $queue = trim((string) config('ai.chat.self_hosted.context_sync.queue', 'ai-context-sync'));
        $debounceKey = "ai:context_sync:debounce:user:{$userId}";

        $dispatch = static function () use ($userId, $debounceSeconds, $uniqueForSeconds, $queue, $debounceKey): void {
            if (! Cache::add($debounceKey, 1, $debounceSeconds)) {
                return;
            }

            $pending = SyncUserAiContext::dispatch($userId, $uniqueForSeconds)
                ->delay(now()->addSeconds($debounceSeconds));

            if ($queue !== '') {
                $pending->onQueue($queue);
            }
        };

        if (DB::transactionLevel() > 0) {
            DB::afterCommit(fn () => app()->terminating($dispatch));

            return;
        }

        app()->terminating($dispatch);
    }
}
