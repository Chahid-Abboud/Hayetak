<?php

namespace App\Services\Ai\Chat;

use App\Models\Ai\AiPlan;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Models\WorkoutPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UserContextSnapshotBuilder
{
    public function buildForUser(User $user): array
    {
        $user->loadMissing('prefs');

        $today = Carbon::today();
        $last7Start = $today->copy()->subDays(6)->startOfDay();
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];

        $todayMacros = $this->macroSummaryForDay($user->id, $today->toDateString());
        $last7Macros = $this->macroSummaryForRange($user->id, $last7Start, $today);
        $recentMeals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $user->id)
            ->orderByDesc('me.eaten_at')
            ->limit(8)
            ->get(['me.eaten_at', 'me.meal_type', 'me.servings', 'f.name'])
            ->map(fn ($row) => sprintf(
                '%s: %s (%s, %.1f servings)',
                (string) $row->eaten_at,
                (string) $row->name,
                (string) $row->meal_type,
                (float) $row->servings,
            ))
            ->values()
            ->all();

        $latestMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->latest('measured_at')
            ->first();

        $latestWeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->latest('measured_at')
            ->first();

        $latestHeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('height_cm')
            ->latest('measured_at')
            ->first();

        $currentWeightKg = $latestWeightMeasurement?->weight_kg ?? $user->weight_kg;
        $currentHeightCm = $latestHeightMeasurement?->height_cm ?? $user->height_cm;
        $weightSource = $latestWeightMeasurement
            ? 'latest measurement on '.$this->displayValue(optional($latestWeightMeasurement->measured_at)->toDateString())
            : 'user profile';
        $heightSource = $latestHeightMeasurement
            ? 'latest measurement on '.$this->displayValue(optional($latestHeightMeasurement->measured_at)->toDateString())
            : 'user profile';

        $recentWorkouts = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->with('day')
            ->latest('performed_at')
            ->limit(6)
            ->get();

        $last7WorkoutCount = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('performed_at', [$last7Start, $today->copy()->endOfDay()])
            ->count();

        $activeNutritionPlan = NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest('id')
            ->first();

        $activeWorkoutPlan = WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->with('days')
            ->latest('id')
            ->first();

        $latestDietAiPlan = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'diet')
            ->latest('version')
            ->first();

        $latestWorkoutAiPlan = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'workout')
            ->latest('version')
            ->first();

        $documents = [
            [
                'doc_key' => 'profile',
                'doc_type' => 'profile',
                'text' => $this->joinLines([
                    'User profile for personalized nutrition and workout calculations.',
                    'Use this document for questions about calories, protein, macros, meal suggestions, workout targets, and safety.',
                    'Age: '.$this->displayValue($user->age),
                    'Sex: '.$this->displayValue($user->gender),
                    'Current height cm: '.$this->displayValue($currentHeightCm),
                    'Current height source: '.$heightSource,
                    'Current weight kg: '.$this->displayValue($currentWeightKg),
                    'Current weight source: '.$weightSource,
                    'Goal: '.$this->displayValue($user->fitness_goal ?: $user->dietary_goal),
                    'Activity level: '.$this->displayValue($user->activity_level),
                    'Workout days per week: '.$this->displayValue($user->workout_days_per_week),
                    'Workout location: '.$this->displayValue($user->workout_location),
                    'Diet type: '.$this->displayValue($user->diet_name),
                    'Allergies: '.$this->displayList($user->allergies),
                    'Medical history: '.$this->displayValue($user->medical_history),
                    'Injury history: '.$this->displayList($settings['injury_history'] ?? $settings['injuries'] ?? []),
                    'Available equipment: '.$this->displayList($settings['available_equipment'] ?? []),
                ]),
            ],
            [
                'doc_key' => 'measurements',
                'doc_type' => 'measurements',
                'text' => $this->joinLines([
                    'Latest measurement snapshot for progress and recalculation questions.',
                    'Most recent measurement date: '.$this->displayValue(optional($latestMeasurement?->measured_at)->toDateString()),
                    'Resolved current weight kg: '.$this->displayValue($currentWeightKg),
                    'Resolved current weight source: '.$weightSource,
                    'Latest weight measurement date: '.$this->displayValue(optional($latestWeightMeasurement?->measured_at)->toDateString()),
                    'Resolved current height cm: '.$this->displayValue($currentHeightCm),
                    'Resolved current height source: '.$heightSource,
                    'Latest height measurement date: '.$this->displayValue(optional($latestHeightMeasurement?->measured_at)->toDateString()),
                    'Body fat percent: '.$this->displayValue($latestMeasurement?->body_fat_pct),
                    'Measurement notes: '.$this->displayValue($latestMeasurement?->notes),
                ]),
            ],
            [
                'doc_key' => 'calculation_facts',
                'doc_type' => 'calculation_facts',
                'text' => $this->joinLines([
                    'Use this document for questions like: what weight do you have saved for me, recalculate my daily protein intake based on my weight, how much protein should I eat, and what calorie or macro target fits my body metrics.',
                    'Resolved current weight kg: '.$this->displayValue($currentWeightKg),
                    'Weight source: '.$weightSource,
                    'Latest weight measurement date: '.$this->displayValue(optional($latestWeightMeasurement?->measured_at)->toDateString()),
                    'Resolved current height cm: '.$this->displayValue($currentHeightCm),
                    'Height source: '.$heightSource,
                    'Goal: '.$this->displayValue($user->fitness_goal ?: $user->dietary_goal),
                    'Activity level: '.$this->displayValue($user->activity_level),
                    'Diet type: '.$this->displayValue($user->diet_name),
                ]),
            ],
            [
                'doc_key' => 'nutrition',
                'doc_type' => 'nutrition',
                'text' => $this->joinLines([
                    'Recent nutrition context for meal, macro, and protein intake questions.',
                    'Today date: '.$today->toDateString(),
                    'Today calories kcal: '.$todayMacros['kcal'],
                    'Today protein g: '.$todayMacros['protein_g'],
                    'Today carbs g: '.$todayMacros['carbs_g'],
                    'Today fat g: '.$todayMacros['fat_g'],
                    'Last 7 days logged days: '.$last7Macros['days_logged'],
                    'Last 7 days average calories kcal: '.$last7Macros['avg_kcal'],
                    'Last 7 days average protein g: '.$last7Macros['avg_protein_g'],
                    'Last 7 days average carbs g: '.$last7Macros['avg_carbs_g'],
                    'Last 7 days average fat g: '.$last7Macros['avg_fat_g'],
                    'Daily calorie target: '.$this->displayValue($user->prefs?->daily_goal_calories),
                    'Daily protein target g: '.$this->displayValue($user->prefs?->daily_goal_protein_g),
                    'Daily carbs target g: '.$this->displayValue($user->prefs?->daily_goal_carbs_g),
                    'Daily fat target g: '.$this->displayValue($user->prefs?->daily_goal_fat_g),
                    'Recent meals: '.$this->displayList($recentMeals),
                ]),
            ],
            [
                'doc_key' => 'workouts',
                'doc_type' => 'workouts',
                'text' => $this->joinLines([
                    'Recent workout context for exercise, training, recovery, and activity questions.',
                    'Workouts completed in the last 7 days: '.$last7WorkoutCount,
                    'Recent workout logs: '.$this->displayList($recentWorkouts->map(function (WorkoutLog $log): string {
                        $dayName = $log->day?->name ?: $log->day?->title ?: 'Unassigned day';

                        return sprintf(
                            '%s, %s, duration %s minutes, notes %s',
                            optional($log->performed_at)->toDateString() ?: 'unknown date',
                            $dayName,
                            $this->displayValue($log->duration_min),
                            $this->displayValue($log->notes),
                        );
                    })->all()),
                ]),
            ],
            [
                'doc_key' => 'plans',
                'doc_type' => 'plans',
                'text' => $this->joinLines([
                    'Saved plan context for plan-following and recommendation questions.',
                    'Active nutrition plan: '.$this->displayValue($activeNutritionPlan?->name),
                    'Active nutrition plan goal: '.$this->displayValue($activeNutritionPlan?->goal),
                    'Active nutrition targets: '.$this->displayJson($activeNutritionPlan?->targets_json),
                    'Active workout plan: '.$this->displayValue($activeWorkoutPlan?->name),
                    'Active workout plan goal: '.$this->displayValue($activeWorkoutPlan?->goal),
                    'Active workout days: '.$this->displayList($activeWorkoutPlan?->days
                        ? $activeWorkoutPlan->days->map(fn ($day) => ($day->title ?: $day->name ?: 'Day '.$day->day_index))->all()
                        : []),
                    'Latest AI diet plan summary: '.$this->displayJson($latestDietAiPlan?->plan_json),
                    'Latest AI workout plan summary: '.$this->displayJson($latestWorkoutAiPlan?->plan_json),
                ]),
            ],
        ];

        return array_map(function (array $document): array {
            $document['text'] = trim($document['text']);

            return $document;
        }, $documents);
    }

    public function buildResolvedMetrics(User $user): array
    {
        $latestWeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->latest('measured_at')
            ->first();

        $latestHeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('height_cm')
            ->latest('measured_at')
            ->first();

        return [
            'current_weight_kg' => $latestWeightMeasurement?->weight_kg ?? $user->weight_kg,
            'current_weight_source' => $latestWeightMeasurement
                ? 'latest measurement on '.$this->displayValue(optional($latestWeightMeasurement->measured_at)->toDateString())
                : 'user profile',
            'current_height_cm' => $latestHeightMeasurement?->height_cm ?? $user->height_cm,
            'current_height_source' => $latestHeightMeasurement
                ? 'latest measurement on '.$this->displayValue(optional($latestHeightMeasurement->measured_at)->toDateString())
                : 'user profile',
        ];
    }

    private function macroSummaryForDay(int $userId, string $date): array
    {
        $row = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->first();

        return [
            'kcal' => (int) round((float) ($row->kcal ?? 0)),
            'protein_g' => (int) round((float) ($row->protein_g ?? 0)),
            'carbs_g' => (int) round((float) ($row->carbs_g ?? 0)),
            'fat_g' => (int) round((float) ($row->fat_g ?? 0)),
        ];
    }

    private function macroSummaryForRange(int $userId, Carbon $from, Carbon $to): array
    {
        $rows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('DATE(me.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $userId)
            ->whereBetween(DB::raw('DATE(me.eaten_at)'), [$from->toDateString(), $to->toDateString()])
            ->groupBy(DB::raw('DATE(me.eaten_at)'))
            ->get();

        $days = max(1, $rows->count());

        return [
            'days_logged' => $rows->count(),
            'avg_kcal' => (int) round($rows->sum('kcal') / $days),
            'avg_protein_g' => (int) round($rows->sum('protein_g') / $days),
            'avg_carbs_g' => (int) round($rows->sum('carbs_g') / $days),
            'avg_fat_g' => (int) round($rows->sum('fat_g') / $days),
        ];
    }

    private function joinLines(array $lines): string
    {
        return implode("\n", array_values(array_filter(array_map(
            static fn ($line) => trim((string) $line),
            $lines,
        ))));
    }

    private function displayValue(mixed $value): string
    {
        if ($value === null) {
            return 'not available';
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed === '' ? 'not available' : $trimmed;
        }

        return (string) $value;
    }

    private function displayList(mixed $value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [$value];
        }

        if (! is_array($value)) {
            return 'none saved';
        }

        $items = array_values(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        )));

        return $items === [] ? 'none saved' : implode('; ', $items);
    }

    private function displayJson(mixed $value): string
    {
        if ($value === null || $value === []) {
            return 'not available';
        }

        if (is_string($value)) {
            return trim($value) !== '' ? trim($value) : 'not available';
        }

        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (! is_string($encoded) || $encoded === '') {
            return 'not available';
        }

        return mb_strlen($encoded) > 1200
            ? mb_substr($encoded, 0, 1200).'...'
            : $encoded;
    }
}
