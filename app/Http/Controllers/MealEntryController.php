<?php

namespace App\Http\Controllers;

use App\Models\MealEntry;
use App\Models\UserPref;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class MealEntryController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->date
            ? Carbon::parse($request->date)->format('Y-m-d')
            : now()->format('Y-m-d');

        $userId = Auth::id();

        [$dailyTotals, $byMeal, $entries] = $this->summaries($userId, $date);

        $pref = UserPref::where('user_id', $userId)->first();
        $targets = $this->targetsFromPref($pref);
        $recommendations = $this->recommendationsFromPref($pref);

        return Inertia::render('track_meal/track_meals', [
            'date'            => $date,
            'dailyTotals'     => $dailyTotals,
            'mealTotals'      => $byMeal,
            'entries'         => $entries,
            'targets'         => $targets,
            'recommendations' => $recommendations,
        ]);
    }

    /**
     * ✅ Day API for dynamic UI (calendar, no reload)
     * GET /api/meal-tracker/day?date=YYYY-MM-DD
     */
    public function day(Request $request)
    {
        $date = $request->date
            ? Carbon::parse($request->date)->format('Y-m-d')
            : now()->format('Y-m-d');

        $userId = Auth::id();

        [$dailyTotals, $byMeal, $entries] = $this->summaries($userId, $date, true);

        $pref = UserPref::where('user_id', $userId)->first();
        $targets = $this->targetsFromPref($pref);
        $recommendations = $this->recommendationsFromPref($pref);

        return response()->json([
            'date'            => $date,
            'dailyTotals'     => $dailyTotals,
            'mealTotals'      => $byMeal,
            'entries'         => $entries,
            'targets'         => $targets,
            'recommendations' => $recommendations,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'food_id'   => ['required','exists:foods,id'],
            'meal_type' => ['required','in:breakfast,lunch,dinner,snack,drink'],
            'servings'  => ['required','numeric','gt:0','max:1000'],
            'eaten_at'  => ['nullable','date'],
        ]);

        $validated['user_id'] = Auth::id();
        $validated['eaten_at'] = isset($validated['eaten_at'])
            ? Carbon::parse($validated['eaten_at'])->startOfDay()
            : now();

        MealEntry::create($validated);

        if ($request->ajax() || $request->wantsJson()) {
            return response()->json(['ok' => true, 'message' => 'Meal added to your day successfully.']);
        }

        return back()->with('success', 'Added to your day.');
    }

    public function destroy(MealEntry $entry)
    {
        abort_if($entry->user_id !== Auth::id(), 403);
        $entry->delete();
        return back()->with('success', 'Removed.');
    }

    private function targetsFromPref(?UserPref $pref): ?array
    {
        if (!$pref) return null;

        $cal = $pref->daily_goal_calories;
        $p   = $pref->daily_goal_protein_g;
        $c   = $pref->daily_goal_carbs_g;
        $f   = $pref->daily_goal_fat_g;

        // if all missing, return null
        if ($cal === null && $p === null && $c === null && $f === null) return null;

        return [
            'calories' => (float) ($cal ?? 0),
            'protein'  => (float) ($p ?? 0),
            'carbs'    => (float) ($c ?? 0),
            'fat'      => (float) ($f ?? 0),
        ];
    }

    /**
     * Optional dietary recommendations:
     * - if user already has targets, we can reuse them as recommendations (simple & consistent)
     * - else if tdee_kcal exists, compute a sane split (25% P / 45% C / 30% F)
     */
    private function recommendationsFromPref(?UserPref $pref): ?array
    {
        if (!$pref) return null;

        $targets = $this->targetsFromPref($pref);
        if ($targets) return $targets;

        $tdee = (int) ($pref->tdee_kcal ?? 0);
        if ($tdee <= 0) return null;

        $protein = ($tdee * 0.25) / 4.0;
        $carbs   = ($tdee * 0.45) / 4.0;
        $fat     = ($tdee * 0.30) / 9.0;

        return [
            'calories' => (float) $tdee,
            'protein'  => round($protein, 1),
            'carbs'    => round($carbs, 1),
            'fat'      => round($fat, 1),
        ];
    }

    private function summaries(int $userId, string $date, bool $includeEntries = true)
    {
        $dailyTotals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw("
                COALESCE(SUM(COALESCE(f.calories ,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g  ,0) * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g    ,0) * me.servings),0) as fat
            ")
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->first();

        $byMealRaw = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw("
                me.meal_type,
                COALESCE(SUM(COALESCE(f.calories ,0) * me.servings),0) as calories,
                COALESCE(SUM(COALESCE(f.protein_g,0) * me.servings),0) as protein,
                COALESCE(SUM(COALESCE(f.carbs_g  ,0) * me.servings),0) as carbs,
                COALESCE(SUM(COALESCE(f.fat_g    ,0) * me.servings),0) as fat
            ")
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->groupBy('me.meal_type')
            ->get();

        $byMeal = [
            'breakfast' => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'lunch'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'dinner'    => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'snack'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
            'drink'     => ['calories'=>0,'protein'=>0,'carbs'=>0,'fat'=>0],
        ];

        foreach ($byMealRaw as $row) {
            $key = in_array($row->meal_type, ['breakfast','lunch','dinner','snack','drink'], true)
                ? $row->meal_type : 'snack';
            $byMeal[$key] = [
                'calories' => (float) $row->calories,
                'protein'  => (float) $row->protein,
                'carbs'    => (float) $row->carbs,
                'fat'      => (float) $row->fat,
            ];
        }

        $entries = [];
        if ($includeEntries) {
            $entries = MealEntry::with('food')
                ->where('user_id', $userId)
                ->whereDate('eaten_at', $date)
                ->orderBy('meal_type')
                ->orderBy('id')
                ->get()
                ->map(function ($e) {
                    $ratio = (float) $e->servings;
                    $f = $e->food;

                    return [
                        'id'        => (int) $e->id,
                        'meal_type' => (string) $e->meal_type,
                        'servings'  => $ratio,
                        'eaten_at'  => $e->eaten_at ? Carbon::parse($e->eaten_at)->format('Y-m-d') : null,
                        'food'      => [
                            'id'           => (int) $f->id,
                            'name'         => (string) $f->name,
                            'serving_unit' => (string) ($f->serving_unit ?? 'g'),
                            'serving_size' => (float) ($f->serving_size ?? 100),
                            'calories'     => (float) (($f->calories   ?? 0) * $ratio),
                            'protein'      => (float) (($f->protein_g ?? 0) * $ratio),
                            'carbs'        => (float) (($f->carbs_g   ?? 0) * $ratio),
                            'fat'          => (float) (($f->fat_g     ?? 0) * $ratio),
                        ],
                    ];
                })->values();
        }

        return [
            [
                'calories' => (float) ($dailyTotals->calories ?? 0),
                'protein'  => (float) ($dailyTotals->protein  ?? 0),
                'carbs'    => (float) ($dailyTotals->carbs    ?? 0),
                'fat'      => (float) ($dailyTotals->fat      ?? 0),
            ],
            $byMeal,
            $entries,
        ];
    }
}
