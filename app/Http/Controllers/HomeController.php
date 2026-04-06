<?php

namespace App\Http\Controllers;

use Carbon\CarbonImmutable;
use App\Models\MealLog;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\AiRequest;
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
        $weightHistory = [];
        $heightHistory = [];

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

            if (Schema::hasTable('measurements')) {
                $hasHeightColumn = Schema::hasColumn('measurements', 'height_cm');
                $columns = ['measured_at', 'weight_kg'];
                if ($hasHeightColumn) {
                    $columns[] = 'height_cm';
                }

                $rows = Measurement::query()
                    ->where('user_id', $user->id)
                    ->orderByDesc('measured_at')
                    ->limit(90)
                    ->get($columns);

                $weightHistory = $rows
                    ->filter(fn ($row) => $row->weight_kg !== null)
                    ->map(fn ($row) => [
                        'date' => (string) optional($row->measured_at)->toDateString(),
                        'type' => 'weight',
                        'value' => (float) $row->weight_kg,
                    ])
                    ->values()
                    ->all();

                if ($hasHeightColumn) {
                    $heightHistory = $rows
                        ->filter(fn ($row) => $row->height_cm !== null)
                        ->map(fn ($row) => [
                            'date' => (string) optional($row->measured_at)->toDateString(),
                            'type' => 'height',
                            'value' => (float) $row->height_cm,
                        ])
                        ->values()
                        ->all();
                }
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
        $mealEntryPreviews = null;

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

            $mealEntryPreviews = DB::table('meal_entries as me')
                ->join('foods as f', 'f.id', '=', 'me.food_id')
                ->select([
                    'me.id',
                    'me.meal_type',
                    'me.servings',
                    'f.name as label',
                    'f.serving_unit as unit',
                ])
                ->where('me.user_id', $user->id)
                ->whereDate('me.eaten_at', $today)
                ->orderBy('me.eaten_at')
                ->orderBy('me.id')
                ->get()
                ->map(fn ($entry) => [
                    'id' => (int) $entry->id,
                    'category' => (string) $entry->meal_type,
                    'label' => (string) $entry->label,
                    'quantity' => isset($entry->servings) ? (float) $entry->servings : null,
                    'unit' => $entry->unit ? (string) $entry->unit : null,
                ])
                ->values()
                ->all();
        }

        // ✅ NEW: Load active generated plans for showing on the dashboard
        $nutritionPlan = null;
        $workoutPlan = null;
        $plannerModelMeta = null;
        $progressPrediction = null;
        $predictionTrend = [];

        if ($user) {
            // Latest ACTIVE nutrition plan (load nested relations + food names)
            $nutritionPlan = NutritionPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereNotNull('ai_request_id')
                ->latest('id')
                ->with([
                    'aiRequest:id,provider,model,prompt_version,schema_version',
                    'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
                ])
                ->first();

            // Latest ACTIVE workout plan (load nested relations + exercise names)
            $workoutPlan = WorkoutPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereNotNull('ai_request_id')
                ->latest('id')
                ->with([
                    'aiRequest:id,provider,model,prompt_version,schema_version',
                    'days.exercises:id,name,primary_muscle,equipment,difficulty',
                ])
                ->first();

            $latestPlannerRequest = AiRequest::query()
                ->where('user_id', $user->id)
                ->where('type', 'plan_generator')
                ->where('status', 'completed')
                ->whereNotNull('output_json')
                ->latest('id')
                ->first([
                    'id',
                    'created_at',
                    'provider',
                    'model',
                    'prompt_version',
                    'schema_version',
                    'output_json',
                ]);

            if ($latestPlannerRequest) {
                $plannerModelMeta = [
                    'ai_request_id' => (int) $latestPlannerRequest->id,
                    'generated_at' => optional($latestPlannerRequest->created_at)?->toDateTimeString(),
                    'provider' => $latestPlannerRequest->provider,
                    'model' => $latestPlannerRequest->model,
                    'prompt_version' => $latestPlannerRequest->prompt_version,
                    'schema_version' => $latestPlannerRequest->schema_version,
                ];

                $prediction = is_array($latestPlannerRequest->output_json)
                    ? data_get($latestPlannerRequest->output_json, 'progress_prediction')
                    : null;

                if (is_array($prediction)) {
                    $progressPrediction = $prediction;
                }
            }

            $predictionTrend = $this->recentPredictionTrend((int) $user->id, 10);
        }

        return Inertia::render('dashboard', [
            'auth' => ['user' => $user ? [
                'id' => $user->id,
                'first_name' => $user->first_name ?? null,
                'username' => $user->username ?? null,
                'name' => $user->name ?? null,
                'email' => $user->email ?? null,
                'role' => $user->role ?? null,
                'verified' => (bool) ($user->verified ?? false),
                'status' => $user->status ?? null,
            ] : null],
            'isGuest' => ! $user,
            'userProfile' => $profile,
            'water' => ['today_ml' => $todayMl, 'target_ml' => $targetMl],
            'todayLog' => $todayLog,
            'latestLog' => $latestLog,
            'todayMacros' => $todayMacros,
            'mealTotals' => $mealTotals,
            'mealEntryPreviews' => $mealEntryPreviews,
            'weightHistory' => $weightHistory,
            'heightHistory' => $heightHistory,

            // ✅ NEW PROPS (safe arrays for TSX)
            'nutritionPlan' => $nutritionPlan ? $nutritionPlan->toArray() : null,
            'workoutPlan' => $workoutPlan ? $workoutPlan->toArray() : null,
            'plannerModelMeta' => $plannerModelMeta,
            'progressPrediction' => $progressPrediction,
            'predictionTrend' => $predictionTrend,
        ]);
    }

    /**
     * @return array<int, array{
     *   plan_date:string,
     *   horizon_days:int,
     *   projected_weight_kg:float,
     *   actual_weight_kg:float|null,
     *   model_name:string|null,
     *   inference_source:string|null
     * }>
     */
    private function recentPredictionTrend(int $userId, int $limit = 10): array
    {
        $requests = AiRequest::query()
            ->where('user_id', $userId)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->limit(max(2, $limit))
            ->get(['id', 'created_at', 'output_json']);

        if ($requests->isEmpty()) {
            return [];
        }

        $measurements = Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->orderBy('measured_at')
            ->get(['measured_at', 'weight_kg']);

        $rows = [];
        foreach ($requests->reverse()->values() as $request) {
            $output = is_array($request->output_json) ? $request->output_json : [];
            $prediction = is_array($output['progress_prediction'] ?? null)
                ? $output['progress_prediction']
                : null;

            if (! is_array($prediction)) {
                continue;
            }

            $horizonDays = $this->normalizePlanHorizonDays(
                (int) ($prediction['horizon_days'] ?? 14)
            );

            $planDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
            $expectedEndDate = $planDate->addDays(max(1, $horizonDays) - 1);

            $projectedWeight = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);
            if ($projectedWeight === null) {
                $baseline = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null);
                $expectedChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
                if ($baseline !== null && $expectedChange !== null) {
                    $projectedWeight = $baseline + $expectedChange;
                }
            }
            if ($projectedWeight === null) {
                continue;
            }

            $actualWeight = $this->weightNearTargetDateFromRows($measurements, $expectedEndDate);

            $rows[] = [
                'plan_date' => $planDate->toDateString(),
                'horizon_days' => $horizonDays,
                'projected_weight_kg' => round((float) $projectedWeight, 3),
                'actual_weight_kg' => $actualWeight !== null ? round((float) $actualWeight, 3) : null,
                'model_name' => is_string($prediction['model_name'] ?? null) ? $prediction['model_name'] : null,
                'inference_source' => is_string($prediction['inference_source'] ?? null) ? $prediction['inference_source'] : null,
            ];
        }

        return $rows;
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

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function weightNearTargetDateFromRows(iterable $rows, CarbonImmutable $targetDate): ?float
    {
        $targetTs = $targetDate->startOfDay()->getTimestamp();
        $best = null;
        $bestDistance = null;

        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            $deltaDays = (int) floor(($rowDate->getTimestamp() - $targetTs) / 86400);

            if ($deltaDays < -7 || $deltaDays > 10) {
                continue;
            }

            $distance = abs($deltaDays);
            if ($bestDistance === null || $distance < $bestDistance) {
                $bestDistance = $distance;
                $best = (float) $row->weight_kg;
            }
        }

        return $best;
    }
}
