<?php

namespace App\Services\Ai;

use App\Models\AiUsageLog;
use App\Models\User;

class AiUsageLogger
{
    public function log(
        ?User $user,
        string $feature,
        array $usage,
        ?string $model = null,
        ?int $latencyMs = null,
        ?string $providerRequestId = null,
        array $metadata = []
    ): void {
        if (! (bool) config('ai.usage_logging.enabled', true)) {
            return;
        }

        $input = (int) ($usage['input_tokens'] ?? 0);
        $output = (int) ($usage['output_tokens'] ?? 0);
        $total = (int) ($usage['total_tokens'] ?? ($input + $output));

        AiUsageLog::query()->create([
            'user_id' => $user?->id,
            'feature' => $feature,
            'model' => $model,
            'input_tokens' => $input,
            'output_tokens' => $output,
            'total_tokens' => $total,
            'estimated_cost_usd' => null,
            'latency_ms' => $latencyMs,
            'provider_request_id' => $providerRequestId,
            'metadata' => $metadata,
        ]);
    }
}

