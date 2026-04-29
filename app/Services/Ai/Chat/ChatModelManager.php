<?php

namespace App\Services\Ai\Chat;

use App\Services\Ai\Chat\Contracts\ChatModelClient;
use App\Services\Ai\Chat\Providers\HttpChatModelClient;
use App\Services\Ai\Chat\Providers\SelfHostedChatModelClient;
use App\Services\Ai\Chat\Providers\StubChatModelClient;
use App\Services\Ai\Runtime\FeatureConfigResolver;

class ChatModelManager
{
    public function __construct(private readonly FeatureConfigResolver $features) {}

    /**
     * Resolve the concrete chat client implementation from feature configuration.
     */
    public function client(): ChatModelClient
    {
        return match ($this->features->provider(FeatureConfigResolver::FEATURE_CHAT)) {
            'http' => app(HttpChatModelClient::class),
            'self_hosted' => app(SelfHostedChatModelClient::class),
            default => app(StubChatModelClient::class),
        };
    }
}
