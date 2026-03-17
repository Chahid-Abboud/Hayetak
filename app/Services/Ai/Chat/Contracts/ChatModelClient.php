<?php

namespace App\Services\Ai\Chat\Contracts;

interface ChatModelClient
{
    public function respond(string $question, array $context, array $options = []): array;
}
