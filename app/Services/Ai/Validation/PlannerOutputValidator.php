<?php

namespace App\Services\Ai\Validation;

use App\Models\User;

class PlannerOutputValidator
{
    /**
     * @throws PlannerValidationException
     */
    public function validate(User $user, array $payload, array $profile, int $planHorizonDays): array
    {
        foreach (['overview', 'safety', 'diet', 'workout', 'adaptive_review', 'ml_readiness'] as $key) {
            if (! isset($payload[$key]) || ! is_array($payload[$key])) {
                throw new PlannerValidationException("Planner output is missing {$key}.");
            }
        }

        $diet = $payload['diet'];
        $workout = $payload['workout'];

        if (! is_array($diet['days'] ?? null) || count($diet['days']) !== $planHorizonDays) {
            throw new PlannerValidationException("Diet plan must contain exactly {$planHorizonDays} day entries.");
        }

        if (! is_array($workout['weekly_schedule'] ?? null) || count($workout['weekly_schedule']) !== 7) {
            throw new PlannerValidationException('Workout plan must contain exactly 7 weekly schedule entries.');
        }

        $this->assertDietTargetSanity($diet);
        $this->assertFoodSafety($user, $diet, $profile);
        $this->assertWorkoutSafety($workout, $profile);
        $this->assertAdaptiveReview($payload['adaptive_review']);

        return $payload;
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertDietTargetSanity(array $diet): void
    {
        $targets = $diet['daily_targets'] ?? [];

        $calories = (int) ($targets['calories_kcal'] ?? 0);
        if ($calories < 1000 || $calories > 5000) {
            throw new PlannerValidationException('Diet calorie target looks unsafe or unrealistic.');
        }

        foreach (['protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'water_ml'] as $field) {
            if ((int) ($targets[$field] ?? 0) <= 0) {
                throw new PlannerValidationException("Diet target {$field} must be greater than zero.");
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertFoodSafety(User $user, array $diet, array $profile): void
    {
        $text = strtolower(json_encode($diet, JSON_UNESCAPED_SLASHES) ?: '');
        $allergies = $this->normalizeList($profile['allergies'] ?? $user->allergies);

        foreach ($allergies as $allergy) {
            foreach ($this->allergyNeedles($allergy) as $needle) {
                if ($needle !== '' && str_contains($text, $needle)) {
                    throw new PlannerValidationException('Diet output includes a saved allergen: '.$allergy);
                }
            }
        }

        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? $user->diet_name ?? '')));
        $blockedByDiet = match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };

        foreach ($blockedByDiet as $item) {
            if (str_contains($text, $item)) {
                throw new PlannerValidationException('Diet output violates the diet type boundary: '.$item);
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertWorkoutSafety(array $workout, array $profile): void
    {
        $text = strtolower(json_encode($workout, JSON_UNESCAPED_SLASHES) ?: '');
        $injuries = $this->normalizeList($profile['injury_history'] ?? []);
        $location = strtolower(trim((string) ($profile['workout_location'] ?? '')));
        $equipment = array_map('strtolower', $this->normalizeList($profile['available_equipment'] ?? []));

        $injuryRules = [
            'knee' => ['jump squat', 'plyometric squat', 'depth jump'],
            'shoulder' => ['upright row', 'behind the neck press'],
            'lower back' => ['good morning', 'max deadlift', 'heavy barbell row'],
            'back' => ['good morning', 'max deadlift'],
            'elbow' => ['skull crusher'],
            'wrist' => ['handstand push-up'],
        ];

        foreach ($injuries as $injury) {
            $normalizedInjury = strtolower($injury);
            foreach ($injuryRules as $keyword => $blockedMoves) {
                if (! str_contains($normalizedInjury, $keyword)) {
                    continue;
                }

                foreach ($blockedMoves as $move) {
                    if (str_contains($text, strtolower($move))) {
                        throw new PlannerValidationException('Workout output conflicts with the saved injury history.');
                    }
                }
            }
        }

        if ($location === 'home') {
            $equipmentTokens = [
                'barbell' => 'barbell',
                'dumbbell' => 'dumbbell',
                'kettlebell' => 'kettlebell',
                'cable' => 'cable machine',
                'smith machine' => 'smith machine',
                'leg press' => 'leg press',
                'lat pulldown' => 'lat pulldown',
                'treadmill' => 'treadmill',
            ];

            foreach ($equipmentTokens as $token => $requiredEquipment) {
                if (! str_contains($text, $token)) {
                    continue;
                }

                if ($equipment === [] || ! $this->containsEquipment($equipment, $requiredEquipment)) {
                    throw new PlannerValidationException('Workout output uses equipment that is not available in the home setup.');
                }
            }
        }

        foreach ((array) ($workout['weekly_schedule'] ?? []) as $day) {
            if (strtolower((string) ($day['session_type'] ?? '')) !== 'train') {
                continue;
            }

            $focus = strtolower(trim((string) ($day['focus'] ?? '')));
            $allowedCategories = $this->allowedCategoriesForFocus($focus);
            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $rest = (int) ($exercise['rest_sec'] ?? 0);
                if ($rest < 60 || $rest > 180) {
                    throw new PlannerValidationException('Workout rest intervals must stay between 60 and 180 seconds.');
                }

                if ($allowedCategories === []) {
                    continue;
                }

                $exerciseCategory = $this->exerciseCategoryByName((string) ($exercise['name'] ?? ''));
                if ($exerciseCategory !== '' && ! in_array($exerciseCategory, $allowedCategories, true)) {
                    $exerciseName = trim((string) ($exercise['name'] ?? 'Exercise'));
                    throw new PlannerValidationException(sprintf(
                        "Workout split '%s' does not match exercise '%s'.",
                        $focus !== '' ? $focus : 'train',
                        $exerciseName !== '' ? $exerciseName : 'Exercise'
                    ));
                }
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertAdaptiveReview(array $adaptiveReview): void
    {
        $reviewAfterDays = (int) ($adaptiveReview['review_after_days'] ?? 0);

        if (! in_array($reviewAfterDays, [14, 21, 28], true)) {
            throw new PlannerValidationException('Adaptive review window must be 14, 21, or 28 days.');
        }
    }

    private function containsEquipment(array $equipment, string $requiredEquipment): bool
    {
        $requiredEquipment = strtolower($requiredEquipment);

        foreach ($equipment as $item) {
            if (str_contains($item, $requiredEquipment) || str_contains($requiredEquipment, $item)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $text = trim((string) $item);
            if ($text !== '') {
                $items[] = $text;
            }
        }

        return array_values(array_unique($items));
    }

    private function allergyNeedles(string $allergy): array
    {
        $normalized = strtolower(trim($allergy));
        if ($normalized === '') {
            return [];
        }

        $needles = [$normalized];

        if (str_ends_with($normalized, 's') && strlen($normalized) > 4) {
            $needles[] = rtrim($normalized, 's');
        }

        foreach (preg_split('/[\s\-\/]+/', $normalized) ?: [] as $part) {
            $part = trim($part);
            if (strlen($part) >= 4) {
                $needles[] = $part;
            }
        }

        return array_values(array_unique($needles));
    }

    private function allowedCategoriesForFocus(string $focus): array
    {
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
        $name = strtolower(trim($name));
        if ($name === '') {
            return '';
        }
        if ($this->containsAny($name, ['squat', 'lunge', 'leg', 'hamstring', 'calf', 'quad', 'glute', 'hip thrust', 'deadlift', 'abduction', 'adduction', 'hip abduction', 'hip adduction'])) {
            return 'lower';
        }
        if ($this->containsAny($name, ['row', 'pulldown', 'pull', 'lat pulldown', 'bicep', 'curl', 'rear delt', 'face pull'])) {
            return 'pull';
        }
        if ($this->containsAny($name, ['press', 'chest', 'shoulder', 'tricep', 'dip', 'fly', 'push', 'lateral raise'])) {
            return 'push';
        }
        if ($this->containsAny($name, ['plank', 'dead bug', 'crunch', 'core', 'oblique', 'ab'])) {
            return 'core';
        }

        return '';
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        $haystack = strtolower($haystack);
        foreach ($needles as $needle) {
            $needle = strtolower(trim((string) $needle));
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
