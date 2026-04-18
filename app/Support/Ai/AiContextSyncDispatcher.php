<?php

namespace App\Support\Ai;

use App\Jobs\SyncUserAiContext;
use App\Services\Ai\Runtime\FeatureConfigResolver;
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

        $dispatch = static fn () => SyncUserAiContext::dispatchSync($userId);

        if (DB::transactionLevel() > 0) {
            DB::afterCommit(fn () => app()->terminating($dispatch));

            return;
        }

        app()->terminating($dispatch);
    }
}
