<?php

namespace App\Http\Controllers;

use App\Models\Ai\AiConversation;
use Carbon\CarbonImmutable;
use App\Models\MealLog;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\Ai\AiRequest;
use App\Models\WaterIntake;
use App\Models\WorkoutPlan;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
// ✅ Add these
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function __construct(
        private readonly UserFacingAiPayloadSanitizer $sanitizer,
    ) {}

    public function index()
    {
        $user = Auth::user();
        $today = now()->toDateString();
        $isAdmin = $user && (string) ($user->role ?? '') === 'admin';

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
                    ->orderBy('measured_at')
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
        $coachSnapshot = null;
        $progressPrediction = null;
        $predictionTrend = [];

        if ($user) {
            // Latest ACTIVE nutrition plan (load nested relations + food names)
            $nutritionPlanQuery = NutritionPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereNotNull('ai_request_id')
                ->latest('id');

            // Internal provider/model metadata is admin-only.
            if ($isAdmin) {
                $nutritionPlanQuery->with([
                    'aiRequest:id,provider,model,prompt_version,schema_version',
                    'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
                ]);
            } else {
                $nutritionPlanQuery->with([
                    'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
                ]);
            }
            $nutritionPlan = $nutritionPlanQuery->first();

            // Latest ACTIVE workout plan (load nested relations + exercise names)
            $workoutPlanQuery = WorkoutPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->whereNotNull('ai_request_id')
                ->latest('id');

            if ($isAdmin) {
                $workoutPlanQuery->with([
                    'aiRequest:id,provider,model,prompt_version,schema_version',
                    'days.exercises:id,name,primary_muscle,equipment,difficulty',
                ]);
            } else {
                $workoutPlanQuery->with([
                    'days.exercises:id,name,primary_muscle,equipment,difficulty',
                ]);
            }
            $workoutPlan = $workoutPlanQuery->first();

            $latestCoachConversation = AiConversation::query()
                ->where('user_id', $user->id)
                ->with(['messages' => fn ($query) => $query->latest('id')->limit(1)])
                ->orderByDesc('last_message_at')
                ->orderByDesc('updated_at')
                ->first();

            if ($latestCoachConversation) {
                $latestCoachMessage = $latestCoachConversation->messages->first();

                $coachSnapshot = [
                    'title' => (string) ($latestCoachConversation->title ?: 'AI Coach'),
                    'last_message_excerpt' => $latestCoachMessage
                        ? Str::limit((string) $latestCoachMessage->content, 140)
                        : null,
                    'last_message_at' => optional($latestCoachConversation->last_message_at ?? $latestCoachMessage?->created_at)?->toISOString(),
                ];
            }

            $predictionTrend = $this->recentPredictionTrend((int) $user->id, 10);
            $progressPrediction = $this->latestProgressPrediction((int) $user->id);
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
            'nutritionPlan' => $nutritionPlan
                ? $this->sanitizer->sanitizePlanResource($nutritionPlan->toArray(), $isAdmin)
                : null,
            'workoutPlan' => $workoutPlan
                ? $this->sanitizer->sanitizePlanResource($workoutPlan->toArray(), $isAdmin)
                : null,
            'coachSnapshot' => $coachSnapshot,
            'progressPrediction' => $this->sanitizer->sanitizeProgressPredictionPayload($progressPrediction, $isAdmin),
            'predictionTrend' => $predictionTrend,
        ]);
    }

    /**
     * @return array{
     *   ai_request_id:int,
     *   generated_at:string,
     *   horizon_days:int,
     *   baseline_weight_kg:float,
     *   projected_body_weight_kg:float|null,
     *   projected_before_feedback_kg:float|null,
     *   projected_after_feedback_kg:float|null,
     *   expected_weight_change_kg:float|null,
     *   actual_weight_kg:float|null,
     *   actual_weight_date:string|null,
     *   feedback_applied:bool,
     *   strength_projection:array{upper_body_compound_pct:float|null,lower_body_compound_pct:float|null},
     *   feedback_adjustment:array{
     *     base_weekly_weight_change_kg:float|null,
     *     adjusted_weekly_weight_change_kg:float|null,
     *     notes:string|null
     *   }
     * }|null
     */
    private function latestProgressPrediction(int $userId): ?array
    {
        $request = AiRequest::query()
            ->where('user_id', $userId)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->first(['id', 'created_at', 'output_json']);

        if (! $request) {
            return null;
        }

        $output = is_array($request->output_json) ? $request->output_json : [];
        $prediction = is_array($output['progress_prediction'] ?? null)
            ? $output['progress_prediction']
            : null;

        if (! is_array($prediction)) {
            return null;
        }

        $measurements = Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->orderBy('measured_at')
            ->get(['measured_at', 'weight_kg']);

        $generatedAt = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
        $horizonDays = $this->normalizePlanHorizonDays(
            (int) ($prediction['horizon_days'] ?? 14)
        );
        $periodEnd = $generatedAt->addDays(max(1, $horizonDays) - 1);
        $weeks = max(1.0, $horizonDays / 7.0);

        $feedback = is_array($prediction['feedback_adjustment'] ?? null)
            ? $prediction['feedback_adjustment']
            : [];

        $baselineWeight = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null)
            ?? $this->weightOnOrBeforeFromRows($measurements, $generatedAt);

        if ($baselineWeight === null) {
            return null;
        }

        $baseWeeklyRate = $this->toFloatOrNull($feedback['base_weekly_weight_change_kg'] ?? null);
        $adjustedWeeklyRate = $this->toFloatOrNull($feedback['adjusted_weekly_weight_change_kg'] ?? null);

        $projectedAfter = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);
        if ($projectedAfter === null) {
            $expectedChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
            if ($expectedChange !== null) {
                $projectedAfter = $baselineWeight + $expectedChange;
            } elseif ($adjustedWeeklyRate !== null) {
                $projectedAfter = $baselineWeight + ($adjustedWeeklyRate * $weeks);
            }
        }

        $projectedBefore = null;
        if ($baseWeeklyRate !== null) {
            $projectedBefore = $baselineWeight + ($baseWeeklyRate * $weeks);
        }

        $actualWeightMatch = $this->weightNearTargetDateFromRows($measurements, $periodEnd);

        return [
            'ai_request_id' => (int) $request->id,
            'generated_at' => $generatedAt->toDateString(),
            'horizon_days' => $horizonDays,
            'baseline_weight_kg' => round($baselineWeight, 2),
            'projected_body_weight_kg' => $projectedAfter !== null ? round($projectedAfter, 2) : null,
            'projected_before_feedback_kg' => $projectedBefore !== null ? round($projectedBefore, 2) : null,
            'projected_after_feedback_kg' => $projectedAfter !== null ? round($projectedAfter, 2) : null,
            'expected_weight_change_kg' => $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null),
            'actual_weight_kg' => $actualWeightMatch !== null ? round((float) $actualWeightMatch['weight_kg'], 2) : null,
            'actual_weight_date' => $actualWeightMatch['measured_at'] ?? null,
            'feedback_applied' => $projectedBefore !== null
                && $projectedAfter !== null
                && abs($projectedAfter - $projectedBefore) >= 0.01,
            'strength_projection' => [
                'upper_body_compound_pct' => $this->toFloatOrNull($prediction['strength_projection']['upper_body_compound_pct'] ?? null),
                'lower_body_compound_pct' => $this->toFloatOrNull($prediction['strength_projection']['lower_body_compound_pct'] ?? null),
            ],
            'feedback_adjustment' => [
                'base_weekly_weight_change_kg' => $baseWeeklyRate,
                'adjusted_weekly_weight_change_kg' => $adjustedWeeklyRate,
                'notes' => is_string($feedback['notes'] ?? null) ? (string) $feedback['notes'] : null,
            ],
        ];
    }

    /**
     * @return array<int, array{
     *   plan_date:string,
     *   feedback_period_start_date:string,
     *   feedback_period_end_date:string,
     *   horizon_days:int,
     *   baseline_weight_kg:float,
     *   projected_before_feedback_kg:float,
     *   projected_after_feedback_kg:float,
     *   projected_weight_kg:float,
     *   feedback_applied:bool,
     *   actual_weight_kg:float|null,
     *   actual_weight_date:string|null
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
            $weeks = max(1.0, $horizonDays / 7.0);

            $feedback = is_array($prediction['feedback_adjustment'] ?? null)
                ? $prediction['feedback_adjustment']
                : [];

            $baselineWeight = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null)
                ?? $this->weightOnOrBeforeFromRows($measurements, $planDate);
            if ($baselineWeight === null) {
                continue;
            }

            $baseWeeklyRate = $this->toFloatOrNull($feedback['base_weekly_weight_change_kg'] ?? null);
            $adjustedWeeklyRate = $this->toFloatOrNull($feedback['adjusted_weekly_weight_change_kg'] ?? null);

            $projectedWeight = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);
            if ($projectedWeight === null) {
                $expectedChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
                if ($expectedChange !== null) {
                    $projectedWeight = $baselineWeight + $expectedChange;
                } elseif ($adjustedWeeklyRate !== null) {
                    $projectedWeight = $baselineWeight + ($adjustedWeeklyRate * $weeks);
                }
            }
            if ($projectedWeight === null) {
                continue;
            }

            $projectedBeforeFeedback = $baseWeeklyRate !== null
                ? $baselineWeight + ($baseWeeklyRate * $weeks)
                : $projectedWeight;

            $actualWeightMatch = $this->weightNearTargetDateFromRows($measurements, $expectedEndDate);
            $actualWeight = $actualWeightMatch['weight_kg'] ?? null;
            $actualWeightDate = $actualWeightMatch['measured_at'] ?? null;

            $feedbackApplied = abs($projectedWeight - $projectedBeforeFeedback) >= 0.01;

            $rows[] = [
                'plan_date' => $planDate->toDateString(),
                'feedback_period_start_date' => $planDate->toDateString(),
                'feedback_period_end_date' => $expectedEndDate->toDateString(),
                'horizon_days' => $horizonDays,
                'baseline_weight_kg' => round((float) $baselineWeight, 3),
                'projected_before_feedback_kg' => round((float) $projectedBeforeFeedback, 3),
                'projected_after_feedback_kg' => round((float) $projectedWeight, 3),
                'projected_weight_kg' => round((float) $projectedWeight, 3),
                'feedback_applied' => $feedbackApplied,
                'actual_weight_kg' => $actualWeight !== null ? round((float) $actualWeight, 3) : null,
                'actual_weight_date' => $actualWeightDate,
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

    private function weightOnOrBeforeFromRows(iterable $rows, CarbonImmutable $targetDate): ?float
    {
        $best = null;
        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            if ($rowDate->greaterThan($targetDate)) {
                break;
            }
            $best = (float) $row->weight_kg;
        }

        return $best;
    }

    /**
     * @return array{weight_kg:float,measured_at:string}|null
     */
    private function weightNearTargetDateFromRows(iterable $rows, CarbonImmutable $targetDate): ?array
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
                $best = [
                    'weight_kg' => (float) $row->weight_kg,
                    'measured_at' => $rowDate->toDateString(),
                ];
            }
        }

        return $best;
    }
}
