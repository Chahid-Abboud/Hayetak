<?php

namespace App\Services\Ai\Context;

use App\Models\AiPlan;
use App\Models\Exercise;
use App\Models\User;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\FoodCatalog\PlannerFoodModel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlannerContextBuilder
{
    public function __construct(
        private readonly FoodCatalogAnomalyService $foodCatalogAnomalies,
        private readonly PlannerFoodModel $plannerFoodModel,
    ) {}

    public function build(User $user, array $profile, int $planHorizonDays = 7): array
    {
        $today = Carbon::today();
        $start = $today->copy()->subDays(6);

        $mealRows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('DATE(me.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings), 0) as calories')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings), 0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings), 0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings), 0) as fat_g')
            ->where('me.user_id', $user->id)
            ->whereBetween('me.eaten_at', [$start->toDateString(), $today->toDateString()])
            ->groupBy(DB::raw('DATE(me.eaten_at)'))
            ->orderBy('day')
            ->get();

        $daysLogged = max(1, $mealRows->count());
        $nutritionAverages = [
            'days_logged' => (int) $mealRows->count(),
            'avg_calories' => (int) round($mealRows->sum('calories') / $daysLogged),
            'avg_protein_g' => (int) round($mealRows->sum('protein_g') / $daysLogged),
            'avg_carbs_g' => (int) round($mealRows->sum('carbs_g') / $daysLogged),
            'avg_fat_g' => (int) round($mealRows->sum('fat_g') / $daysLogged),
        ];

        $workoutRows = DB::table('workout_logs')
            ->selectRaw('COUNT(*) as sessions')
            ->selectRaw('COALESCE(SUM(duration_min), 0) as minutes')
            ->where('user_id', $user->id)
            ->whereBetween(DB::raw('DATE(performed_at)'), [$start->toDateString(), $today->toDateString()])
            ->first();

        $latestDiet = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'diet')
            ->latest('version')
            ->first();

        $latestWorkout = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'workout')
            ->latest('version')
            ->first();

        return [
            'profile' => [
                'age' => $user->age !== null ? (int) $user->age : null,
                'gender' => $this->cleanString($user->gender),
                'height_cm' => $user->height_cm !== null ? (int) $user->height_cm : null,
                'weight_kg' => $user->weight_kg !== null ? (float) $user->weight_kg : null,
                'activity_level' => $this->cleanString($user->activity_level),
                'dietary_goal' => $profile['dietary_goal'] ?: null,
                'fitness_goal' => $profile['fitness_goal'] ?: null,
                'diet_type' => $profile['diet_type'] ?: null,
                'allergies' => $profile['allergies'],
                'medical_conditions' => $profile['medical_conditions'],
                'injury_history' => $profile['injury_history'],
                'available_equipment' => $profile['available_equipment'],
                'preferred_workout_days' => $profile['preferred_workout_days'] ?? [],
                'workout_days_per_week' => $profile['workout_days_per_week'],
                'workout_location' => $profile['workout_location'] ?: null,
                'past_diet_failures' => $profile['past_diet_failures'],
                'past_diet_failures_other' => $profile['past_diet_failures_other'] ?: null,
            ],
            'recent_history' => [
                'window_days' => 7,
                'nutrition_last_7_days' => [
                    'daily_totals' => $mealRows->map(fn ($row) => [
                        'day' => (string) $row->day,
                        'calories' => (int) round((float) $row->calories),
                        'protein_g' => (int) round((float) $row->protein_g),
                        'carbs_g' => (int) round((float) $row->carbs_g),
                        'fat_g' => (int) round((float) $row->fat_g),
                    ])->all(),
                    'averages' => $nutritionAverages,
                ],
                'workouts_last_7_days' => [
                    'sessions' => (int) ($workoutRows->sessions ?? 0),
                    'minutes' => (int) ($workoutRows->minutes ?? 0),
                ],
            ],
            'planning_constraints' => [
                'plan_horizon_days' => $this->normalizePlanHorizonDays($planHorizonDays),
                'plan_horizon_options_days' => [14, 21, 28],
                'plan_horizon_meaning' => 'This is the check-in window before reviewing progress and deciding if replanning is needed.',
                'must_respect_allergies' => true,
                'must_respect_diet_type' => true,
                'must_respect_medical_conditions' => true,
                'must_respect_injuries' => true,
                'must_consider_workout_location_and_equipment' => true,
                'target_training_days_per_week' => $profile['workout_days_per_week'] !== null ? (int) $profile['workout_days_per_week'] : null,
                'preferred_workout_days' => $profile['preferred_workout_days'] ?? [],
                'must_return_json_only' => true,
            ],
            'meal_catalog_hints' => $this->foodCatalog($profile),
            'exercise_catalog_hints' => $this->exerciseCatalog($profile),
            'existing_plan_versions' => [
                'diet' => $latestDiet?->version,
                'workout' => $latestWorkout?->version,
            ],
        ];
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

    private function foodCatalog(array $profile): array
    {
        return $this->plannerFoodModel->buildMealCatalog($profile, 12);
    }

    private function exerciseCatalog(array $profile): array
    {
        $location = strtolower((string) ($profile['workout_location'] ?? ''));
        if ($location === 'both') {
            $location = 'gym';
        }
        $equipment = array_map(
            static fn (string $item): string => strtolower($item),
            is_array($profile['available_equipment'] ?? null) ? $profile['available_equipment'] : []
        );
        $injuries = array_map(
            static fn (string $item): string => strtolower($item),
            is_array($profile['injury_history'] ?? null) ? $profile['injury_history'] : []
        );

        $filtered = Exercise::query()
            ->select(['id', 'name', 'primary_muscle', 'equipment', 'difficulty', 'home_friendly', 'conditions'])
            ->get()
            ->filter(function (Exercise $exercise) use ($location, $equipment, $injuries): bool {
                $exerciseEquipment = strtolower((string) ($exercise->equipment ?? 'bodyweight'));

                if ($location === 'home' && ! $exercise->home_friendly) {
                    $allowedAtHome = $exerciseEquipment === '' || $exerciseEquipment === 'bodyweight' || in_array($exerciseEquipment, $equipment, true);
                    if (! $allowedAtHome) {
                        return false;
                    }
                }

                if ($location === 'home' && $equipment !== [] && $exerciseEquipment !== '' && $exerciseEquipment !== 'bodyweight' && ! in_array($exerciseEquipment, $equipment, true)) {
                    return false;
                }

                $conditions = array_map(
                    static fn ($value): string => strtolower((string) $value),
                    is_array($exercise->conditions) ? $exercise->conditions : []
                );

                foreach ($injuries as $injury) {
                    foreach ($conditions as $condition) {
                        if ($injury !== '' && $condition !== '' && Str::contains($injury, $condition)) {
                            return false;
                        }
                    }
                }

                return true;
            })
            ->values();

        $perMuscleCap = $location === 'gym' ? 3 : 4;
        $balanced = collect();

        foreach ($filtered->groupBy(fn (Exercise $exercise) => strtolower(trim((string) ($exercise->primary_muscle ?? 'general')))) as $group) {
            $balanced = $balanced->merge($group->take($perMuscleCap));
        }

        $balanced = $balanced->unique(fn (Exercise $exercise) => (int) $exercise->id)->values();

        if ($balanced->count() < 40) {
            $remaining = $filtered->reject(fn (Exercise $exercise) => $balanced->contains('id', $exercise->id));
            $balanced = $balanced->merge($remaining->take(40 - $balanced->count()));
        }

        if ($location === 'gym') {
            $balanced = $balanced
                ->sortBy(fn (Exercise $exercise) => [
                    $this->equipmentPriority((string) ($exercise->equipment ?? '')),
                    strtolower((string) ($exercise->primary_muscle ?? '')),
                    strtolower((string) ($exercise->name ?? '')),
                ])
                ->values();
        } else {
            $balanced = $balanced
                ->sortBy(fn (Exercise $exercise) => [
                    strtolower((string) ($exercise->primary_muscle ?? '')),
                    strtolower((string) ($exercise->name ?? '')),
                ])
                ->values();
        }

        return $balanced
            ->take(40)
            ->map(fn (Exercise $exercise) => [
                'name' => (string) $exercise->name,
                'primary_muscle' => $this->cleanString($exercise->primary_muscle),
                'equipment' => $this->cleanString($exercise->equipment),
                'difficulty' => $this->cleanString($exercise->difficulty),
                'home_friendly' => (bool) $exercise->home_friendly,
            ])
            ->values()
            ->all();
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

    private function normalizeMealTypes(
        mixed $value,
        ?string $fallbackCategory = null,
        ?string $fallbackName = null
    ): array {
        $types = [];

        if (is_array($value)) {
            $types = $value;
        } elseif (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed !== '') {
                if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
                    $parts = explode(',', trim($trimmed, '{}'));
                    $types = array_map(static fn (string $part) => trim($part, " \t\n\r\0\x0B\""), $parts);
                } else {
                    $decoded = json_decode($trimmed, true);
                    $types = is_array($decoded)
                        ? $decoded
                        : (preg_split('/[\s,;]+/', $trimmed) ?: []);
                }
            }
        }

        if ($types === [] && is_string($fallbackCategory) && trim($fallbackCategory) !== '') {
            $types = [trim($fallbackCategory)];
        }

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

        if ($normalized === [] && is_string($fallbackName) && trim($fallbackName) !== '') {
            $normalized = $this->inferMealTypesFromName($fallbackName);
        }

        return array_values(array_unique($normalized));
    }

    private function inferMealTypesFromName(string $name): array
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return [];
        }

        $types = [];

        if ($this->containsAnyText($text, ['oat', 'egg', 'toast', 'labneh', 'granola', 'breakfast'])) {
            $types[] = 'breakfast';
        }

        if ($this->containsAnyText($text, ['yogurt', 'fruit', 'berry', 'apple', 'banana', 'cracker', 'bar', 'wafer', 'nuts', 'seed', 'popcorn', 'smoothie', 'shake', 'pudding', 'snack'])) {
            $types[] = 'snack';
        }

        if ($this->containsAnyText($text, ['chicken', 'beef', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'lentil', 'rice', 'pasta', 'quinoa', 'bowl', 'plate', 'stew', 'salad'])) {
            $types[] = 'lunch';
            $types[] = 'dinner';
        }

        if ($types === []) {
            $types = ['snack'];
        }

        return array_values(array_unique($types));
    }

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
            $normalized = strtolower(trim((string) $item));
            if ($normalized !== '') {
                $items[] = $normalized;
            }
        }

        return array_values(array_unique($items));
    }

    private function hasAnyOverlap(array $left, array $right): bool
    {
        if ($left === [] || $right === []) {
            return false;
        }

        $rightSet = array_flip($right);
        foreach ($left as $item) {
            if ($item !== '' && isset($rightSet[$item])) {
                return true;
            }
        }

        return false;
    }

    private function fillCatalogByMealType(array &$byType, array $entries, int $limitPerType): void
    {
        foreach ($entries as $entry) {
            $mealTypes = is_array($entry['meal_types'] ?? null) ? $entry['meal_types'] : [];
            foreach ($mealTypes as $mealType) {
                if (! array_key_exists($mealType, $byType)) {
                    continue;
                }
                if (count($byType[$mealType]) >= $limitPerType) {
                    continue;
                }

                $exists = collect($byType[$mealType])->contains(
                    fn (array $candidate): bool => strtolower((string) ($candidate['name'] ?? '')) === strtolower((string) ($entry['name'] ?? ''))
                );
                if ($exists) {
                    continue;
                }

                $byType[$mealType][] = $entry;
            }
        }
    }

    private function requiresCatalogBackfill(array $byType): bool
    {
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealType) {
            if (count($byType[$mealType] ?? []) < 4) {
                return true;
            }
        }

        return false;
    }

    private function isStrictDietType(string $dietType): bool
    {
        $dietType = strtolower(trim($dietType));

        return $this->containsAnyText($dietType, ['vegan', 'vegetarian', 'pescetarian']);
    }

    private function blockedDietNeedles(string $dietType): array
    {
        $dietType = strtolower(trim($dietType));

        return match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey', 'whey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey', 'shrimp'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };
    }

    private function containsDietBlockedNeedle(Food $food, array $needles): bool
    {
        if ($needles === []) {
            return false;
        }

        $haystacks = array_filter([
            strtolower((string) $food->name),
            strtolower((string) $food->category),
            strtolower((string) $food->cuisine),
        ]);

        foreach ($this->toLowerList($food->ingredients) as $ingredient) {
            $haystacks[] = $ingredient;
        }
        foreach ($this->toLowerList($food->tags) as $tag) {
            $haystacks[] = $tag;
        }

        foreach ($needles as $needle) {
            $needle = strtolower(trim((string) $needle));
            if ($needle === '') {
                continue;
            }

            foreach ($haystacks as $haystack) {
                if ($haystack !== '' && str_contains($haystack, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function containsAnyText(string $haystack, array $needles): bool
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

    private function cleanString(?string $value): ?string
    {
        $clean = trim((string) $value);

        return $clean !== '' ? $clean : null;
    }

    private function equipmentPriority(string $equipment): int
    {
        $equipment = strtolower(trim($equipment));

        return match (true) {
            str_contains($equipment, 'machine') => 0,
            str_contains($equipment, 'cable') => 1,
            str_contains($equipment, 'barbell') => 2,
            str_contains($equipment, 'dumbbell') => 3,
            str_contains($equipment, 'kettlebell') => 4,
            str_contains($equipment, 'bodyweight') => 8,
            default => 5,
        };
    }
}
