<?php

namespace App\Support\Ai;

use App\Jobs\SyncUserAiContext;
use Illuminate\Support\Facades\DB;

class AiContextSyncDispatcher
{
    public static function dispatch(int $userId): void
    {
        if ($userId <= 0 || (string) config('ai.chat.provider', 'stub') !== 'self_hosted') {
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
