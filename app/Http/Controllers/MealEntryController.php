<?php

namespace App\Http\Controllers;

use App\Models\MealEntry;
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

        [$dailyTotals, $byMeal, $entries] = $this->summaries(Auth::id(), $date);

        return Inertia::render('track_meal/track_meals', [
            'date'        => $date,
            'dailyTotals' => $dailyTotals,
            'mealTotals'  => $byMeal,
            'entries'     => $entries,
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

        return back()->with('success', 'Added to your day.');
    }

    public function destroy(MealEntry $entry)
    {
        abort_if($entry->user_id !== Auth::id(), 403);
        $entry->delete();
        return back()->with('success', 'Removed.');
    }

    public function dailyMacros(Request $request)
    {
        $date = $request->date
            ? Carbon::parse($request->date)->format('Y-m-d')
            : now()->format('Y-m-d');

        [$dailyTotals, $byMeal] = $this->summaries(Auth::id(), $date, false);

        return response()->json([
            'date'        => $date,
            'dailyTotals' => $dailyTotals,
            'mealTotals'  => $byMeal,
        ]);
    }

    private function summaries(int $userId, string $date, bool $includeEntries = true)
    {
        // Only use existing columns: calories, protein_g, carbs_g, fat_g
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
                            // multiply by servings using existing columns
                            'calories'     => (float) (($f->calories  ?? 0) * $ratio),
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
