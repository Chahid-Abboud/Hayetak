<?php

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Chat\SelfHostedContextAwareChatService;
use Illuminate\Console\Command;

class AiSetupSelfHostedChat extends Command
{
    protected $signature = 'ai:setup-self-hosted-chat
        {--sample=hayetak self hosted chat setup : Sample text used to infer the embedding size}
        {--sync-existing=1 : Reindex all existing users after creating the collection}';

    protected $description = 'Create the local Qdrant collection and optionally sync existing users into the self-hosted vector store.';

    public function handle(SelfHostedContextAwareChatService $chatService): int
    {
        $chatService->ensureCollectionIsReady((string) $this->option('sample'));
        $this->info('Self-hosted vector collection is ready.');

        if ((int) $this->option('sync-existing') !== 1) {
            return self::SUCCESS;
        }

        $this->info('Syncing existing users into the vector store...');

        User::query()
            ->with('prefs')
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($chatService): void {
                foreach ($users as $user) {
                    $chatService->syncUserContext($user);
                    $this->line("Indexed user {$user->id}");
                }
            });

        $this->info('Existing user context sync finished.');

        return self::SUCCESS;
    }
}
