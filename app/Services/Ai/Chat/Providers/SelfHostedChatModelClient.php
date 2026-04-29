<?php

namespace App\Services\Ai\Chat\Providers;

use App\Services\Ai\Chat\Contracts\ChatModelClient;
use App\Services\Ai\Chat\SelfHostedContextAwareChatService;
use RuntimeException;

class SelfHostedChatModelClient implements ChatModelClient
{
    public function __construct(
        private readonly SelfHostedContextAwareChatService $chatService,
    ) {}

    /**
     * Route chat requests to the self-hosted context-aware service.
     */
    public function respond(string $question, array $context, array $options = []): array
    {
        $userId = (int) ($options['user_id'] ?? 0);

        if ($userId <= 0) {
            throw new RuntimeException('Self-hosted chat requires a user_id option.');
        }

        return $this->chatService->chatResponse($userId, $question, $context);
    }
}
