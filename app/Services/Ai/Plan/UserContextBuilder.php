<?php

namespace App\Services\Ai\Plan;

use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\User;
use App\Models\UserPref;
use App\Models\WorkoutLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UserContextBuilder
{
    /**
     * Build a deterministic JSON-ready array for plan generation/training.
     *
     * This is what you store into ai_requests.input_context_json
     */
    public function build(User $user, ?Carbon $now = null, int $historyDays = 7): array
    {
        $now = $now?->copy() ?? Carbon::now();
        $startDate = $now->copy()->subDays($historyDays - 1)->startOfDay();

        $pref = UserPref::query()->where('user_id', $user->id)->first();
        $settings = (array) ($pref?->settings ?? []);

        // Option A: injuries + equipment in user_prefs.settings (jsonb)
        $injuries = $this->normalizeStringArray($settings['injuries'] ?? []);
        $availableEquipment = $this->normalizeStringArray($settings['available_equipment'] ?? []);

        // Latest measurement (if exists)
        $latestMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->orderByDesc('measured_at')
            ->first();

        // Nutrition totals for last N days from meal_entries joined with foods macros
        $nutritionDaily = $this->getNutritionDailyTotals($user->id, $startDate, $now);

        // Aggregate nutrition totals (sum over period)
        $nutritionTotals = $this->sumNutritionTotals($nutritionDaily);

        // Workout totals for last N days from workout_logs + workout_log_sets
        $workoutSummary = $this->getWorkoutSummary($user->id, $startDate, $now);

        return [
            'schema_version' => 'context_v1',
            'generated_at'   => $now->toIso8601String(),
            'history_window' => [
                'days' => $historyDays,
                'from' => $startDate->format('Y-m-d'),
                'to'   => $now->format('Y-m-d'),
            ],

            'user' => [
                'id'                   => $user->id,
                'first_name'           => $user->first_name,
                'last_name'            => $user->last_name,
                'gender'               => $user->gender,
                'age'                  => $user->age,
                'height_cm'            => $user->height_cm,
                'weight_kg'            => (float) ($latestMeasurement?->weight_kg ?? $user->weight_kg ?? 0),

                // goals / diet
                'dietary_goal'         => $user->dietary_goal,
                'fitness_goal'         => $user->fitness_goal,
                'diet_name'            => $user->diet_name,
                'allergies'            => $this->normalizeStringArray($user->allergies ?? []),

                // training
                'activity_level'       => $user->activity_level,
                'workout_days_per_week'=> $user->workout_days_per_week,
                'workout_location'     => $user->workout_location,

                // medical
                'has_medical_history'  => (bool) $user->has_medical_history,
                'medical_history'      => $user->medical_history,
            ],

            'prefs' => [
                'units'                 => $pref?->units ?? 'metric',
                'home_gym'              => $pref?->home_gym,
                'activity_factor'       => $pref?->activity_factor,
                'bmr_kcal'              => $pref?->bmr_kcal,
                'tdee_kcal'             => $pref?->tdee_kcal,

                // user targets (if you have them)
                'daily_goal_calories'   => $pref?->daily_goal_calories,
                'daily_goal_protein_g'  => $pref?->daily_goal_protein_g,
                'daily_goal_carbs_g'    => $pref?->daily_goal_carbs_g,
                'daily_goal_fat_g'      => $pref?->daily_goal_fat_g,
                'workout_days_target'   => $pref?->workout_days_target,
            ],

            'constraints' => [
                'injuries'            => $injuries,
                'available_equipment' => $availableEquipment,
                'workout_location'    => $user->workout_location,
                'diet_name'           => $user->diet_name,
                'allergies'           => $this->normalizeStringArray($user->allergies ?? []),
                'medical_history'     => $user->medical_history,
            ],

            'recent_history' => [
                'nutrition_last_days' => [
                    'daily'  => $nutritionDaily,   // per-day totals
                    'totals' => $nutritionTotals,  // summed totals
                ],
                'workouts_last_days' => $workoutSummary,
                'latest_measurement' => $latestMeasurement ? [
                    'measured_at' => $latestMeasurement?->measured_at?->format('Y-m-d'),
                    'weight_kg'    => $latestMeasurement->weight_kg !== null ? (float) $latestMeasurement->weight_kg : null,
                    'body_fat_pct' => $latestMeasurement->body_fat_pct !== null ? (float) $latestMeasurement->body_fat_pct : null,
                    'waist_cm'     => $latestMeasurement->waist_cm !== null ? (float) $latestMeasurement->waist_cm : null,
                    'hip_cm'       => $latestMeasurement->hip_cm !== null ? (float) $latestMeasurement->hip_cm : null,
                    'notes'        => $latestMeasurement->notes,
                ] : null,
            ],
        ];
    }

    private function getNutritionDailyTotals(int $userId, Carbon $startDate, Carbon $now): array
    {
        $rows = MealEntry::query()
            ->where('meal_entries.user_id', $userId)
            ->whereDate('meal_entries.eaten_at', '>=', $startDate->format('Y-m-d'))
            ->whereDate('meal_entries.eaten_at', '<=', $now->format('Y-m-d'))
            ->join('foods', 'foods.id', '=', 'meal_entries.food_id')
            ->selectRaw('DATE(meal_entries.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(foods.calories * meal_entries.servings), 0) as calories')
            ->selectRaw('COALESCE(SUM(foods.protein_g * meal_entries.servings), 0) as protein_g')
            ->selectRaw('COALESCE(SUM(foods.carbs_g * meal_entries.servings), 0) as carbs_g')
            ->selectRaw('COALESCE(SUM(foods.fat_g * meal_entries.servings), 0) as fat_g')
            ->selectRaw('COALESCE(SUM(foods.fiber_g * meal_entries.servings), 0) as fiber_g')
            ->groupBy(DB::raw('DATE(meal_entries.eaten_at)'))
            ->orderBy('day')
            ->get();

        // Make sure we return deterministic keys & numeric types
        return $rows->map(fn ($r) => [
            'day'       => (string) $r->day,
            'calories'  => (int) round((float) $r->calories),
            'protein_g' => (float) round((float) $r->protein_g, 1),
            'carbs_g'   => (float) round((float) $r->carbs_g, 1),
            'fat_g'     => (float) round((float) $r->fat_g, 1),
            'fiber_g'   => (float) round((float) $r->fiber_g, 1),
        ])->all();
    }

    private function sumNutritionTotals(array $daily): array
    {
        $totals = [
            'calories'  => 0,
            'protein_g' => 0.0,
            'carbs_g'   => 0.0,
            'fat_g'     => 0.0,
            'fiber_g'   => 0.0,
        ];

        foreach ($daily as $d) {
            $totals['calories']  += (int) ($d['calories'] ?? 0);
            $totals['protein_g'] += (float) ($d['protein_g'] ?? 0);
            $totals['carbs_g']   += (float) ($d['carbs_g'] ?? 0);
            $totals['fat_g']     += (float) ($d['fat_g'] ?? 0);
            $totals['fiber_g']   += (float) ($d['fiber_g'] ?? 0);
        }

        // Normalize rounding
        $totals['protein_g'] = (float) round($totals['protein_g'], 1);
        $totals['carbs_g']   = (float) round($totals['carbs_g'], 1);
        $totals['fat_g']     = (float) round($totals['fat_g'], 1);
        $totals['fiber_g']   = (float) round($totals['fiber_g'], 1);

        return $totals;
    }

    private function getWorkoutSummary(int $userId, Carbon $startDate, Carbon $now): array
    {
        // Sessions + total duration
        $logs = WorkoutLog::query()
            ->where('user_id', $userId)
            ->where('performed_at', '>=', $startDate)
            ->where('performed_at', '<=', $now->copy()->endOfDay())
            ->withCount('sets')
            ->get();

        $sessionsCount = $logs->count();
        $totalDuration = (int) $logs->sum('duration_min');
        $totalSets     = (int) $logs->sum('sets_count');

        // Simple per-day sessions breakdown
        $perDay = $logs->groupBy(fn ($l) => $l->performed_at ? $l->performed_at->format('Y-m-d') : 'unknown')
            ->map(fn ($group) => [
                'sessions'     => $group->count(),
                'duration_min' => (int) $group->sum('duration_min'),
                'sets'         => (int) $group->sum('sets_count'),
            ])
            ->sortKeys()
            ->map(fn ($v, $k) => array_merge(['day' => $k], $v))
            ->values()
            ->all();

        return [
            'sessions_count'     => $sessionsCount,
            'total_duration_min' => $totalDuration,
            'total_sets'         => $totalSets,
            'per_day'            => $perDay,
        ];
    }

    private function normalizeStringArray($value): array
    {
        if ($value === null) return [];
        if (is_string($value)) $value = [$value];
        if (!is_array($value)) return [];

        $out = [];
        foreach ($value as $v) {
            if ($v === null) continue;
            $s = trim((string) $v);
            if ($s === '') continue;
            $out[] = $s;
        }

        // remove duplicates while preserving order
        return array_values(array_unique($out));
    }
}
