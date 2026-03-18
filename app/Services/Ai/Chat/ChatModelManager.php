<?php

namespace App\Services\Ai\Chat;

use App\Services\Ai\Chat\Contracts\ChatModelClient;
use App\Services\Ai\Chat\Providers\HttpChatModelClient;
use App\Services\Ai\Chat\Providers\SelfHostedChatModelClient;
use App\Services\Ai\Chat\Providers\StubChatModelClient;

class ChatModelManager
{
    public function client(): ChatModelClient
    {
        return match ((string) config('ai.chat.provider', 'stub')) {
            'http' => app(HttpChatModelClient::class),
            'self_hosted' => app(SelfHostedChatModelClient::class),
            default => app(StubChatModelClient::class),
        };
    }
}
