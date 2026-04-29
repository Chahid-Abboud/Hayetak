<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AiRequestRateLimit
{
    public function handle(Request $request, Closure $next, string $feature)
    {
        $feature = strtolower(trim($feature));
        if (! in_array($feature, ['plan', 'chat'], true)) {
            return response()->json([
                'message' => 'Unsupported AI rate-limit feature.',
                'error' => [
                    'code' => 'AI_RATE_LIMIT_FEATURE_INVALID',
                    'feature' => $feature,
                ],
            ], 500);
        }

        $identity = $this->identity($request);
        [$attempts, $minutes] = $this->parseBurstLimit(config("ai.rate_limits.{$feature}", '60,1'));
        if ($attempts > 0) {
            $burstKey = "ai:{$feature}:burst:{$identity}";

            if (RateLimiter::tooManyAttempts($burstKey, $attempts)) {
                return response()->json([
                    'message' => 'Too many AI requests. Please wait a bit and try again.',
                    'error' => [
                        'code' => 'AI_RATE_LIMIT_EXCEEDED',
                        'feature' => $feature,
                        'retry_after_seconds' => RateLimiter::availableIn($burstKey),
                    ],
                ], 429);
            }

            RateLimiter::hit($burstKey, max(60, $minutes * 60));
        }

        $dailyCap = (int) config("ai.rate_limits.{$feature}_daily_cap", 0);
        if ($dailyCap > 0) {
            $date = now()->toDateString();
            $dailyKey = "ai:{$feature}:daily:{$date}:{$identity}";

            if (RateLimiter::tooManyAttempts($dailyKey, $dailyCap)) {
                return response()->json([
                    'message' => 'Daily AI request limit reached. Please try again tomorrow.',
                    'error' => [
                        'code' => 'AI_DAILY_CAP_REACHED',
                        'feature' => $feature,
                        'daily_cap' => $dailyCap,
                        'retry_after_seconds' => RateLimiter::availableIn($dailyKey),
                    ],
                ], 429);
            }

            RateLimiter::hit($dailyKey, $this->secondsUntilEndOfDay());
        }

        return $next($request);
    }

    private function identity(Request $request): string
    {
        $userId = $request->user()?->id;
        if (is_int($userId) || is_string($userId)) {
            return 'user:'.$userId;
        }

        return 'ip:'.$request->ip();
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function parseBurstLimit(mixed $value): array
    {
        if (is_int($value)) {
            return [max(0, $value), 1];
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return [0, 1];
        }

        $parts = array_map('trim', explode(',', $raw, 2));
        $attempts = (int) ($parts[0] ?? 0);
        $minutes = (int) ($parts[1] ?? 1);

        return [max(0, $attempts), max(1, $minutes)];
    }

    private function secondsUntilEndOfDay(): int
    {
        $now = now();

        return max(60, (int) $now->diffInSeconds($now->copy()->endOfDay()) + 1);
    }
}
