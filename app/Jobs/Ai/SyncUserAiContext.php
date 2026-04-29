<?php

namespace App\Jobs\Ai;

use App\Models\User;
use App\Services\Ai\Chat\SelfHostedContextAwareChatService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncUserAiContext implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $uniqueFor;

    public function __construct(
        public int $userId,
        int $uniqueForSeconds = 120,
    ) {
        $this->uniqueFor = max(30, $uniqueForSeconds);
    }

    public function uniqueId(): string
    {
        return 'user:'.$this->userId;
    }

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
