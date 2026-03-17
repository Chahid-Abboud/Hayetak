<?php

namespace App\Services\Ai\Chat;

use App\Models\AiConversation;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WaterIntake;
use App\Models\WorkoutLog;
use App\Models\WorkoutPlan;
use App\Services\Ai\Context\CoachContextBuilder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ChatContextBuilder
{
    public function __construct(
        private readonly CoachContextBuilder $coachContextBuilder,
    ) {}

    public function build(
        User $user,
        array $runtimeContext = [],
        ?AiConversation $conversation = null,
        array $classification = [],
    ): array {
        $flags = $classification['context_flags'] ?? [];
        $runtimeContext['include_last_7_days'] = (bool) ($flags['include_last_7_days'] ?? false);

        $base = $this->coachContextBuilder->build($user, $runtimeContext, $conversation);
        $profile = $base['context']['profile'] ?? [];
        $today = Carbon::today();
        $from = $today->copy()->subDays(6)->startOfDay();
        $to = $today->copy()->endOfDay();

        $todayMeals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $user->id)
            ->whereDate('me.eaten_at', $today->toDateString())
            ->orderBy('me.eaten_at')
            ->limit(12)
            ->get([
                'me.meal_type',
                'me.servings',
                'f.name',
            ])
            ->map(fn ($row) => [
                'meal_type' => (string) $row->meal_type,
                'name' => (string) $row->name,
                'servings' => (float) $row->servings,
            ])
            ->values()
            ->all();

        $todayWater = (int) (WaterIntake::query()
            ->where('user_id', $user->id)
            ->whereDate('for_day', $today->toDateString())
            ->value('ml') ?? 0);

        $targetWater = $this->waterTargetForUser($user);

        $todayWorkouts = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereDate('performed_at', $today->toDateString())
            ->with('day:id,workout_plan_id,day_index,name')
            ->latest('performed_at')
            ->get();

        $last7Workouts = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('performed_at', [$from, $to])
            ->with('day:id,workout_plan_id,day_index,name')
            ->latest('performed_at')
            ->get();

        $latestMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->latest('measured_at')
            ->first();

        $nutritionPlan = NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest('id')
            ->first();

        $workoutPlan = WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest('id')
            ->with('days:id,workout_plan_id,day_index,name')
            ->first();

        $medicalHistory = trim((string) ($profile['medical_history'] ?? ''));
        $injuries = $this->normalizeList($profile['injury_history'] ?? []);

        $context = [
            'user_profile' => [
                'age' => $profile['age'] ?: null,
                'sex' => $profile['gender'] ?: null,
                'height_cm' => $profile['height_cm'] ?: null,
                'weight_kg' => $profile['weight_kg'] ?: null,
                'goal' => $profile['fitness_goal'] ?: ($profile['dietary_goal'] ?: null),
                'activity_level' => $profile['activity'] ?: null,
                'workout_location' => $profile['workout_location'] ?: null,
                'workout_days_per_week' => $profile['workout_days_per_week'] ?: null,
                'available_equipment' => $this->normalizeList($profile['available_equipment'] ?? []),
            ],
            'restrictions' => [
                'diet_type' => $profile['diet_type'] ?: null,
                'allergies' => $this->normalizeList($profile['allergies'] ?? []),
                'medical_conditions' => $medicalHistory !== '' ? [$medicalHistory] : [],
                'injuries' => $injuries,
            ],
            'today_summary' => [
                'date' => $today->toDateString(),
                'calories' => data_get($base, 'context.today_macros.kcal'),
                'protein_g' => data_get($base, 'context.today_macros.protein_g'),
                'carbs_g' => data_get($base, 'context.today_macros.carbs_g'),
                'fat_g' => data_get($base, 'context.today_macros.fat_g'),
                'water_ml' => $todayWater,
                'target_water_ml' => $targetWater,
                'meals' => $todayMeals,
                'workout_logged' => $todayWorkouts->isNotEmpty(),
                'workouts' => $todayWorkouts->map(fn (WorkoutLog $log) => [
                    'performed_at' => optional($log->performed_at)?->toISOString(),
                    'duration_min' => $log->duration_min,
                    'day_name' => $log->day?->name,
                    'notes' => $this->truncate((string) ($log->notes ?? ''), 140),
                ])->values()->all(),
            ],
            'last_7_days_summary' => [
                'nutrition' => data_get($base, 'context.last_7_days'),
                'workouts_completed' => $last7Workouts->count(),
                'workout_day_names' => $last7Workouts
                    ->pluck('day.name')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
                'latest_measurement' => $latestMeasurement ? [
                    'measured_at' => optional($latestMeasurement->measured_at)?->toDateString(),
                    'weight_kg' => $latestMeasurement->weight_kg,
                    'body_fat_pct' => $latestMeasurement->body_fat_pct,
                ] : null,
            ],
            'plans' => [
                'nutrition_plan_active' => (bool) $nutritionPlan,
                'nutrition_plan_name' => $nutritionPlan?->name,
                'nutrition_goal' => $nutritionPlan?->goal,
                'nutrition_targets' => $nutritionPlan?->targets_json ?: $this->defaultTargetsForUser($user),
                'workout_plan_active' => (bool) $workoutPlan,
                'workout_plan_name' => $workoutPlan?->name,
                'workout_goal' => $workoutPlan?->goal,
                'workout_days' => $workoutPlan
                    ? $workoutPlan->days
                        ->map(fn ($day) => [
                            'day_index' => $day->day_index,
                            'name' => $day->name,
                        ])
                        ->values()
                        ->all()
                    : [],
            ],
            'ui_state' => [
                'screen_context' => $runtimeContext['screen_context'] ?? 'coach',
                'selected_date' => $runtimeContext['selected_date'] ?? $today->toDateString(),
            ],
            'nearby_context' => [
                'lat' => $runtimeContext['lat'] ?? null,
                'lng' => $runtimeContext['lng'] ?? null,
                'goal' => $runtimeContext['goal'] ?? null,
            ],
            'conversation_context' => [
                'recent_turns' => data_get($base, 'context.memory.recent_turns', []),
                'summary' => data_get($base, 'context.memory.summary'),
            ],
            'runtime' => [
                'available_ingredients' => $this->normalizeList($runtimeContext['available_ingredients'] ?? []),
            ],
        ];

        return [
            'context' => $context,
            'citations' => $base['citations'] ?? [],
            'used_context_keys' => $this->usedContextKeys($context),
        ];
    }

    private function waterTargetForUser(User $user): int
    {
        if (is_numeric($user->weight_kg)) {
            return (int) round(((float) $user->weight_kg) * 30);
        }

        return max(1500, ((int) ($user->prefs?->water_cups_per_day ?? 8)) * 250);
    }

    private function defaultTargetsForUser(User $user): array
    {
        return array_filter([
            'calories' => $user->prefs?->daily_goal_calories,
            'protein_g' => $user->prefs?->daily_goal_protein_g,
            'carbs_g' => $user->prefs?->daily_goal_carbs_g,
            'fat_g' => $user->prefs?->daily_goal_fat_g,
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [$value];
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        ))));
    }

    private function usedContextKeys(array $context): array
    {
        $keys = [];

        foreach ($context as $group => $payload) {
            if (! is_array($payload)) {
                continue;
            }

            foreach ($payload as $key => $value) {
                if ($value === null || $value === '' || $value === [] || $value === false) {
                    continue;
                }

                $keys[] = $group.'.'.$key;
            }
        }

        return $keys;
    }

    private function truncate(string $value, int $max): string
    {
        $clean = trim(preg_replace('/\s+/', ' ', $value) ?? '');

        return mb_strlen($clean) > $max
            ? mb_substr($clean, 0, $max).'...'
            : $clean;
    }
}
