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
        $mealOptions = is_array(data_get($plan, 'diet.meal_options')) ? data_get($plan, 'diet.meal_options') : [];
        $weekly = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        $reviewAfterDays = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
        $hardRules = is_array(data_get($plan, 'safety.hard_rules_observed')) ? data_get($plan, 'safety.hard_rules_observed') : [];

        $dietPayload = mb_strtolower(json_encode(data_get($plan, 'diet', []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');

        $checks = [
            'has_required_sections' => $this->hasRequiredSections($plan),
            'meal_options_present' => $this->mealOptionsPresent($mealOptions),
            'meal_options_sized' => $this->mealOptionsSized($mealOptions),
            'diet_days_match_horizon' => count($dietDays) === $this->normalizeHorizon($horizonDays),
            'workout_days_is_7' => count($weekly) === 7,
            'workout_labels_match_week' => $this->workoutLabelsMatchWeek($weekly),
            'adaptive_review_window_valid' => in_array($reviewAfterDays, [14, 21, 28], true),
            'hard_rules_present' => $hardRules !== [],
            'allergies_respected' => ! $this->containsAny($dietPayload, $this->allergyNeedles($profileSafety['allergies'] ?? [])),
            'diet_type_respected' => ! $this->containsAny($dietPayload, $this->blockedDietNeedles((string) ($profileSafety['diet_type'] ?? ''))),
            'breakfast_clean' => $this->mealGroupIsClean($mealOptions['breakfast'] ?? [], 'breakfast'),
            'lunch_dinner_clean' => $this->mealGroupIsClean($mealOptions['lunch'] ?? [], 'lunch') && $this->mealGroupIsClean($mealOptions['dinner'] ?? [], 'dinner'),
            'training_days_no_recovery_moves' => $this->trainingDaysContainNoRecoveryMoves($weekly),
            'workout_split_integrity' => $this->workoutSplitIntegrityHolds($weekly),
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

    private function mealOptionsPresent(array $mealOptions): bool
    {
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealCode) {
            if (! is_array($mealOptions[$mealCode] ?? null)) {
                return false;
            }
        }

        return true;
    }

    private function mealOptionsSized(array $mealOptions): bool
    {
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealCode) {
            $options = is_array($mealOptions[$mealCode] ?? null) ? $mealOptions[$mealCode] : [];
            if (count($options) < 3 || count($options) > 7) {
                return false;
            }
        }

        return true;
    }

    private function workoutLabelsMatchWeek(array $weekly): bool
    {
        $expected = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];

        foreach ($weekly as $day) {
            $dayIndex = (int) ($day['day_index'] ?? 0);
            $dayLabel = trim((string) ($day['day_label'] ?? ''));
            if (! isset($expected[$dayIndex]) || $dayLabel !== $expected[$dayIndex]) {
                return false;
            }
        }

        return true;
    }

    private function mealGroupIsClean(array $meals, string $mealCode): bool
    {
        foreach ($meals as $meal) {
            if (! is_array($meal)) {
                return false;
            }

            foreach ((array) ($meal['items'] ?? []) as $item) {
                $name = trim((string) ($item['name'] ?? ''));
                if ($name === '') {
                    return false;
                }

                if ($this->looksQuestionableFoodName($name)) {
                    return false;
                }

                if ($mealCode !== 'snack' && ($this->looksLikeSnackOrDrink($name) || $this->looksLikeStandaloneSnack($name))) {
                    return false;
                }
            }
        }

        return true;
    }

    private function trainingDaysContainNoRecoveryMoves(array $weekly): bool
    {
        foreach ($weekly as $day) {
            if (mb_strtolower(trim((string) ($day['session_type'] ?? ''))) !== 'train') {
                continue;
            }

            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                if ($this->looksRecoveryStyleExercise((string) ($exercise['name'] ?? ''))) {
                    return false;
                }
            }
        }

        return true;
    }

    private function workoutSplitIntegrityHolds(array $weekly): bool
    {
        foreach ($weekly as $day) {
            if (mb_strtolower(trim((string) ($day['session_type'] ?? ''))) !== 'train') {
                continue;
            }

            $allowedCategories = $this->allowedCategoriesForFocus((string) ($day['focus'] ?? ''));
            if ($allowedCategories === []) {
                continue;
            }

            $classified = 0;
            $matched = 0;
            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $category = $this->exerciseCategoryByName((string) ($exercise['name'] ?? ''));
                if (in_array($category, ['', 'core', 'accessory'], true)) {
                    continue;
                }

                $classified++;
                if (in_array($category, $allowedCategories, true)) {
                    $matched++;
                }
            }

            if ($classified > 0 && ($matched / $classified) < 0.6) {
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

    private function looksQuestionableFoodName(string $name): bool
    {
        return $this->containsAny($name, [
            'gandour',
            'rice pops',
            'snickers',
            'mars bar',
            'kitkat',
            'oreo',
            'doritos',
            'cheetos',
            'vodka',
            'beer',
            'wine',
            'tequila',
            'whiskey',
            'candy',
            'chocolate bar',
        ]);
    }

    private function looksLikeSnackOrDrink(string $name): bool
    {
        return $this->containsAny($name, [
            'chips',
            'wafer',
            'cookie',
            'biscuit',
            'ice cream',
            'cola',
            'soda',
            'juice',
            'energy drink',
            'soft drink',
            'candy',
            'chocolate bar',
            'protein wafer',
            'dessert',
        ]);
    }

    private function looksLikeStandaloneSnack(string $name): bool
    {
        return $this->containsAny($name, [
            'protein bar',
            'granola bar',
            'cereal bar',
            'trail mix',
            'mixed nuts',
            'roasted chickpea',
            'roasted chickpeas',
            'coated peanut',
            'coated peanuts',
            'rice cake',
            'rice cakes',
            'cracker',
            'crackers',
            'pretzel',
            'popcorn',
            'pringles',
            'nutella',
            'hot chocolate',
            'chocolate drink',
            'milkshake',
            'brownie',
            'cupcake',
        ]);
    }

    private function looksRecoveryStyleExercise(string $name): bool
    {
        $text = mb_strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        if (str_contains($text, 'walk') && ! $this->containsAny($text, ['lunge', 'farmer', 'sled'])) {
            return true;
        }

        return $this->containsAny($text, [
            'stretch',
            'mobility',
            'foam roll',
            'breathing',
            'activation',
            'recovery',
        ]);
    }

    private function allowedCategoriesForFocus(string $focus): array
    {
        $focus = mb_strtolower(trim($focus));

        if ($focus === '' || str_contains($focus, 'full body') || str_contains($focus, 'machine full body')) {
            return [];
        }
        if (str_contains($focus, 'upper') || (str_contains($focus, 'push') && str_contains($focus, 'pull'))) {
            return ['push', 'pull'];
        }
        if (str_contains($focus, 'push')) {
            return ['push'];
        }
        if (str_contains($focus, 'pull')) {
            return ['pull'];
        }
        if (str_contains($focus, 'leg') || str_contains($focus, 'lower')) {
            return ['lower'];
        }

        return [];
    }

    private function exerciseCategoryByName(string $name): string
    {
        $name = mb_strtolower(trim($name));
        if ($name === '') {
            return '';
        }
        if ($this->containsAny($name, ['squat', 'lunge', 'leg', 'hamstring', 'calf', 'quad', 'glute', 'thigh', 'hip thrust', 'deadlift', 'abduction', 'adduction'])) {
            return 'lower';
        }
        if ($this->containsAny($name, ['row', 'pulldown', 'pull', 'bicep', 'curl', 'rear delt', 'face pull'])) {
            return 'pull';
        }
        if ($this->containsAny($name, ['press', 'chest', 'shoulder', 'tricep', 'dip', 'push', 'lateral raise', 'fly', 'pec deck'])) {
            return 'push';
        }
        if ($this->containsAny($name, ['plank', 'dead bug', 'crunch', 'core', 'oblique', 'ab'])) {
            return 'core';
        }

        return 'accessory';
    }
}
