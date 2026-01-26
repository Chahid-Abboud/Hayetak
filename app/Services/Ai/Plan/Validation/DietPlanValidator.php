<?php

namespace App\Services\Ai\Plan\Validation;

use Illuminate\Support\Arr;

class DietPlanValidator
{
    /**
     * Validate + normalize nutrition_plan JSON structure.
     *
     * Expected structure:
     * nutrition_plan: {
     *   name, goal, start_date (Y-m-d), duration_days (int),
     *   targets: { calories_kcal?, protein_g?, carbs_g?, fat_g?, fiber_g? },
     *   meta?,
     *   days: [
     *     { day_index, date?, notes?, meals: [
     *        { meal_type (breakfast|lunch|dinner|snack), order?, notes?, items: [
     *           { food_id, servings|null, grams|null, sort_order?, notes? }
     *        ]}
     *     ]}
     *   ]
     * }
     *
     * Rules enforced:
     * - food_id must be in allowed_food_ids
     * - each item must have servings OR grams (at least one not null)
     * - day_index must be 1..duration_days
     * - meal_type must be allowed value
     */
    public function validate(
        array $nutritionPlan,
        array $allowedFoodIds,
        array $options = []
    ): array {
        $errors = [];

        $allowedSet = $this->toBoolSet($allowedFoodIds);

        $name = trim((string) Arr::get($nutritionPlan, 'name', ''));
        $goal = trim((string) Arr::get($nutritionPlan, 'goal', ''));
        $startDate = trim((string) Arr::get($nutritionPlan, 'start_date', ''));
        $durationDays = Arr::get($nutritionPlan, 'duration_days', null);
        $days = Arr::get($nutritionPlan, 'days', null);

        if ($name === '') $errors[] = 'nutrition_plan.name is required';
        if ($goal === '') $errors[] = 'nutrition_plan.goal is required';

        if (!is_int($durationDays)) {
            if (is_numeric($durationDays)) $durationDays = (int) $durationDays;
        }
        if (!is_int($durationDays) || $durationDays < 1 || $durationDays > 31) {
            $errors[] = 'nutrition_plan.duration_days must be an integer 1..31';
        }

        if ($startDate !== '' && !$this->isYmdDate($startDate)) {
            $errors[] = 'nutrition_plan.start_date must be YYYY-MM-DD';
        }

        if (!is_array($days) || empty($days)) {
            $errors[] = 'nutrition_plan.days must be a non-empty array';
        }

        if (!empty($errors)) {
            throw new ValidationException($errors);
        }

        $allowedMealTypes = ['breakfast','lunch','dinner','snack'];

        $normalizedDays = [];
        $seenDayIndex = [];

        foreach ($days as $di => $day) {
            if (!is_array($day)) {
                $errors[] = "nutrition_plan.days[$di] must be an object";
                continue;
            }

            $dayIndex = Arr::get($day, 'day_index', null);
            if (!is_int($dayIndex)) {
                if (is_numeric($dayIndex)) $dayIndex = (int) $dayIndex;
            }

            if (!is_int($dayIndex) || $dayIndex < 1 || $dayIndex > $durationDays) {
                $errors[] = "nutrition_plan.days[$di].day_index must be 1..{$durationDays}";
                continue;
            }

            if (isset($seenDayIndex[$dayIndex])) {
                $errors[] = "Duplicate day_index {$dayIndex} in nutrition_plan.days";
                continue;
            }
            $seenDayIndex[$dayIndex] = true;

            $date = Arr::get($day, 'date', null);
            if ($date !== null) {
                $date = trim((string) $date);
                if ($date !== '' && !$this->isYmdDate($date)) {
                    $errors[] = "nutrition_plan.days[$di].date must be YYYY-MM-DD if provided";
                    continue;
                }
            }

            $meals = Arr::get($day, 'meals', null);
            if (!is_array($meals) || empty($meals)) {
                $errors[] = "nutrition_plan.days[$di].meals must be a non-empty array";
                continue;
            }

            $normalizedMeals = [];

            foreach ($meals as $mi => $meal) {
                if (!is_array($meal)) {
                    $errors[] = "nutrition_plan.days[$di].meals[$mi] must be an object";
                    continue;
                }

                $mealType = trim((string) Arr::get($meal, 'meal_type', ''));
                $mealType = strtolower($mealType);

                if (!in_array($mealType, $allowedMealTypes, true)) {
                    $errors[] = "Invalid meal_type at nutrition_plan.days[$di].meals[$mi] (must be breakfast|lunch|dinner|snack)";
                    continue;
                }

                $items = Arr::get($meal, 'items', null);
                if (!is_array($items) || empty($items)) {
                    $errors[] = "nutrition_plan.days[$di].meals[$mi].items must be a non-empty array";
                    continue;
                }

                $normalizedItems = [];
                $sort = 1;

                foreach ($items as $ii => $item) {
                    if (!is_array($item)) {
                        $errors[] = "nutrition_plan.days[$di].meals[$mi].items[$ii] must be an object";
                        continue;
                    }

                    $foodId = Arr::get($item, 'food_id', null);
                    if (!is_int($foodId)) {
                        if (is_numeric($foodId)) $foodId = (int) $foodId;
                    }
                    if (!is_int($foodId) || $foodId <= 0) {
                        $errors[] = "Invalid food_id at nutrition_plan.days[$di].meals[$mi].items[$ii]";
                        continue;
                    }

                    if (!isset($allowedSet[$foodId])) {
                        $errors[] = "food_id {$foodId} is not allowed (nutrition_plan.days[$di].meals[$mi].items[$ii])";
                        continue;
                    }

                    $servings = Arr::get($item, 'servings', null);
                    $grams    = Arr::get($item, 'grams', null);

                    if ($servings !== null && !is_float($servings) && !is_int($servings)) {
                        if (is_numeric($servings)) $servings = (float) $servings;
                    }
                    if ($grams !== null && !is_int($grams)) {
                        if (is_numeric($grams)) $grams = (int) $grams;
                    }

                    // Must have servings OR grams
                    $hasServings = $servings !== null && $servings > 0;
                    $hasGrams    = $grams !== null && $grams > 0;

                    if (!$hasServings && !$hasGrams) {
                        $errors[] = "nutrition_plan item must have servings OR grams (food_id {$foodId}, day_index {$dayIndex}, meal {$mealType})";
                        continue;
                    }

                    $sortOrder = Arr::get($item, 'sort_order', $sort);
                    if (!is_int($sortOrder)) {
                        if (is_numeric($sortOrder)) $sortOrder = (int) $sortOrder;
                    }
                    if (!is_int($sortOrder) || $sortOrder < 1 || $sortOrder > 200) {
                        $sortOrder = $sort;
                    }

                    $note = trim((string) Arr::get($item, 'notes', ''));

                    $normalizedItems[] = [
                        'food_id'    => $foodId,
                        'servings'   => $hasServings ? (float) $servings : null,
                        'grams'      => $hasGrams ? (int) $grams : null,
                        'sort_order' => $sortOrder,
                        'notes'      => $note !== '' ? $note : null,
                    ];

                    $sort++;
                }

                // Deterministic ordering
                usort($normalizedItems, fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);

                $order = Arr::get($meal, 'order', $mi + 1);
                if (!is_int($order)) {
                    if (is_numeric($order)) $order = (int) $order;
                }
                if (!is_int($order) || $order < 1 || $order > 20) {
                    $order = $mi + 1;
                }

                $mealNotes = trim((string) Arr::get($meal, 'notes', ''));

                $normalizedMeals[] = [
                    'meal_type' => $mealType,
                    'order'     => $order,
                    'notes'     => $mealNotes !== '' ? $mealNotes : null,
                    'items'     => $normalizedItems,
                ];
            }

            // Deterministic ordering by meal order
            usort($normalizedMeals, fn ($a, $b) => $a['order'] <=> $b['order']);

            $dayNotes = trim((string) Arr::get($day, 'notes', ''));

            $normalizedDays[] = [
                'day_index' => $dayIndex,
                'date'      => ($date ?? '') !== '' ? $date : null,
                'notes'     => $dayNotes !== '' ? $dayNotes : null,
                'meals'     => $normalizedMeals,
            ];
        }

        // Sort days by day_index
        usort($normalizedDays, fn ($a, $b) => $a['day_index'] <=> $b['day_index']);

        // Optional: target sanity (very light)
        $targets = Arr::get($nutritionPlan, 'targets', []);
        if ($targets !== null && !is_array($targets)) $targets = [];

        if (!empty($errors)) {
            throw new ValidationException($errors);
        }

        return [
            'name'          => $name,
            'goal'          => $goal,
            'start_date'    => $startDate !== '' ? $startDate : null,
            'duration_days' => $durationDays,
            'is_active'     => (bool) Arr::get($nutritionPlan, 'is_active', false),
            'targets'       => $this->normalizeTargets($targets),
            'meta'          => is_array(Arr::get($nutritionPlan, 'meta')) ? Arr::get($nutritionPlan, 'meta') : [],
            'days'          => $normalizedDays,
        ];
    }

    private function normalizeTargets(array $targets): array
    {
        $out = [];

        foreach (['calories_kcal','protein_g','carbs_g','fat_g','fiber_g'] as $k) {
            $v = $targets[$k] ?? null;
            if ($v === null) continue;
            if (!is_numeric($v)) continue;
            $out[$k] = $k === 'calories_kcal' ? (int) round((float) $v) : (float) $v;
        }

        $notes = trim((string) ($targets['notes'] ?? ''));
        if ($notes !== '') $out['notes'] = $notes;

        return $out;
    }

    private function isYmdDate(string $s): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) return false;
        [$y,$m,$d] = array_map('intval', explode('-', $s));
        return checkdate($m, $d, $y);
    }

    private function toBoolSet(array $ids): array
    {
        $set = [];
        foreach ($ids as $id) {
            if (is_numeric($id)) $set[(int) $id] = true;
        }
        return $set;
    }
}
