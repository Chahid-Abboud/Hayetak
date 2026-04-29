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

        if (! is_array($diet['meal_options'] ?? null)) {
            throw new PlannerValidationException('Diet plan must contain meal option groups.');
        }

        if (! is_array($diet['days'] ?? null) || count($diet['days']) !== $planHorizonDays) {
            throw new PlannerValidationException("Diet plan must contain exactly {$planHorizonDays} day entries.");
        }

        if (! is_array($workout['weekly_schedule'] ?? null) || count($workout['weekly_schedule']) !== 7) {
            throw new PlannerValidationException('Workout plan must contain exactly 7 weekly schedule entries.');
        }

        $this->assertDietTargetSanity($diet);
        $this->assertDietMealOptions($diet);
        $this->assertDietMealConsistency($diet);
        $this->assertDietVariety($diet);
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
    private function assertDietMealOptions(array $diet): void
    {
        $dailyCalories = max(1000, (int) (($diet['daily_targets']['calories_kcal'] ?? 0)));

        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealCode) {
            $options = is_array($diet['meal_options'][$mealCode] ?? null)
                ? array_values($diet['meal_options'][$mealCode])
                : [];

            if (count($options) < 3 || count($options) > 7) {
                throw new PlannerValidationException(sprintf(
                    "Diet meal options for '%s' must contain between 3 and 7 options.",
                    $mealCode
                ));
            }

            foreach ($options as $optionIndex => $option) {
                $this->assertSingleMealDefinition(
                    $option,
                    $mealCode,
                    $dailyCalories,
                    sprintf('%s option %d', $mealCode, $optionIndex + 1)
                );
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertDietMealConsistency(array $diet): void
    {
        $dailyCalories = max(1000, (int) (($diet['daily_targets']['calories_kcal'] ?? 0)));
        $requiredMealCodes = ['breakfast', 'lunch', 'dinner', 'snack'];
        $days = is_array($diet['days'] ?? null) ? $diet['days'] : [];
        $optionSignatures = [];

        foreach ($requiredMealCodes as $mealCode) {
            $optionSignatures[$mealCode] = array_values(array_map(
                fn (array $meal): string => $this->mealSignature($meal, $mealCode),
                is_array($diet['meal_options'][$mealCode] ?? null) ? array_values($diet['meal_options'][$mealCode]) : []
            ));
        }

        foreach ($days as $dayIndex => $day) {
            $meals = is_array($day['meals'] ?? null) ? $day['meals'] : [];
            $mealCodes = [];

            foreach ($meals as $mealIndex => $meal) {
                $mealCode = strtolower(trim((string) ($meal['meal_code'] ?? 'snack')));
                $mealCodes[] = $mealCode;
                $this->assertSingleMealDefinition(
                    $meal,
                    $mealCode,
                    $dailyCalories,
                    sprintf('day %d meal %d', $dayIndex + 1, $mealIndex + 1)
                );

                $signature = $this->mealSignature($meal, $mealCode);
                if ($signature === '' || ! in_array($signature, $optionSignatures[$mealCode] ?? [], true)) {
                    throw new PlannerValidationException(sprintf(
                        'Diet day %d contains a %s meal that does not match the advertised meal options.',
                        $dayIndex + 1,
                        $mealCode
                    ));
                }
            }

            foreach ($requiredMealCodes as $requiredMealCode) {
                if (! in_array($requiredMealCode, $mealCodes, true)) {
                    throw new PlannerValidationException(sprintf(
                        "Diet day %d is missing required meal '%s'.",
                        $dayIndex + 1,
                        $requiredMealCode
                    ));
                }
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertDietVariety(array $diet): void
    {
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealCode) {
            $options = is_array($diet['meal_options'][$mealCode] ?? null)
                ? array_values($diet['meal_options'][$mealCode])
                : [];
            if ($options === []) {
                continue;
            }

            $signatures = array_values(array_filter(array_map(
                fn (array $meal): string => $this->mealSignature($meal, $mealCode),
                $options
            )));

            if (count(array_unique($signatures)) !== count($options)) {
                throw new PlannerValidationException(sprintf(
                    "Diet variety is too low for '%s'.",
                    $mealCode
                ));
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertSingleMealDefinition(array $meal, string $mealCode, int $dailyCalories, string $context): void
    {
        $mealCode = $this->normalizeMealCode($mealCode);
        $targetKcal = (int) ($meal['target_kcal'] ?? 0);
        if ($targetKcal <= 0) {
            throw new PlannerValidationException(sprintf(
                'Diet meal target calories are missing for %s.',
                $context
            ));
        }

        [$targetMin, $targetMax] = $this->mealTargetBounds($mealCode, $dailyCalories);
        if ($targetKcal < $targetMin || $targetKcal > $targetMax) {
            throw new PlannerValidationException(sprintf(
                "Meal '%s' calories are outside a realistic range for this profile.",
                $mealCode !== '' ? $mealCode : 'unknown'
            ));
        }

        $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
        if ($items === []) {
            throw new PlannerValidationException(sprintf(
                "Meal '%s' must contain at least one item.",
                $mealCode !== '' ? $mealCode : 'unknown'
            ));
        }

        $sum = 0;
        foreach ($items as $item) {
            $name = trim((string) ($item['name'] ?? ''));
            if ($name === '') {
                throw new PlannerValidationException('Diet meal item name cannot be empty.');
            }
            if (
                $this->looksQuestionableFoodName($name)
                || ($mealCode !== 'snack' && ($this->looksLikeSnackOrDrink($name) || $this->looksLikeStandaloneSnack($name)))
            ) {
                throw new PlannerValidationException(sprintf(
                    "Meal item '%s' does not fit a realistic %s.",
                    $name,
                    $mealCode !== '' ? $mealCode : 'meal'
                ));
            }

            $itemCalories = (int) ($item['calories_kcal'] ?? 0);
            if ($itemCalories < 40 || $itemCalories > 1400) {
                throw new PlannerValidationException(sprintf(
                    "Meal item '%s' has unrealistic calories for one portion.",
                    $name
                ));
            }

            $portion = (string) ($item['portion'] ?? '');
            if (! $this->isReasonablePortion($portion) || ! $this->portionMatchesMealName($name, $portion)) {
                throw new PlannerValidationException(sprintf(
                    "Meal item '%s' has an unrealistic serving portion.",
                    $name
                ));
            }

            $macroCalories = ((int) ($item['protein_g'] ?? 0) * 4)
                + ((int) ($item['carbs_g'] ?? 0) * 4)
                + ((int) ($item['fat_g'] ?? 0) * 9);
            if ($macroCalories < (int) round($itemCalories * 0.60) || $macroCalories > (int) round($itemCalories * 1.30)) {
                throw new PlannerValidationException(sprintf(
                    "Meal item '%s' has unrealistic macros for its calories.",
                    $name
                ));
            }

            $sum += $itemCalories;
        }

        $lower = (int) floor($targetKcal * 0.60);
        $upper = (int) ceil($targetKcal * 1.45);
        if ($sum < $lower || $sum > $upper) {
            throw new PlannerValidationException(sprintf(
                "Meal '%s' calories are inconsistent with its target.",
                $mealCode !== '' ? $mealCode : 'unknown'
            ));
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
                if ($needle !== '' && $this->containsNeedlePhrase($text, $needle)) {
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
            if ($this->containsNeedlePhrase($text, $item)) {
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
        $expectedLabels = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];

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
            $dayIndex = (int) ($day['day_index'] ?? 0);
            $dayLabel = trim((string) ($day['day_label'] ?? ''));
            if (! isset($expectedLabels[$dayIndex]) || $dayLabel !== $expectedLabels[$dayIndex]) {
                throw new PlannerValidationException('Workout day labels must run Monday through Sunday in order.');
            }

            if (strtolower((string) ($day['session_type'] ?? '')) !== 'train') {
                continue;
            }

            $focus = strtolower(trim((string) ($day['focus'] ?? '')));
            $allowedCategories = $this->allowedCategoriesForFocus($focus);
            $exercises = is_array($day['exercises'] ?? null) ? array_values($day['exercises']) : [];
            if (count($exercises) < 4 || count($exercises) > 6) {
                throw new PlannerValidationException('Workout training days must contain between 4 and 6 exercises.');
            }
            foreach ($exercises as $exercise) {
                $exerciseName = trim((string) ($exercise['name'] ?? 'Exercise'));
                if ($exerciseName === '' || $this->looksGenericExerciseName($exerciseName)) {
                    throw new PlannerValidationException('Workout output contains a placeholder exercise name.');
                }
                if ($this->looksRecoveryStyleExercise($exerciseName)) {
                    throw new PlannerValidationException('Workout training days cannot contain recovery or mobility drills in the main exercise list.');
                }
                if ($this->exerciseConflictsWithInjuries($exerciseName, $injuries)) {
                    throw new PlannerValidationException('Workout output conflicts with the saved injury history.');
                }

                $exerciseEquipment = trim((string) ($exercise['equipment'] ?? ''));
                if ($location === 'home' && $this->exerciseNeedsUnavailableHomeEquipment($exerciseName, $exerciseEquipment, $equipment)) {
                    throw new PlannerValidationException('Workout output uses equipment that is not available in the home setup.');
                }

                $rest = (int) ($exercise['rest_sec'] ?? 0);
                if ($rest < 60 || $rest > 180) {
                    throw new PlannerValidationException('Workout rest intervals must stay between 60 and 180 seconds.');
                }

                if ($allowedCategories === []) {
                    continue;
                }

                $exerciseCategory = $this->exerciseCategoryByName((string) ($exercise['name'] ?? ''));
                if ($exerciseCategory !== '' && ! in_array($exerciseCategory, $allowedCategories, true)) {
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

    private function mealTargetBounds(string $mealCode, int $dailyCalories): array
    {
        $mealCode = strtolower(trim($mealCode));

        $expected = match ($mealCode) {
            'breakfast' => (int) round($dailyCalories * 0.30),
            'lunch' => (int) round($dailyCalories * 0.35),
            'dinner' => (int) round($dailyCalories * 0.30),
            'snack' => (int) round($dailyCalories * 0.08),
            default => (int) round($dailyCalories * 0.25),
        };

        if ($mealCode === 'snack') {
            $min = max(80, (int) round($expected * 0.60));
            $max = max($min + 40, (int) round($expected * 1.90));

            return [$min, $max];
        }

        $min = max(180, (int) round($expected * 0.65));
        $max = max($min + 60, (int) round($expected * 1.45));

        return [$min, $max];
    }

    private function isReasonablePortion(string $portion): bool
    {
        $portion = strtolower(trim($portion));
        if ($portion === '') {
            return true;
        }

        if (! preg_match('/(\d+(?:\.\d+)?)/', $portion, $matches)) {
            return true;
        }

        $amount = (float) $matches[1];
        if ($amount <= 0) {
            return false;
        }

        if (str_contains($portion, 'serving')) {
            return $amount >= 0.25 && $amount <= 4.0;
        }

        if (str_contains($portion, 'g')) {
            return $amount >= 20.0 && $amount <= 700.0;
        }

        if (str_contains($portion, 'ml')) {
            return $amount >= 40.0 && $amount <= 1000.0;
        }

        return $amount <= 4.0;
    }

    private function portionMatchesMealName(string $name, string $portion): bool
    {
        $name = strtolower(trim($name));
        $portion = strtolower(trim($portion));

        if ($name === '' || $portion === '' || in_array($portion, ['1 serving', '1 portion'], true)) {
            return true;
        }

        if (str_contains($portion, 'slice')) {
            return $this->containsAny($name, ['toast', 'bread', 'sandwich', 'cheese']);
        }

        if (str_contains($portion, 'wrap')) {
            return str_contains($name, 'wrap');
        }

        if (str_contains($portion, 'sandwich')) {
            return str_contains($name, 'sandwich');
        }

        if (str_contains($portion, 'bowl')) {
            return $this->containsAny($name, [
                'bowl',
                'salad',
                'soup',
                'oat',
                'oats',
                'yogurt',
                'labneh',
                'cottage cheese',
                'hummus',
                'rice',
                'quinoa',
                'bulgur',
                'pasta',
                'lentil',
                'chickpea',
                'potato',
            ]);
        }

        if (str_contains($portion, 'plate')) {
            return $this->containsAny($name, [
                'plate',
                'platter',
                'tray',
                'salad',
                'meal',
                'fattoush',
            ]);
        }

        if ($this->containsAny($portion, ['pcs', 'piece'])) {
            if ($this->containsAny($name, ['egg', 'apple', 'banana', 'pear', 'orange', 'cracker', 'rice cake'])) {
                return true;
            }

            return ! $this->containsAny($name, [
                'chicken',
                'turkey',
                'beef',
                'fish',
                'salmon',
                'tuna',
                'shrimp',
                'tofu',
                'paneer',
                'rice',
                'quinoa',
                'pasta',
                'potato',
                'oat',
                'yogurt',
                'labneh',
            ]);
        }

        return true;
    }

    private function normalizeMealCode(string $value): string
    {
        $value = strtolower(trim($value));

        return match (true) {
            str_contains($value, 'break') => 'breakfast',
            str_contains($value, 'lunch') => 'lunch',
            str_contains($value, 'dinner') => 'dinner',
            default => 'snack',
        };
    }

    private function mealSignature(array $meal, string $fallbackMealCode = 'snack'): string
    {
        $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? $fallbackMealCode));
        $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
        $parts = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $name = strtolower(trim((string) ($item['name'] ?? '')));
            $portion = strtolower(trim((string) ($item['portion'] ?? '')));
            if ($name === '') {
                continue;
            }

            $parts[] = $name.'|'.$portion;
        }

        if ($parts === []) {
            $title = strtolower(trim((string) ($meal['title'] ?? '')));

            return $title === '' ? '' : $mealCode.'|'.$title;
        }

        return $mealCode.'|'.implode('||', $parts);
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

        $needles = array_merge($needles, $this->allergyAssociatedFoodNeedles($normalized));

        return array_values(array_unique($needles));
    }

    private function allergyAssociatedFoodNeedles(string $allergy): array
    {
        return match (true) {
            str_contains($allergy, 'milk'), str_contains($allergy, 'dairy'), str_contains($allergy, 'lactose') => [
                'milk', 'dairy', 'yogurt', 'greek yogurt', 'cheese', 'labneh', 'cottage cheese', 'whey', 'butter', 'cream', 'paneer',
            ],
            str_contains($allergy, 'egg') => ['egg'],
            str_contains($allergy, 'soy') => ['soy', 'tofu', 'edamame', 'tempeh', 'soy milk'],
            str_contains($allergy, 'peanut') => ['peanut', 'groundnut', 'peanut butter'],
            str_contains($allergy, 'tree nut'), str_contains($allergy, 'nut') => ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'nut butter'],
            str_contains($allergy, 'sesame') => ['sesame', 'tahini'],
            str_contains($allergy, 'gluten'), str_contains($allergy, 'wheat') => ['wheat', 'bread', 'pasta', 'bulgur', 'cracker'],
            str_contains($allergy, 'shellfish') => ['shrimp', 'prawn', 'crab', 'lobster'],
            str_contains($allergy, 'fish') => ['fish', 'salmon', 'tuna', 'cod'],
            default => [],
        };
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

    private function containsNeedlePhrase(string $text, string $needle): bool
    {
        $text = strtolower($text);
        $needle = strtolower(trim($needle));

        if ($needle === '') {
            return false;
        }

        return preg_match('/(^|[^a-z0-9])'.preg_quote($needle, '/').'([^a-z0-9]|$)/', $text) === 1;
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
        ]);
    }

    private function looksGenericExerciseName(string $name): bool
    {
        $name = strtolower(trim($name));

        return $name === ''
            || str_starts_with($name, 'debug ')
            || in_array($name, ['exercise', 'strength exercise', 'cardio movement', 'mobility drill'], true);
    }

    private function looksRecoveryStyleExercise(string $name): bool
    {
        $text = strtolower(trim($name));
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

    private function exerciseConflictsWithInjuries(string $name, array $injuries): bool
    {
        $blockedMoves = [];
        $injuryText = strtolower(implode(' ', $injuries));
        if (str_contains($injuryText, 'knee')) {
            $blockedMoves = array_merge($blockedMoves, ['jump squat', 'plyometric squat', 'depth jump', 'box jump']);
        }
        if (str_contains($injuryText, 'shoulder')) {
            $blockedMoves = array_merge($blockedMoves, ['upright row', 'behind the neck press', 'arnold press']);
        }
        if (str_contains($injuryText, 'lower back') || str_contains($injuryText, 'back')) {
            $blockedMoves = array_merge($blockedMoves, ['good morning', 'max deadlift', 'heavy barbell row']);
        }
        if (str_contains($injuryText, 'elbow')) {
            $blockedMoves[] = 'skull crusher';
        }
        if (str_contains($injuryText, 'wrist')) {
            $blockedMoves[] = 'handstand push-up';
        }

        return $this->containsAny($name, array_values(array_unique($blockedMoves)));
    }

    private function exerciseNeedsUnavailableHomeEquipment(string $name, string $exerciseEquipment, array $equipment): bool
    {
        $equipmentText = strtolower(trim($exerciseEquipment));
        $nameText = strtolower(trim($name));
        if ($equipmentText === '' || str_contains($equipmentText, 'bodyweight')) {
            return false;
        }

        $needles = ['barbell', 'cable', 'smith machine', 'leg press', 'lat pulldown', 'machine', 'treadmill'];
        if (! $this->containsAny($equipmentText.' '.$nameText, $needles)) {
            return false;
        }

        return ! $this->containsEquipment($equipment, $exerciseEquipment);
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
        if ($this->containsAny($name, ['stretch', 'mobility', 'foam roll', 'walk', 'breathing', 'activation', 'recovery'])) {
            return '';
        }
        if ($this->containsAny($name, ['squat', 'lunge', 'leg', 'hamstring', 'calf', 'quad', 'glute', 'thigh', 'hip thrust', 'deadlift', 'abduction', 'adduction', 'hip abduction', 'hip adduction'])) {
            return 'lower';
        }
        if ($this->containsAny($name, ['row', 'pulldown', 'pull', 'lat pulldown', 'bicep', 'curl', 'rear delt', 'face pull'])) {
            return 'pull';
        }
        if ($this->containsAny($name, ['press', 'chest', 'shoulder', 'tricep', 'dip', 'push', 'lateral raise', 'chest fly', 'pec fly', 'pec deck'])) {
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
