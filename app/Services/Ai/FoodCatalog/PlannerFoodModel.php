<?php

namespace App\Services\Ai\FoodCatalog;

use App\Models\Food;
use Illuminate\Support\Str;

class PlannerFoodModel
{
    /**
     * @var array<string, array<string, array<int, array<string, mixed>>>>
     */
    private array $catalogCache = [];

    public function __construct(
        private readonly FoodCatalogAnomalyService $foodCatalogAnomalies,
    ) {}

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function buildMealCatalog(array $profile, int $limitPerType = 12): array
    {
        $limitPerType = max(3, min(24, $limitPerType));
        $catalog = [
            'breakfast' => [],
            'lunch' => [],
            'dinner' => [],
            'snack' => [],
            'drink' => [],
        ];

        $candidates = $this->candidateFoods($profile);
        foreach (array_keys($catalog) as $mealCode) {
            $ranked = array_values(array_filter($candidates, static function (array $food) use ($mealCode): bool {
                return in_array($mealCode, (array) ($food['meal_types'] ?? []), true);
            }));

            usort($ranked, function (array $left, array $right) use ($mealCode): int {
                $scoreDiff = $this->catalogScore($mealCode, $right) <=> $this->catalogScore($mealCode, $left);
                if ($scoreDiff !== 0) {
                    return $scoreDiff;
                }

                return strcmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
            });

            $catalog[$mealCode] = array_slice($ranked, 0, $limitPerType);
        }

        return $catalog;
    }

    /**
     * @param  array<string, array<int, array<string, mixed>>>  $mealCatalog
     * @return array<string, mixed>|null
     */
    public function resolveMealItem(
        string $mealCode,
        int $targetCalories,
        array $profile,
        int $seed = 0,
        string $preferredName = '',
        array $mealCatalog = []
    ): ?array {
        $mealCode = $this->normalizeMealCode($mealCode);
        $targetCalories = max(80, $targetCalories);
        $preferredName = trim($preferredName);

        $pool = is_array($mealCatalog[$mealCode] ?? null)
            ? array_values(array_filter($mealCatalog[$mealCode], fn (mixed $item): bool => is_array($item)))
            : [];

        if ($pool === []) {
            $pool = $this->buildMealCatalog($profile, 16)[$mealCode] ?? [];
        }

        if ($pool === []) {
            return null;
        }

        $ranked = array_map(function (array $food) use ($mealCode, $targetCalories, $preferredName, $profile): array {
            $food['_score'] = $this->selectionScore($food, $mealCode, $targetCalories, $preferredName, $profile);

            return $food;
        }, $pool);

        usort($ranked, static function (array $left, array $right): int {
            $scoreDiff = ((float) ($right['_score'] ?? 0)) <=> ((float) ($left['_score'] ?? 0));
            if ($scoreDiff !== 0) {
                return $scoreDiff;
            }

            return strcmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
        });

        $topPool = array_slice($ranked, 0, min(5, count($ranked)));
        if ($topPool === []) {
            return null;
        }

        $selected = $this->pickCandidate($topPool, $seed, $preferredName);
        $alternatives = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['name'] ?? '')),
            array_slice($topPool, 1, 2)
        )));

        return $this->materializeMealItem($selected, $targetCalories, $mealCode, $alternatives);
    }

    /**
     * @return array<string, mixed>
     */
    public function inspectFood(Food $food): array
    {
        $entry = $this->catalogEntryFromFood($food);
        $warnings = [];

        if ($entry['input_default_meal_types'] ?? false) {
            $warnings[] = 'default_meal_types';
        }

        $mealTypeSource = (string) ($entry['meal_type_source'] ?? 'explicit');
        if ($mealTypeSource === 'category') {
            $warnings[] = 'meal_types_derived_from_category';
        } elseif ($mealTypeSource === 'name') {
            $warnings[] = 'meal_types_inferred_from_name';
        } elseif ($mealTypeSource === 'fallback') {
            $warnings[] = 'meal_types_defaulted_to_snack';
        }

        $servingSize = $entry['serving_size'];
        if (! is_numeric($servingSize) || (float) $servingSize <= 0) {
            $warnings[] = 'missing_serving_size';
        }

        $rawServingUnit = trim((string) ($entry['serving_unit'] ?? ''));
        if ($rawServingUnit === '') {
            $warnings[] = 'missing_serving_unit';
        } elseif ($this->isGenericServingUnit($rawServingUnit)) {
            $warnings[] = 'generic_serving_unit';
        }

        $calories = $entry['calories'];
        if (! is_numeric($calories) || (int) $calories <= 0) {
            $warnings[] = 'missing_calories';
        }

        if ($this->hasSparseMacroProfile($entry)) {
            $warnings[] = 'sparse_macro_profile';
        }

        if ($this->hasMissingConstraintMetadata($entry)) {
            $warnings[] = 'missing_constraint_metadata';
        }

        if ($this->hasTinyMainMealCalories($entry)) {
            $warnings[] = 'tiny_main_meal';
        }

        if ($this->hasOversizedSnackCalories($entry)) {
            $warnings[] = 'oversized_snack';
        }

        return [
            'food_id' => (int) $food->id,
            'name' => trim((string) $food->name),
            'category' => trim((string) ($food->category ?? '')),
            'planner_ready' => $warnings === [],
            'planner_warnings' => array_values(array_unique($warnings)),
            'normalized_meal_types' => $entry['meal_types'],
            'meal_type_source' => $mealTypeSource,
            'input_default_meal_types' => (bool) ($entry['input_default_meal_types'] ?? false),
            'serving_size' => $entry['serving_size'],
            'serving_unit' => $rawServingUnit,
            'normalized_serving_unit' => (string) ($entry['normalized_serving_unit'] ?? ''),
            'calories' => $entry['calories'],
            'protein_g' => $entry['protein_g'],
            'carbs_g' => $entry['carbs_g'],
            'fat_g' => $entry['fat_g'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function candidateFoods(array $profile): array
    {
        $cacheKey = md5(json_encode([
            'diet_type' => strtolower(trim((string) ($profile['diet_type'] ?? ''))),
            'allergies' => array_values(array_map(
                static fn (string $value): string => strtolower(trim($value)),
                is_array($profile['allergies'] ?? null) ? $profile['allergies'] : []
            )),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        if (isset($this->catalogCache[$cacheKey])) {
            return $this->catalogCache[$cacheKey];
        }

        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));
        $allergies = array_values(array_filter(array_map(
            static fn (string $value): string => strtolower(trim($value)),
            is_array($profile['allergies'] ?? null) ? $profile['allergies'] : []
        )));
        $allergyNeedles = $this->allergyNeedles($allergies);
        $blockedByDiet = $this->blockedDietNeedles($dietType);

        $foods = Food::query()
            ->select([
                'id',
                'name',
                'category',
                'cuisine',
                'meal_types',
                'allergens',
                'diets_allowed',
                'ingredients',
                'tags',
                'serving_size',
                'serving_unit',
                'calories',
                'protein_g',
                'carbs_g',
                'fat_g',
            ])
            ->orderBy('name')
            ->get();

        $entries = [];
        foreach ($foods as $food) {
            if ($this->foodCatalogAnomalies->shouldExcludeFromAiCatalog($food)) {
                continue;
            }

            $entry = $this->catalogEntryFromFood($food);
            if (($entry['meal_types'] ?? []) === []) {
                continue;
            }

            $allergenList = $entry['allergens'];
            if ($this->hasOverlap($allergies, $allergenList)) {
                continue;
            }

            $foodText = $this->normalizeText(implode(' ', array_filter([
                (string) ($entry['name'] ?? ''),
                implode(' ', (array) ($entry['ingredients'] ?? [])),
                implode(' ', (array) ($entry['allergens'] ?? [])),
            ])));
            if ($this->containsAny($foodText, $allergyNeedles)) {
                continue;
            }

            if ($this->containsBlockedNeedle($entry, $blockedByDiet)) {
                continue;
            }

            if (! $this->isFoodAllowedForDiet($dietType, $entry['diets_allowed'])) {
                continue;
            }

            $entries[] = $entry;
        }

        return $this->catalogCache[$cacheKey] = $entries;
    }

    /**
     * @return array<string, mixed>
     */
    private function catalogEntryFromFood(Food $food): array
    {
        $mealTypeInfo = $this->resolveMealTypeInfo(
            $food->meal_types,
            (string) ($food->category ?? ''),
            (string) $food->name,
        );

        $servingUnit = trim((string) ($food->serving_unit ?? ''));

        return [
            'id' => (int) $food->id,
            'name' => trim((string) $food->name),
            'category' => trim((string) ($food->category ?? '')),
            'cuisine' => trim((string) ($food->cuisine ?? '')),
            'meal_types' => $mealTypeInfo['normalized'],
            'meal_type_source' => $mealTypeInfo['source'],
            'input_default_meal_types' => $mealTypeInfo['input_default_set'],
            'allergens' => $this->toLowerList($food->allergens),
            'diets_allowed' => $this->toLowerList($food->diets_allowed),
            'ingredients' => $this->toLowerList($food->ingredients),
            'tags' => $this->toLowerList($food->tags),
            'serving_size' => $food->serving_size !== null ? (float) $food->serving_size : null,
            'serving_unit' => $servingUnit,
            'normalized_serving_unit' => $this->normalizeServingUnit($servingUnit),
            'calories' => $food->calories !== null ? (int) $food->calories : null,
            'protein_g' => $food->protein_g !== null ? (float) $food->protein_g : null,
            'carbs_g' => $food->carbs_g !== null ? (float) $food->carbs_g : null,
            'fat_g' => $food->fat_g !== null ? (float) $food->fat_g : null,
        ];
    }

    private function catalogScore(string $mealCode, array $food): float
    {
        $score = 0.0;
        $calories = max(40, (int) ($food['calories'] ?? 0));
        $protein = (float) ($food['protein_g'] ?? 0);

        if (in_array($mealCode, (array) ($food['meal_types'] ?? []), true)) {
            $score += 16.0;
        }

        if ($mealCode === 'snack') {
            $score += min(12.0, $protein);
            if ($calories > 320) {
                $score -= 10.0;
            }
        } else {
            $score += min(18.0, ($protein / max(1, $calories)) * 100);
        }

        if (! empty($food['serving_unit'])) {
            $score += 4.0;
        }

        if (! empty($food['carbs_g']) || ! empty($food['fat_g'])) {
            $score += 3.0;
        }

        return $score;
    }

    private function selectionScore(
        array $food,
        string $mealCode,
        int $targetCalories,
        string $preferredName,
        array $profile
    ): float {
        $score = $this->catalogScore($mealCode, $food);
        $calories = max(80, (int) ($food['calories'] ?? $targetCalories));
        $diff = abs($targetCalories - $calories);
        $score += max(0.0, 32.0 - min(32.0, $diff / 12.0));

        $goalText = strtolower(trim((string) (($profile['dietary_goal'] ?? '').' '.($profile['fitness_goal'] ?? ''))));
        $protein = (float) ($food['protein_g'] ?? 0);

        if (Str::contains($goalText, ['gain', 'bulk', 'muscle', 'hypertrophy'])) {
            $score += min(10.0, $protein / 3.0);
        } elseif (Str::contains($goalText, ['lose', 'loss', 'cut', 'fat'])) {
            $score += min(10.0, ($protein * 4) / max(1, $calories) * 18.0);
        }

        if ($preferredName !== '') {
            $score += $this->nameMatchScore($preferredName, (string) ($food['name'] ?? ''));
        }

        if ($mealCode !== 'snack' && $this->looksLikeStandaloneSnack((string) ($food['name'] ?? ''))) {
            $score -= 18.0;
        }

        return $score;
    }

    /**
     * @param  array<int, array<string, mixed>>  $topPool
     * @return array<string, mixed>
     */
    private function pickCandidate(array $topPool, int $seed, string $preferredName): array
    {
        if (count($topPool) === 1) {
            return $topPool[0];
        }

        $topScore = (float) ($topPool[0]['_score'] ?? 0);
        $runnerUp = (float) ($topPool[1]['_score'] ?? 0);

        if ($preferredName !== '' && ($topScore - $runnerUp) >= 18.0) {
            return $topPool[0];
        }

        $selectionPool = array_slice($topPool, 0, min(3, count($topPool)));

        return $selectionPool[$seed % count($selectionPool)] ?? $selectionPool[0];
    }

    /**
     * @param  array<int, string>  $alternatives
     * @return array<string, mixed>
     */
    private function materializeMealItem(array $food, int $targetCalories, string $mealCode, array $alternatives): array
    {
        $portion = $this->portionForFood($food, $targetCalories, $mealCode);
        [$protein, $carbs, $fat] = $this->scaledMacros($food, $portion['ratio'], $portion['calories'], $mealCode);

        return [
            'food_id' => (int) ($food['id'] ?? 0),
            'name' => (string) ($food['name'] ?? ucfirst($mealCode).' option'),
            'portion' => $portion['label'],
            'calories_kcal' => (int) $portion['calories'],
            'protein_g' => $protein,
            'carbs_g' => $carbs,
            'fat_g' => $fat,
            'serving_size' => $food['serving_size'] ?? null,
            'serving_unit' => $food['serving_unit'] ?? null,
            'alternatives' => array_values(array_unique(array_filter($alternatives))),
            'search_terms' => array_values(array_filter([
                (string) ($food['name'] ?? ''),
                trim((string) ($food['cuisine'] ?? '')) !== '' ? trim((string) $food['cuisine']).' '.$mealCode : null,
                'healthy '.$mealCode,
            ])),
        ];
    }

    /**
     * @return array{label: string, ratio: float, calories: int}
     */
    private function portionForFood(array $food, int $targetCalories, string $mealCode): array
    {
        $baseCalories = max(80, (int) ($food['calories'] ?? $targetCalories));
        $unit = $this->normalizeServingUnit((string) ($food['serving_unit'] ?? ''));
        $baseAmount = (float) ($food['serving_size'] ?? 0);

        if ($baseAmount <= 0) {
            $baseAmount = $this->defaultServingSize($unit, $mealCode);
        }

        [$minScale, $maxScale] = $this->portionScaleBounds($unit, $mealCode);
        $ratio = max($minScale, min($maxScale, $targetCalories / max(1, $baseCalories)));

        if ($this->isMassUnit($unit)) {
            $amount = $this->roundToStep(max(40.0, $baseAmount * $ratio), 10.0);
            $ratio = $amount / max(1.0, $baseAmount);

            return [
                'label' => (string) ((int) round($amount)).' '.$unit,
                'ratio' => $ratio,
                'calories' => max(80, (int) round($baseCalories * $ratio)),
            ];
        }

        if ($this->isVolumeUnit($unit)) {
            $amount = $this->roundToStep(max(120.0, $baseAmount * $ratio), 25.0);
            $ratio = $amount / max(1.0, $baseAmount);

            return [
                'label' => (string) ((int) round($amount)).' '.$unit,
                'ratio' => $ratio,
                'calories' => max(80, (int) round($baseCalories * $ratio)),
            ];
        }

        if ($this->isDiscreteCountUnit($unit)) {
            $amount = max(1.0, round($baseAmount * $ratio));
            $ratio = $amount / max(1.0, $baseAmount);

            return [
                'label' => $this->formatQuantity($amount).' '.$this->pluralizeUnit($unit, $amount),
                'ratio' => $ratio,
                'calories' => max(80, (int) round($baseCalories * $ratio)),
            ];
        }

        $amount = max(0.75, $this->roundToStep($baseAmount * $ratio, 0.25));
        $ratio = $amount / max(0.25, $baseAmount);

        return [
            'label' => $this->formatQuantity($amount).' '.$this->pluralizeUnit($unit, $amount),
            'ratio' => $ratio,
            'calories' => max(80, (int) round($baseCalories * $ratio)),
        ];
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private function scaledMacros(array $food, float $ratio, int $targetCalories, string $mealCode): array
    {
        $protein = max(0.0, ((float) ($food['protein_g'] ?? 0)) * $ratio);
        $carbs = max(0.0, ((float) ($food['carbs_g'] ?? 0)) * $ratio);
        $fat = max(0.0, ((float) ($food['fat_g'] ?? 0)) * $ratio);

        $macroCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
        if ($macroCalories <= 0) {
            return $this->fallbackMacroGrams($targetCalories, $mealCode);
        }

        if ($macroCalories < ($targetCalories * 0.72) || $macroCalories > ($targetCalories * 1.32)) {
            $scale = $targetCalories / max(1.0, $macroCalories);
            $protein *= $scale;
            $carbs *= $scale;
            $fat *= $scale;
        }

        return $this->adjustMacroCalories(
            (int) round($protein),
            (int) round($carbs),
            (int) round($fat),
            $targetCalories,
            $mealCode
        );
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private function fallbackMacroGrams(int $calories, string $mealCode): array
    {
        $shares = match ($mealCode) {
            'breakfast' => ['protein' => 0.28, 'carbs' => 0.47, 'fat' => 0.25],
            'snack' => ['protein' => 0.24, 'carbs' => 0.43, 'fat' => 0.33],
            default => ['protein' => 0.30, 'carbs' => 0.40, 'fat' => 0.30],
        };

        return $this->adjustMacroCalories(
            max(1, (int) round(($calories * $shares['protein']) / 4)),
            max(1, (int) round(($calories * $shares['carbs']) / 4)),
            max(1, (int) round(($calories * $shares['fat']) / 9)),
            $calories,
            $mealCode
        );
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private function adjustMacroCalories(int $protein, int $carbs, int $fat, int $targetCalories, string $mealCode): array
    {
        $priority = $mealCode === 'snack'
            ? ['carbs', 'protein', 'fat']
            : ['protein', 'carbs', 'fat'];

        for ($i = 0; $i < 64; $i++) {
            $currentCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
            $delta = $targetCalories - $currentCalories;
            if (abs($delta) <= 10) {
                break;
            }

            if ($delta > 0) {
                foreach ($priority as $macro) {
                    if ($macro === 'fat' && $delta >= 9) {
                        $fat++;
                        continue 2;
                    }
                    if ($delta >= 4) {
                        if ($macro === 'protein') {
                            $protein++;
                        } elseif ($macro === 'carbs') {
                            $carbs++;
                        }

                        continue 2;
                    }
                }

                break;
            }

            foreach ($priority as $macro) {
                if ($macro === 'fat' && $fat > 0 && abs($delta) >= 9) {
                    $fat--;
                    continue 2;
                }

                if (abs($delta) >= 4) {
                    if ($macro === 'protein' && $protein > 0) {
                        $protein--;
                        continue 2;
                    }

                    if ($macro === 'carbs' && $carbs > 0) {
                        $carbs--;
                        continue 2;
                    }
                }
            }

            break;
        }

        return [max(0, $protein), max(0, $carbs), max(0, $fat)];
    }

    private function nameMatchScore(string $preferredName, string $candidateName): float
    {
        $preferred = $this->normalizeText($preferredName);
        $candidate = $this->normalizeText($candidateName);

        if ($preferred === '' || $candidate === '') {
            return 0.0;
        }

        if ($preferred === $candidate) {
            return 70.0;
        }

        $score = 0.0;
        if (str_contains($candidate, $preferred) || str_contains($preferred, $candidate)) {
            $score += 24.0;
        }

        $preferredTokens = array_values(array_filter(explode(' ', $preferred)));
        $candidateTokens = array_values(array_filter(explode(' ', $candidate)));
        $overlap = count(array_intersect($preferredTokens, $candidateTokens));
        $score += min(30.0, $overlap * 6.0);

        return $score;
    }

    private function normalizeMealTypes(mixed $value, string $fallbackCategory = '', string $fallbackName = ''): array
    {
        return $this->resolveMealTypeInfo($value, $fallbackCategory, $fallbackName)['normalized'];
    }

    /**
     * @return array{normalized: array<int, string>, source: string, input_default_set: bool}
     */
    private function resolveMealTypeInfo(mixed $value, string $fallbackCategory = '', string $fallbackName = ''): array
    {
        $types = $this->rawMealTypes($value);
        $source = 'explicit';
        $inputDefaultSet = false;

        if ($types === [] && trim($fallbackCategory) !== '') {
            $types = [trim($fallbackCategory)];
            $source = 'category';
        }

        $normalized = $this->normalizeMealTypeLabels($types);

        if ($normalized === []) {
            $normalized = $this->inferMealTypesFromName($fallbackName);
            $source = $normalized === [] ? $source : 'name';
        }

        if ($this->looksLikeDefaultMealTypeSet($normalized)) {
            $inputDefaultSet = true;
            $categoryTypes = $this->categoryMealTypes($fallbackCategory);
            if ($categoryTypes !== []) {
                $normalized = $categoryTypes;
                $source = 'category';
            } elseif (trim($fallbackName) !== '') {
                $normalized = $this->inferMealTypesFromName($fallbackName);
                $source = $normalized === [] ? $source : 'name';
            }
        }

        if ($normalized === []) {
            $normalized = ['snack'];
            $source = 'fallback';
        }

        return [
            'normalized' => array_values(array_unique($normalized)),
            'source' => $source,
            'input_default_set' => $inputDefaultSet,
        ];
    }

    private function inferMealTypesFromName(string $name): array
    {
        $text = $this->normalizeText($name);
        if ($text === '') {
            return [];
        }

        $types = [];
        if ($this->containsAny($text, ['oat', 'egg', 'toast', 'labneh', 'granola', 'breakfast', 'scramble', 'hash'])) {
            $types[] = 'breakfast';
        }
        if ($this->containsAny($text, ['yogurt', 'fruit', 'berry', 'apple', 'banana', 'cracker', 'bar', 'wafer', 'nuts', 'seed', 'smoothie', 'shake', 'pudding', 'cup'])) {
            $types[] = 'snack';
        }
        if ($this->containsAny($text, ['chicken', 'beef', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'lentil', 'rice', 'pasta', 'quinoa', 'bowl', 'plate', 'stew', 'salad'])) {
            $types[] = 'lunch';
            $types[] = 'dinner';
        }

        return $types === [] ? ['snack'] : array_values(array_unique($types));
    }

    /**
     * @param  array<int, string>  $mealTypes
     */
    private function looksLikeDefaultMealTypeSet(array $mealTypes): bool
    {
        $normalized = array_values(array_unique(array_map('strtolower', $mealTypes)));
        sort($normalized);

        return $normalized === ['breakfast', 'dinner', 'drink', 'lunch', 'snack'];
    }

    /**
     * @return array<int, string>
     */
    private function categoryMealTypes(string $category): array
    {
        $category = strtolower(trim($category));
        if ($category === '') {
            return [];
        }

        return match (true) {
            str_contains($category, 'break') => ['breakfast'],
            str_contains($category, 'lunch') => ['lunch'],
            str_contains($category, 'dinner'), str_contains($category, 'supper') => ['dinner'],
            str_contains($category, 'snack') => ['snack'],
            str_contains($category, 'drink'), str_contains($category, 'beverage') => ['drink'],
            default => [],
        };
    }

    private function isFoodAllowedForDiet(string $dietType, array $allowedDiets): bool
    {
        if ($dietType === '') {
            return true;
        }

        if (! $this->isStrictDietType($dietType)) {
            return true;
        }

        if ($allowedDiets === []) {
            return false;
        }

        $dietType = str_replace(['-', ' '], '_', $dietType);
        foreach ($allowedDiets as $allowedDiet) {
            $normalized = str_replace(['-', ' '], '_', strtolower($allowedDiet));
            if (
                $normalized === $dietType
                || str_contains($normalized, $dietType)
                || str_contains($dietType, $normalized)
            ) {
                return true;
            }
        }

        return false;
    }

    private function isStrictDietType(string $dietType): bool
    {
        return $this->containsAny($dietType, ['vegan', 'vegetarian', 'pescetarian', 'keto', 'low-carb', 'whole30', 'paleo', 'gluten-free']);
    }

    /**
     * @return array<int, string>
     */
    private function blockedDietNeedles(string $dietType): array
    {
        if ($dietType === '') {
            return [];
        }

        return match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };
    }

    private function containsBlockedNeedle(array $food, array $needles): bool
    {
        if ($needles === []) {
            return false;
        }

        $haystack = $this->normalizeText(implode(' ', array_filter([
            (string) ($food['name'] ?? ''),
            (string) ($food['category'] ?? ''),
            implode(' ', (array) ($food['ingredients'] ?? [])),
        ])));

        return $this->containsAny($haystack, $needles);
    }

    /**
     * @param  array<int, string>  $allergies
     * @return array<int, string>
     */
    private function allergyNeedles(array $allergies): array
    {
        $needles = [];

        foreach ($allergies as $allergy) {
            $needle = strtolower(trim((string) $allergy));
            if ($needle === '') {
                continue;
            }

            $needles[] = $needle;

            if (str_ends_with($needle, 's') && strlen($needle) > 4) {
                $needles[] = rtrim($needle, 's');
            }

            $needles = array_merge($needles, $this->allergyAssociatedFoodNeedles($needle));
        }

        return array_values(array_unique(array_filter($needles)));
    }

    /**
     * @return array<int, string>
     */
    private function allergyAssociatedFoodNeedles(string $allergy): array
    {
        $allergy = strtolower(trim($allergy));

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

    /**
     * @return array<int, string>
     */
    private function toLowerList(mixed $value): array
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
            $text = strtolower(trim((string) $item));
            if ($text !== '') {
                $items[] = $text;
            }
        }

        return array_values(array_unique($items));
    }

    /**
     * @param  array<int, string>  $left
     * @param  array<int, string>  $right
     */
    private function hasOverlap(array $left, array $right): bool
    {
        return count(array_intersect($left, $right)) > 0;
    }

    private function normalizeMealCode(string $mealCode): string
    {
        $mealCode = strtolower(trim($mealCode));

        return match (true) {
            str_contains($mealCode, 'break') => 'breakfast',
            str_contains($mealCode, 'lunch') => 'lunch',
            str_contains($mealCode, 'dinner'), str_contains($mealCode, 'supper') => 'dinner',
            str_contains($mealCode, 'drink') => 'drink',
            default => 'snack',
        };
    }

    private function normalizeServingUnit(string $unit): string
    {
        $unit = strtolower(trim($unit));

        return match ($unit) {
            '', 'serving', 'servings', 'portion', 'portions' => 'serving',
            'gram', 'grams' => 'g',
            'milliliter', 'milliliters', 'millilitre', 'millilitres' => 'ml',
            'pc', 'piece', 'pieces' => 'pcs',
            'slice', 'slices' => 'slices',
            default => $unit,
        };
    }

    /**
     * @return array<int, string>
     */
    private function rawMealTypes(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $trimmed = trim($value);
        if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
            return str_getcsv(trim($trimmed, '{}'), ',', '"', '\\') ?: [];
        }

        $decoded = json_decode($trimmed, true);

        return is_array($decoded)
            ? $decoded
            : (preg_split('/[\s,;]+/', $trimmed) ?: []);
    }

    /**
     * @param  array<int, string>  $types
     * @return array<int, string>
     */
    private function normalizeMealTypeLabels(array $types): array
    {
        $normalized = [];

        foreach ($types as $type) {
            $candidate = strtolower(trim((string) $type));
            if ($candidate === '') {
                continue;
            }
            if (str_contains($candidate, 'break')) {
                $normalized[] = 'breakfast';
            } elseif (str_contains($candidate, 'lunch')) {
                $normalized[] = 'lunch';
            } elseif (str_contains($candidate, 'dinner') || str_contains($candidate, 'supper')) {
                $normalized[] = 'dinner';
            } elseif (str_contains($candidate, 'snack')) {
                $normalized[] = 'snack';
            } elseif (str_contains($candidate, 'drink') || str_contains($candidate, 'beverage')) {
                $normalized[] = 'drink';
            }
        }

        return $normalized;
    }

    private function isGenericServingUnit(string $unit): bool
    {
        return in_array(strtolower(trim($unit)), ['serving', 'servings', 'portion', 'portions'], true);
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function hasSparseMacroProfile(array $entry): bool
    {
        $macroFields = [
            (float) ($entry['protein_g'] ?? 0),
            (float) ($entry['carbs_g'] ?? 0),
            (float) ($entry['fat_g'] ?? 0),
        ];

        $nonZero = count(array_filter($macroFields, static fn (float $value): bool => $value > 0));

        return $nonZero < 2;
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function hasMissingConstraintMetadata(array $entry): bool
    {
        return ($entry['allergens'] ?? []) === []
            && ($entry['diets_allowed'] ?? []) === []
            && ($entry['ingredients'] ?? []) === [];
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function hasTinyMainMealCalories(array $entry): bool
    {
        $calories = (int) ($entry['calories'] ?? 0);
        if ($calories <= 0) {
            return false;
        }

        $mealTypes = (array) ($entry['meal_types'] ?? []);

        return $calories < 180
            && (in_array('lunch', $mealTypes, true) || in_array('dinner', $mealTypes, true));
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function hasOversizedSnackCalories(array $entry): bool
    {
        $calories = (int) ($entry['calories'] ?? 0);
        $mealTypes = (array) ($entry['meal_types'] ?? []);

        return $calories > 450 && $mealTypes === ['snack'];
    }

    private function defaultServingSize(string $unit, string $mealCode): float
    {
        if ($this->isMassUnit($unit)) {
            return 150.0;
        }

        if ($this->isVolumeUnit($unit)) {
            return $mealCode === 'snack' ? 250.0 : 350.0;
        }

        if ($this->isDiscreteCountUnit($unit)) {
            return in_array($unit, ['slices', 'pcs'], true) ? 2.0 : 1.0;
        }

        return 1.0;
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function portionScaleBounds(string $unit, string $mealCode): array
    {
        if ($mealCode === 'snack') {
            return $this->isMassUnit($unit) || $this->isVolumeUnit($unit)
                ? [0.70, 1.85]
                : [0.75, 1.5];
        }

        return $this->isMassUnit($unit) || $this->isVolumeUnit($unit)
            ? [0.80, 2.10]
            : [0.80, 1.60];
    }

    private function isMassUnit(string $unit): bool
    {
        return in_array($unit, ['g', 'kg'], true);
    }

    private function isVolumeUnit(string $unit): bool
    {
        return in_array($unit, ['ml', 'l'], true);
    }

    private function isDiscreteCountUnit(string $unit): bool
    {
        return in_array($unit, ['pcs', 'piece', 'pieces', 'slices', 'wrap', 'sandwich'], true);
    }

    private function pluralizeUnit(string $unit, float $amount): string
    {
        if (abs($amount - 1.0) < 0.001) {
            return match ($unit) {
                'pcs' => 'pc',
                'slices' => 'slice',
                default => $unit,
            };
        }

        return match ($unit) {
            'pc', 'piece' => 'pcs',
            'slice' => 'slices',
            default => str_ends_with($unit, 's') ? $unit : $unit.'s',
        };
    }

    private function roundToStep(float $value, float $step): float
    {
        if ($step <= 0) {
            return $value;
        }

        return round($value / $step) * $step;
    }

    private function formatQuantity(float $amount): string
    {
        return rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.');
    }

    private function looksLikeStandaloneSnack(string $name): bool
    {
        $text = $this->normalizeText($name);

        return $this->containsAny($text, [
            'protein bar',
            'granola bar',
            'cereal bar',
            'trail mix',
            'mixed nuts',
            'rice cake',
            'rice cakes',
            'cracker',
            'crackers',
            'pretzel',
            'popcorn',
            'brownie',
            'cupcake',
        ]);
    }

    private function normalizeText(string $text): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $text) ?: ''));
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            $needle = strtolower(trim($needle));
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
