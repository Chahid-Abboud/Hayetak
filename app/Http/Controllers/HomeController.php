<?php

namespace App\Http\Controllers;

use App\Models\MealLog;
use App\Models\NutritionPlan;
use App\Models\WaterIntake;
use App\Models\WorkoutPlan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
// ✅ Add these
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $today = now()->toDateString();

        // ---- User profile (for BMI) ----
        $profile = $user ? [
            'age' => isset($user->age) ? (int) $user->age : null,
            'height_cm' => isset($user->height_cm) ? (float) $user->height_cm : null,
            'weight_kg' => isset($user->weight_kg) ? (float) $user->weight_kg : null,
        ] : null;

        // ---- Water intake ----
        $todayMl = 0;
        $targetMl = 2000;

        if ($user) {
            if (is_numeric($user->weight_kg)) {
                $targetMl = (int) round(((float) $user->weight_kg) * 30);
            }

            if (Schema::hasTable('water_intakes')) {
                $todayMl = (int) (
                    WaterIntake::where('user_id', $user->id)
                        ->whereDate('for_day', $today) // fixed column name
                        ->value('ml') ?? 0
                );
            }
        }

        // ---- Legacy MealLog (today or latest) ----
        $todayLog = null;
        $latestLog = null;

        if ($user && Schema::hasTable('meal_logs')) {
            $log = MealLog::with('items')
                ->where('user_id', $user->id)
                ->whereDate('consumed_at', $today)
                ->first();

            if ($log) {
                $todayLog = [
                    'id' => $log->id,
                    'consumed_at' => optional($log->consumed_at)->format('Y-m-d'),
                    'photo_url' => $log->photo_path ? asset('storage/'.ltrim($log->photo_path, '/')) : null,
                    'other_notes' => $log->other_notes,
                    'items' => $log->items->map(fn ($i) => [
                        'category' => $i->category,
                        'label' => $i->label,
                        'quantity' => $i->quantity,
                        'unit' => $i->unit,
                    ])->values(),
                ];
            } else {
                $last = MealLog::with('items')
                    ->where('user_id', $user->id)
                    ->orderByDesc('consumed_at')
                    ->first();

                if ($last) {
                    $latestLog = [
                        'id' => $last->id,
                        'consumed_at' => optional($last->consumed_at)->format('Y-m-d'),
                        'photo_url' => $last->photo_path ? asset('storage/'.ltrim($last->photo_path, '/')) : null,
                        'other_notes' => $last->other_notes,
                        'items' => $last->items->map(fn ($i) => [
                            'category' => $i->category,
                            'label' => $i->label,
                            'quantity' => $i->quantity,
                            'unit' => $i->unit,
                        ])->values(),
                    ];
                }
            }
        }

        // ---- New meal_entries/foods daily macros ----
        $todayMacros = null;
        $mealTotals = null;

        if ($user && Schema::hasTable('meal_entries') && Schema::hasTable('foods')) {
            $daily = DB::table('meal_entries as me')
                ->join('foods as f', 'f.id', '=', 'me.food_id')
                ->selectRaw('
                    COALESCE(SUM(COALESCE(f.calories,  0) * me.servings), 0) as calories,
                    COALESCE(SUM(COALESCE(f.protein_g, 0) * me.servings), 0) as protein,
                    COALESCE(SUM(COALESCE(f.carbs_g,  0) * me.servings), 0) as carbs,
                    COALESCE(SUM(COALESCE(f.fat_g,    0) * me.servings), 0) as fat
                ')
                ->where('me.user_id', $user->id)
                ->whereDate('me.eaten_at', $today)
                ->first();

            $todayMacros = [
                'date' => $today,
                'calories' => (float) ($daily->calories ?? 0),
                'protein' => (float) ($daily->protein ?? 0),
                'carbs' => (float) ($daily->carbs ?? 0),
                'fat' => (float) ($daily->fat ?? 0),
            ];

            $byMeal = DB::table('meal_entries as me')
                ->join('foods as f', 'f.id', '=', 'me.food_id')
                ->selectRaw('
                    me.meal_type,
                    COALESCE(SUM(COALESCE(f.calories,  0) * me.servings), 0) as calories,
                    COALESCE(SUM(COALESCE(f.protein_g, 0) * me.servings), 0) as protein,
                    COALESCE(SUM(COALESCE(f.carbs_g,  0) * me.servings), 0) as carbs,
                    COALESCE(SUM(COALESCE(f.fat_g,    0) * me.servings), 0) as fat
                ')
                ->where('me.user_id', $user->id)
                ->whereDate('me.eaten_at', $today)
                ->groupBy('me.meal_type')
                ->get();

            $mealTotals = [
                'breakfast' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
                'lunch' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
                'dinner' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
                'snack' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
                'drink' => ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0],
            ];

            foreach ($byMeal as $row) {
                $type = (string) $row->meal_type;
                if (! array_key_exists($type, $mealTotals)) {
                    $mealTotals[$type] = ['calories' => 0, 'protein' => 0, 'carbs' => 0, 'fat' => 0];
                }
                $mealTotals[$type] = [
                    'calories' => (float) $row->calories,
                    'protein' => (float) $row->protein,
                    'carbs' => (float) $row->carbs,
                    'fat' => (float) $row->fat,
                ];
            }
        }

        // ✅ NEW: Load active generated plans for showing on the dashboard
        $nutritionPlan = null;
        $workoutPlan = null;

        if ($user) {
            // Latest ACTIVE nutrition plan (load nested relations + food names)
            $nutritionPlan = NutritionPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->latest('id')
                ->with([
                    'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
                ])
                ->first();

            // Latest ACTIVE workout plan (load nested relations + exercise names)
            $workoutPlan = WorkoutPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->latest('id')
                ->with([
                    'days.exercises:id,name,primary_muscle,equipment,difficulty',
                ])
                ->first();
        }

        return Inertia::render('dashboard', [
            'auth' => ['user' => $user ? [
                'id' => $user->id,
                'first_name' => $user->first_name ?? null,
                'username' => $user->username ?? null,
                'name' => $user->name ?? null,
                'email' => $user->email ?? null,
            ] : null],
            'isGuest' => ! $user,
            'userProfile' => $profile,
            'water' => ['today_ml' => $todayMl, 'target_ml' => $targetMl],
            'todayLog' => $todayLog,
            'latestLog' => $latestLog,
            'todayMacros' => $todayMacros,
            'mealTotals' => $mealTotals,

            // ✅ NEW PROPS (safe arrays for TSX)
            'nutritionPlan' => $nutritionPlan ? $nutritionPlan->toArray() : null,
            'workoutPlan' => $workoutPlan ? $workoutPlan->toArray() : null,
        ]);
    }
}
