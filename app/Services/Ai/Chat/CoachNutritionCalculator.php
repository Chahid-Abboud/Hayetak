<?php

namespace App\Services\Ai\Chat;

class CoachNutritionCalculator
{
    public function proteinTargetRange(?float $weightKg, ?string $goal = null, ?string $activityLevel = null): ?array
    {
        if (! is_numeric($weightKg) || $weightKg <= 0) {
            return null;
        }

        $goalText = mb_strtolower(trim((string) ($goal ?? '')));
        $activityText = mb_strtolower(trim((string) ($activityLevel ?? '')));

        [$minPerKg, $maxPerKg, $rationale] = match (true) {
            $this->containsAny($goalText, ['muscle', 'build', 'gain', 'bulk', 'strength']) => [1.6, 2.2, 'muscle support'],
            $this->containsAny($goalText, ['fat loss', 'lose', 'cut', 'weight loss']) => [1.6, 2.4, 'fat-loss support while protecting lean mass'],
            $this->containsAny($activityText, ['very active', 'high', 'athlete', 'intense']) => [1.4, 2.0, 'high activity support'],
            default => [1.2, 1.8, 'general active health support'],
        };

        $low = $weightKg * $minPerKg;
        $high = $weightKg * $maxPerKg;

        return [
            'weight_kg' => round($weightKg, 2),
            'min_g_per_kg' => $minPerKg,
            'max_g_per_kg' => $maxPerKg,
            'low_g' => (int) round($low),
            'high_g' => (int) round($high),
            'suggested_g' => (int) round(($low + $high) / 2),
            'rationale' => $rationale,
        ];
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
