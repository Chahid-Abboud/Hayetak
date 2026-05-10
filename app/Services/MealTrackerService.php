<?php

namespace App\Services;

use App\Models\Food;
use App\Models\FoodFavorite;
use App\Models\MealEntry;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\User;
use App\Models\UserPref;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MealTrackerService
{
    public function targets(int $userId): ?array
    {
        $pref = UserPref::where('user_id', $userId)->first();
        $fromPrefs = $this->targetsFromPrefs($pref);
        if ($fromPrefs) {
            return $fromPrefs;
        }

        $user = User::query()->find($userId);
        if (! $user) {
            return null;
        }

        return $this->targetsFromUserProfile($user, $pref);
    }

    private function targetsFromPrefs(?UserPref $pref): ?array
    {
        if (! $pref) {
            return null;
        }

        $calories = (float) ($pref->daily_goal_calories ?? 0);
        $protein = (float) ($pref->daily_goal_protein_g ?? 0);
        $carbs = (float) ($pref->daily_goal_carbs_g ?? 0);
        $fat = (float) ($pref->daily_goal_fat_g ?? 0);

        if ($calories <= 0 && $protein <= 0 && $carbs <= 0 && $fat <= 0) {
            return null;
        }

        // If calories are absent but macros exist, derive calories from macro energy.
        if ($calories <= 0) {
            $calories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
        }

        return [
            'calories' => round($calories, 1),
            'protein' => round(max(0, $protein), 1),
            'carbs' => round(max(0, $carbs), 1),
            'fat' => round(max(0, $fat), 1),
        ];
    }

    private function targetsFromUserProfile(User $user, ?UserPref $pref): array
    {
        $weightKg = max(25.0, (float) ($user->weight_kg ?? 75));
        $heightCm = max(120.0, (float) ($user->height_cm ?? 170));
        $age = max(13, (int) ($user->age ?? 25));
        $gender = strtolower((string) ($user->gender ?? 'male'));
        $goalText = strtolower(trim(((string) ($user->dietary_goal ?? '')).' '.((string) ($user->fitness_goal ?? ''))));
        $activityFactor = $this->resolveActivityFactor((string) ($user->activity_level ?? ''), (int) ($user->workout_days_per_week ?? 0), $pref);

        $bmr = $gender === 'female'
            ? ((10 * $weightKg) + (6.25 * $heightCm) - (5 * $age) - 161)
            : ((10 * $weightKg) + (6.25 * $heightCm) - (5 * $age) + 5);

        $tdee = max(1200.0, $bmr * $activityFactor);

        $calorieMultiplier = 1.0;
        $proteinPerKg = 1.6;

        if (
            str_contains($goalText, 'lose')
            || str_contains($goalText, 'loss')
            || str_contains($goalText, 'fat')
            || str_contains($goalText, 'cut')
        ) {
            $calorieMultiplier = 0.85;
            $proteinPerKg = 1.8;
        } elseif (
            str_contains($goalText, 'gain')
            || str_contains($goalText, 'bulk')
            || str_contains($goalText, 'muscle')
        ) {
            $calorieMultiplier = 1.10;
            $proteinPerKg = 2.0;
        }

        $targetCalories = max(1200.0, $tdee * $calorieMultiplier);
        $proteinG = max(0.0, $weightKg * $proteinPerKg);
        $fatG = max(0.0, max($weightKg * 0.6, ($targetCalories * 0.25) / 9));
        $carbsG = max(0.0, ($targetCalories - (($proteinG * 4) + ($fatG * 9))) / 4);

        return [
            'calories' => round($targetCalories, 1),
            'protein' => round($proteinG, 1),
            'carbs' => round($carbsG, 1),
            'fat' => round($fatG, 1),
        ];
    }

    private function resolveActivityFactor(string $activityLevel, int $workoutDays, ?UserPref $pref): float
    {
        $activityLevel = strtolower(trim($activityLevel));
        $fromPref = (float) ($pref?->activity_factor ?? 0);
        if ($fromPref > 0) {
            return $fromPref;
        }

        return match ($activityLevel) {
            'sedentary' => 1.20,
            'lightly active' => 1.375,
            'moderately active' => 1.55,
            'very active' => 1.725,
            'athlete' => 1.90,
            default => match (true) {
                $workoutDays >= 6 => 1.725,
                $workoutDays >= 3 => 1.55,
                $workoutDays >= 1 => 1.375,
                default => 1.20,
            },
        };
    }

    public function userAllergies(int $userId): array
    {
        $u = DB::table('users')->select('allergies')->where('id', $userId)->first();
        $arr = $u?->allergies;

        // pg jsonb comes as string sometimes, normalize:
        if (is_string($arr)) {
            $decoded = json_decode($arr, true);

            return is_array($decoded) ? array_values($decoded) : [];
        }

        return is_array($arr) ? array_values($arr) : [];
    }

    public function userDietName(int $userId): ?string
    {
        $dietName = User::query()->whereKey($userId)->value('diet_name');

        return is_string($dietName) && trim($dietName) !== '' ? trim($dietName) : null;
    }

    /**
     * @throws \InvalidArgumentException
     */
    public function resolveLoggedServings(Food $food, array $payload, ?string $mealType = null): float
    {
        $hasServings = array_key_exists('servings', $payload) && $payload['servings'] !== null && $payload['servings'] !== '';
        $hasGrams = array_key_exists('grams', $payload) && $payload['grams'] !== null && $payload['grams'] !== '';
        $hasMilliliters = array_key_exists('milliliters', $payload) && $payload['milliliters'] !== null && $payload['milliliters'] !== '';

        $providedCount = (int) $hasServings + (int) $hasGrams + (int) $hasMilliliters;
        if ($providedCount !== 1) {
            throw new \InvalidArgumentException('Provide exactly one quantity: servings, grams, or milliliters.');
        }

        if ($hasServings) {
            return round(max(0.01, (float) $payload['servings']), 4);
        }

        if ($hasGrams) {
            return $this->quantityToServings($food, (float) $payload['grams'], 'grams');
        }

        $normalizedMealType = strtolower(trim((string) $mealType));
        if ($normalizedMealType !== 'drink' && ! $this->isLiquidServingUnit((string) ($food->serving_unit ?? ''))) {
            throw new \InvalidArgumentException('Milliliters can only be used for drinks.');
        }

        return $this->quantityToServings($food, (float) $payload['milliliters'], 'milliliters');
    }

    private function quantityToServings(Food $food, float $quantity, string $mode): float
    {
        $quantity = max(0.01, $quantity);
        $servingSize = max(0.0, (float) ($food->serving_size ?? 0));
        $servingUnit = strtolower(trim((string) ($food->serving_unit ?? '')));

        if ($mode === 'milliliters') {
            if (in_array($servingUnit, ['l', 'liter', 'liters'], true)) {
                $servingSize *= 1000;
            } elseif (! $this->isLiquidServingUnit($servingUnit)) {
                $servingSize = 250.0;
            }

            return round(max(0.01, $quantity / max(1.0, $servingSize)), 4);
        }

        if (in_array($servingUnit, ['kg', 'kilogram', 'kilograms'], true)) {
            $servingSize *= 1000;
        } elseif ($servingSize <= 0) {
            $servingSize = 100.0;
        }

        return round(max(0.01, $quantity / max(1.0, $servingSize)), 4);
    }

    private function isLiquidServingUnit(string $unit): bool
    {
        return in_array($unit, ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'], true);
    }

    public function daySummary(int $userId, string $dateYmd): array
    {
        $date = Carbon::parse($dateYmd)->toDateString();

        // daily totals
        $daily = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('
                COALESCE(SUM(COALESCE(f.calories,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g,0)   * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g,0)     * me.servings),0) as fat
            ')
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->first();

        // per-meal totals
        $byMealRaw = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('
                me.meal_type,
                COALESCE(SUM(COALESCE(f.calories,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g,0)   * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g,0)     * me.servings),0) as fat
            ')
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->groupBy('me.meal_type')
            ->get();

        $mealTotals = [
            'breakfast' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
            'lunch' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
            'dinner' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
            'snack' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
            'drink' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
        ];

        foreach ($byMealRaw as $r) {
            if (! isset($mealTotals[$r->meal_type])) {
                continue;
            }
            $mealTotals[$r->meal_type] = [
                'calories' => (float) $r->calories,
                'protein' => (float) $r->protein,
                'carbs' => (float) $r->carbs,
                'fat' => (float) $r->fat,
            ];
        }

        // entries
        $entries = MealEntry::with([
            'food',
            'nutritionPlanItem.food',
            'nutritionPlanItem.meal.day.plan',
        ])
            ->where('user_id', $userId)
            ->whereDate('eaten_at', $date)
            ->orderBy('meal_type')->orderBy('id')
            ->get()
            ->map(function ($e) {
                /** @var \App\Models\MealEntry $e */
                /** @var \App\Models\Food|null $f */
                $ratio = (float) $e->servings;
                $f = $e->food;

                // (Very rare) but keep UI/API safe if relation missing
                if (! $f) {
                    return [
                        'id' => (int) $e->id,
                        'meal_type' => (string) $e->meal_type,
                        'servings' => $ratio,
                        'eaten_at' => $e->eaten_at?->toDateString(),
                        'nutrition_plan_item_id' => $e->nutrition_plan_item_id,
                        'plan_tracking' => $this->serializeEntryPlanTracking($e),
                        'food' => [
                            'id' => 0,
                            'name' => '',
                            'category' => '',
                            'allergens' => [],
                            'serving_unit' => 'g',
                            'serving_size' => 100,
                            'calories' => 0,
                            'protein' => 0,
                            'carbs' => 0,
                            'fat' => 0,
                        ],
                    ];
                }

                return [
                    'id' => (int) $e->id,
                    'meal_type' => (string) $e->meal_type,
                    'servings' => $ratio,
                    // ✅ IDE + runtime safe
                    'eaten_at' => $e->eaten_at?->toDateString(),
                    'nutrition_plan_item_id' => $e->nutrition_plan_item_id,
                    'plan_tracking' => $this->serializeEntryPlanTracking($e),
                    'food' => [
                        'id' => (int) $f->id,
                        'name' => (string) $f->name,
                        'category' => (string) ($f->category ?? ''),
                        'allergens' => is_array($f->allergens) ? $f->allergens : [],
                        'serving_unit' => (string) ($f->serving_unit ?? 'g'),
                        'serving_size' => (float) ($f->serving_size ?? 100),
                        'calories' => (float) (($f->calories ?? 0) * $ratio),
                        'protein' => (float) (($f->protein_g ?? 0) * $ratio),
                        'carbs' => (float) (($f->carbs_g ?? 0) * $ratio),
                        'fat' => (float) (($f->fat_g ?? 0) * $ratio),
                    ],
                ];
            })->values();

        $dailyTotals = [
            'calories' => (float) ($daily->calories ?? 0),
            'protein' => (float) ($daily->protein ?? 0),
            'carbs' => (float) ($daily->carbs ?? 0),
            'fat' => (float) ($daily->fat ?? 0),
        ];

        $targets = $this->targets($userId);
        $remaining = $targets ? [
            'calories' => max(0, (float) $targets['calories'] - $dailyTotals['calories']),
            'protein' => max(0, (float) $targets['protein'] - $dailyTotals['protein']),
            'carbs' => max(0, (float) $targets['carbs'] - $dailyTotals['carbs']),
            'fat' => max(0, (float) $targets['fat'] - $dailyTotals['fat']),
        ] : null;

        $plannedDay = $this->plannedDay($userId, $date);

        return [
            'date' => $date,
            'dailyTotals' => $dailyTotals,
            'mealTotals' => $mealTotals,
            'entries' => $entries,
            'targets' => $targets,
            'remaining' => $remaining,
            'planModeAvailable' => $plannedDay !== null,
            'plannedDay' => $plannedDay,
        ];
    }

    public function daysWithEntries(int $userId, string $monthYyyyMm): array
    {
        // monthYyyyMm: "2026-01"
        $start = Carbon::parse($monthYyyyMm.'-01')->startOfMonth();
        $end = (clone $start)->endOfMonth();

        return DB::table('meal_entries')
            ->where('user_id', $userId)
            ->whereBetween('eaten_at', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('DISTINCT eaten_at')
            ->orderBy('eaten_at')
            ->pluck('eaten_at')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->values()
            ->all();
    }

    public function recommendedFoods(int $userId, string $dateYmd, ?string $mealType = null, int $limit = 8): array
    {
        $summary = $this->daySummary($userId, $dateYmd);
        $rem = $summary['remaining'];
        if (! $rem) {
            return [];
        }

        $allergies = $this->userAllergies($userId);

        // Target “per item” approximation: suggest items that help fill remaining macros gradually.
        $tp = max(1, $rem['protein'] / 3.0);
        $tc = max(1, $rem['carbs'] / 3.0);
        $tf = max(1, $rem['fat'] / 3.0);

        $q = Food::query()
            ->select(['id', 'name', 'category', 'serving_size', 'serving_unit', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'allergens', 'meal_types'])
            ->when($mealType && in_array($mealType, ['breakfast', 'lunch', 'dinner', 'snack', 'drink'], true), function ($qq) use ($mealType) {
                $qq->whereRaw('? IN (SELECT unnest(meal_types)::text)', [$mealType]);
            });

        // exclude allergens
        foreach ($allergies as $a) {
            $q->where(function ($sub) use ($a) {
                $sub->whereNull('allergens')->orWhereJsonDoesntContain('allergens', $a);
            });
        }

        // simple scoring: “distance” from ideal per-item remaining macros
        $q->orderByRaw('
            ABS(COALESCE(protein_g,0)::numeric - ?::numeric) +
            ABS(COALESCE(carbs_g,0)::numeric   - ?::numeric) +
            ABS(COALESCE(fat_g,0)::numeric     - ?::numeric) +
            (ABS(COALESCE(calories,0)::numeric - ?::numeric) / 10.0)
        ', [$tp, $tc, $tf, max(1, $rem['calories'] / 3.0)]);

        return $q->limit($limit)->get()->map(function ($f) use ($userId) {
            /** @var \App\Models\Food $f */
            $isFav = FoodFavorite::where('user_id', $userId)->where('food_id', $f->id)->exists();

            return [
                'id' => (int) $f->id,
                'name' => (string) $f->name,
                'category' => (string) ($f->category ?? ''),
                'allergens' => is_array($f->allergens) ? $f->allergens : [],
                'serving_size' => (float) ($f->serving_size ?? 100),
                'serving_unit' => (string) ($f->serving_unit ?? 'g'),
                'calories' => (int) ($f->calories ?? 0),
                'protein_g' => (float) ($f->protein_g ?? 0),
                'carbs_g' => (float) ($f->carbs_g ?? 0),
                'fat_g' => (float) ($f->fat_g ?? 0),
                'is_favorite' => $isFav,
            ];
        })->values()->all();
    }

    public function plannedDay(int $userId, string $dateYmd): ?array
    {
        $date = Carbon::parse($dateYmd)->toDateString();

        $day = NutritionPlanDay::query()
            ->whereDate('date', $date)
            ->whereHas('plan', function ($query) use ($userId): void {
                $query
                    ->where('user_id', $userId)
                    ->where('is_active', true)
                    ->whereNotNull('ai_request_id');
            })
            ->with([
                'meals' => fn ($query) => $query->orderBy('order'),
                'meals.items.food',
            ])
            ->first();

        if (! $day || ! $day->plan) {
            return null;
        }

        $planEntries = MealEntry::query()
            ->with('food')
            ->where('user_id', $userId)
            ->whereDate('eaten_at', $date)
            ->whereNotNull('nutrition_plan_item_id')
            ->get()
            ->keyBy('nutrition_plan_item_id');

        return [
            'plan' => [
                'id' => (int) $day->plan->id,
                'name' => (string) $day->plan->name,
                'goal' => $day->plan->goal,
                'start_date' => optional($day->plan->start_date)->toDateString(),
                'duration_days' => (int) ($day->plan->duration_days ?? 0),
            ],
            'day' => [
                'id' => (int) $day->id,
                'day_index' => (int) $day->day_index,
                'date' => $day->date?->toDateString(),
                'notes' => $day->notes,
            ],
            'meals' => $day->meals->map(function ($meal) use ($planEntries) {
                return [
                    'id' => (int) $meal->id,
                    'meal_type' => (string) $meal->meal_type,
                    'order' => (int) ($meal->order ?? 0),
                    'title' => $this->mealTitleFromNotes($meal->notes, (string) $meal->meal_type),
                    'notes' => $meal->notes,
                    'items' => $meal->items->map(function (NutritionPlanItem $item) use ($planEntries, $meal) {
                        /** @var MealEntry|null $entry */
                        $entry = $planEntries->get($item->id);
                        $defaultServings = $this->defaultServingsForPlannedItem($item);

                        return [
                            'id' => (int) $item->id,
                            'meal_type' => (string) $meal->meal_type,
                            'sort_order' => (int) ($item->sort_order ?? 0),
                            'servings' => $item->servings !== null ? (float) $item->servings : null,
                            'grams' => $item->grams !== null ? (float) $item->grams : null,
                            'default_servings' => $defaultServings,
                            'notes' => $item->notes,
                            'status' => $this->plannedStatus($entry, $item),
                            'food' => $this->serializeFood($item->food),
                            'logged_entry' => $entry ? [
                                'id' => (int) $entry->id,
                                'food_id' => (int) $entry->food_id,
                                'servings' => (float) $entry->servings,
                                'eaten_at' => $entry->eaten_at?->toDateString(),
                                'food' => $this->serializeFood($entry->food, (float) $entry->servings),
                            ] : null,
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ];
    }

    private function serializeEntryPlanTracking(MealEntry $entry): ?array
    {
        $plannedItem = $entry->nutritionPlanItem;
        if (! $plannedItem || ! $plannedItem->meal || ! $plannedItem->meal->day) {
            return null;
        }

        return [
            'nutrition_plan_item_id' => (int) $plannedItem->id,
            'planned_food_id' => $plannedItem->food_id ? (int) $plannedItem->food_id : null,
            'planned_food_name' => $plannedItem->food?->name,
            'meal_type' => (string) $plannedItem->meal->meal_type,
            'status' => $this->plannedStatus($entry, $plannedItem),
            'plan_day' => [
                'id' => (int) $plannedItem->meal->day->id,
                'day_index' => (int) $plannedItem->meal->day->day_index,
                'date' => $plannedItem->meal->day->date?->toDateString(),
            ],
        ];
    }

    private function plannedStatus(?MealEntry $entry, ?NutritionPlanItem $item): string
    {
        if (! $entry || ! $item) {
            return 'pending';
        }

        return (int) $entry->food_id === (int) $item->food_id
            ? 'logged_exact'
            : 'logged_substitute';
    }

    private function defaultServingsForPlannedItem(NutritionPlanItem $item): float
    {
        if ($item->servings !== null) {
            return max(0.25, (float) $item->servings);
        }

        $servingSize = (float) ($item->food?->serving_size ?? 0);
        $grams = (float) ($item->grams ?? 0);
        if ($grams > 0 && $servingSize > 0) {
            return max(0.25, round($grams / $servingSize, 2));
        }

        return 1.0;
    }

    private function mealTitleFromNotes(?string $notes, string $mealType): string
    {
        $first = trim((string) str($notes ?? '')->before('|'));

        return $first !== '' ? $first : str($mealType)->headline()->toString();
    }

    private function serializeFood(?Food $food, float $ratio = 1.0): array
    {
        if (! $food) {
            return [
                'id' => 0,
                'name' => '',
                'category' => '',
                'allergens' => [],
                'serving_unit' => 'g',
                'serving_size' => 100,
                'calories' => 0,
                'protein' => 0,
                'carbs' => 0,
                'fat' => 0,
            ];
        }

        return [
            'id' => (int) $food->id,
            'name' => (string) $food->name,
            'category' => (string) ($food->category ?? ''),
            'allergens' => is_array($food->allergens) ? $food->allergens : [],
            'serving_unit' => (string) ($food->serving_unit ?? 'g'),
            'serving_size' => (float) ($food->serving_size ?? 100),
            'calories' => (float) (($food->calories ?? 0) * $ratio),
            'protein' => (float) (($food->protein_g ?? 0) * $ratio),
            'carbs' => (float) (($food->carbs_g ?? 0) * $ratio),
            'fat' => (float) (($food->fat_g ?? 0) * $ratio),
        ];
    }
}
