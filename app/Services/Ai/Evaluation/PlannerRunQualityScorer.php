<?php

namespace App\Services\Ai\Evaluation;

use App\Models\User;
use App\Services\Ai\Profile\UserSafetyProfileResolver;

class PlannerRunQualityScorer
{
    public function __construct(
        private readonly UserSafetyProfileResolver $safetyProfileResolver,
    ) {}

    public function score(User $user, array $plan, int $horizonDays, ?array $profile = null): array
    {
        $profileSafety = $this->resolveProfileSafety($user, $profile ?? []);
        $dietDays = is_array(data_get($plan, 'diet.days')) ? data_get($plan, 'diet.days') : [];
        $weekly = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        $reviewAfterDays = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
        $hardRules = is_array(data_get($plan, 'safety.hard_rules_observed')) ? data_get($plan, 'safety.hard_rules_observed') : [];

        $dietPayload = mb_strtolower(json_encode(data_get($plan, 'diet', []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');

        $checks = [
            'has_required_sections' => $this->hasRequiredSections($plan),
            'diet_days_match_horizon' => count($dietDays) === $this->normalizeHorizon($horizonDays),
            'workout_days_is_7' => count($weekly) === 7,
            'adaptive_review_window_valid' => in_array($reviewAfterDays, [14, 21, 28], true),
            'hard_rules_present' => $hardRules !== [],
            'allergies_respected' => ! $this->containsAny($dietPayload, $this->allergyNeedles($profileSafety['allergies'] ?? [])),
            'diet_type_respected' => ! $this->containsAny($dietPayload, $this->blockedDietNeedles((string) ($profileSafety['diet_type'] ?? ''))),
            'progress_prediction_present' => is_array(data_get($plan, 'progress_prediction')),
        ];

        $passed = count(array_filter($checks));
        $total = max(1, count($checks));
        $percentage = round(($passed / $total) * 100, 2);

        return [
            'passed_checks' => $passed,
            'total_checks' => $total,
            'quality_percentage' => $percentage,
            'checks' => $checks,
        ];
    }

    private function hasRequiredSections(array $plan): bool
    {
        foreach (['overview', 'safety', 'diet', 'workout', 'adaptive_review', 'ml_readiness'] as $section) {
            if (! is_array($plan[$section] ?? null)) {
                return false;
            }
        }

        return true;
    }

    private function resolveProfileSafety(User $user, array $profile): array
    {
        $resolved = $this->safetyProfileResolver->resolve($user);

        $resolved['diet_type'] = trim((string) ($profile['diet_type'] ?? $resolved['diet_type'] ?? ''));
        $resolved['allergies'] = $this->normalizeList($profile['allergies'] ?? $resolved['allergies'] ?? []);

        return $resolved;
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [$value];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $value,
        ))));
    }

    private function allergyNeedles(array $allergies): array
    {
        $needles = [];
        foreach ($allergies as $allergy) {
            $value = mb_strtolower(trim((string) $allergy));
            if ($value === '') {
                continue;
            }

            $needles[] = $value;
            if (str_ends_with($value, 's') && mb_strlen($value) > 4) {
                $needles[] = rtrim($value, 's');
            }
        }

        return array_values(array_unique($needles));
    }

    private function blockedDietNeedles(string $dietType): array
    {
        $dietType = mb_strtolower(trim($dietType));

        return match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };
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

    private function normalizeHorizon(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }
}
