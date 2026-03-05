<?php

namespace App\Services\Ai\Tools;

use App\Models\User;

interface AiTool
{
    public function name(): string;

    public function description(): string;

    public function schema(): array;

    public function execute(User $user, array $arguments): array;
}
