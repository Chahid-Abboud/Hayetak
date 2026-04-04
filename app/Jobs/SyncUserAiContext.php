<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Ai\Chat\SelfHostedContextAwareChatService;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Bus\Queueable;

class SyncUserAiContext implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
    ) {}

    public function handle(SelfHostedContextAwareChatService $chatService): void
    {
        $user = User::query()->with('prefs')->find($this->userId);

        if ($user) {
            $chatService->syncUserContext($user);

            return;
        }

        $chatService->deleteUserData($this->userId);
    }
}
