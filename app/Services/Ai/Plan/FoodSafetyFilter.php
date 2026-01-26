<?php

namespace App\Services\Ai\Plan;

use App\Models\Food;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class FoodSafetyFilter
{
    /**
     * Build food allow/block lists based on user's diet + allergies.
     *
     * Returns:
     * - allowed_food_ids: int[]
     * - blocked_food_ids: int[] (optional, limited)
     * - meta: applied filters
     */
    public function build(User $user): array
    {
        $dietName = $this->normalizeScalar($user->diet_name); // e.g. "Mediterranean"
        $allergies = $this->normalizeStringArray($user->allergies); // stored as JSON string in your DB

        // 1) Start with base query
        $q = Food::query()->select(['id']);

        // 2) Apply diet filter (case-insensitive, safe for jsonb array)
        // Allow if diets_allowed is NULL or [] OR contains user's diet.
        $q->where(function (Builder $w) use ($dietName) {
            $w->whereNull('diets_allowed')
              ->orWhereRaw("jsonb_array_length(COALESCE(diets_allowed, '[]'::jsonb)) = 0");

            if ($dietName !== '') {
                // Case-insensitive membership check inside jsonb array
                $w->orWhereRaw(
                    "EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(COALESCE(diets_allowed, '[]'::jsonb)) AS d(val)
                        WHERE lower(d.val) = lower(?)
                    )",
                    [$dietName]
                );
            }
        });

        // 3) Apply allergy exclusion filter (case-insensitive)
        // Exclude food if ANY allergen equals user's allergy string.
        if (!empty($allergies)) {
            foreach ($allergies as $a) {
                $q->whereRaw(
                    "NOT EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(COALESCE(allergens, '[]'::jsonb)) AS x(val)
                        WHERE lower(x.val) = lower(?)
                    )",
                    [$a]
                );
            }
        }

        $allowedFoodIds = $q->orderBy('id')->pluck('id')->map(fn ($v) => (int) $v)->all();

        // Optional: build blocked list for debugging (limited)
        // Blocked = foods failing diet+allergy (approx) -> we just compute "not in allowed"
        $blockedFoodIds = Food::query()
            ->select('id')
            ->whereNotIn('id', $allowedFoodIds ?: [0])
            ->orderBy('id')
            ->limit(500)
            ->pluck('id')
            ->map(fn ($v) => (int) $v)
            ->all();

        return [
            'allowed_food_ids' => $allowedFoodIds,
            'blocked_food_ids' => $blockedFoodIds,
            'meta' => [
                'diet_name' => $dietName,
                'allergies' => $allergies,
                'allowed_count' => count($allowedFoodIds),
                'blocked_count_sampled' => count($blockedFoodIds),
            ],
        ];
    }

    /**
     * Normalize a scalar string.
     */
    private function normalizeScalar($v): string
    {
        $s = trim((string) ($v ?? ''));
        return $s;
    }

    /**
     * Your DB stores allergies like: "["Banana","Mustard"]" (string)
     * This helper accepts:
     * - JSON string
     * - PHP array
     * - single string
     */
    private function normalizeStringArray($value): array
    {
        if ($value === null) return [];

        // If it's a JSON string array, decode it
        if (is_string($value)) {
            $trim = trim($value);

            // JSON array string?
            if ($trim !== '' && ($trim[0] === '[' || $trim[0] === '{')) {
                $decoded = json_decode($trim, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $value = $decoded;
                } else {
                    // fallback: treat as single string
                    $value = [$trim];
                }
            } else {
                $value = [$trim];
            }
        }

        if (!is_array($value)) return [];

        $out = [];
        foreach ($value as $v) {
            if ($v === null) continue;
            $s = trim((string) $v);
            if ($s === '') continue;
            $out[] = $s;
        }

        // unique while preserving order
        $out = array_values(array_unique($out));
        return $out;
    }
}
