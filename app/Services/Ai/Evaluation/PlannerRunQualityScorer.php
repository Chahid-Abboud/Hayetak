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
        $allergyLeaks = $this->detectAllergyLeaks(
            is_array(data_get($plan, 'diet')) ? data_get($plan, 'diet') : [],
            $profileSafety['allergies'] ?? []
        );
        $dietTypeLeaks = $this->detectDietTypeLeaks(
            is_array(data_get($plan, 'diet')) ? data_get($plan, 'diet') : [],
            (string) ($profileSafety['diet_type'] ?? '')
        );
        $medicalConditionConflicts = $this->detectMedicalConditionConflicts(
            is_array(data_get($plan, 'diet')) ? data_get($plan, 'diet') : [],
            $profileSafety['medical_conditions'] ?? []
        );
        $injuryConflicts = $this->detectInjuryUnsafeExercises(
            $weekly,
            $profileSafety['injuries'] ?? []
        );
        $equipmentConflicts = $this->detectEquipmentLocationConflicts(
            $weekly,
            (string) ($profileSafety['workout_location'] ?? ''),
            $profileSafety['available_equipment'] ?? []
        );

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
            'allergy_leakage_absent' => $allergyLeaks === [],
            'allergies_respected' => $allergyLeaks === [],
            'diet_type_respected' => $dietTypeLeaks === [],
            'strict_diet_type_respected' => $dietTypeLeaks === [],
            'medical_condition_conflicts_absent' => $medicalConditionConflicts === [],
            'breakfast_clean' => $this->mealGroupIsClean($mealOptions['breakfast'] ?? [], 'breakfast'),
            'lunch_dinner_clean' => $this->mealGroupIsClean($mealOptions['lunch'] ?? [], 'lunch') && $this->mealGroupIsClean($mealOptions['dinner'] ?? [], 'dinner'),
            'training_days_no_recovery_moves' => $this->trainingDaysContainNoRecoveryMoves($weekly),
            'injury_unsafe_exercises_absent' => $injuryConflicts === [],
            'location_equipment_respected' => $equipmentConflicts === [],
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
            'safety_findings' => [
                'allergy_leaks' => $allergyLeaks,
                'diet_type_leaks' => $dietTypeLeaks,
                'medical_condition_conflicts' => $medicalConditionConflicts,
                'injury_conflicts' => $injuryConflicts,
                'equipment_conflicts' => $equipmentConflicts,
            ],
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
        $resolved['medical_conditions'] = $this->normalizeList($profile['medical_conditions'] ?? $resolved['medical_conditions'] ?? []);
        $resolved['injuries'] = $this->normalizeList($profile['injury_history'] ?? $profile['injuries'] ?? $resolved['injuries'] ?? []);
        $resolved['available_equipment'] = $this->normalizeList($profile['available_equipment'] ?? $resolved['available_equipment'] ?? []);
        $resolved['workout_location'] = trim((string) ($profile['workout_location'] ?? $resolved['workout_location'] ?? $user->workout_location ?? ''));

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

    private function detectAllergyLeaks(array $diet, array $allergies): array
    {
        $findings = [];
        $itemNames = $this->collectDietTextCandidates($diet);

        foreach ($allergies as $allergy) {
            $allergy = trim((string) $allergy);
            if ($allergy === '') {
                continue;
            }

            foreach ($this->allergyNeedles($allergy) as $needle) {
                $matchedSource = $this->firstDietCandidateMatch($itemNames, $needle);
                if ($needle !== '' && $matchedSource !== null) {
                    $findings[] = [
                        'allergy' => $allergy,
                        'matched_needle' => $needle,
                        'matched_source' => $matchedSource,
                    ];
                    break;
                }
            }
        }

        return array_values($findings);
    }

    private function detectDietTypeLeaks(array $diet, string $dietType): array
    {
        $dietType = mb_strtolower(trim($dietType));
        if ($dietType === '') {
            return [];
        }

        $findings = [];
        $itemNames = $this->collectDietTextCandidates($diet);

        foreach ($this->blockedDietNeedles($dietType) as $needle) {
            $matchedSource = $this->firstDietCandidateMatch($itemNames, $needle);
            if ($matchedSource === null) {
                continue;
            }

            if ($this->dietTypeLeakShouldBeIgnored($dietType, $needle, $matchedSource)) {
                continue;
            }

            $findings[] = [
                'diet_type' => $dietType,
                'matched_needle' => $needle,
                'matched_source' => $matchedSource,
            ];
        }

        return array_values($findings);
    }

    private function detectMedicalConditionConflicts(array $diet, array $medicalConditions): array
    {
        if ($medicalConditions === []) {
            return [];
        }

        $findings = [];
        $itemNames = $this->collectDietTextCandidates($diet);

        foreach ($medicalConditions as $condition) {
            $condition = mb_strtolower(trim((string) $condition));
            if ($condition === '') {
                continue;
            }

            foreach ($this->medicalConditionBlockedNeedles($condition) as $needle) {
                $matchedSource = $this->firstDietCandidateMatch($itemNames, $needle);
                if ($matchedSource === null) {
                    continue;
                }

                $findings[] = [
                    'medical_condition' => $condition,
                    'matched_needle' => $needle,
                    'matched_source' => $matchedSource,
                ];
                break;
            }
        }

        return array_values($findings);
    }

    private function detectInjuryUnsafeExercises(array $weekly, array $injuries): array
    {
        if ($injuries === []) {
            return [];
        }

        $findings = [];

        foreach ($weekly as $day) {
            if (mb_strtolower(trim((string) ($day['session_type'] ?? ''))) !== 'train') {
                continue;
            }

            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $name = trim((string) ($exercise['name'] ?? ''));
                if ($name === '' || ! $this->exerciseConflictsWithInjuries($name, $injuries)) {
                    continue;
                }

                $findings[] = [
                    'exercise' => $name,
                    'day_label' => trim((string) ($day['day_label'] ?? '')),
                    'focus' => trim((string) ($day['focus'] ?? '')),
                ];
            }
        }

        return array_values($findings);
    }

    private function detectEquipmentLocationConflicts(array $weekly, string $workoutLocation, array $availableEquipment): array
    {
        $location = mb_strtolower(trim($workoutLocation));
        if ($location !== 'home') {
            return [];
        }

        $equipment = array_map(
            static fn ($item): string => mb_strtolower(trim((string) $item)),
            $availableEquipment
        );

        $findings = [];

        foreach ($weekly as $day) {
            if (mb_strtolower(trim((string) ($day['session_type'] ?? ''))) !== 'train') {
                continue;
            }

            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $name = trim((string) ($exercise['name'] ?? ''));
                $exerciseEquipment = trim((string) ($exercise['equipment'] ?? ''));

                if ($name === '' || ! $this->exerciseNeedsUnavailableHomeEquipment($name, $exerciseEquipment, $equipment)) {
                    continue;
                }

                $findings[] = [
                    'exercise' => $name,
                    'equipment' => $exerciseEquipment,
                    'day_label' => trim((string) ($day['day_label'] ?? '')),
                ];
            }
        }

        return array_values($findings);
    }

    private function allergyNeedles(string $allergy): array
    {
        $normalized = mb_strtolower(trim($allergy));
        if ($normalized === '') {
            return [];
        }

        $needles = [$normalized];
        if (str_ends_with($normalized, 's') && mb_strlen($normalized) > 4) {
            $needles[] = rtrim($normalized, 's');
        }

        foreach (preg_split('/[\s\-\/]+/', $normalized) ?: [] as $part) {
            $part = trim($part);
            if (mb_strlen($part) >= 4) {
                $needles[] = $part;
            }
        }

        $needles = array_merge($needles, $this->allergyAssociatedFoodNeedles($normalized));

        return array_values(array_unique($needles));
    }

    private function blockedDietNeedles(string $dietType): array
    {
        $dietType = mb_strtolower(trim($dietType));

        return match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            str_contains($dietType, 'gluten-free'), str_contains($dietType, 'gluten free') => ['wheat', 'bread', 'pasta', 'bulgur', 'cracker'],
            str_contains($dietType, 'low fodmap'), str_contains($dietType, 'low-fodmap') => ['garlic', 'onion'],
            str_contains($dietType, 'dairy-free'), str_contains($dietType, 'dairy free') => ['milk', 'yogurt', 'cheese', 'labneh', 'cream', 'butter', 'whey'],
            default => [],
        };
    }

    private function medicalConditionBlockedNeedles(string $condition): array
    {
        return match (true) {
            str_contains($condition, 'hypertension'), str_contains($condition, 'blood pressure') => [
                'energy drink', 'pre-workout', 'pre workout', 'salted chips', 'instant ramen',
            ],
            str_contains($condition, 'diabetes'), str_contains($condition, 'prediabetes') => [
                'soda', 'cola', 'sweet tea', 'sugary juice', 'candy bar',
            ],
            str_contains($condition, 'reflux'), str_contains($condition, 'gerd') => [
                'energy drink', 'coffee shot', 'hot sauce', 'deep fried',
            ],
            str_contains($condition, 'fatty liver') => [
                'beer', 'wine', 'vodka', 'whiskey', 'tequila', 'alcohol',
            ],
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

    private function containsNeedlePhrase(string $text, string $needle): bool
    {
        $text = mb_strtolower($text);
        $needle = mb_strtolower(trim($needle));

        if ($needle === '') {
            return false;
        }

        return preg_match('/(^|[^a-z0-9])'.preg_quote($needle, '/').'([^a-z0-9]|$)/', $text) === 1;
    }

    private function collectDietTextCandidates(array $diet): array
    {
        $candidates = [];

        foreach ((array) ($diet['meal_options'] ?? []) as $meals) {
            foreach ((array) $meals as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name !== '') {
                        $candidates[] = $name;
                    }
                }
            }
        }

        foreach ((array) ($diet['days'] ?? []) as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name !== '') {
                        $candidates[] = $name;
                    }
                }
            }
        }

        foreach ((array) ($diet['grocery_list'] ?? []) as $grocery) {
            if (is_string($grocery)) {
                $name = trim($grocery);
            } else {
                $name = trim((string) data_get($grocery, 'name', ''));
            }

            if ($name !== '') {
                $candidates[] = $name;
            }
        }

        return array_values(array_unique($candidates));
    }

    private function firstDietCandidateMatch(array $candidates, string $needle): ?string
    {
        foreach ($candidates as $candidate) {
            if ($this->containsNeedlePhrase($candidate, $needle)) {
                return $candidate;
            }
        }

        return null;
    }

    private function dietTypeLeakShouldBeIgnored(string $dietType, string $needle, string $matchedSource): bool
    {
        $dietType = mb_strtolower(trim($dietType));
        $matchedSource = mb_strtolower(trim($matchedSource));

        if (str_contains($dietType, 'gluten') && str_contains($matchedSource, 'gluten-free')) {
            return true;
        }

        if (str_contains($dietType, 'low fodmap') && str_contains($matchedSource, 'low fodmap')) {
            return true;
        }

        return false;
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

    private function exerciseConflictsWithInjuries(string $name, array $injuries): bool
    {
        $blockedMoves = [];
        $injuryText = mb_strtolower(implode(' ', $injuries));

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

        return $this->containsAny(mb_strtolower($name), array_values(array_unique($blockedMoves)));
    }

    private function exerciseNeedsUnavailableHomeEquipment(string $name, string $exerciseEquipment, array $equipment): bool
    {
        $equipmentText = mb_strtolower(trim($exerciseEquipment));
        $nameText = mb_strtolower(trim($name));
        if ($equipmentText === '' || str_contains($equipmentText, 'bodyweight')) {
            return false;
        }

        $needles = ['barbell', 'cable', 'smith machine', 'leg press', 'lat pulldown', 'machine', 'treadmill'];
        if (! $this->containsAny($equipmentText.' '.$nameText, $needles)) {
            return false;
        }

        foreach ($equipment as $item) {
            if ($item !== '' && (str_contains($equipmentText, $item) || str_contains($item, $equipmentText))) {
                return false;
            }
        }

        return true;
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
