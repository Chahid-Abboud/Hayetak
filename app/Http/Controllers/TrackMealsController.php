<?php

namespace App\Http\Controllers;

use App\Models\Diet;
use App\Models\DietItem;
use App\Models\MealLog;
use App\Models\MealLogItem;
use App\Models\UserDiet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class TrackMealsController extends Controller
{
    /**
     * Meal Tracker (daily view)
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Resolve date (?date=YYYY-MM-DD) default today
        $date = $request->query('date');
        try {
            $date = $date ? (new \Carbon\Carbon($date))->toDateString() : now()->toDateString();
        } catch (\Throwable $e) {
            $date = now()->toDateString();
        }

        // Load entries & totals
        [$entries, $mealTotals, $dailyTotals] = $this->loadEntriesAndTotals($user->id, $date);

        // Compute recommended targets for progress bars
        $rawTargets = $this->computeTargetsForUser($user);
        $targets    = $this->sanitizeTargets($rawTargets);

        return Inertia::render('track_meal/track_meals', [
            'date'        => $date,
            'entries'     => $entries,
            'mealTotals'  => $mealTotals,
            'dailyTotals' => $dailyTotals,
            'targets'     => $targets, // always numeric and >0
        ]);
    }

    /**
     * Load entries/totals from MealEntry+Food if present, else MealLog fallback
     */
    protected function loadEntriesAndTotals(int $userId, string $date): array
    {
        $useMealEntry = class_exists(\App\Models\MealEntry::class) && class_exists(\App\Models\Food::class);

        if ($useMealEntry) {
            $MealEntry = app(\App\Models\MealEntry::class);

            $rows = $MealEntry::with(['food'])
                ->where('user_id', $userId)
                ->whereDate('eaten_at', $date)
                ->orderBy('id')
                ->get();

            $entries = [];
            $mealTotals = $this->blankMealTotals();

            foreach ($rows as $row) {
                $food = $row->food;
                if (!$food) continue;

                // Normalize meal_type
                $mealType = strtolower(trim((string)($row->meal_type ?? 'other')));
                if (!in_array($mealType, ['breakfast','lunch','dinner','snack','drink'])) {
                    $mealType = 'snack'; // fallback category
                }

                $one = [
                    'id'        => (int)$row->id,
                    'meal_type' => $mealType,
                    'servings'  => (float)($row->servings ?? 1),
                    'eaten_at'  => (string)$row->eaten_at,
                    'food'      => [
                        'id'           => (int)$food->id,
                        'name'         => (string)$food->name,
                        'serving_unit' => (string)($food->serving_unit ?? 'g'),
                        'serving_size' => (float)($food->serving_size ?? 100),
                        // Fixed fallback logic — evaluate each column separately
                        'calories'     => (float)($food->calories ?? $food->calories_kcal ?? 0),
                        'protein'      => (float)((!is_null($food->protein)) ? $food->protein : ($food->protein_g ?? 0)),
                        'carbs'        => (float)((!is_null($food->carbs)) ? $food->carbs : ($food->carbs_g ?? 0)),
                        'fat'          => (float)((!is_null($food->fat)) ? $food->fat : ($food->fat_g ?? 0)),
                    ],
                ];

                $entries[] = $one;

                // Accumulate safely
                if (isset($mealTotals[$mealType])) {
                    $this->accumulateTotals($mealTotals[$mealType], $one);
                }
            }

            $dailyTotals = $this->sumMealTotals($mealTotals);
            return [$entries, $mealTotals, $dailyTotals];
        }

        // Fallback: MealLog + MealLogItem
        $log = MealLog::with('items')
            ->where('user_id', $userId)
            ->whereDate('consumed_at', $date)
            ->first();

        $entries = [];
        $mealTotals = $this->blankMealTotals();

        if ($log) {
            foreach ($log->items as $item) {
                $mealType = strtolower(trim((string)($item->category ?? 'snack')));
                if (!in_array($mealType, ['breakfast','lunch','dinner','snack','drink'])) {
                    $mealType = 'snack';
                }

                $one = [
                    'id'        => (int)$item->id,
                    'meal_type' => $mealType,
                    'servings'  => 1.0,
                    'eaten_at'  => (string)$log->consumed_at,
                    'food'      => [
                        'id'           => 0,
                        'name'         => (string)$item->label,
                        'serving_unit' => 'g',
                        'serving_size' => 100.0,
                        'calories'     => (float)($item->calories ?? 0),
                        'protein'      => (float)($item->protein ?? 0),
                        'carbs'        => (float)($item->carbs ?? 0),
                        'fat'          => (float)($item->fat ?? 0),
                    ],
                ];

                $entries[] = $one;
                $this->accumulateTotals($mealTotals[$mealType], $one);
            }
        }

        $dailyTotals = $this->sumMealTotals($mealTotals);
        return [$entries, $mealTotals, $dailyTotals];
    }

    protected function blankMealTotals(): array
    {
        $zero = fn() => ['calories' => 0.0, 'protein' => 0.0, 'carbs' => 0.0, 'fat' => 0.0];
        return [
            'breakfast' => $zero(),
            'lunch'     => $zero(),
            'dinner'    => $zero(),
            'snack'     => $zero(),
            'drink'     => $zero(),
        ];
    }

    protected function sumMealTotals(array $mealTotals): array
    {
        $daily = ['calories' => 0.0, 'protein' => 0.0, 'carbs' => 0.0, 'fat' => 0.0];
        foreach ($mealTotals as $t) {
            $daily['calories'] += $t['calories'];
            $daily['protein']  += $t['protein'];
            $daily['carbs']    += $t['carbs'];
            $daily['fat']      += $t['fat'];
        }
        return $this->roundTotals($daily);
    }

    protected function accumulateTotals(array &$bucket, array $entry): void
    {
        $servings = (float)$entry['servings'];
        $f = $entry['food'];

        $bucket['calories'] += ($f['calories'] ?? 0) * $servings;
        $bucket['protein']  += ($f['protein']  ?? 0) * $servings;
        $bucket['carbs']    += ($f['carbs']    ?? 0) * $servings;
        $bucket['fat']      += ($f['fat']      ?? 0) * $servings;

        $bucket = $this->roundTotals($bucket);
    }

    protected function roundTotals(array $t): array
    {
        return [
            'calories' => (int) round($t['calories'] ?? 0),
            'protein'  => (int) round($t['protein'] ?? 0),
            'carbs'    => (int) round($t['carbs'] ?? 0),
            'fat'      => (int) round($t['fat'] ?? 0),
        ];
    }

    protected function sanitizeTargets(array $t): array
    {
        $fallback = ['calories'=>2000,'protein'=>120,'carbs'=>220,'fat'=>70];
        $out = [];
        foreach ($fallback as $k => $def) {
            $v = isset($t[$k]) ? (int) round((float) $t[$k]) : 0;
            $out[$k] = $v > 0 ? $v : $def;
        }
        return $out;
    }

    protected function computeTargetsForUser($user): array
    {
        $age   = (int)($user->age ?? 25);
        $sex   = strtolower((string)($user->gender ?? 'm'));
        $ht    = (float)($user->height_cm ?? 175);
        $wt    = (float)($user->weight_kg ?? 75);

        $bmr = ($sex === 'f')
            ? 10 * $wt + 6.25 * $ht - 5 * $age - 161
            : 10 * $wt + 6.25 * $ht - 5 * $age + 5;

        $tdee = $bmr * 1.4;

        $goal = null;
        if (class_exists(\App\Models\UserPref::class)) {
            $pref = \App\Models\UserPref::where('user_id', $user->id)->first();
            $goal = $pref->dietary_goal ?? null;
        }

        $calories = $tdee;
        if ($goal) {
            $g = strtolower((string)$goal);
            if (str_contains($g, 'loss'))   $calories = $tdee * 0.85;
            if (str_contains($g, 'gain') || str_contains($g, 'muscle')) $calories = $tdee * 1.10;
        }

        $proteinPerKg = 1.6;
        if ($goal) {
            $g = strtolower((string)$goal);
            if (str_contains($g, 'loss'))   $proteinPerKg = 1.8;
            if (str_contains($g, 'muscle')) $proteinPerKg = 2.0;
        }
        $proteinG = $wt * $proteinPerKg;

        $fatKcal = $calories * 0.25;
        $fatG    = $fatKcal / 9;
        $carbKcal = max(0, $calories - ($proteinG * 4 + $fatG * 9));
        $carbG    = $carbKcal / 4;

        return [
            'calories' => (int) round($calories),
            'protein'  => (int) round($proteinG),
            'carbs'    => (int) round($carbG),
            'fat'      => (int) round($fatG),
        ];
    }
}
