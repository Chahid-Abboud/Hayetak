<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Ai\Chat\SelfHostedContextAwareChatService;
use Illuminate\Console\Command;

class AiSyncUserContext extends Command
{
    protected $signature = 'ai:sync-user-context {user_id? : Sync a single user instead of all users}';

    protected $description = 'Rebuild the self-hosted vector context for one user or every user.';

    public function handle(SelfHostedContextAwareChatService $chatService): int
    {
        $userId = $this->argument('user_id');

        if ($userId !== null) {
            $user = User::query()->with('prefs')->find((int) $userId);

            if (! $user) {
                $this->error("User {$userId} was not found.");

                return self::FAILURE;
            }

            $chatService->syncUserContext($user);
            $this->info("Indexed user {$user->id}.");

            return self::SUCCESS;
        }

        User::query()
            ->with('prefs')
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($chatService): void {
                foreach ($users as $user) {
                    $chatService->syncUserContext($user);
                    $this->line("Indexed user {$user->id}");
                }
            });

        $this->info('Indexed all users.');

        return self::SUCCESS;
    }
}
