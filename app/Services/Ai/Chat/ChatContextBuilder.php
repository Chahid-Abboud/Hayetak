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
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class ChatContextBuilder
{
    public function __construct(
        private readonly CoachContextBuilder $coachContextBuilder,
        private readonly UserProfileFactResolver $profileFactResolver,
    ) {}

    /**
     * Build the full context bundle the coach uses: profile, restrictions, today's logs, 7-day history, plans, UI state, and memory.
     */
    public function build(
        User $user,
        array $runtimeContext = [],
        ?AiConversation $conversation = null,
        array $classification = [],
    ): array {
        $flags = $classification['context_flags'] ?? [];
        $runtimeContext['include_last_7_days'] = (bool) ($flags['include_last_7_days'] ?? false);

        $base = $this->coachContextBuilder->build($user, $runtimeContext, $conversation);
        $deterministicAction = (string) ($classification['deterministic_action'] ?? '');
        $profile = $base['context']['profile'] ?? [];
        $resolvedProfile = $this->profileFactResolver->resolve($user);
        $selectedDate = $this->resolveSelectedDate($runtimeContext, $flags);
        $selectedDateString = $selectedDate->toDateString();
        $anchorDate = $selectedDate->copy()->startOfDay();
        $from = $anchorDate->copy()->subDays(6)->startOfDay();
        $to = $anchorDate->copy()->endOfDay();
        $selectedMacros = $this->macroSummaryForDay($user->id, $selectedDateString);

        $todayMeals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $user->id)
            ->whereDate('me.eaten_at', $selectedDateString)
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
            ->whereDate('for_day', $selectedDateString)
            ->value('ml') ?? 0);

        $targetWater = $this->waterTargetForUser($user, $resolvedProfile['current_weight_kg'] ?? null);

        $todayWorkouts = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereDate('performed_at', $selectedDateString)
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
        $allergies = $this->normalizeList($resolvedProfile['allergies'] ?? ($profile['allergies'] ?? []));
        $allergyAudit = null;

        if (in_array($deterministicAction, ['allergy_exposure_check', 'ingredient_exposure_check'], true)) {
            $allergyAudit = $this->allergyExposureAudit($user->id, $allergies, $anchorDate);
        }

        $context = [
            'user_profile' => [
                'age' => $resolvedProfile['age'] ?? ($profile['age'] ?: null),
                'sex' => $resolvedProfile['sex'] ?? ($profile['gender'] ?: null),
                'height_cm' => $resolvedProfile['current_height_cm'] ?? ($profile['height_cm'] ?: null),
                'weight_kg' => $resolvedProfile['current_weight_kg'] ?? ($profile['weight_kg'] ?: null),
                'goal' => $resolvedProfile['goal'] ?? ($profile['fitness_goal'] ?: ($profile['dietary_goal'] ?: null)),
                'activity_level' => $resolvedProfile['activity_level'] ?? ($profile['activity'] ?: null),
                'workout_location' => $resolvedProfile['workout_location'] ?? ($profile['workout_location'] ?: null),
                'workout_days_per_week' => $resolvedProfile['workout_days_per_week'] ?? ($profile['workout_days_per_week'] ?: null),
                'available_equipment' => $this->normalizeList($resolvedProfile['available_equipment'] ?? ($profile['available_equipment'] ?? [])),
            ],
            'resolved_profile' => $resolvedProfile,
            'restrictions' => [
                'diet_type' => $resolvedProfile['diet_type'] ?? ($profile['diet_type'] ?: null),
                'allergies' => $allergies,
                'medical_conditions' => $this->normalizeList($resolvedProfile['medical_conditions'] ?? ($medicalHistory !== '' ? [$medicalHistory] : [])),
                'injuries' => $this->normalizeList($resolvedProfile['injuries'] ?? $injuries),
            ],
            'today_summary' => [
                'date' => $selectedDateString,
                'calories' => $selectedMacros['kcal'],
                'protein_g' => $selectedMacros['protein_g'],
                'carbs_g' => $selectedMacros['carbs_g'],
                'fat_g' => $selectedMacros['fat_g'],
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
                'selected_date' => $selectedDateString,
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
            'role_context' => [
                'role' => $user->role,
                'can_access_other_users' => false,
                'note' => $user->role === User::ROLE_ADMIN
                    ? 'The requester is an admin. Keep answers useful for their own wellness and Hayetak workflow questions, but never reveal or infer other users\' private data.'
                    : 'Use the requester\'s own profile and app context only.',
            ],
            'runtime' => [
                'available_ingredients' => $this->normalizeList($runtimeContext['available_ingredients'] ?? []),
            ],
            'allergy_audit' => $allergyAudit,
        ];

        return [
            'context' => $context,
            'citations' => $base['citations'] ?? [],
            'used_context_keys' => $this->usedContextKeys($context),
        ];
    }

    private function waterTargetForUser(User $user, ?float $resolvedWeightKg = null): int
    {
        if (is_numeric($resolvedWeightKg)) {
            return (int) round(((float) $resolvedWeightKg) * 30);
        }

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

    private function resolveSelectedDate(array $runtimeContext, array $flags): CarbonInterface
    {
        if (is_string($runtimeContext['selected_date'] ?? null)) {
            try {
                return Carbon::createFromFormat('Y-m-d', $runtimeContext['selected_date'])->startOfDay();
            } catch (\Throwable) {
                // Ignore malformed runtime date and fall back to relative date hints.
            }
        }

        $offset = $flags['requested_day_offset'] ?? null;
        if (is_numeric($offset)) {
            return Carbon::today()->addDays((int) $offset)->startOfDay();
        }

        return Carbon::today();
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
            'date' => $date,
            'kcal' => (int) round((float) ($row->kcal ?? 0)),
            'protein_g' => (int) round((float) ($row->protein_g ?? 0)),
            'carbs_g' => (int) round((float) ($row->carbs_g ?? 0)),
            'fat_g' => (int) round((float) ($row->fat_g ?? 0)),
        ];
    }

    private function allergyExposureAudit(int $userId, array $allergies, CarbonInterface $anchorDate, int $lookbackDays = 30): array
    {
        $normalizedAllergies = array_values(array_unique(array_filter(array_map(
            static fn ($allergy) => mb_strtolower(trim((string) $allergy)),
            $allergies,
        ))));

        $to = Carbon::createFromFormat('Y-m-d', $anchorDate->toDateString())->endOfDay();
        $from = $to->copy()->subDays(max(0, $lookbackDays - 1))->startOfDay();

        $rows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $userId)
            ->whereBetween(DB::raw('DATE(me.eaten_at)'), [$from->toDateString(), $to->toDateString()])
            ->orderBy('me.eaten_at')
            ->get([
                'me.eaten_at',
                'me.meal_type',
                'f.name as food_name',
                'f.allergens as food_allergens',
                'f.ingredients as food_ingredients',
            ]);

        $entries = [];
        $matchedEntries = [];

        foreach ($rows as $row) {
            $date = trim((string) ($row->eaten_at ?? ''));
            $mealType = trim((string) ($row->meal_type ?? ''));
            $foodName = trim((string) ($row->food_name ?? ''));
            $normalizedFoodName = mb_strtolower($foodName);
            $foodAllergens = array_map(
                static fn ($value) => mb_strtolower(trim((string) $value)),
                $this->decodeJsonList($row->food_allergens ?? null),
            );
            $ingredientText = mb_strtolower(implode(' ', $this->decodeJsonList($row->food_ingredients ?? null)));

            $entry = [
                'date' => $date,
                'meal_type' => $mealType,
                'food_name' => $foodName,
                'allergens' => array_values(array_filter($foodAllergens)),
                'ingredients' => array_values(array_filter($this->decodeJsonList($row->food_ingredients ?? null))),
            ];
            $entries[] = $entry;

            $matchedAllergies = [];
            foreach ($normalizedAllergies as $allergy) {
                if ($allergy === '') {
                    continue;
                }

                $matchFromName = $this->containsWholeWord($normalizedFoodName, $allergy);
                $matchFromAllergens = in_array($allergy, $foodAllergens, true);
                $matchFromIngredients = $this->containsWholeWord($ingredientText, $allergy);

                if ($matchFromName || $matchFromAllergens || $matchFromIngredients) {
                    $matchedAllergies[] = $allergy;
                }
            }

            if ($matchedAllergies !== []) {
                $matchedEntries[] = $entry + [
                    'matched_allergies' => array_values(array_unique($matchedAllergies)),
                ];
            }
        }

        return [
            'lookback_days' => $lookbackDays,
            'range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'saved_allergies' => $normalizedAllergies,
            'logged_entries' => count($entries),
            'entries' => $entries,
            'matched_entries' => $matchedEntries,
        ];
    }

    private function decodeJsonList(mixed $value): array
    {
        if (is_array($value)) {
            return $this->normalizeList($value);
        }

        if (! is_string($value)) {
            return [];
        }

        $raw = trim($value);
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $this->normalizeList($decoded);
        }

        return $this->normalizeList([$raw]);
    }

    private function containsWholeWord(string $text, string $term): bool
    {
        $candidate = trim($term);
        if ($candidate === '') {
            return false;
        }

        return preg_match('/\b'.preg_quote($candidate, '/').'\b/u', $text) === 1;
    }
}
