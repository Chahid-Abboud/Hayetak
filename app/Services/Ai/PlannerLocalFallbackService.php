<?php

namespace App\Services\Ai;

use App\Models\Exercise;
use App\Models\User;
use App\Services\Ai\FoodCatalog\PlannerFoodModel;

class PlannerLocalFallbackService
{
    public function __construct(
        private readonly PlannerFoodModel $plannerFoodModel,
    ) {}

    private function plannerSeed(User $user, array $profile, string $goalText): int
    {
        $parts = [
            'uid:'.(int) $user->id,
            'diet:'.strtolower(trim((string) ($profile['diet_type'] ?? ''))),
            'goal:'.strtolower(trim($goalText)),
            'days:'.(int) ($profile['workout_days_per_week'] ?? 0),
            'location:'.strtolower(trim((string) ($profile['workout_location'] ?? ''))),
            'allergies:'.implode(',', array_map('strtolower', $this->normalizeList($profile['allergies'] ?? []))),
            'injuries:'.implode(',', array_map('strtolower', $this->normalizeList($profile['injury_history'] ?? []))),
            'equipment:'.implode(',', array_map('strtolower', $this->normalizeList($profile['available_equipment'] ?? []))),
        ];

        return (int) sprintf('%u', crc32(implode('|', $parts)));
    }

    private function normalizePlanHorizonDays(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    public function build(User $user, array $profile, int $planHorizonDays, array $context = []): array
    {
        $days = $this->normalizePlanHorizonDays($planHorizonDays);
        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));
        $goalText = strtolower(trim((string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? '')));
        $seed = $this->plannerSeed($user, $profile, $goalText);

        $allergies = $this->normalizeList($profile['allergies'] ?? []);
        $medicalConditions = $this->normalizeList($profile['medical_conditions'] ?? []);
        $injuries = $this->normalizeList($profile['injury_history'] ?? []);
        $availableEquipment = $this->normalizeList($profile['available_equipment'] ?? []);
        $location = $this->normalizeWorkoutLocation($profile['workout_location'] ?? null);

        $blockedNeedles = array_values(array_unique(array_merge(
            $this->blockedByDietType($dietType),
            $this->allergyNeedles($allergies),
        )));

        $targets = $this->buildTargets($user, $goalText);
        $mealCatalog = is_array($context['meal_catalog_hints'] ?? null) ? $context['meal_catalog_hints'] : [];
        $exerciseCatalog = is_array($context['exercise_catalog_hints'] ?? null) ? $context['exercise_catalog_hints'] : [];

        $dietDays = $this->buildDietDays($days, $targets, $dietType, $blockedNeedles, $mealCatalog, $profile, $seed);
        $workout = $this->buildWorkout($profile, $injuries, $exerciseCatalog, $location, $availableEquipment, $goalText, $seed);

        return [
            'overview' => [
                'summary' => 'A complete safety-first plan was generated automatically so your planning flow can continue without interruption.',
                'key_constraints' => array_values(array_filter(array_merge(
                    $allergies !== [] ? ['Saved allergies were enforced.'] : [],
                    $dietType !== '' ? ['Diet type rules were enforced.'] : [],
                    $medicalConditions !== [] ? ['Medical conditions were considered.'] : [],
                    $injuries !== [] ? ['Known injuries were considered in exercise selection.'] : [],
                    ['Plan includes full daily structure and realistic exercise naming.']
                ))),
                'assumptions' => [
                    'Portions can be adjusted based on progress and satiety.',
                    'Sessions should remain pain-free and controlled.',
                    'Sleep and hydration remain consistent during this plan window.',
                ],
            ],
            'safety' => [
                'hard_rules_observed' => [
                    'Allergy and diet-type constraints were applied.',
                    'Workout selection respects injury and location constraints.',
                    'Plan output remains structured and practical.',
                ],
                'food_avoidances' => $allergies !== [] ? $allergies : ['No explicit allergy was saved.'],
                'exercise_cautions' => $injuries !== []
                    ? array_map(fn (string $injury): string => 'Protect and monitor: '.$injury, $injuries)
                    : ['Stop any movement that causes sharp pain.'],
            ],
            'diet' => [
                'daily_targets' => $targets,
                'days' => $dietDays,
                'grocery_list' => $this->buildGroceryList($dietDays, $blockedNeedles),
                'meal_prep_notes' => [
                    'Batch-cook 2 proteins and 2 carb bases twice per week.',
                    'Pre-portion snacks and backup meals to improve adherence.',
                    'Keep one quick no-cook meal option for busy days.',
                ],
                'adherence_notes' => [
                    'Keep meal timing and hydration consistent each day.',
                    'If hunger is high, increase vegetables before increasing calorie-dense foods.',
                    'Track meals daily so the next regeneration can personalize better.',
                ],
            ],
            'workout' => $workout,
            'adaptive_review' => [
                'review_after_days' => $days,
                'checkpoints' => ['Body-weight trend', 'Protein adherence', 'Workout completion rate', 'Pain or fatigue changes'],
                'replanning_triggers' => ['Pain increases during sessions', 'Less than 60% plan adherence for a full week', 'Persistent low energy for more than 4 days'],
                'next_data_to_collect' => ['Average daily calories', 'Average daily protein', 'Sessions completed vs planned', 'Sleep and soreness notes'],
            ],
            'ml_readiness' => [
                'candidate_features' => ['weight_kg', 'goal', 'diet_type', 'workout_days_per_week', 'adherence_rate'],
                'candidate_targets' => ['weekly_weight_change', 'plan_completion_score', 'regeneration_need'],
                'notes' => 'This output stays deterministic to preserve continuity between regenerations.',
            ],
        ];
    }

    private function buildTargets(User $user, string $goalText): array
    {
        $weight = (float) ($user->weight_kg ?: 70.0);
        $weight = max(45.0, min(220.0, $weight));

        $isCut = $this->containsAny($goalText, ['lose', 'loss', 'cut', 'deficit', 'fat']);
        $isGain = $this->containsAny($goalText, ['gain', 'bulk', 'muscle', 'hypertrophy']);

        $calories = match (true) {
            $isCut => (int) round($weight * 24),
            $isGain => (int) round($weight * 33),
            default => (int) round($weight * 28),
        };
        $calories = max(1400, min(3600, $calories));

        $protein = max(90, min(220, (int) round($weight * ($isGain ? 2.0 : 1.8))));
        $fat = max(45, min(110, (int) round($weight * 0.8)));
        $carbs = max(90, min(420, (int) round(($calories - ($protein * 4) - ($fat * 9)) / 4)));
        $fiber = max(25, (int) round($calories / 80));
        $water = max(2000, min(4200, (int) round($weight * 35)));

        return [
            'calories_kcal' => $calories,
            'protein_g' => $protein,
            'carbs_g' => $carbs,
            'fat_g' => $fat,
            'fiber_g' => $fiber,
            'water_ml' => $water,
        ];
    }

    private function buildDietDays(
        int $days,
        array $targets,
        string $dietType,
        array $blockedNeedles,
        array $mealCatalog,
        array $profile,
        int $seed = 0
    ): array {
        $mealCodes = ['breakfast', 'lunch', 'dinner', 'snack'];
        $ratios = ['breakfast' => 0.28, 'lunch' => 0.34, 'dinner' => 0.30, 'snack' => 0.08];
        $themes = ['High-protein momentum day', 'Balanced recovery nutrition day', 'Fiber and hydration focus day', 'Consistency and adherence day'];
        $library = $this->fallbackMealLibrary($dietType);
        $lastUsed = [];
        $usedSnackNames = [];
        $result = [];

        for ($day = 1; $day <= $days; $day++) {
            $meals = [];
            $daySeed = $seed + ($day * 13);
            foreach ($mealCodes as $index => $mealCode) {
                $ratio = $ratios[$mealCode] ?? 0.25;
                $targetKcal = max(80, (int) round($targets['calories_kcal'] * $ratio));
                $candidates = $this->dietMealCandidates($mealCode, $mealCatalog, $library[$mealCode] ?? []);
                $catalogCandidates = $this->catalogMealCandidates($mealCode, $mealCatalog);
                $candidates = array_values(array_filter($candidates, fn (string $name): bool => ! $this->containsBlockedTerm($name, $blockedNeedles)));
                $catalogCandidates = array_values(array_filter($catalogCandidates, fn (string $name): bool => ! $this->containsBlockedTerm($name, $blockedNeedles)));
                if ($candidates === []) {
                    $candidates = [ucfirst($mealCode).' protein-focused option'];
                }
                $primaryCandidates = $this->preferredCandidatesForMeal($mealCode, $catalogCandidates, $candidates);

                if ($mealCode === 'snack') {
                    $selected = $this->pickUniqueSnackName($primaryCandidates, $daySeed + $index, $lastUsed[$mealCode] ?? null, $usedSnackNames);
                    if (trim($selected) === '') {
                        $selected = $this->pickUniqueSnackName($candidates, $daySeed + $index + 5, $lastUsed[$mealCode] ?? null, $usedSnackNames);
                    }
                    $usedSnackNames[] = strtolower($selected);
                } else {
                    $selected = $this->pickMealName($primaryCandidates, $daySeed + $index, $lastUsed[$mealCode] ?? null);
                    if (trim($selected) === '') {
                        $selected = $this->pickMealName($candidates, $daySeed + $index + 5, $lastUsed[$mealCode] ?? null);
                    }
                }
                $lastUsed[$mealCode] = strtolower($selected);

                $foodBackedItem = $this->plannerFoodModel->resolveMealItem(
                    $mealCode,
                    $targetKcal,
                    $profile,
                    $daySeed + $index,
                    $selected,
                    $mealCatalog
                );

                $meals[] = [
                    'meal_code' => $mealCode,
                    'title' => ucfirst($mealCode).' plan',
                    'target_kcal' => $targetKcal,
                    'items' => [[
                        'name' => $foodBackedItem['name'] ?? $selected,
                        'portion' => $foodBackedItem['portion'] ?? $this->portionFromCalories($targetKcal, $mealCode),
                        'calories_kcal' => (int) ($foodBackedItem['calories_kcal'] ?? $targetKcal),
                        'protein_g' => (int) ($foodBackedItem['protein_g'] ?? max(8, (int) round($targets['protein_g'] * $ratio))),
                        'carbs_g' => (int) ($foodBackedItem['carbs_g'] ?? max(6, (int) round($targets['carbs_g'] * $ratio))),
                        'fat_g' => (int) ($foodBackedItem['fat_g'] ?? max(3, (int) round($targets['fat_g'] * $ratio))),
                        'recipe_note' => $this->recipeNoteForMeal($mealCode),
                        'search_terms' => is_array($foodBackedItem['search_terms'] ?? null)
                            ? array_values($foodBackedItem['search_terms'])
                            : [$selected, 'healthy '.$mealCode, 'high protein '.$mealCode],
                        'alternatives' => is_array($foodBackedItem['alternatives'] ?? null)
                            ? array_values($foodBackedItem['alternatives'])
                            : $this->mealAlternatives($candidates, $selected),
                    ]],
                ];
            }

            $result[] = [
                'day_index' => $day,
                'theme' => $themes[($day - 1) % count($themes)],
                'meals' => $meals,
                'coaching_notes' => [
                    $day % 2 === 0 ? 'Keep sodium and hydration balanced for recovery.' : 'Prioritize protein distribution across all meals.',
                    'Use listed alternatives when ingredients are unavailable.',
                ],
            ];
        }

        return $result;
    }

    private function dietMealCandidates(string $mealCode, array $mealCatalog, array $fallback): array
    {
        $catalogItems = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];
        $catalogNames = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['name'] ?? '')),
            $catalogItems
        )));

        $all = array_merge($catalogNames, $fallback);
        $clean = [];
        foreach ($all as $name) {
            $item = trim((string) $name);
            if (
                $item !== ''
                && strlen($item) >= 4
                && $this->isAllowedCandidateForMeal($item, $mealCode)
            ) {
                $clean[] = $item;
            }
        }

        return array_values(array_unique($clean));
    }

    private function catalogMealCandidates(string $mealCode, array $mealCatalog): array
    {
        $catalogItems = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];

        return array_values(array_unique(array_values(array_filter(array_map(
            fn (array $item): string => $this->isAllowedCandidateForMeal((string) ($item['name'] ?? ''), $mealCode)
                ? trim((string) ($item['name'] ?? ''))
                : '',
            $catalogItems
        )))));
    }

    private function preferredCandidatesForMeal(string $mealCode, array $catalogCandidates, array $allCandidates): array
    {
        if ($mealCode === 'snack') {
            $filteredCatalog = array_values(array_filter(
                $catalogCandidates,
                fn (string $name): bool => ! $this->looksLikeJunkSnackOrDrink($name)
            ));

            if ($filteredCatalog !== []) {
                return $filteredCatalog;
            }

            $filteredAll = array_values(array_filter(
                $allCandidates,
                fn (string $name): bool => ! $this->looksLikeJunkSnackOrDrink($name)
            ));

            return $filteredAll !== [] ? $filteredAll : $allCandidates;
        }

        $filteredCatalog = array_values(array_filter($catalogCandidates, fn (string $name): bool => ! $this->looksLikeSnackOrDrink($name)));
        if ($filteredCatalog !== []) {
            return $filteredCatalog;
        }

        $filteredAll = array_values(array_filter($allCandidates, fn (string $name): bool => ! $this->looksLikeSnackOrDrink($name)));

        return $filteredAll !== [] ? $filteredAll : $allCandidates;
    }

    private function isAllowedCandidateForMeal(string $name, string $mealCode): bool
    {
        $candidate = trim($name);
        if ($candidate === '') {
            return false;
        }

        if ($this->looksQuestionableFoodName($candidate)) {
            return false;
        }

        if ($mealCode === 'snack') {
            return ! $this->looksLikeJunkSnackOrDrink($candidate);
        }

        return ! $this->looksLikeSnackOrDrink($candidate);
    }

    private function looksLikeSnackOrDrink(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        return $this->containsAny($text, [
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
            'gandour',
            'rice pops',
            'vodka',
            'dessert',
        ]);
    }

    private function looksLikeJunkSnackOrDrink(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        return $this->containsAny($text, [
            'chips',
            'wafer',
            'cookie',
            'biscuit',
            'ice cream',
            'cola',
            'soda',
            'energy drink',
            'soft drink',
            'candy',
            'chocolate bar',
            'protein wafer',
            'gandour',
            'rice pops',
            'pringles',
            'doritos',
            'cheetos',
            'snickers',
            'kitkat',
            'oreo',
            'nutella',
            'dessert',
        ]);
    }

    private function looksQuestionableFoodName(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return true;
        }

        return $this->containsAny($text, [
            'gandour',
            'rice pops',
            'snickers',
            'kitkat',
            'oreo',
            'doritos',
            'cheetos',
            'pringles',
            'nutella',
            'vodka',
            'beer',
            'wine',
            'tequila',
            'whiskey',
        ]);
    }

    private function fallbackMealLibrary(string $dietType): array
    {
        $isVegan = str_contains($dietType, 'vegan');
        $isVegetarian = str_contains($dietType, 'vegetarian');
        $isPescetarian = str_contains($dietType, 'pescetarian');

        return [
            'breakfast' => $isVegan
                ? ['Tofu scramble with oats', 'Overnight oats with chia and berries', 'Chickpea omelet with vegetables']
                : ['Greek yogurt with oats and berries', 'Egg and avocado wholegrain toast', 'Labneh bowl with cucumber and olives'],
            'lunch' => $isVegan
                ? ['Lentil and quinoa bowl', 'Chickpea salad with olive oil and lemon', 'Tofu rice vegetable stir-fry']
                : ($isPescetarian
                    ? ['Grilled salmon with rice and vegetables', 'Tuna quinoa salad bowl', 'Baked fish with potato and greens']
                    : ($isVegetarian
                        ? ['Lentil and rice bowl with salad', 'Halloumi quinoa vegetable plate', 'Chickpea pasta salad']
                        : ['Grilled chicken rice bowl', 'Turkey quinoa salad', 'Lean beef bulgur vegetable plate'])),
            'dinner' => $isVegan
                ? ['Baked tofu with sweet potato and broccoli', 'Lentil stew with mixed vegetables', 'Quinoa chickpea vegetable plate']
                : ($isPescetarian
                    ? ['Seared fish with roasted vegetables', 'Shrimp rice and salad plate', 'Baked salmon with potato wedges']
                    : ($isVegetarian
                        ? ['Vegetarian lentil soup with wholegrain bread', 'Eggplant chickpea tahini bowl', 'Paneer and vegetable skillet']
                        : ['Lemon chicken with potatoes and salad', 'Beef stir-fry with rice', 'Turkey and vegetable tray bake'])),
            'snack' => $isVegan
                ? [
                    'Hummus with carrot sticks',
                    'Protein smoothie with banana and oats',
                    'Apple slices with tahini',
                    'Edamame and cucumber cup',
                    'Chia pudding with berries',
                    'Banana oat shake',
                    'Pea protein yogurt cup',
                    'Apple and tahini snack box',
                    'Roasted edamame and berries',
                    'Tofu berry protein cup',
                    'Fruit and soy yogurt bowl',
                    'Oatmeal energy bites',
                ]
                : [
                    'Greek yogurt and fruit cup',
                    'Cottage cheese and berries',
                    'Protein smoothie with milk and banana',
                    'Apple with peanut-free nut butter',
                    'Boiled eggs and cherry tomatoes',
                    'Labneh and cucumber cup',
                    'Tuna cucumber snack box',
                    'Milk and oats shake',
                    'Protein pudding cup',
                    'Dates and yogurt bowl',
                    'Turkey roll-ups with lettuce',
                    'Fruit salad with yogurt',
                    'Apple and yogurt snack box',
                    'Cucumber and labneh plate',
                    'Cheese and tomato cup',
                    'Skyr and berries bowl',
                ],
        ];
    }

    private function pickMealName(array $candidates, int $seed, ?string $lastUsed): string
    {
        $count = count($candidates);
        if ($count === 0) {
            return 'Balanced meal option';
        }

        for ($i = 0; $i < $count; $i++) {
            $candidate = $candidates[($seed + $i) % $count];
            if ($lastUsed !== null && strtolower($candidate) === strtolower($lastUsed)) {
                continue;
            }

            return $candidate;
        }

        return $candidates[$seed % $count];
    }

    private function pickUniqueSnackName(array $candidates, int $seed, ?string $lastUsed, array $usedSnackNames): string
    {
        $count = count($candidates);
        if ($count === 0) {
            return 'Portable protein snack';
        }

        for ($i = 0; $i < $count; $i++) {
            $candidate = trim((string) ($candidates[($seed + $i) % $count] ?? ''));
            if ($candidate === '') {
                continue;
            }

            $candidateKey = strtolower($candidate);
            if ($lastUsed !== null && $candidateKey === strtolower($lastUsed)) {
                continue;
            }
            if (in_array($candidateKey, $usedSnackNames, true)) {
                continue;
            }

            return $candidate;
        }

        $fallback = trim((string) ($candidates[$seed % $count] ?? 'Portable protein snack'));
        if ($fallback === '') {
            $fallback = 'Portable protein snack';
        }

        return $fallback.' variation '.(count($usedSnackNames) + 1);
    }

    private function mealAlternatives(array $candidates, string $selected): array
    {
        $alternatives = [];
        foreach ($candidates as $candidate) {
            if (strtolower($candidate) === strtolower($selected)) {
                continue;
            }
            $alternatives[] = $candidate;
            if (count($alternatives) >= 2) {
                break;
            }
        }

        return $alternatives;
    }

    private function recipeNoteForMeal(string $mealCode): string
    {
        return match ($mealCode) {
            'breakfast' => 'Keep prep under 15 minutes and prioritize protein first.',
            'lunch' => 'Build around one lean protein, one carb source, and vegetables.',
            'dinner' => 'Use oven or one-pan cooking for consistency and easy cleanup.',
            default => 'Keep this portable and pre-portioned for adherence.',
        };
    }

    private function portionFromCalories(int $calories, string $mealCode): string
    {
        $calories = max(40, $calories);
        $mealCode = strtolower(trim($mealCode));

        if ($mealCode === 'snack') {
            return match (true) {
                $calories <= 130 => '0.75 serving',
                $calories <= 210 => '1 serving',
                $calories <= 300 => '1.25 serving',
                default => '1.5 serving',
            };
        }

        return match (true) {
            $calories <= 260 => '1 serving',
            $calories <= 380 => '1.25 serving',
            $calories <= 520 => '1.5 serving',
            $calories <= 680 => '2 serving',
            default => '2.25 serving',
        };
    }

    private function buildGroceryList(array $dietDays, array $blockedNeedles): array
    {
        $totals = [];

        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name === '' || $this->containsBlockedTerm($name, $blockedNeedles)) {
                        continue;
                    }

                    $portion = trim((string) ($item['portion'] ?? '1 serving')) ?: '1 serving';
                    $units = $this->portionUnits($portion);
                    foreach ($this->extractIngredientNames($name) as $ingredient) {
                        if ($this->containsBlockedTerm($ingredient, $blockedNeedles)) {
                            continue;
                        }

                        $key = strtolower(trim($ingredient));
                        if ($key === '') {
                            continue;
                        }

                        $profile = $this->ingredientQuantityProfile($ingredient);
                        $amount = $units * $profile['per_unit'];

                        if (! isset($totals[$key])) {
                            $totals[$key] = [
                                'category' => $this->inferGroceryCategory($ingredient),
                                'name' => $ingredient,
                                'measure' => $profile['measure'],
                                'amount' => 0.0,
                            ];
                        }

                        $totals[$key]['amount'] += $amount;
                    }
                }
            }
        }

        if ($totals === []) {
            return [
                ['category' => 'Protein', 'name' => 'Allergy-safe protein source', 'quantity' => '7 servings'],
                ['category' => 'Carbs', 'name' => 'Allergy-safe whole grains', 'quantity' => '7 servings'],
                ['category' => 'Produce', 'name' => 'Seasonal vegetables and fruit', 'quantity' => '14 servings'],
            ];
        }

        uasort($totals, static function (array $left, array $right): int {
            $unitsComparison = $right['amount'] <=> $left['amount'];
            if ($unitsComparison !== 0) {
                return $unitsComparison;
            }

            return strcasecmp((string) $left['name'], (string) $right['name']);
        });

        return array_values(array_map(fn (array $item): array => [
            'category' => $item['category'],
            'name' => $item['name'],
            'quantity' => $this->formatGroceryQuantity((float) $item['amount'], (string) ($item['measure'] ?? 'serving')),
        ], $totals));
    }

    private function inferGroceryCategory(string $name): string
    {
        $text = strtolower($name);
        if ($this->containsAny($text, ['olive oil', 'hummus', 'salsa'])) {
            return 'Pantry';
        }
        if ($this->containsAny($text, ['chicken', 'turkey', 'beef', 'fish', 'salmon', 'tuna', 'egg', 'tofu', 'lentil', 'chickpea', 'paneer', 'cottage', 'shrimp'])) {
            return 'Protein';
        }
        if ($this->containsAny($text, ['yogurt', 'labneh', 'milk', 'cheese'])) {
            return 'Dairy';
        }
        if ($this->containsAny($text, ['rice', 'oats', 'quinoa', 'potato', 'bread', 'pasta', 'bulgur', 'cracker'])) {
            return 'Carbs';
        }
        if ($this->containsAny($text, ['broccoli', 'salad', 'vegetable', 'cucumber', 'fruit', 'berries', 'banana', 'carrot', 'spinach', 'apple', 'tomato', 'avocado'])) {
            return 'Produce';
        }

        return 'Pantry';
    }

    private function extractIngredientNames(string $mealName): array
    {
        $name = strtolower(trim($mealName));
        if ($name === '') {
            return [];
        }

        $map = [
            'chicken' => 'Chicken Breast',
            'turkey' => 'Turkey Breast',
            'beef' => 'Lean Beef',
            'salmon' => 'Salmon',
            'tuna' => 'Tuna',
            'fish' => 'White Fish',
            'shrimp' => 'Shrimp',
            'egg' => 'Eggs',
            'tofu' => 'Tofu',
            'lentil' => 'Lentils',
            'chickpea' => 'Chickpeas',
            'paneer' => 'Paneer',
            'yogurt' => 'Greek Yogurt',
            'cottage' => 'Cottage Cheese',
            'labneh' => 'Labneh',
            'rice' => 'Rice',
            'quinoa' => 'Quinoa',
            'oat' => 'Oats',
            'bread' => 'Wholegrain Bread',
            'pasta' => 'Wholegrain Pasta',
            'bulgur' => 'Bulgur',
            'potato' => 'Potatoes',
            'broccoli' => 'Broccoli',
            'spinach' => 'Spinach',
            'cucumber' => 'Cucumber',
            'tomato' => 'Tomatoes',
            'carrot' => 'Carrots',
            'banana' => 'Bananas',
            'apple' => 'Apples',
            'berries' => 'Berries',
            'avocado' => 'Avocado',
            'olive oil' => 'Olive Oil',
            'hummus' => 'Hummus',
            'milk' => 'Milk',
        ];

        $ingredients = [];
        foreach ($map as $needle => $ingredient) {
            if (str_contains($name, $needle)) {
                $ingredients[] = $ingredient;
            }
        }

        if ($ingredients === []) {
            return [trim($mealName)];
        }

        return array_values(array_unique($ingredients));
    }

    private function portionUnits(string $portion): float
    {
        $text = strtolower(trim($portion));
        if ($text === '') {
            return 1.0;
        }

        if (! preg_match('/(\d+(?:\.\d+)?)/', $text, $matches)) {
            return 1.0;
        }

        $amount = max(0.25, (float) $matches[1]);
        if (str_contains($text, 'g')) {
            return max(0.5, $amount / 100);
        }
        if (str_contains($text, 'ml')) {
            return max(0.5, $amount / 250);
        }

        return $amount;
    }

    private function ingredientQuantityProfile(string $ingredient): array
    {
        $name = strtolower(trim($ingredient));

        if ($this->containsAny($name, ['chicken', 'turkey', 'beef', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'paneer'])) {
            return ['measure' => 'g', 'per_unit' => 180.0];
        }
        if ($this->containsAny($name, ['rice', 'quinoa', 'oats', 'bulgur', 'pasta'])) {
            return ['measure' => 'g', 'per_unit' => 90.0];
        }
        if ($this->containsAny($name, ['potato', 'sweet potato'])) {
            return ['measure' => 'g', 'per_unit' => 250.0];
        }
        if ($this->containsAny($name, ['yogurt', 'labneh', 'cottage cheese'])) {
            return ['measure' => 'g', 'per_unit' => 200.0];
        }
        if ($this->containsAny($name, ['milk'])) {
            return ['measure' => 'ml', 'per_unit' => 300.0];
        }
        if ($this->containsAny($name, ['olive oil'])) {
            return ['measure' => 'ml', 'per_unit' => 15.0];
        }
        if ($this->containsAny($name, ['egg'])) {
            return ['measure' => 'piece', 'per_unit' => 2.0];
        }
        if ($this->containsAny($name, ['banana', 'apple', 'avocado', 'tomato', 'cucumber', 'carrot'])) {
            return ['measure' => 'piece', 'per_unit' => 1.0];
        }
        if ($this->containsAny($name, ['berries', 'broccoli', 'spinach', 'lentils', 'chickpeas', 'hummus'])) {
            return ['measure' => 'g', 'per_unit' => 120.0];
        }

        return ['measure' => 'serving', 'per_unit' => 1.0];
    }

    private function formatGroceryQuantity(float $amount, string $measure): string
    {
        $amount = max(0.1, $amount);
        $measure = strtolower(trim($measure));

        if ($measure === 'g') {
            if ($amount >= 1000) {
                return number_format($amount / 1000, 1).' kg';
            }

            return (string) ((int) (round($amount / 50) * 50)).' g';
        }

        if ($measure === 'ml') {
            if ($amount >= 1000) {
                return number_format($amount / 1000, 1).' L';
            }

            return (string) ((int) (round($amount / 50) * 50)).' ml';
        }

        if ($measure === 'piece') {
            return (string) max(1, (int) round($amount)).' pcs';
        }

        return (string) max(1, (int) round($amount)).' servings';
    }

    private function buildWorkout(
        array $profile,
        array $injuries,
        array $exerciseCatalog,
        string $location,
        array $availableEquipment,
        string $goalText,
        int $seed = 0
    ): array {
        $trainingDays = max(2, min(6, (int) ($profile['workout_days_per_week'] ?? 4)));
        $trainIndexes = $this->trainingDayIndexes($trainingDays, is_array($profile['preferred_workout_days'] ?? null) ? $profile['preferred_workout_days'] : []);

        $pool = $this->prepareExercisePool($exerciseCatalog, $location, $availableEquipment, $injuries);
        $labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $splits = $this->knownWorkoutSplitTemplates($trainingDays, $location);
        $splitOffset = $seed % max(1, count($splits));
        $weekly = [];

        for ($dayIndex = 1, $trainCounter = 0; $dayIndex <= 7; $dayIndex++) {
            $label = $labels[$dayIndex - 1] ?? ('Day '.$dayIndex);
            if (! in_array($dayIndex, $trainIndexes, true)) {
                $isRecovery = $dayIndex % 2 === 0;
                $weekly[] = [
                    'day_index' => $dayIndex,
                    'day_label' => $label,
                    'session_type' => $isRecovery ? 'recovery' : 'rest',
                    'focus' => $isRecovery ? 'Active recovery and mobility' : 'Rest and recharge',
                    'location' => $location,
                    'duration_min' => $isRecovery ? 20 : 0,
                    'warmup' => $isRecovery ? ['Easy walk 5 minutes', 'Gentle joint mobility 5 minutes'] : [],
                    'exercises' => [],
                    'cooldown' => $isRecovery ? ['Breathing and gentle stretching'] : [],
                    'safety_notes' => ['Keep intensity low and stay pain-free.'],
                ];

                continue;
            }

            $split = $splits[($splitOffset + $trainCounter) % count($splits)];
            $trainCounter++;
            $exercises = $this->buildTrainingDayExercises(
                $pool,
                $dayIndex,
                $location,
                $split['sequence'],
                $goalText,
                $seed
            );

            $weekly[] = [
                'day_index' => $dayIndex,
                'day_label' => $label,
                'session_type' => 'train',
                'focus' => $split['focus'],
                'location' => $location,
                'duration_min' => $location === 'gym' ? 50 : 40,
                'warmup' => ['Brisk walk or bike 5 minutes', 'Dynamic mobility for hips, shoulders, and thoracic spine'],
                'exercises' => $exercises,
                'cooldown' => ['Easy breathing 2 minutes', 'Gentle stretch for worked muscles 4 minutes'],
                'safety_notes' => ['Keep 1-2 reps in reserve on most sets.', 'Stop and switch to a safer alternative if pain appears.'],
            ];
        }

        return [
            'weekly_schedule' => $weekly,
            'progression_rules' => ['Add 1 rep per set before increasing load.', 'Increase load only when all working sets stay pain-free.', 'On difficult weeks, keep load and reduce total sets by 15-20%.'],
            'recovery_rules' => ['Keep at least one full rest day each week.', 'If soreness lasts beyond 48 hours, reduce next session volume.', 'Prioritize hydration and sleep on training days.'],
            'coach_notes' => ['Consistency beats intensity spikes; complete planned sessions first.', 'Track pain, energy, and completion so the next plan can adapt better.'],
        ];
    }

    private function knownWorkoutSplitTemplates(int $trainingDays, string $location): array
    {
        return match (max(2, min(6, $trainingDays))) {
            2 => [
                ['focus' => 'Upper Body Strength', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => 'Lower Body Strength', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            3 => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            4 => [
                ['focus' => 'Upper A (Push and Pull)', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => 'Lower A (Quad Emphasis)', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Upper B (Hypertrophy Mix)', 'sequence' => ['pull', 'push', 'pull', 'push', 'pull']],
                ['focus' => 'Lower B (Posterior Chain)', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            5 => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Upper Hypertrophy', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => $location === 'gym' ? 'Machine Full Body' : 'Full Body Strength', 'sequence' => ['lower', 'push', 'pull', 'lower', 'push']],
            ],
            default => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Push Volume', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Volume', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => $location === 'gym' ? 'Machine Lower' : 'Lower Strength', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
        };
    }

    private function buildTrainingDayExercises(
        array $pool,
        int $dayIndex,
        string $location,
        array $sequence,
        string $goalText,
        int $seed = 0
    ): array {
        $count = count($pool);
        if ($count === 0) {
            return [];
        }

        $strictCategories = array_values(array_unique(array_filter(array_map(
            static fn ($item): string => strtolower(trim((string) $item)),
            $sequence
        ))));
        $strictPool = $strictCategories !== [] ? array_values(array_filter($pool, function (array $exercise) use ($strictCategories): bool {
            return in_array($this->exerciseCategory((string) ($exercise['primary_muscle'] ?? '')), $strictCategories, true);
        })) : [];
        $activePool = $strictPool !== [] ? $strictPool : $pool;
        $count = count($activePool);
        if ($count === 0) {
            return [];
        }

        $groups = [
            'lower' => [],
            'push' => [],
            'pull' => [],
            'core' => [],
            'accessory' => [],
        ];
        foreach ($activePool as $exercise) {
            $groups[$this->exerciseCategory((string) ($exercise['primary_muscle'] ?? ''))][] = $exercise;
        }

        $result = [];
        $usedNames = [];
        $seed = ($dayIndex * 3) + $seed;

        foreach ($sequence as $slot => $category) {
            $exercise = $this->pickCategoryExercise($groups[$category] ?? [], $activePool, $usedNames, $seed + $slot);
            if (! is_array($exercise)) {
                continue;
            }

            $recipe = $this->exerciseSetRecipe($category, $location, $goalText);
            $result[] = [
                'name' => (string) ($exercise['name'] ?? 'Exercise'),
                'sets' => $recipe['sets'],
                'reps' => $recipe['reps'],
                'rest_sec' => $recipe['rest_sec'],
                'rpe' => $recipe['rpe'],
                'equipment' => (string) ($exercise['equipment'] ?? 'Bodyweight'),
                'movement_notes' => $recipe['movement_notes'],
                'safer_alternative' => $recipe['safer_alternative'],
            ];
        }

        $target = 5;
        for ($i = 0; count($result) < $target && $i < ($count * 2); $i++) {
            $exercise = $this->pickCategoryExercise($activePool, $activePool, $usedNames, $seed + $i + 50);
            if (! is_array($exercise)) {
                break;
            }

            $category = $this->exerciseCategory((string) ($exercise['primary_muscle'] ?? ''));
            $recipe = $this->exerciseSetRecipe($category, $location, $goalText);
            $result[] = [
                'name' => (string) ($exercise['name'] ?? 'Exercise'),
                'sets' => $recipe['sets'],
                'reps' => $recipe['reps'],
                'rest_sec' => $recipe['rest_sec'],
                'rpe' => $recipe['rpe'],
                'equipment' => (string) ($exercise['equipment'] ?? 'Bodyweight'),
                'movement_notes' => $recipe['movement_notes'],
                'safer_alternative' => $recipe['safer_alternative'],
            ];
        }

        for ($i = 0; count($result) < $target && $count > 0; $i++) {
            $exercise = $activePool[($seed + $i) % $count] ?? null;
            if (! is_array($exercise)) {
                continue;
            }

            $name = (string) ($exercise['name'] ?? 'Exercise');
            $nameKey = strtolower(trim($name));
            if ($nameKey !== '' && in_array($nameKey, $usedNames, true)) {
                $name .= ' variation '.($i + 1);
            } elseif ($nameKey !== '') {
                $usedNames[] = $nameKey;
            }

            $category = $this->exerciseCategory((string) ($exercise['primary_muscle'] ?? ''));
            $recipe = $this->exerciseSetRecipe($category, $location, $goalText);
            $result[] = [
                'name' => $name,
                'sets' => $recipe['sets'],
                'reps' => $recipe['reps'],
                'rest_sec' => $recipe['rest_sec'],
                'rpe' => $recipe['rpe'],
                'equipment' => (string) ($exercise['equipment'] ?? 'Bodyweight'),
                'movement_notes' => $recipe['movement_notes'],
                'safer_alternative' => $recipe['safer_alternative'],
            ];
        }

        return $result;
    }

    private function pickCategoryExercise(array $preferredPool, array $fallbackPool, array &$usedNames, int $seed): ?array
    {
        $picked = $this->pickUniqueExercise($preferredPool, $usedNames, $seed);
        if (is_array($picked)) {
            return $picked;
        }

        return $this->pickUniqueExercise($fallbackPool, $usedNames, $seed + 7);
    }

    private function pickUniqueExercise(array $pool, array &$usedNames, int $seed): ?array
    {
        $count = count($pool);
        if ($count === 0) {
            return null;
        }

        for ($i = 0; $i < $count; $i++) {
            $exercise = $pool[($seed + $i) % $count] ?? null;
            if (! is_array($exercise)) {
                continue;
            }

            $name = strtolower(trim((string) ($exercise['name'] ?? '')));
            if ($name === '' || in_array($name, $usedNames, true)) {
                continue;
            }

            $usedNames[] = $name;

            return $exercise;
        }

        return null;
    }

    private function exerciseSetRecipe(string $category, string $location, string $goalText): array
    {
        $rest = $this->goalBasedRestSeconds($category, $goalText);

        return match ($category) {
            'lower' => ['sets' => 4, 'reps' => '8-12', 'rest_sec' => $rest, 'rpe' => 7.5, 'movement_notes' => 'Use controlled tempo and full pain-free range.', 'safer_alternative' => $location === 'gym' ? 'Leg press with reduced load' : 'Sit-to-stand from chair'],
            'push' => ['sets' => 3, 'reps' => '8-12', 'rest_sec' => $rest, 'rpe' => 7.0, 'movement_notes' => 'Keep shoulders stable and avoid lower-back compensation.', 'safer_alternative' => 'Incline push up with reduced range'],
            'pull' => ['sets' => 3, 'reps' => '8-12', 'rest_sec' => $rest, 'rpe' => 7.0, 'movement_notes' => 'Lead with elbows and maintain neutral spine.', 'safer_alternative' => 'Seated resistance band row'],
            'core' => ['sets' => 3, 'reps' => '10-15', 'rest_sec' => $rest, 'rpe' => 6.5, 'movement_notes' => 'Brace gently and breathe through each rep.', 'safer_alternative' => 'Dead bug variation'],
            default => ['sets' => 3, 'reps' => '10-15', 'rest_sec' => $rest, 'rpe' => 6.5, 'movement_notes' => 'Use smooth controlled repetitions.', 'safer_alternative' => 'Reduce load and range of motion'],
        };
    }

    private function goalBasedRestSeconds(string $category, string $goalText): int
    {
        $goalText = strtolower(trim($goalText));

        if ($goalText !== '' && preg_match('/gain|bulk|strength|hypertrophy|muscle/', $goalText)) {
            return in_array($category, ['lower', 'push', 'pull'], true) ? 120 : 90;
        }
        if ($goalText !== '' && preg_match('/lose|loss|deficit|fat|cut|endurance/', $goalText)) {
            return in_array($category, ['lower', 'push', 'pull'], true) ? 75 : 60;
        }

        return in_array($category, ['lower', 'push', 'pull'], true) ? 90 : 75;
    }

    private function prepareExercisePool(array $exerciseCatalog, string $location, array $availableEquipment, array $injuries): array
    {
        if ($exerciseCatalog === []) {
            $exerciseCatalog = Exercise::query()
                ->select(['name', 'primary_muscle', 'equipment', 'difficulty', 'home_friendly'])
                ->orderBy('name')
                ->limit(120)
                ->get()
                ->map(fn (Exercise $exercise) => [
                    'name' => (string) $exercise->name,
                    'primary_muscle' => (string) ($exercise->primary_muscle ?? ''),
                    'equipment' => (string) ($exercise->equipment ?? ''),
                    'difficulty' => (string) ($exercise->difficulty ?? ''),
                    'home_friendly' => (bool) ($exercise->home_friendly ?? false),
                ])
                ->all();
        }

        $exerciseCatalog = array_merge($exerciseCatalog, $this->defaultExercisePool($location));

        $injuryNeedles = $this->injuryBlockedNeedles($injuries);
        $equipmentLower = array_map('strtolower', $availableEquipment);

        $pool = array_values(array_filter(array_map(function (array $exercise) {
            $name = trim((string) ($exercise['name'] ?? ''));
            if ($name === '' || str_contains(strtolower($name), 'debug')) {
                return null;
            }

            return [
                'name' => $name,
                'primary_muscle' => (string) ($exercise['primary_muscle'] ?? ''),
                'equipment' => trim((string) ($exercise['equipment'] ?? '')) ?: 'Bodyweight',
                'difficulty' => (string) ($exercise['difficulty'] ?? ''),
                'home_friendly' => (bool) ($exercise['home_friendly'] ?? false),
            ];
        }, $exerciseCatalog)));

        $pool = array_values(array_filter($pool, function (array $exercise) use ($location, $equipmentLower, $injuryNeedles): bool {
            $nameLower = strtolower($exercise['name']);
            if ($this->containsAny($nameLower, $injuryNeedles)) {
                return false;
            }
            if ($this->isRecoveryOnlyExercise($nameLower)) {
                return false;
            }
            if ($this->containsAny($nameLower, ['snatch', 'jerk', 'kipping', 'muscle up', 'jumping lunge', 'plyometric', 'depth jump'])) {
                return false;
            }

            if ($location !== 'home') {
                return true;
            }

            $equipment = strtolower((string) ($exercise['equipment'] ?? ''));
            if ($equipment === '' || str_contains($equipment, 'bodyweight')) {
                return true;
            }

            if ($equipmentLower === []) {
                return false;
            }

            foreach ($equipmentLower as $available) {
                if ($available !== '' && (str_contains($equipment, $available) || str_contains($available, $equipment))) {
                    return true;
                }
            }

            return false;
        }));

        $pool = array_values(array_unique($pool, SORT_REGULAR));

        if ($location === 'gym') {
            usort($pool, function (array $a, array $b): int {
                $scoreA = $this->exerciseNamePriority((string) ($a['name'] ?? ''))
                    + $this->gymEquipmentScore((string) ($a['equipment'] ?? ''))
                    + $this->difficultyPenalty((string) ($a['difficulty'] ?? ''));
                $scoreB = $this->exerciseNamePriority((string) ($b['name'] ?? ''))
                    + $this->gymEquipmentScore((string) ($b['equipment'] ?? ''))
                    + $this->difficultyPenalty((string) ($b['difficulty'] ?? ''));

                return $scoreA <=> $scoreB;
            });
        }

        return $pool;
    }

    private function defaultExercisePool(string $location): array
    {
        if ($location === 'gym') {
            return [
                ['name' => 'Leg Press', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Hack Squat Machine', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Machine', 'difficulty' => 'Intermediate'],
                ['name' => 'Romanian Deadlift', 'primary_muscle' => 'Hamstrings', 'equipment' => 'Barbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Leg Curl Machine', 'primary_muscle' => 'Hamstrings', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Walking Dumbbell Lunge', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Machine Chest Press', 'primary_muscle' => 'Chest', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Incline Dumbbell Press', 'primary_muscle' => 'Chest', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Seated Dumbbell Shoulder Press', 'primary_muscle' => 'Shoulders', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Cable Triceps Pushdown', 'primary_muscle' => 'Triceps', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Machine Lateral Raise', 'primary_muscle' => 'Shoulders', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Seated Cable Row', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Lat Pulldown', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Cable Face Pull', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Dumbbell Hammer Curl', 'primary_muscle' => 'Biceps', 'equipment' => 'Dumbbell', 'difficulty' => 'Beginner'],
                ['name' => 'Chest Supported Row Machine', 'primary_muscle' => 'Back', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Cable Crunch', 'primary_muscle' => 'Core', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Plank', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ];
        }

        return [
            ['name' => 'Bodyweight Squat', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Chair Step Up', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Wall Sit', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Bulgarian Split Squat', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
            ['name' => 'Reverse Lunge', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Intermediate'],
            ['name' => 'Incline Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Dumbbell Floor Press', 'primary_muscle' => 'Chest', 'equipment' => 'Dumbbell', 'difficulty' => 'Beginner'],
            ['name' => 'Pike Push Up', 'primary_muscle' => 'Shoulders', 'equipment' => 'Bodyweight', 'difficulty' => 'Intermediate'],
            ['name' => 'Chair Triceps Dip', 'primary_muscle' => 'Triceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Bodyweight Towel Row', 'primary_muscle' => 'Back', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Doorframe Row', 'primary_muscle' => 'Back', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Resistance Band Row', 'primary_muscle' => 'Back', 'equipment' => 'Resistance Band', 'difficulty' => 'Beginner'],
            ['name' => 'One Arm Dumbbell Row', 'primary_muscle' => 'Back', 'equipment' => 'Dumbbell', 'difficulty' => 'Beginner'],
            ['name' => 'Resistance Band Pulldown', 'primary_muscle' => 'Back', 'equipment' => 'Resistance Band', 'difficulty' => 'Beginner'],
            ['name' => 'Glute Bridge', 'primary_muscle' => 'Glutes', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ['name' => 'Dead Bug', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
        ];
    }

    private function isRecoveryOnlyExercise(string $nameLower): bool
    {
        return $this->containsAny($nameLower, [
            'stretch',
            'pose',
            'twist',
            'mobility',
            'breathing',
            'walk',
            'warmup',
            'warm-up',
        ]);
    }

    private function exerciseNamePriority(string $name): int
    {
        $name = strtolower($name);

        if ($this->containsAny($name, ['squat', 'press', 'row', 'deadlift', 'lunge', 'pulldown', 'hip thrust', 'split squat', 'leg press', 'chest press'])) {
            return 0;
        }
        if ($this->containsAny($name, ['curl', 'extension', 'raise', 'fly'])) {
            return 2;
        }

        return 1;
    }

    private function difficultyPenalty(string $difficulty): int
    {
        $difficulty = strtolower(trim($difficulty));

        return match (true) {
            str_contains($difficulty, 'advanced') => 2,
            str_contains($difficulty, 'intermediate') => 1,
            default => 0,
        };
    }

    private function exerciseCategory(string $muscle): string
    {
        $muscle = strtolower($muscle);
        if ($this->containsAny($muscle, ['core', 'abs', 'oblique'])) {
            return 'core';
        }
        if ($this->containsAny($muscle, ['quad', 'hamstring', 'glute', 'calf', 'leg', 'adductor', 'abductor'])) {
            return 'lower';
        }
        if ($this->containsAny($muscle, ['chest', 'shoulder', 'tricep'])) {
            return 'push';
        }
        if ($this->containsAny($muscle, ['back', 'lat', 'bicep', 'trap', 'rhomboid'])) {
            return 'pull';
        }

        return 'accessory';
    }

    private function gymEquipmentScore(string $equipment): int
    {
        $text = strtolower($equipment);

        return match (true) {
            str_contains($text, 'machine') => 0,
            str_contains($text, 'cable') => 1,
            str_contains($text, 'barbell') => 2,
            str_contains($text, 'dumbbell') => 3,
            str_contains($text, 'kettlebell') => 4,
            str_contains($text, 'bodyweight') => 8,
            default => 5,
        };
    }

    private function trainingDayIndexes(int $count, array $preferredDays = []): array
    {
        $preferred = $this->preferredWorkoutDayIndexes($preferredDays);
        if ($preferred !== []) {
            $indexes = array_slice($preferred, 0, $count);
            if (count($indexes) < $count) {
                foreach (range(1, 7) as $candidate) {
                    if (! in_array($candidate, $indexes, true)) {
                        $indexes[] = $candidate;
                    }
                    if (count($indexes) >= $count) {
                        break;
                    }
                }
            }
            sort($indexes);

            return $indexes;
        }

        $indexes = [];
        $step = 7 / max(1, $count);
        for ($i = 0; $i < $count; $i++) {
            $indexes[] = max(1, min(7, (int) round(1 + ($i * $step))));
        }

        $indexes = array_values(array_unique($indexes));
        while (count($indexes) < $count) {
            foreach (range(1, 7) as $candidate) {
                if (! in_array($candidate, $indexes, true)) {
                    $indexes[] = $candidate;
                }
                if (count($indexes) >= $count) {
                    break;
                }
            }
        }

        sort($indexes);

        return $indexes;
    }

    private function preferredWorkoutDayIndexes(array $value): array
    {
        $mapping = ['monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6, 'sunday' => 7];
        $indexes = [];
        foreach ($value as $day) {
            $key = strtolower(trim((string) $day));
            if (isset($mapping[$key])) {
                $indexes[] = $mapping[$key];
            }
        }

        return array_values(array_unique($indexes));
    }

    private function normalizeWorkoutLocation(mixed $location): string
    {
        $value = strtolower(trim((string) $location));
        if (in_array($value, ['home', 'gym'], true)) {
            return $value;
        }

        return 'gym';
    }

    private function blockedByDietType(string $dietType): array
    {
        return match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };
    }

    private function allergyNeedles(array $allergies): array
    {
        $needles = [];
        foreach ($allergies as $allergy) {
            $normalized = strtolower(trim($allergy));
            if ($normalized === '') {
                continue;
            }

            $needles[] = $normalized;
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
        }

        return array_values(array_unique(array_filter($needles)));
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

    private function injuryBlockedNeedles(array $injuries): array
    {
        $text = strtolower(implode(' ', $injuries));
        $blocked = [];
        if (str_contains($text, 'knee')) {
            $blocked = array_merge($blocked, ['jump squat', 'plyometric squat', 'depth jump']);
        }
        if (str_contains($text, 'shoulder')) {
            $blocked = array_merge($blocked, ['upright row', 'behind the neck press']);
        }
        if (str_contains($text, 'lower back') || str_contains($text, 'back')) {
            $blocked = array_merge($blocked, ['good morning', 'max deadlift', 'heavy barbell row']);
        }
        if (str_contains($text, 'elbow')) {
            $blocked[] = 'skull crusher';
        }
        if (str_contains($text, 'wrist')) {
            $blocked[] = 'handstand push-up';
        }

        return array_values(array_unique($blocked));
    }

    private function containsBlockedTerm(string $value, array $blockedNeedles): bool
    {
        $text = strtolower($value);
        foreach ($blockedNeedles as $needle) {
            $needle = strtolower(trim((string) $needle));
            if ($needle !== '' && str_contains($text, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        $haystack = strtolower($haystack);
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, strtolower($needle))) {
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
}
