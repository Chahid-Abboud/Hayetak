<?php

namespace App\Services\Ai\Audit;

class PlannerAuditGpuLoad
{
    public const DEFAULT = 'low';

    public static function acceptedValues(): array
    {
        return ['low', 'medium', 'mid', 'high'];
    }

    public static function normalize(?string $gpuLoad): string
    {
        return match (strtolower(trim((string) $gpuLoad))) {
            'high' => 'high',
            'medium', 'mid' => 'medium',
            default => self::DEFAULT,
        };
    }

    public static function profile(?string $gpuLoad): array
    {
        return match (self::normalize($gpuLoad)) {
            'high' => [
                'sleep_ms' => 0,
                'batch_size' => 0,
                'batch_pause_seconds' => 0,
            ],
            'medium' => [
                'sleep_ms' => 1500,
                'batch_size' => 8,
                'batch_pause_seconds' => 15,
            ],
            default => [
                'sleep_ms' => 4000,
                'batch_size' => 6,
                'batch_pause_seconds' => 45,
            ],
        };
    }
}
