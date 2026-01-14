<?php

namespace App\Services;

use App\Models\Food;
use App\Models\FoodFavorite;
use App\Models\MealEntry;
use App\Models\UserPref;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MealTrackerService
{
    public function targets(int $userId): ?array
    {
        $pref = UserPref::where('user_id', $userId)->first();
        if (!$pref) return null;

        $t = [
            'calories' => $pref->daily_goal_calories,
            'protein'  => (float) ($pref->daily_goal_protein_g ?? 0),
            'carbs'    => (float) ($pref->daily_goal_carbs_g ?? 0),
            'fat'      => (float) ($pref->daily_goal_fat_g ?? 0),
        ];

        return ($t['calories'] || $t['protein'] || $t['carbs'] || $t['fat']) ? $t : null;
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

    public function daySummary(int $userId, string $dateYmd): array
    {
        $date = Carbon::parse($dateYmd)->toDateString();

        // daily totals
        $daily = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw("
                COALESCE(SUM(COALESCE(f.calories,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g,0)   * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g,0)     * me.servings),0) as fat
            ")
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->first();

        // per-meal totals
        $byMealRaw = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw("
                me.meal_type,
                COALESCE(SUM(COALESCE(f.calories,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g,0)   * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g,0)     * me.servings),0) as fat
            ")
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->groupBy('me.meal_type')
            ->get();

        $mealTotals = [
            'breakfast' => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'lunch'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'dinner'    => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'snack'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'drink'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
        ];

        foreach ($byMealRaw as $r) {
            if (!isset($mealTotals[$r->meal_type])) continue;
            $mealTotals[$r->meal_type] = [
                'calories' => (float) $r->calories,
                'protein'  => (float) $r->protein,
                'carbs'    => (float) $r->carbs,
                'fat'      => (float) $r->fat,
            ];
        }

        // entries
        $entries = MealEntry::with('food')
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
                if (!$f) {
                    return [
                        'id'        => (int) $e->id,
                        'meal_type' => (string) $e->meal_type,
                        'servings'  => $ratio,
                        'eaten_at'  => $e->eaten_at?->toDateString(),
                        'food'      => [
                            'id'           => 0,
                            'name'         => '',
                            'category'     => '',
                            'allergens'    => [],
                            'serving_unit' => 'g',
                            'serving_size' => 100,
                            'calories'     => 0,
                            'protein'      => 0,
                            'carbs'        => 0,
                            'fat'          => 0,
                        ],
                    ];
                }

                return [
                    'id'        => (int) $e->id,
                    'meal_type' => (string) $e->meal_type,
                    'servings'  => $ratio,
                    // ✅ IDE + runtime safe
                    'eaten_at'  => $e->eaten_at?->toDateString(),
                    'food'      => [
                        'id'           => (int) $f->id,
                        'name'         => (string) $f->name,
                        'category'     => (string) ($f->category ?? ''),
                        'allergens'    => is_array($f->allergens) ? $f->allergens : [],
                        'serving_unit' => (string) ($f->serving_unit ?? 'g'),
                        'serving_size' => (float)  ($f->serving_size ?? 100),
                        'calories'     => (float) (($f->calories ?? 0) * $ratio),
                        'protein'      => (float) (($f->protein_g ?? 0) * $ratio),
                        'carbs'        => (float) (($f->carbs_g ?? 0) * $ratio),
                        'fat'          => (float) (($f->fat_g ?? 0) * $ratio),
                    ],
                ];
            })->values();

        $dailyTotals = [
            'calories' => (float) ($daily->calories ?? 0),
            'protein'  => (float) ($daily->protein  ?? 0),
            'carbs'    => (float) ($daily->carbs    ?? 0),
            'fat'      => (float) ($daily->fat      ?? 0),
        ];

        $targets = $this->targets($userId);
        $remaining = $targets ? [
            'calories' => max(0, (float)$targets['calories'] - $dailyTotals['calories']),
            'protein'  => max(0, (float)$targets['protein']  - $dailyTotals['protein']),
            'carbs'    => max(0, (float)$targets['carbs']    - $dailyTotals['carbs']),
            'fat'      => max(0, (float)$targets['fat']      - $dailyTotals['fat']),
        ] : null;

        return [
            'date'        => $date,
            'dailyTotals' => $dailyTotals,
            'mealTotals'  => $mealTotals,
            'entries'     => $entries,
            'targets'     => $targets,
            'remaining'   => $remaining,
        ];
    }

    public function daysWithEntries(int $userId, string $monthYyyyMm): array
    {
        // monthYyyyMm: "2026-01"
        $start = Carbon::parse($monthYyyyMm . '-01')->startOfMonth();
        $end   = (clone $start)->endOfMonth();

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
        if (!$rem) return [];

        $allergies = $this->userAllergies($userId);

        // Target “per item” approximation: suggest items that help fill remaining macros gradually.
        $tp = max(1, $rem['protein'] / 3.0);
        $tc = max(1, $rem['carbs']   / 3.0);
        $tf = max(1, $rem['fat']     / 3.0);

        $q = Food::query()
            ->select(['id','name','category','serving_size','serving_unit','calories','protein_g','carbs_g','fat_g','allergens','meal_types'])
            ->when($mealType && in_array($mealType, ['breakfast','lunch','dinner','snack','drink'], true), function ($qq) use ($mealType) {
                $qq->whereJsonContains('meal_types', $mealType);
            });

        // exclude allergens
        foreach ($allergies as $a) {
            $q->where(function ($sub) use ($a) {
                $sub->whereNull('allergens')->orWhereJsonDoesntContain('allergens', $a);
            });
        }

        // simple scoring: “distance” from ideal per-item remaining macros
        $q->orderByRaw("
            ABS(COALESCE(protein_g,0) - ?) +
            ABS(COALESCE(carbs_g,0)   - ?) +
            ABS(COALESCE(fat_g,0)     - ?) +
            (ABS(COALESCE(calories,0) - ?) / 10.0)
        ", [$tp, $tc, $tf, max(1, $rem['calories'] / 3.0)]);

        return $q->limit($limit)->get()->map(function ($f) use ($userId) {
            /** @var \App\Models\Food $f */
            $isFav = FoodFavorite::where('user_id', $userId)->where('food_id', $f->id)->exists();

            return [
                'id'           => (int)$f->id,
                'name'         => (string)$f->name,
                'category'     => (string)($f->category ?? ''),
                'allergens'    => is_array($f->allergens) ? $f->allergens : [],
                'serving_size' => (float)($f->serving_size ?? 100),
                'serving_unit' => (string)($f->serving_unit ?? 'g'),
                'calories'     => (int)($f->calories ?? 0),
                'protein_g'    => (float)($f->protein_g ?? 0),
                'carbs_g'      => (float)($f->carbs_g ?? 0),
                'fat_g'        => (float)($f->fat_g ?? 0),
                'is_favorite'  => $isFav,
            ];
        })->values()->all();
    }
}
