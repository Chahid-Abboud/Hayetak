<?php

namespace App\Services\Ai\Chat\Contracts;

interface ChatModelClient
{
    /**
     * Send a question + context bundle to a chat model provider and return normalized output.
     */
    public function respond(string $question, array $context, array $options = []): array;
}
