<?php

namespace App\Services\Ai\Audit;

class PlannerAuditExecutionMode
{
    public const DEFAULT = 'standard';

    /**
     * @return list<string>
     */
    public static function acceptedValues(): array
    {
        return ['standard', 'fast-fallback', 'fast_fallback', 'live', 'live-model', 'live_model'];
    }

    public static function normalize(?string $mode): string
    {
        return match (strtolower(trim((string) $mode))) {
            'fast_fallback', 'fast-fallback' => 'fast-fallback',
            'live', 'live_model', 'live-model' => 'live',
            default => self::DEFAULT,
        };
    }

    /**
     * @return array<string,mixed>
     */
    public static function configOverrides(?string $mode): array
    {
        return match (self::normalize($mode)) {
            'fast-fallback' => [
                'ai.planner.local_fallback.enabled' => true,
                'ai.planner.ollama.base_url' => 'http://127.0.0.1:65530',
                'ai.planner.ollama.connect_timeout' => 1,
                'ai.planner.ollama.timeout' => 1,
                'ai.planner.request_timeout_seconds' => 4,
            ],
            'live' => [
                'ai.planner.local_fallback.enabled' => false,
            ],
            default => [],
        };
    }

    public static function description(?string $mode): string
    {
        return match (self::normalize($mode)) {
            'fast-fallback' => 'Forces a quick handoff to the deterministic local planner for speed-focused verification runs.',
            'live' => 'Disables local fallback so audit latency and failures reflect the real planner model path.',
            default => 'Uses the current planner configuration and only falls back if the app is configured to do so.',
        };
    }
}
