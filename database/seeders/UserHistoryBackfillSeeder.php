<?php

namespace Database\Seeders;

use App\Models\Exercise;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\MealLog;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\Seed\SeededPlanCleanupService;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;
use Carbon\CarbonImmutable;
use Database\Seeders\Ai\Data\ExerciseDataQualitySeeder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserHistoryBackfillSeeder extends Seeder
{
    private const DEFAULT_HISTORY_WINDOW_DAYS = 70;

    private CarbonImmutable $today;

    private CarbonImmutable $activityStartFloor;

    private CarbonImmutable $activityEndCeiling;

    private CarbonImmutable $measurementStartFloor;

    private CarbonImmutable $measurementEndCeiling;

    private int $measurementMinGapDays;

    private int $measurementMaxGapDays;

    /** @var \Illuminate\Support\Collection<string,\App\Models\Food> */
    private Collection $foodsByName;

    /** @var \Illuminate\Support\Collection<string,\App\Models\Exercise> */
    private Collection $exercisesByName;

    private ?FoodCatalogAnomalyService $foodCatalogAnomalies = null;

    private SeedUserProfileTargetsService $targets;

    private SeededPlanCleanupService $planCleanup;

    public function run(): void
    {
        $this->call(DocxMealCatalogSeeder::class);
        $this->call(ExerciseDataQualitySeeder::class);
        $this->call(PremadeWorkoutPrototypeSeeder::class);

        // Keep meal/workout history anchored to the current local date, but allow
        // seeded history to extend through the configured demo verification window.
        $this->today = CarbonImmutable::today(config('app.timezone', 'UTC'))->startOfDay();
        $historyWindowDays = max(42, min(180, (int) config('ai.seed_history_window_days', self::DEFAULT_HISTORY_WINDOW_DAYS)));
        $this->activityStartFloor = $this->resolveMeasurementBoundary(
            config('ai.seed_activity_history.start_date'),
            $this->today->subDays($historyWindowDays)->startOfDay()
        );
        $this->activityEndCeiling = $this->resolveMeasurementBoundary(
            config('ai.seed_activity_history.end_date'),
            $this->today
        );
        if ($this->activityEndCeiling->lessThan($this->activityStartFloor)) {
            $this->activityEndCeiling = $this->activityStartFloor;
        }
        $this->measurementStartFloor = $this->resolveMeasurementBoundary(
            config('ai.seed_measurements.start_date'),
            $this->today->startOfYear()
        );
        $this->measurementEndCeiling = $this->resolveMeasurementBoundary(
            config('ai.seed_measurements.end_date'),
            $this->today
        );
        if ($this->measurementEndCeiling->lessThan($this->measurementStartFloor)) {
            $this->measurementEndCeiling = $this->measurementStartFloor;
        }
        $this->measurementMinGapDays = max(1, (int) config('ai.seed_measurements.min_gap_days', 4));
        $this->measurementMaxGapDays = max($this->measurementMinGapDays, (int) config('ai.seed_measurements.max_gap_days', 7));
        $this->foodsByName = Food::query()->get()->keyBy(fn (Food $food) => $this->normalizeKey($food->name));
        $this->exercisesByName = Exercise::query()->get()->keyBy(fn (Exercise $exercise) => $this->normalizeKey($exercise->name));
        $this->foodCatalogAnomalies = app(FoodCatalogAnomalyService::class);
        $this->targets = app(SeedUserProfileTargetsService::class);
        $this->planCleanup = app(SeededPlanCleanupService::class);

        $users = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->with(['dietaryRestrictions', 'medicalHistories', 'prefs'])
            ->orderBy('id')
            ->get();

        foreach ($users as $user) {
            DB::transaction(function () use ($user): void {
                $profile = $this->buildUserProfile($user);

                $this->planCleanup->cleanupForUser($user);
                $this->resetSeededHistory($user, $profile);
                $this->syncRestrictionTables($user, $profile);
                $this->seedMealHistory($user, $profile);
                $this->seedWorkoutHistory($user, $profile);
                $this->seedMeasurementHistory($user, $profile);
                $this->seedWaterHistory($user, $profile);
            });
        }
    }

    private function buildUserProfile(User $user): array
    {
        $this->fillMissingUserColumns($user);
        $scenario = $this->scenarioForUser($user);
        $inferredWorkoutDays = $this->resolveWorkoutDaysPerWeek($user);
        if ((int) ($user->workout_days_per_week ?? 0) <= 0) {
            $user->forceFill(['workout_days_per_week' => $inferredWorkoutDays])->save();
            $user->refresh();
        }

        $dietKey = $this->normalizeDietName($user->diet_name);
        $allergies = collect($user->allergies ?? [])
            ->merge(
                $user->dietaryRestrictions
                    ->where('kind', 'allergy')
                    ->pluck('value')
            )
            ->filter()
            ->map(fn ($value) => $this->normalizeKey((string) $value))
            ->unique()
            ->values()
            ->all();

        $issues = $this->parseMedicalIssues($user);
        $targets = $this->targets->build($user, $issues);
        $this->syncUserPrefs($user, $targets, $issues);
        $createdAt = $user->created_at
            ? CarbonImmutable::parse($user->created_at)->startOfDay()
            : $this->today;
        $historyStart = $this->activityStartFloor;
        if ($historyStart->greaterThan($this->activityEndCeiling)) {
            $historyStart = $this->activityEndCeiling;
        }

        return [
            'scenario' => $scenario,
            'goal_bucket' => $targets['goal_bucket'],
            'diet_key' => $dietKey,
            'allergies' => $allergies,
            'issues' => $issues,
            'created_at' => $createdAt,
            'meal_start' => $historyStart,
            'meal_end' => $this->activityEndCeiling,
            'measurement_start' => $this->measurementStartFloor,
            'measurement_end' => $this->measurementEndCeiling,
            'workout_start' => $historyStart,
            'workout_days' => max(1, $inferredWorkoutDays),
            'workout_location' => $this->normalizeKey((string) ($user->workout_location ?? 'home')),
            'activity_key' => $this->normalizeKey((string) ($user->activity_level ?? '')),
            'weight_kg' => $this->resolveCurrentWeight($user),
            'height_cm' => $user->height_cm ? (int) $user->height_cm : null,
            'targets' => $targets,
        ];
    }

    private function resetSeededHistory(User $user, array $profile): void
    {
        $this->purgeManualBackfillWorkoutLogs($user);

        MealEntry::query()
            ->where('user_id', $user->id)
            ->delete();

        MealLog::query()
            ->where('user_id', $user->id)
            ->delete();

        $workoutLogIds = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->pluck('id');

        if ($workoutLogIds->isNotEmpty()) {
            WorkoutLogSet::query()->whereIn('workout_log_id', $workoutLogIds)->delete();
            WorkoutLog::query()->whereIn('id', $workoutLogIds)->delete();
        }

        Measurement::query()
            ->where('user_id', $user->id)
            ->delete();

        DB::table('water_intakes')
            ->where('user_id', $user->id)
            ->delete();
    }

    private function purgeManualBackfillWorkoutLogs(User $user): void
    {
        $manualLogIds = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->where(function ($query): void {
                $query->where('notes', 'like', 'manual_backfill%')
                    ->orWhereRaw("(meta->>'source') = 'manual_backfill'");
            })
            ->pluck('id');

        if ($manualLogIds->isEmpty()) {
            return;
        }

        WorkoutLogSet::query()->whereIn('workout_log_id', $manualLogIds)->delete();
        WorkoutLog::query()->whereIn('id', $manualLogIds)->delete();
    }

    private function shouldRefreshSeededHistory(User $user): bool
    {
        $email = strtolower(trim((string) ($user->email ?? '')));

        if (
            str_contains($email, 'hayetak.local')
            || str_contains($email, '@clients.')
            || str_contains($email, 'example.')
        ) {
            return true;
        }

        $tdee = (int) ($user->prefs?->tdee_kcal ?? 0);
        if ($tdee > 0) {
            $hasExtremeCalories = DB::query()
                ->fromSub(function ($query) use ($user): void {
                    $query->from('meal_entries as me')
                        ->join('foods as f', 'f.id', '=', 'me.food_id')
                        ->where('me.user_id', $user->id)
                        ->selectRaw('me.eaten_at::date as day_key, SUM(COALESCE(f.calories, 0) * me.servings) as day_total_kcal')
                        ->groupByRaw('me.eaten_at::date');
                }, 'daily_totals')
                ->selectRaw('COALESCE(MAX(day_total_kcal), 0) as max_day_total')
                ->value('max_day_total');

            if ((float) $hasExtremeCalories > ($tdee + 500)) {
                return true;
            }
        }

        if ($this->hasImpossibleBeverageMeals($user) || $this->hasExtremeProteinDays($user)) {
            return true;
        }

        return WorkoutLogSet::query()
            ->join('workout_logs', 'workout_logs.id', '=', 'workout_log_sets.workout_log_id')
            ->join('exercises', 'exercises.id', '=', 'workout_log_sets.exercise_id')
            ->where('workout_logs.user_id', $user->id)
            ->whereNotNull('workout_log_sets.weight_kg')
            ->where(function ($query): void {
                $query->whereRaw("LOWER(exercises.name) LIKE '%bodyweight%'")
                    ->orWhereRaw("LOWER(exercises.name) LIKE '%push-up%'")
                    ->orWhereRaw("LOWER(exercises.name) LIKE '%air squat%'")
                    ->orWhereRaw("LOWER(exercises.name) LIKE '%chair squat%'")
                    ->orWhereRaw("LOWER(exercises.name) LIKE '%child''s pose%'");
            })
            ->exists();
    }

    private function hasImpossibleBeverageMeals(User $user): bool
    {
        return MealEntry::query()
            ->join('foods as f', 'f.id', '=', 'meal_entries.food_id')
            ->where('meal_entries.user_id', $user->id)
            ->where(function ($query): void {
                $query->where('f.meal_types', 'like', '%drink%')
                    ->orWhereRaw("LOWER(f.name) LIKE '%tea%'")
                    ->orWhereRaw("LOWER(f.name) LIKE '%juice%'")
                    ->orWhereRaw("LOWER(f.name) LIKE '%cola%'")
                    ->orWhereRaw("LOWER(f.name) LIKE '%lemonade%'")
                    ->orWhereRaw("LOWER(f.name) LIKE '%kombucha%'");
            })
            ->whereNull('f.calories')
            ->where(function ($query): void {
                $query->where('f.protein_g', '>', 12)
                    ->orWhere('f.fat_g', '>', 8);
            })
            ->exists();
    }

    private function hasExtremeProteinDays(User $user): bool
    {
        $weightKg = is_numeric($user->weight_kg ?? null) ? (float) $user->weight_kg : null;
        $threshold = max(220, (int) round(($weightKg ?? 85.0) * 2.6));

        $maxProtein = DB::query()
            ->fromSub(function ($query) use ($user): void {
                $query->from('meal_entries as me')
                    ->join('foods as f', 'f.id', '=', 'me.food_id')
                    ->where('me.user_id', $user->id)
                    ->selectRaw('me.eaten_at::date as day_key, SUM(COALESCE(f.protein_g, 0) * me.servings) as day_total_protein_g')
                    ->groupByRaw('me.eaten_at::date');
            }, 'daily_protein_totals')
            ->selectRaw('COALESCE(MAX(day_total_protein_g), 0) as max_day_total')
            ->value('max_day_total');

        return (float) $maxProtein > $threshold;
    }

    private function fillMissingUserColumns(User $user): void
    {
        $baselineTargets = $this->targets->build($user, []);
        $firstName = trim((string) ($user->first_name ?: $this->inferNamePart($user, 0)));
        $lastName = trim((string) ($user->last_name ?: $this->inferNamePart($user, 1)));
        $role = (string) ($user->role ?? User::ROLE_CLIENT);
        $goalDefaults = $this->goalDefaultsForUser($user);
        $activityLevel = trim((string) ($user->activity_level ?: $this->defaultActivityLevelForUser($user)));
        $workoutLocation = trim((string) ($user->workout_location ?: $this->defaultWorkoutLocationForUser($user)));
        $hasMedicalHistory = (bool) ($user->has_medical_history
            || filled($user->medical_history)
            || $user->medicalHistories->isNotEmpty());
        $medicalSummary = filled($user->medical_history)
            ? trim((string) $user->medical_history)
            : $this->tableMedicalSummary($user);
        $normalizedGender = $this->normalizeKey((string) ($user->gender ?? ''));
        $isSeededDemoUser = $this->isSeededDemoUser($user);

        $updates = [];

        if (blank($user->name)) {
            $updates['name'] = trim($firstName.' '.$lastName);
        }

        if (blank($user->first_name)) {
            $updates['first_name'] = $firstName;
        }

        if (blank($user->last_name)) {
            $updates['last_name'] = $lastName;
        }

        if (blank($user->username)) {
            $updates['username'] = Str::lower(Str::slug($firstName.' '.$lastName, '_')).'_'.$user->id;
        }

        if (blank($user->gender) || ! in_array($normalizedGender, ['female', 'male'], true)) {
            $updates['gender'] = $baselineTargets['gender'];
        }

        if ((int) ($user->age ?? 0) <= 0) {
            $updates['age'] = $baselineTargets['age'];
        }

        if ((int) ($user->height_cm ?? 0) <= 0) {
            $updates['height_cm'] = $baselineTargets['height_cm'];
        }

        if ((float) ($user->weight_kg ?? 0) <= 0) {
            $updates['weight_kg'] = $baselineTargets['weight_kg'];
        }

        if (blank($user->dietary_goal)) {
            $updates['dietary_goal'] = $goalDefaults['dietary_goal'];
        }

        if (blank($user->fitness_goal)) {
            $updates['fitness_goal'] = $goalDefaults['fitness_goal'];
        }

        if (blank($user->diet_name)) {
            $updates['diet_name'] = $goalDefaults['diet_name'];
        }

        if (blank($user->activity_level)) {
            $updates['activity_level'] = $activityLevel;
        }

        if ((int) ($user->workout_days_per_week ?? 0) <= 0) {
            $updates['workout_days_per_week'] = $baselineTargets['workout_days_target'];
        }

        if (blank($user->workout_location)) {
            $updates['workout_location'] = $workoutLocation;
        }

        if ($user->tried_diet_before === null) {
            $updates['tried_diet_before'] = $role !== User::ROLE_ADMIN && (int) ($user->age ?? 0) >= 22;
        }

        if (($user->diet_failure_reasons ?? []) === [] && ($updates['tried_diet_before'] ?? $user->tried_diet_before)) {
            $updates['diet_failure_reasons'] = $this->dietFailureReasonsForUser($user);
        }

        if (blank($user->diet_failure_other) && (($updates['tried_diet_before'] ?? $user->tried_diet_before) && $user->id % 5 === 0)) {
            $updates['diet_failure_other'] = $role === User::ROLE_CLIENT
                ? 'Routine changes and social meals made consistency difficult.'
                : 'Work hours sometimes disrupted consistent meal timing.';
        }

        if (! $user->has_medical_history && $hasMedicalHistory) {
            $updates['has_medical_history'] = true;
        }

        if (blank($user->medical_history) && $medicalSummary !== '') {
            $updates['medical_history'] = $medicalSummary;
        }

        if (blank($user->city)) {
            $updates['city'] = $this->defaultCityForUser($user);
        }

        if ($isSeededDemoUser) {
            $backdatedCreatedAt = $this->activityStartFloor
                ->subDays(14 + ($user->id % 21))
                ->setTime(8, 0);
            $createdAt = $user->created_at
                ? CarbonImmutable::parse($user->created_at)
                : null;
            if (! $createdAt || $createdAt->greaterThan($backdatedCreatedAt)) {
                $updates['created_at'] = $backdatedCreatedAt;
            }
            if (! $user->email_verified_at || CarbonImmutable::parse($user->email_verified_at)->greaterThan($this->today)) {
                $updates['email_verified_at'] = $backdatedCreatedAt->addDays(2);
            }
        }

        if ($role !== User::ROLE_CLIENT && blank($user->contact_display)) {
            $updates['contact_display'] = (string) $user->email;
        }

        if ($role !== User::ROLE_CLIENT && blank($user->availability_text)) {
            $updates['availability_text'] = 'Mon-Fri 9:00-17:00';
        }

        if ($role !== User::ROLE_CLIENT && blank($user->professional_bio)) {
            $updates['professional_bio'] = $role === User::ROLE_TRAINER
                ? 'Coach focused on progressive, safe, and realistic training plans.'
                : 'Dietitian focused on sustainable habits, meal structure, and long-term adherence.';
        }

        if ($role !== User::ROLE_CLIENT && ($user->specialties ?? []) === []) {
            $updates['specialties'] = $role === User::ROLE_TRAINER
                ? ['Strength', 'Technique', 'Injury-safe coaching']
                : ['Weight management', 'Habit change', 'Meal planning'];
        }

        $updates = array_replace($updates, $this->targets->personaAdjustments($user));

        if ($updates !== []) {
            $user->forceFill($updates)->save();
            $user->refresh();
            $user->loadMissing(['dietaryRestrictions', 'medicalHistories']);
        }
    }

    private function syncUserPrefs(User $user, array $targets, array $issues): void
    {
        $existingSettings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];
        $injuryHistory = collect($issues)
            ->filter(fn (array $issue) => ($issue['kind'] ?? null) === 'injury')
            ->pluck('label')
            ->values()
            ->all();

        UserPref::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'units' => $user->prefs?->units ?? 'metric',
                'theme' => $user->prefs?->theme ?? 'system',
                'home_gym' => $targets['home_gym'],
                'is_public' => (bool) ($user->prefs?->is_public ?? false),
                'bmr_kcal' => $targets['bmr_kcal'],
                'tdee_kcal' => $targets['tdee_kcal'],
                'activity_factor' => $targets['activity_factor'],
                'daily_goal_calories' => $targets['daily_goal_calories'],
                'daily_goal_protein_g' => $targets['daily_goal_protein_g'],
                'daily_goal_carbs_g' => $targets['daily_goal_carbs_g'],
                'daily_goal_fat_g' => $targets['daily_goal_fat_g'],
                'water_cups_per_day' => $targets['water_cups_per_day'],
                'workout_days_target' => $targets['workout_days_target'],
                'notifications' => $user->prefs?->notifications,
                'settings' => array_merge($existingSettings, [
                    'injury_history' => $injuryHistory,
                    'available_equipment' => $targets['available_equipment'],
                    'preferred_workout_days' => $targets['preferred_workout_days'],
                    'seed_goal_bucket' => $targets['goal_bucket'],
                    'seeded_calorie_floor_kcal' => $targets['daily_intake_floor_kcal'],
                    'seeded_calorie_ceiling_kcal' => $targets['daily_intake_ceiling_kcal'],
                ]),
            ]
        );

        $user->unsetRelation('prefs');
        $user->loadMissing('prefs');
    }

    private function syncRestrictionTables(User $user, array $profile): void
    {
        if ($user->diet_name) {
            UserDietaryRestriction::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => 'diet_type',
                    'value' => $user->diet_name,
                ],
                [
                    'notes' => 'Backfilled from user profile for seeded history.',
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }

        foreach ($profile['allergies'] as $allergy) {
            UserDietaryRestriction::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => 'allergy',
                    'value' => Str::headline(str_replace('-', ' ', $allergy)),
                ],
                [
                    'notes' => 'Backfilled from user profile for seeded history.',
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }

        foreach ($profile['issues'] as $issue) {
            UserMedicalHistory::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => $issue['kind'],
                    'value' => $issue['label'],
                ],
                [
                    'notes' => $issue['notes'],
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }
    }

    private function scenarioForUser(User $user): string
    {
        return match ($user->id % 4) {
            0 => 'steady_progress',
            1 => 'plateau',
            2 => 'regression',
            default => 'rebound',
        };
    }

    private function goalBucket(User $user): string
    {
        $goalText = $this->normalizeKey(
            trim(((string) ($user->dietary_goal ?? '')).' '.((string) ($user->fitness_goal ?? '')))
        );

        if (Str::contains($goalText, ['loss', 'lose', 'deficit', 'fat'])) {
            return 'loss';
        }

        if (Str::contains($goalText, ['gain', 'surplus', 'muscle', 'bulk'])) {
            return 'gain';
        }

        return 'maintain';
    }

    private function normalizeDietName(?string $dietName): string
    {
        return $this->normalizeDietAlias((string) $dietName);
    }

    private function normalizeDietAlias(string $dietName): string
    {
        $normalized = $this->normalizeKey($dietName);

        return match ($normalized) {
            'intermittent fasting', 'if' => 'intermittent fasting',
            'low fodmap', 'low-fodmap' => 'low fodmap',
            'low carb', 'low-carb', 'lowcarb' => 'low-carb',
            'high protein', 'high-protein' => 'high-protein',
            'whole 30', 'whole30' => 'whole30',
            default => $normalized !== '' ? $normalized : 'general',
        };
    }

    private function resolveCurrentWeight(User $user): float
    {
        $latestMeasurementWeight = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->latest('measured_at')
            ->value('weight_kg');

        if ($latestMeasurementWeight !== null) {
            return round((float) $latestMeasurementWeight, 2);
        }

        if ($user->weight_kg !== null) {
            return (float) $user->weight_kg;
        }

        $base = 67 + (($user->id * 7) % 19);
        if ($this->normalizeKey((string) $user->gender) === 'female') {
            $base -= 8;
        }

        if ($user->role === User::ROLE_TRAINER) {
            $base += 6;
        }

        return (float) $base;
    }

    private function resolveWorkoutDaysPerWeek(User $user): int
    {
        $current = (int) ($user->workout_days_per_week ?? 0);
        if ($current > 0) {
            return min(7, $current);
        }

        $activity = $this->normalizeKey((string) ($user->activity_level ?? ''));
        $base = match (true) {
            str_contains($activity, 'sedentary') => 2,
            str_contains($activity, 'light') => 3,
            str_contains($activity, 'moderate') => 4,
            str_contains($activity, 'very') => 5,
            str_contains($activity, 'athlete') => 6,
            default => 3,
        };

        if ($user->role === User::ROLE_TRAINER) {
            $base = max($base, 5);
        } elseif ($user->role === User::ROLE_NUTRITIONIST) {
            $base = max($base, 3);
        }

        return min(7, max(1, $base));
    }

    private function parseMedicalIssues(User $user): array
    {
        $sourceText = collect([
            $user->medical_history,
            ...$user->medicalHistories->pluck('value')->all(),
        ])->filter()->implode(' | ');

        $normalized = $this->normalizeKey($sourceText);
        $catalog = [
            'type 2 diabetes' => ['kind' => 'medical_condition', 'label' => 'Type 2 Diabetes'],
            'diabetes' => ['kind' => 'medical_condition', 'label' => 'Diabetes'],
            'asthma' => ['kind' => 'medical_condition', 'label' => 'Asthma'],
            'iron-deficiency anemia' => ['kind' => 'medical_condition', 'label' => 'Iron-Deficiency Anemia'],
            'anemia' => ['kind' => 'medical_condition', 'label' => 'Anemia'],
            'vitamin d' => ['kind' => 'medical_condition', 'label' => 'Low Vitamin D'],
            'pcos' => ['kind' => 'medical_condition', 'label' => 'PCOS'],
            'insulin resistance' => ['kind' => 'medical_condition', 'label' => 'Insulin Resistance'],
            'lactose intolerance' => ['kind' => 'medical_condition', 'label' => 'Lactose Intolerance'],
            'acid reflux' => ['kind' => 'medical_condition', 'label' => 'Acid Reflux'],
            'high blood pressure' => ['kind' => 'medical_condition', 'label' => 'High Blood Pressure'],
            'hypertension' => ['kind' => 'medical_condition', 'label' => 'Hypertension'],
            'ibs' => ['kind' => 'medical_condition', 'label' => 'IBS'],
            'sleep apnea' => ['kind' => 'medical_condition', 'label' => 'Sleep Apnea'],
            'high triglycerides' => ['kind' => 'medical_condition', 'label' => 'High Triglycerides'],
            'hypothyroidism' => ['kind' => 'medical_condition', 'label' => 'Hypothyroidism'],
            'migraine' => ['kind' => 'medical_condition', 'label' => 'Migraines'],
            'fatty liver' => ['kind' => 'medical_condition', 'label' => 'NAFLD'],
            'elevated ldl' => ['kind' => 'medical_condition', 'label' => 'Elevated LDL'],
            'shoulder injury' => ['kind' => 'injury', 'label' => 'Shoulder Injury'],
            'shoulder impingement' => ['kind' => 'injury', 'label' => 'Shoulder Impingement'],
            'broken ankle' => ['kind' => 'injury', 'label' => 'Broken Ankle'],
            'ankle sprain' => ['kind' => 'injury', 'label' => 'Ankle Sprain'],
            'lower-back tightness' => ['kind' => 'injury', 'label' => 'Lower Back Tightness'],
            'lower back tightness' => ['kind' => 'injury', 'label' => 'Lower Back Tightness'],
            'wrist strain' => ['kind' => 'injury', 'label' => 'Wrist Strain'],
            'knee pain' => ['kind' => 'injury', 'label' => 'Knee Pain'],
            'patellofemoral knee pain' => ['kind' => 'injury', 'label' => 'Patellofemoral Knee Pain'],
            'postpartum core weakness' => ['kind' => 'injury', 'label' => 'Postpartum Core Weakness'],
        ];

        $issues = [];
        foreach ($catalog as $needle => $issue) {
            if (! Str::contains($normalized, $needle)) {
                continue;
            }

            $issues[$issue['kind'].'|'.$issue['label']] = [
                ...$issue,
                'notes' => $sourceText !== '' ? $sourceText : null,
            ];
        }

        return array_values($issues);
    }

    private function seedMealHistory(User $user, array $profile): void
    {
        $mealEnd = $this->clampMealHistoryEnd($profile);
        if ($profile['meal_start']->greaterThan($mealEnd)) {
            return;
        }

        $plannedItemsByDayAndMeal = $this->ensureHistoricalFollowPlan($user, $profile);

        $existingEntries = MealEntry::query()
            ->where('user_id', $user->id)
            ->whereBetween('eaten_at', [$profile['meal_start']->toDateString(), $mealEnd->toDateString()])
            ->get(['id', 'meal_type', 'eaten_at', 'food_id', 'nutrition_plan_item_id', 'servings']);

        $existingCounts = $existingEntries
            ->groupBy(fn (MealEntry $entry) => $entry->eaten_at->toDateString().'|'.$entry->meal_type);
        $existingByDay = $existingEntries
            ->groupBy(fn (MealEntry $entry) => $entry->eaten_at->toDateString());

        $date = $profile['meal_start'];
        while ($date->lessThanOrEqualTo($mealEnd)) {
            $dayKey = $date->toDateString();
            $existingForDate = $existingByDay->get($dayKey, collect());

            if ($existingForDate->isEmpty()) {
                $createdEntries = $this->buildMealDayEntriesWithRetries($user, $profile, $date, $plannedItemsByDayAndMeal);
                if ($createdEntries !== []) {
                    $persisted = collect();
                    foreach ($createdEntries as $entryData) {
                        $entry = MealEntry::query()->create([
                            'user_id' => $user->id,
                            'food_id' => $entryData['food_id'],
                            'nutrition_plan_item_id' => $entryData['nutrition_plan_item_id'],
                            'meal_type' => $entryData['meal_type'],
                            'servings' => $entryData['servings'],
                            'eaten_at' => $dayKey,
                        ]);
                        $persisted->push($entry);
                    }

                    $existingByDay->put($dayKey, $persisted);
                    foreach ($persisted->groupBy('meal_type') as $mealType => $entries) {
                        $existingCounts->put($dayKey.'|'.$mealType, $entries);
                    }
                }

                $date = $date->addDay();

                continue;
            }

            $behavior = $this->dailyMealBehavior($user, $profile, $date);

            foreach ($this->mealTypesForDay($profile, $date, $behavior) as $mealType) {
                $key = $dayKey.'|'.$mealType;
                $existing = $existingCounts->get($key, collect());
                $targetEntries = $this->targetMealEntriesForMeal($profile, $mealType, $date, $behavior);

                if ($existing->count() >= $targetEntries) {
                    continue;
                }

                $excludedFoodIds = $existing->pluck('food_id')->filter()->values()->all();
                $usedPlanItemIds = $existing->pluck('nutrition_plan_item_id')
                    ->filter()
                    ->map(fn ($value) => (int) $value)
                    ->values()
                    ->all();

                for ($slotIndex = $existing->count(); $slotIndex < $targetEntries; $slotIndex++) {
                    $loggingMode = $this->resolveLoggingModeForMeal(
                        $behavior['logging_mode'],
                        $mealType,
                        $date,
                        $plannedItemsByDayAndMeal,
                        $usedPlanItemIds,
                    );

                    $planItem = null;
                    $food = null;

                    if ($loggingMode === 'follow_plan') {
                        $planItem = $this->pickFollowPlanItem(
                            $date,
                            $mealType,
                            $slotIndex,
                            $plannedItemsByDayAndMeal,
                            $usedPlanItemIds,
                        );

                        if ($planItem && $planItem->food instanceof Food) {
                            $food = $planItem->food;
                            $usedPlanItemIds[] = (int) $planItem->id;
                        }
                    }

                    if (! $food instanceof Food) {
                        $food = $this->pickFoodForUser(
                            $profile,
                            $mealType,
                            $date,
                            $slotIndex,
                            $excludedFoodIds,
                            $behavior,
                            $targetEntries
                        );
                        $loggingMode = 'freestyle';
                        $planItem = null;
                    }

                    if (! $food) {
                        continue;
                    }

                    $entry = MealEntry::query()->create([
                        'user_id' => $user->id,
                        'food_id' => $food->id,
                        'nutrition_plan_item_id' => $planItem?->id,
                        'meal_type' => $mealType,
                        'servings' => $this->servingsForMeal(
                            $profile,
                            $mealType,
                            $date,
                            $food,
                            $behavior,
                            $loggingMode,
                            $slotIndex,
                            $targetEntries
                        ),
                        'eaten_at' => $dayKey,
                    ]);

                    $existing->push($entry);
                    $existingCounts->put($key, $existing);
                    $excludedFoodIds[] = $food->id;
                }
            }

            $date = $date->addDay();
        }

        $this->syncLegacyMealLogs($user, $profile, $mealEnd);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildMealDayEntriesWithRetries(
        User $user,
        array $profile,
        CarbonImmutable $date,
        array $plannedItemsByDayAndMeal,
    ): array {
        $baseBehavior = $this->dailyMealBehavior($user, $profile, $date);
        $validation = [];
        $lastEntries = [];

        foreach (range(0, 2) as $attempt) {
            $behavior = $attempt === 0
                ? $baseBehavior
                : $this->tightenMealBehavior($profile, $baseBehavior, $attempt, $validation);

            $entries = $this->buildMealDayEntries($profile, $date, $plannedItemsByDayAndMeal, $behavior);
            $validation = $this->validateBuiltMealDay($profile, $entries, $behavior);
            $lastEntries = $entries;

            if (($validation['ok'] ?? false) === true) {
                return $entries;
            }
        }

        return $lastEntries;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildMealDayEntries(
        array $profile,
        CarbonImmutable $date,
        array $plannedItemsByDayAndMeal,
        array $behavior,
    ): array {
        $entries = [];
        $usedPlanItemIds = [];
        $excludedFoodIds = [];
        $runningProtein = 0.0;

        foreach ($this->mealTypesForDay($profile, $date, $behavior) as $mealType) {
            $targetEntries = $this->targetMealEntriesForMeal($profile, $mealType, $date, $behavior);
            if ($targetEntries <= 0) {
                continue;
            }

            for ($slotIndex = 0; $slotIndex < $targetEntries; $slotIndex++) {
                $slotBehavior = $this->behaviorForMealSlot($profile, $behavior, $runningProtein, $mealType);
                $loggingMode = $this->resolveLoggingModeForMeal(
                    (($slotBehavior['prefer_lower_protein'] ?? false) === true ? 'freestyle' : $behavior['logging_mode']),
                    $mealType,
                    $date,
                    $plannedItemsByDayAndMeal,
                    $usedPlanItemIds,
                );

                $planItem = null;
                $food = null;

                if ($loggingMode === 'follow_plan') {
                    $planItem = $this->pickFollowPlanItem(
                        $date,
                        $mealType,
                        $slotIndex,
                        $plannedItemsByDayAndMeal,
                        $usedPlanItemIds,
                    );

                    if ($planItem && $planItem->food instanceof Food) {
                        $food = $planItem->food;
                        $usedPlanItemIds[] = (int) $planItem->id;
                    }
                }

                if (! $food instanceof Food) {
                    $food = $this->pickFoodForUser(
                        $profile,
                        $mealType,
                        $date,
                        $slotIndex,
                        $excludedFoodIds,
                        $slotBehavior,
                        $targetEntries
                    );
                    $loggingMode = 'freestyle';
                    $planItem = null;
                }

                if (! $food) {
                    continue;
                }

                $servings = $this->servingsForMeal(
                    $profile,
                    $mealType,
                    $date,
                    $food,
                    $slotBehavior,
                    $loggingMode,
                    $slotIndex,
                    $targetEntries
                );

                $entries[] = [
                    'food' => $food,
                    'food_id' => (int) $food->id,
                    'nutrition_plan_item_id' => $planItem?->id,
                    'meal_type' => $mealType,
                    'servings' => $servings,
                ];

                $excludedFoodIds[] = $food->id;
                $runningProtein += (float) ($food->protein_g ?? 0) * $servings;
            }
        }

        return $entries;
    }

    private function syncLegacyMealLogs(User $user, array $profile, CarbonImmutable $mealEnd): void
    {
        MealLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('consumed_at', [$profile['meal_start']->toDateString(), $mealEnd->toDateString()])
            ->delete();

        $entriesByDay = MealEntry::query()
            ->with('food')
            ->where('user_id', $user->id)
            ->whereBetween('eaten_at', [$profile['meal_start']->toDateString(), $mealEnd->toDateString()])
            ->orderBy('eaten_at')
            ->orderBy('meal_type')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (MealEntry $entry) => $entry->eaten_at->toDateString());

        if ($entriesByDay->isEmpty()) {
            return;
        }

        $now = now();

        foreach ($entriesByDay as $day => $entries) {
            $mealLog = MealLog::query()->create([
                'user_id' => $user->id,
                'consumed_at' => $day,
                'other_notes' => 'synthetic_seeded meal summary mirrored from meal_entries.',
                'photo_path' => null,
            ]);

            $items = $entries
                ->map(function (MealEntry $entry) use ($mealLog, $now): array {
                    $food = $entry->food;
                    $servings = (float) ($entry->servings ?? 1);

                    return [
                        'meal_log_id' => $mealLog->id,
                        'category' => $entry->meal_type,
                        'label' => $food?->name ?: 'Seeded meal',
                        'quantity' => round($servings, 2),
                        'unit' => $food?->serving_unit ?: 'serving',
                        'calories' => (int) round(((float) ($food?->calories ?? 0)) * $servings),
                        'protein' => round(((float) ($food?->protein_g ?? $food?->protein ?? 0)) * $servings, 2),
                        'carbs' => round(((float) ($food?->carbs_g ?? $food?->carbs ?? 0)) * $servings, 2),
                        'fat' => round(((float) ($food?->fat_g ?? $food?->fat ?? 0)) * $servings, 2),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                })
                ->values()
                ->all();

            if ($items !== []) {
                DB::table('meal_log_items')->insert($items);
            }
        }
    }

    private function mealTypesForDay(array $profile, CarbonImmutable $date, array $behavior = []): array
    {
        if ($profile['diet_key'] === 'intermittent fasting') {
            $meals = ['lunch', 'snack', 'dinner', 'drink'];
            $signature = abs(crc32($date->toDateString().'|if-breakfast')) % 3;
            if (($behavior['include_breakfast'] ?? false) || $date->isWeekend() || $signature === 0) {
                array_unshift($meals, 'breakfast');
            }

            return $meals;
        }

        return ['breakfast', 'lunch', 'snack', 'dinner', 'drink'];
    }

    private function targetMealEntriesForMeal(
        array $profile,
        string $mealType,
        CarbonImmutable $date,
        array $behavior,
    ): int {
        $dailyCalories = max(1200, (int) ($behavior['daily_calories'] ?? data_get($profile, 'targets.daily_goal_calories', 1800)));

        if ($mealType === 'snack') {
            if (! $behavior['include_snack']) {
                return 0;
            }

            return $dailyCalories >= 2500 ? 2 : 1;
        }

        if ($mealType === 'drink') {
            return $behavior['include_drink'] ? 1 : 0;
        }

        if ($profile['diet_key'] === 'intermittent fasting' && $mealType === 'breakfast') {
            return $behavior['include_breakfast'] ? 1 : 0;
        }

        if (($behavior['single_item_meals'] ?? false) === true) {
            return 1;
        }

        if ($mealType === 'breakfast' && $dailyCalories >= 2800) {
            return 2;
        }

        if (in_array($mealType, ['lunch', 'dinner'], true)) {
            if ($dailyCalories >= 2300) {
                return 2;
            }

            if (($profile['goal_bucket'] ?? 'maintain') === 'gain' && $dailyCalories >= 2200) {
                return 2;
            }
        }

        return 1;
    }

    private function clampMealHistoryEnd(array $profile): CarbonImmutable
    {
        $mealEnd = $profile['meal_end'] ?? $this->activityEndCeiling;
        if (! $mealEnd instanceof CarbonImmutable) {
            $mealEnd = CarbonImmutable::parse((string) $mealEnd);
        }

        if ($mealEnd->greaterThan($this->activityEndCeiling)) {
            $mealEnd = $this->activityEndCeiling;
        }

        return $mealEnd->startOfDay();
    }

    /**
     * @return array{
     *   intake_mode:'under'|'proper'|'over',
     *   logging_mode:'follow_plan'|'freestyle',
     *   include_breakfast:bool,
     *   include_snack:bool,
     *   include_drink:bool,
     *   daily_calories:int
     * }
     */
    private function dailyMealBehavior(User $user, array $profile, CarbonImmutable $date): array
    {
        $cycle = [
            ['intake_mode' => 'proper', 'logging_mode' => 'follow_plan'],
            ['intake_mode' => 'proper', 'logging_mode' => 'freestyle'],
            ['intake_mode' => 'under', 'logging_mode' => 'follow_plan'],
            ['intake_mode' => 'under', 'logging_mode' => 'freestyle'],
            ['intake_mode' => 'over', 'logging_mode' => 'follow_plan'],
            ['intake_mode' => 'over', 'logging_mode' => 'freestyle'],
        ];

        $daysSinceFloor = (int) $this->activityStartFloor->diffInDays($date, false);
        $index = (($daysSinceFloor % count($cycle)) + ($user->id % count($cycle)) + count($cycle)) % count($cycle);
        $pattern = $cycle[$index];
        $signature = abs(crc32($user->id.'|'.$date->toDateString().'|'.$profile['scenario'])) % 100;
        $goalBucket = (string) ($profile['goal_bucket'] ?? 'maintain');
        $dailyCalories = $this->dailyLoggedCalories($profile, $pattern['intake_mode'], $date);

        $includeBreakfast = $profile['diet_key'] !== 'intermittent fasting'
            || $date->isWeekend()
            || $signature < 28
            || $pattern['intake_mode'] === 'over';

        $includeSnack = match ($pattern['intake_mode']) {
            'over' => true,
            'under' => $goalBucket === 'gain' || $signature < 22,
            default => $goalBucket === 'gain' || $signature < 68,
        };

        $includeDrink = match (true) {
            $goalBucket === 'gain' && $signature < 38 => true,
            $pattern['intake_mode'] === 'over' && $signature < 22 => true,
            $profile['diet_key'] === 'intermittent fasting' && $signature < 55 => true,
            default => false,
        };

        if ($dailyCalories >= 2800) {
            $includeSnack = true;
        }

        if ($dailyCalories >= 3000) {
            $includeDrink = true;
        }

        return [
            ...$pattern,
            'include_breakfast' => $includeBreakfast,
            'include_snack' => $includeSnack,
            'include_drink' => $includeDrink,
            'daily_calories' => $dailyCalories,
        ];
    }

    private function dailyLoggedCalories(array $profile, string $intakeMode, CarbonImmutable $date): int
    {
        $targets = $profile['targets'] ?? [];
        $maintenance = (int) ($targets['tdee_kcal'] ?? 2000);
        $goal = (int) ($targets['daily_goal_calories'] ?? $maintenance);
        $scenario = (string) ($profile['scenario'] ?? 'steady_progress');
        $goalBucket = (string) ($profile['goal_bucket'] ?? 'maintain');

        $scenarioOffset = match ($goalBucket) {
            'loss' => match ($scenario) {
                'steady_progress' => -60,
                'plateau' => 90,
                'regression' => 220,
                default => $date->greaterThanOrEqualTo($this->today->subDays(14)) ? -25 : 140,
            },
            'gain' => match ($scenario) {
                'steady_progress' => 40,
                'plateau' => -100,
                'regression' => -220,
                default => $date->greaterThanOrEqualTo($this->today->subDays(14)) ? -20 : -140,
            },
            default => match ($scenario) {
                'steady_progress' => 0,
                'plateau' => 50,
                'regression' => $profile['weight_kg'] >= 72 ? 170 : -170,
                default => $date->greaterThanOrEqualTo($this->today->subDays(14)) ? 15 : 80,
            },
        };

        $modeOffset = match ($intakeMode) {
            'under' => -140,
            'over' => 160,
            default => 0,
        };

        $weekendOffset = $date->isWeekend()
            ? match ($goalBucket) {
                'loss' => 70,
                'gain' => 40,
                default => 55,
            }
        : 0;

        return $this->clampDailyCalories(
            $goal + $scenarioOffset + $modeOffset + $weekendOffset,
            $targets,
            $maintenance
        );
    }

    private function clampDailyCalories(int $calories, array $targets, int $maintenance): int
    {
        $floor = (int) ($targets['daily_intake_floor_kcal'] ?? max(1200, $maintenance - 500));
        $ceiling = (int) ($targets['daily_intake_ceiling_kcal'] ?? ($maintenance + 500));

        return max($floor, min($ceiling, $calories));
    }

    private function mealCalorieTarget(
        array $profile,
        string $mealType,
        array $behavior,
        int $slotIndex = 0,
        int $slotCount = 1,
    ): int {
        $ratios = $this->mealRatiosForDay($profile, $behavior);
        $ratio = (float) ($ratios[$mealType] ?? 0.0);
        $dailyCalories = max(1200, (int) ($behavior['daily_calories'] ?? data_get($profile, 'targets.daily_goal_calories', 1800)));
        $calories = (int) round($dailyCalories * $ratio);

        if ($slotCount > 1) {
            $slotRatios = $slotCount === 2
                ? [0.68, 0.32]
                : [0.55, 0.25, 0.20];
            $slotShare = (float) ($slotRatios[$slotIndex] ?? (1 / max(1, $slotCount)));
            $calories = (int) round($calories * $slotShare);
        }

        return max($mealType === 'snack' ? 90 : 120, $calories);
    }

    private function mealRatiosForDay(array $profile, array $behavior): array
    {
        $ratios = [];

        if ($behavior['include_breakfast'] ?? $profile['diet_key'] !== 'intermittent fasting') {
            $ratios['breakfast'] = $profile['diet_key'] === 'intermittent fasting' ? 0.14 : 0.24;
        }

        $ratios['lunch'] = $profile['diet_key'] === 'intermittent fasting' ? 0.37 : 0.33;
        $ratios['dinner'] = $profile['diet_key'] === 'intermittent fasting' ? 0.31 : 0.28;

        if ($behavior['include_snack'] ?? false) {
            $ratios['snack'] = $profile['goal_bucket'] === 'gain' ? 0.12 : 0.09;
        }

        if ($behavior['include_drink'] ?? false) {
            $ratios['drink'] = $profile['goal_bucket'] === 'gain' ? 0.09 : 0.06;
        }

        $total = array_sum($ratios);
        if ($total <= 0) {
            return ['breakfast' => 0.24, 'lunch' => 0.33, 'dinner' => 0.28, 'snack' => 0.09, 'drink' => 0.06];
        }

        foreach ($ratios as $mealType => $ratio) {
            $ratios[$mealType] = $ratio / $total;
        }

        return $ratios;
    }

    /**
     * @return array<int, array<string, array<int, \App\Models\NutritionPlanItem>>>
     */
    private function ensureHistoricalFollowPlan(User $user, array $profile): array
    {
        $templateStart = $profile['meal_start'] instanceof CarbonImmutable
            ? $profile['meal_start']
            : $this->activityStartFloor;
        $templateEnd = $profile['meal_end'] instanceof CarbonImmutable
            ? $profile['meal_end']
            : $this->activityEndCeiling;

        $plan = NutritionPlan::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => 'Historical Meal Follow Plan (Seeder)',
            ],
            [
                'start_date' => $templateStart->toDateString(),
                'duration_days' => 7,
                'goal' => $user->dietary_goal ?? 'Historical consistency baseline',
                'is_active' => false,
                'targets_json' => null,
                'meta' => [
                    'seeded' => true,
                    'seed_source' => 'history_backfill',
                    'seed_window' => [
                        'from' => $templateStart->toDateString(),
                        'to' => $templateEnd->toDateString(),
                    ],
                ],
            ]
        );

        NutritionPlanDay::query()
            ->where('nutrition_plan_id', $plan->id)
            ->whereNotIn('day_index', range(1, 7))
            ->delete();

        $itemsByDayAndMeal = [];
        $mealTypes = ['breakfast', 'lunch', 'snack', 'dinner', 'drink'];

        foreach (range(1, 7) as $dayIndex) {
            $planDay = NutritionPlanDay::query()->firstOrCreate(
                [
                    'nutrition_plan_id' => $plan->id,
                    'day_index' => $dayIndex,
                ],
                [
                    'date' => $templateStart->addDays($dayIndex - 1)->toDateString(),
                    'notes' => 'Seeded append-only template day for historical follow-plan logging.',
                ]
            );

            foreach ($mealTypes as $order => $mealType) {
                $planMeal = NutritionPlanMeal::query()->firstOrCreate(
                    [
                        'nutrition_plan_day_id' => $planDay->id,
                        'meal_type' => $mealType,
                        'order' => $order + 1,
                    ],
                    [
                        'notes' => 'Seeded template meal for '.$mealType.'.',
                    ]
                );

                $desiredItems = $mealType === 'drink' ? 1 : 2;
                $selectedFoods = $this->plannedFoodsForMeal($profile, $mealType, $dayIndex, $desiredItems);
                $desiredFoodIds = array_values(array_map(fn (Food $food) => (int) $food->id, $selectedFoods));

                NutritionPlanItem::query()
                    ->where('nutrition_plan_meal_id', $planMeal->id)
                    ->where(function ($query) use ($desiredFoodIds, $desiredItems): void {
                        if ($desiredFoodIds === []) {
                            $query->where('sort_order', '>', 0);

                            return;
                        }

                        $query->whereNotIn('food_id', $desiredFoodIds)
                            ->orWhere('sort_order', '>', $desiredItems);
                    })
                    ->delete();

                foreach (array_values($selectedFoods) as $sortIndex => $food) {
                    $item = NutritionPlanItem::query()->updateOrCreate(
                        [
                            'nutrition_plan_meal_id' => $planMeal->id,
                            'sort_order' => $sortIndex + 1,
                        ],
                        [
                            'food_id' => $food->id,
                            'servings' => 1.0,
                            'grams' => null,
                            'notes' => 'Append-only seeded template item for follow-plan history.',
                        ]
                    );

                    if (! $item->relationLoaded('food')) {
                        $item->setRelation('food', $food);
                    }

                    $itemsByDayAndMeal[$dayIndex][$mealType][] = $item;
                }
            }
        }

        return $itemsByDayAndMeal;
    }

    /**
     * @return array<int, \App\Models\Food>
     */
    private function plannedFoodsForMeal(array $profile, string $mealType, int $dayIndex, int $count): array
    {
        $preferredNames = $this->mealPoolNames($profile['diet_key'], $mealType);

        $foods = collect($preferredNames)
            ->map(fn (string $name) => $this->foodsByName->get($this->normalizeKey($name)))
            ->filter(fn ($food) => $food instanceof Food)
            ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
            ->filter(fn (Food $food) => $this->foodLooksRightForMealType($food, $mealType))
            ->values();

        if ($foods->isEmpty()) {
            $foods = $this->foodsByName
                ->values()
                ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
                ->filter(fn (Food $food) => $this->foodLooksRightForMealType($food, $mealType))
                ->values();
        }

        if ($foods->isEmpty()) {
            $foods = $this->foodsByName
                ->values()
                ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
                ->filter(fn (Food $food) => $this->foodLooksRightForMealType($food, $mealType))
                ->values();
        }

        if ($foods->isEmpty()) {
            return [];
        }

        $selected = [];
        $pool = $foods;
        for ($slotIndex = 0; $slotIndex < $count && $pool->isNotEmpty(); $slotIndex++) {
            $signature = abs(crc32($profile['diet_key'].'|'.$mealType.'|'.$dayIndex.'|plan|'.$slotIndex));
            $pickIndex = $signature % $pool->count();
            $picked = $pool->get($pickIndex);
            if (! $picked instanceof Food) {
                continue;
            }

            $selected[] = $picked;
            $pool = $pool->reject(fn (Food $food) => $food->id === $picked->id)->values();
        }

        return $selected;
    }

    private function resolveLoggingModeForMeal(
        string $preferredMode,
        string $mealType,
        CarbonImmutable $date,
        array $plannedItemsByDayAndMeal,
        array $usedPlanItemIds,
    ): string {
        if ($preferredMode !== 'follow_plan') {
            return 'freestyle';
        }

        $dayIndex = $this->planDayIndexForDate($date);
        $candidates = collect($plannedItemsByDayAndMeal[$dayIndex][$mealType] ?? [])
            ->filter(fn ($item) => $item instanceof NutritionPlanItem)
            ->reject(fn (NutritionPlanItem $item) => in_array((int) $item->id, $usedPlanItemIds, true));

        return $candidates->isNotEmpty() ? 'follow_plan' : 'freestyle';
    }

    private function pickFollowPlanItem(
        CarbonImmutable $date,
        string $mealType,
        int $slotIndex,
        array $plannedItemsByDayAndMeal,
        array $usedPlanItemIds,
    ): ?NutritionPlanItem {
        $dayIndex = $this->planDayIndexForDate($date);
        $candidates = collect($plannedItemsByDayAndMeal[$dayIndex][$mealType] ?? [])
            ->filter(fn ($item) => $item instanceof NutritionPlanItem)
            ->reject(fn (NutritionPlanItem $item) => in_array((int) $item->id, $usedPlanItemIds, true))
            ->values();

        if ($candidates->isEmpty()) {
            return null;
        }

        $pickIndex = abs(crc32($date->toDateString().'|'.$mealType.'|'.$slotIndex.'|follow')) % $candidates->count();

        /** @var NutritionPlanItem|null $picked */
        $picked = $candidates->get($pickIndex);

        return $picked;
    }

    private function planDayIndexForDate(CarbonImmutable $date): int
    {
        $daysSinceStart = (int) $this->activityStartFloor->diffInDays($date, false);
        $normalized = (($daysSinceStart % 7) + 7) % 7;

        return $normalized + 1;
    }

    private function pickFoodForUser(
        array $profile,
        string $mealType,
        CarbonImmutable $date,
        int $slotIndex = 0,
        array $excludedFoodIds = [],
        array $behavior = [],
        int $slotCount = 1,
    ): ?Food {
        $targetCalories = $this->mealCalorieTarget($profile, $mealType, $behavior, $slotIndex, $slotCount);
        $foodNames = $this->mealPoolNames($profile['diet_key'], $mealType);
        $foods = collect($foodNames)
            ->map(fn (string $name) => $this->foodsByName->get($this->normalizeKey($name)))
            ->filter(fn ($food) => $food instanceof Food)
            ->reject(fn (Food $food) => in_array($food->id, $excludedFoodIds, true))
            ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
            ->filter(fn (Food $food) => $this->foodLooksRightForMealType($food, $mealType))
            ->values();

        if ($foods->isEmpty()) {
            $foods = $this->foodsByName
                ->values()
                ->reject(fn (Food $food) => in_array($food->id, $excludedFoodIds, true))
                ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
                ->filter(fn (Food $food) => $this->foodLooksRightForMealType($food, $mealType))
                ->values();
        }

        if ($foods->isEmpty()) {
            return null;
        }

        $foods = $foods
            ->sortBy(fn (Food $food) => $this->foodSelectionScore($food, $profile, $mealType, $targetCalories, $behavior))
            ->values();
        if (($behavior['strict_best_match'] ?? false) === true) {
            return $foods->first();
        }

        $window = min(4, $foods->count());
        $index = abs(crc32($profile['diet_key'].'|'.$mealType.'|'.$date->toDateString().'|'.$slotIndex)) % $window;

        return $foods->get($index);
    }

    private function mealPoolNames(string $dietKey, string $mealType): array
    {
        $pools = [
            'general' => [
                'breakfast' => [
                    'Three-Egg Cheese Avocado Plate',
                    'Turkey Egg Avocado Toast',
                    'Strawberry Mango Protein Yogurt Bowl',
                    'Protein Oatmeal Bowl',
                    'Greek Yogurt Fruit Bowl',
                    'Brown Yogurt Flatbread Kashkaval',
                ],
                'lunch' => [
                    'Charcoal Chicken Fattoush Plate',
                    'Lean Beef Rice Laban Plate',
                    'Kafta Tabbouleh Hummus Plate',
                    'Chicken Creme Fraiche Pasta Plate',
                    'Chicken Liver Warak Enab Salad Plate',
                    'Turkey Gouda Brown Toast Sandwich',
                    'Chicken Rice Spinach Plate',
                    'Herb Chicken Quinoa Plate',
                    'Salmon Sushi Combo',
                    'Lentil Quinoa Power Bowl',
                    'Halloumi Bulgur Salad',
                ],
                'dinner' => [
                    'Tuna Dill Pickle Bowl',
                    'Labneh Lean Beef Plate',
                    'Air Fryer Salmon Potato Plate',
                    'Chicken Brown Pasta Cream Plate',
                    'Chicken Caesar Salad Bowl',
                    'Herb Salmon Carrot Plate',
                    'Baked Salmon Potato Tray',
                    'Lemon Chicken Veg Plate',
                    'Lentil Stuffed Pepper Plate',
                    'Tofu Vegetable Stir Fry',
                ],
                'snack' => [
                    'Banana Bread Slice',
                    'Rice Pop Peanut Butter Honey Snack',
                    'Protein Pudding Cup',
                    'Smoked Turkey Roll-Ups',
                    'Greek Yogurt Fruit Bowl',
                    'Low-Fat Labneh Dip',
                ],
                'drink' => [
                    'Chocolate Protein Shake',
                    'Chocolate Milk (Bottle)',
                    'Taanayel Les Fermes Fresh Full-Fat Milk',
                ],
            ],
            'mediterranean' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Turkey Egg Avocado Toast', 'Strawberry Mango Protein Yogurt Bowl', 'Protein Oatmeal Bowl'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lean Beef Rice Laban Plate', 'Kafta Tabbouleh Hummus Plate', 'Chicken Liver Warak Enab Salad Plate', 'Chicken Rice Spinach Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Air Fryer Salmon Potato Plate', 'Herb Salmon Carrot Plate', 'Lemon Chicken Veg Plate'],
                'snack' => ['Protein Pudding Cup', 'Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'dash' => [
                'breakfast' => ['Protein Oatmeal Bowl', 'Strawberry Mango Protein Yogurt Bowl', 'Chia Berry Breakfast Jar', 'Rice Flakes Berry Bowl'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Chicken Rice Spinach Plate', 'Lentil Quinoa Power Bowl'],
                'dinner' => ['Baked Salmon Potato Tray', 'Herb Salmon Carrot Plate', 'Lemon Chicken Veg Plate', 'Lentil Stuffed Pepper Plate'],
                'snack' => ['Protein Pudding Cup', 'Greek Yogurt Fruit Bowl'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'high-protein' => [
                'breakfast' => ['Protein Oatmeal Bowl', 'Strawberry Mango Protein Yogurt Bowl', 'Three-Egg Cheese Avocado Plate', 'Turkey Egg Avocado Toast'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Turkey Gouda Brown Toast Sandwich', 'Chicken Mozzarella Pasta Bake', 'Chicken Liver Warak Enab Salad Plate', 'Lentil Quinoa Power Bowl'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Chicken Brown Pasta Cream Plate', 'Chicken Caesar Salad Bowl', 'Air Fryer Salmon Potato Plate', 'Kafta Hummus Pepper Plate', 'Lentil Stuffed Pepper Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Protein Pudding Cup', 'Edamame Snack Bowl', 'Low-Fat Labneh Dip', 'Banana Bread Slice'],
                'drink' => ['Chocolate Protein Shake', 'Chocolate Milk (Bottle)', 'Taanayel Les Fermes Fresh Full-Fat Milk'],
            ],
            'keto' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Avocado Egg Plate', 'Turkey Egg Avocado Toast'],
                'lunch' => ['Beef Zucchini Skillet', 'Labneh Lean Beef Plate', 'Kafta Hummus Pepper Plate', 'Salmon Broccoli Butter Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Beef Meatballs Zucchini Plate', 'Salmon Broccoli Butter Plate', 'Labneh Lean Beef Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip', 'Protein Pudding Cup'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'low-carb' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Avocado Egg Plate', 'Turkey Egg Avocado Toast'],
                'lunch' => ['Beef Zucchini Skillet', 'Kafta Hummus Pepper Plate', 'Charcoal Chicken Fattoush Plate', 'Chicken Thigh Air Fryer Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Labneh Lean Beef Plate', 'Salmon Broccoli Butter Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip', 'Protein Pudding Cup'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'paleo' => [
                'breakfast' => ['Avocado Egg Plate', 'Turkey Sweet Potato Hash', 'Sweet Potato Turkey Hash'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lemon Chicken Root Veg Plate', 'Beef Zucchini Skillet', 'Chicken Thigh Air Fryer Plate'],
                'dinner' => ['Herb Salmon Carrot Plate', 'Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups'],
                'drink' => [],
            ],
            'whole30' => [
                'breakfast' => ['Avocado Egg Plate', 'Turkey Sweet Potato Hash', 'Sweet Potato Turkey Hash'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lemon Chicken Root Veg Plate', 'Beef Zucchini Skillet'],
                'dinner' => ['Herb Salmon Carrot Plate', 'Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups'],
                'drink' => [],
            ],
            'vegan' => [
                'breakfast' => ['Chickpea Tomato Breakfast Bowl', 'Rice Flakes Berry Bowl'],
                'lunch' => ['Lentil Quinoa Power Bowl', 'Lentil Stuffed Pepper Plate'],
                'dinner' => ['Tofu Vegetable Stir Fry', 'Lentil Stuffed Pepper Plate'],
                'snack' => ['Edamame Snack Bowl'],
                'drink' => [],
            ],
            'vegetarian' => [
                'breakfast' => ['Strawberry Mango Protein Yogurt Bowl', 'Protein Oatmeal Bowl', 'Greek Yogurt Fruit Bowl', 'Brown Yogurt Flatbread Kashkaval'],
                'lunch' => ['Halloumi Bulgur Salad', 'Lentil Quinoa Power Bowl', 'Protein Flatbread Cheese Melt'],
                'dinner' => ['Protein Flatbread Cheese Melt', 'Lentil Stuffed Pepper Plate', 'Greek Yogurt Fruit Bowl'],
                'snack' => ['Protein Pudding Cup', 'Greek Yogurt Fruit Bowl', 'Low-Fat Labneh Dip', 'Edamame Snack Bowl'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'low fodmap' => [
                'breakfast' => ['Rice Flakes Berry Bowl', 'Sweet Potato Turkey Hash', 'Protein Oatmeal Bowl'],
                'lunch' => ['Chicken Rice Spinach Plate', 'Beef Zucchini Skillet', 'Herb Salmon Carrot Plate'],
                'dinner' => ['Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Protein Pudding Cup', 'Smoked Turkey Roll-Ups'],
                'drink' => ['Chocolate Protein Shake'],
            ],
            'intermittent fasting' => [
                'breakfast' => ['Protein Oatmeal Bowl', 'Greek Yogurt Fruit Bowl'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Chicken Mozzarella Pasta Bake', 'Salmon Sushi Combo', 'Lentil Quinoa Power Bowl', 'Halloumi Bulgur Salad'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Chicken Brown Pasta Cream Plate', 'Herb Salmon Carrot Plate', 'Chicken Caesar Salad Bowl', 'Lentil Stuffed Pepper Plate', 'Tofu Vegetable Stir Fry'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Protein Pudding Cup', 'Greek Yogurt Fruit Bowl', 'Banana Bread Slice', 'Rice Pop Peanut Butter Honey Snack', 'Chia Berry Breakfast Jar'],
                'drink' => ['Chocolate Protein Shake', 'Chocolate Milk (Bottle)', 'Taanayel Les Fermes Fresh Full-Fat Milk'],
            ],
        ];

        $pool = $pools[$dietKey][$mealType] ?? $pools['general'][$mealType] ?? [];

        return array_values(array_unique($pool));
    }

    private function foodIsAllowedForUser(Food $food, array $profile): bool
    {
        $allergens = collect($food->allergens ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $ingredients = collect($food->ingredients ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $dietsAllowed = collect($food->diets_allowed ?? [])->map(fn ($value) => $this->normalizeDietAlias((string) $value));
        $name = $this->normalizeKey($food->name);

        foreach ($profile['allergies'] as $allergy) {
            if ($allergens->contains($allergy)) {
                return false;
            }

            if ($ingredients->contains(fn ($ingredient) => Str::contains($ingredient, $allergy))) {
                return false;
            }

            if (Str::contains($name, $allergy)) {
                return false;
            }
        }

        $dietKey = $this->normalizeDietAlias((string) ($profile['diet_key'] ?? 'general'));
        if (
            $dietKey !== 'general'
            && $this->requiresStrictDietCompatibility($dietKey)
            && $dietsAllowed->isNotEmpty()
            && ! $dietsAllowed->contains($dietKey)
            && ! $dietsAllowed->contains('general')
        ) {
            return false;
        }

        return true;
    }

    private function foodLooksRightForMealType(Food $food, string $mealType): bool
    {
        $name = $this->normalizeKey($food->name);
        $category = $this->normalizeKey((string) ($food->category ?? ''));

        if ($this->foodLooksQuestionableForSeeder($food)) {
            return false;
        }

        return match ($mealType) {
            'drink' => Str::contains($name, ['shake', 'juice', 'smoothie', 'tea', 'coffee', 'latte', 'milk'])
                || Str::contains($category, ['drink', 'beverage']),
            'snack' => Str::contains($name, ['snack', 'pudding', 'dip', 'roll', 'fruit', 'yogurt', 'labneh', 'shake', 'egg'])
                || Str::contains($category, ['snack', 'fruit']),
            'breakfast' => ! Str::contains($name, ['lasagna', 'vodka pasta', 'fries', 'chips', 'candy', 'soda', 'shake', 'smoothie', 'juice', 'pudding']),
            'lunch', 'dinner' => ! Str::contains($name, ['juice', 'smoothie', 'pudding', 'bar', 'latte', 'dip', 'chips', 'candy']),
            default => true,
        };
    }

    private function foodLooksQuestionableForSeeder(Food $food): bool
    {
        $text = $this->normalizeKey($food->name.' '.(string) ($food->category ?? ''));

        if ($this->foodCatalogAnomalies()->shouldExcludeFromAiCatalog($food)) {
            return true;
        }

        return Str::contains($text, [
            'gandour',
            'rice pops',
            'snickers',
            'kitkat',
            'oreo',
            'pringles',
            'doritos',
            'cheetos',
            'nutella',
            'bonjus',
            'chips',
            'wafer',
            'candy',
            'chocolate bar',
            'cola',
            'soda',
            'ice cream',
            'vodka',
            'beer',
            'wine',
        ]);
    }

    private function foodHasImpossibleBeverageMacros(Food $food): bool
    {
        $name = $this->normalizeKey($food->name);
        $category = $this->normalizeKey((string) ($food->category ?? ''));
        $mealTypesRaw = is_array($food->meal_types)
            ? implode(' ', array_map(fn ($value) => $this->normalizeKey((string) $value), $food->meal_types))
            : $this->normalizeKey((string) ($food->meal_types ?? ''));

        $looksLikeDrink = Str::contains($mealTypesRaw, 'drink')
            || Str::contains($name, [
                'tea',
                'juice',
                'smoothie',
                'cola',
                'lemonade',
                'kombucha',
                'energy drink',
                'drink',
                'milk',
                'ayran',
                'syrup',
                'red bull',
                'gatorade',
                'barbican',
                'arizona',
                'lipton',
                'pepsi',
                '7up',
                'schweppes',
                'malt',
                'water',
            ])
            || Str::contains($category, ['drink', 'beverage']);

        if (! $looksLikeDrink) {
            return false;
        }

        $calories = $food->calories !== null ? (float) $food->calories : null;
        $protein = (float) ($food->protein_g ?? 0);
        $fat = (float) ($food->fat_g ?? 0);

        if ($calories === null && ($protein > 12 || $fat > 8)) {
            return true;
        }

        return $calories !== null
            && $calories <= 40
            && ($protein > 12 || $fat > 8);
    }

    private function foodSelectionScore(
        Food $food,
        array $profile,
        string $mealType,
        int $targetCalories,
        array $behavior,
    ): float {
        $foodCalories = (int) round((float) ($food->calories ?? $targetCalories));
        $foodProtein = (float) ($food->protein_g ?? 0);
        $score = abs($foodCalories - $targetCalories);

        if (($behavior['prefer_lower_protein'] ?? false) === true) {
            $score += $foodProtein * 4.5;
        }

        if (($behavior['prefer_energy_dense'] ?? false) === true && $foodCalories < $targetCalories) {
            $score += (float) ($targetCalories - $foodCalories) * 0.4;
        }

        $targetProteinPerFood = max(14.0, min(34.0, ((float) data_get($profile, 'targets.daily_goal_protein_g', 120)) / 4.5));
        if ($foodProtein > $targetProteinPerFood) {
            $score += ($foodProtein - $targetProteinPerFood) * 2.8;
        }

        if ($mealType === 'snack' && $foodCalories > 420) {
            $score += 220;
        }

        if (in_array($mealType, ['lunch', 'dinner'], true) && ($profile['goal_bucket'] ?? 'maintain') !== 'gain' && $foodCalories > 850) {
            $score += 180;
        }

        return $score;
    }

    /**
     * @return array<string, mixed>
     */
    private function behaviorForMealSlot(
        array $profile,
        array $behavior,
        float $runningProtein,
        string $mealType,
    ): array {
        $targetProtein = max(70.0, (float) data_get($profile, 'targets.daily_goal_protein_g', 120));
        $slotBehavior = $behavior;

        if ($runningProtein >= ($targetProtein * 0.70)) {
            $slotBehavior['prefer_lower_protein'] = true;
        }

        if ($runningProtein >= ($targetProtein * 0.82) && in_array($mealType, ['snack', 'drink', 'dinner'], true)) {
            $slotBehavior['prefer_lower_protein'] = true;
            $slotBehavior['prefer_energy_dense'] = true;
            $slotBehavior['strict_best_match'] = true;
        }

        return $slotBehavior;
    }

    private function servingsForMeal(
        array $profile,
        string $mealType,
        CarbonImmutable $date,
        Food $food,
        array $behavior,
        string $loggingMode,
        int $slotIndex = 0,
        int $slotCount = 1,
    ): float {
        $targetCalories = $this->mealCalorieTarget($profile, $mealType, $behavior, $slotIndex, $slotCount);
        $foodCalories = max(
            $mealType === 'drink' ? 110 : 80,
            (int) round((float) ($food->calories ?? 0))
        );
        $servings = $targetCalories / $foodCalories;

        if ($loggingMode === 'freestyle') {
            $freestyleSignature = (abs(crc32($mealType.'|'.$date->toDateString().'|'.$food->id)) % 9) - 4;
            $servings += $freestyleSignature * 0.03;
        }

        $limits = match ($mealType) {
            'drink' => [0.8, 1.7],
            'snack' => [0.6, 1.6],
            'breakfast' => [0.75, 1.5],
            default => [0.7, 1.6],
        };

        if (($behavior['prefer_energy_dense'] ?? false) === true) {
            $limits[1] += $mealType === 'drink' ? 0.15 : 0.20;
        }

        if ($targetCalories >= 420 && $mealType === 'snack') {
            $limits[1] = max($limits[1], 1.6);
        }

        if ($targetCalories >= 500 && in_array($mealType, ['lunch', 'dinner'], true)) {
            $limits[1] = max($limits[1], 1.75);
        }

        if ($targetCalories >= 650 && in_array($mealType, ['lunch', 'dinner', 'breakfast'], true)) {
            $limits[1] = max($limits[1], 1.9);
        }

        return round(max($limits[0], min($limits[1], $servings)), 2);
    }

    private function requiresStrictDietCompatibility(string $dietKey): bool
    {
        return in_array($dietKey, [
            'vegan',
            'vegetarian',
            'keto',
            'low-carb',
            'paleo',
            'whole30',
            'low fodmap',
            'dash',
        ], true);
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<string, mixed>
     */
    private function validateBuiltMealDay(array $profile, array $entries, array $behavior): array
    {
        $totals = [
            'calories' => 0.0,
            'protein_g' => 0.0,
        ];

        foreach ($entries as $entry) {
            $food = $entry['food'] ?? null;
            if (! $food instanceof Food) {
                continue;
            }

            $servings = (float) ($entry['servings'] ?? 1);
            $totals['calories'] += (float) ($food->calories ?? 0) * $servings;
            $totals['protein_g'] += (float) ($food->protein_g ?? 0) * $servings;
        }

        $targetCalories = max(1200, (int) ($behavior['daily_calories'] ?? data_get($profile, 'targets.daily_goal_calories', 1800)));
        $targetProtein = max(60, (int) data_get($profile, 'targets.daily_goal_protein_g', 110));
        $weightKg = (float) ($profile['weight_kg'] ?? data_get($profile, 'targets.weight_kg', 80) ?? 80);
        $calorieFloor = max(1100, $targetCalories - max(150, (int) round($targetCalories * 0.12)));
        $calorieCeiling = $targetCalories + max(180, (int) round($targetCalories * 0.14));
        $proteinFloor = max(55, min($targetProtein, (int) round(max($targetProtein * 0.72, $weightKg * 0.85))));
        $proteinCeiling = max(
            150,
            (int) round(max($targetProtein * 1.28, $weightKg * 2.45))
        );

        $issues = [];
        if ($totals['calories'] < $calorieFloor) {
            $issues[] = 'too_low_calories';
        }
        if ($totals['calories'] > $calorieCeiling) {
            $issues[] = 'too_high_calories';
        }
        if ($totals['protein_g'] < $proteinFloor) {
            $issues[] = 'too_low_protein';
        }
        if ($totals['protein_g'] > $proteinCeiling) {
            $issues[] = 'too_high_protein';
        }

        return [
            'ok' => $issues === [],
            'issues' => $issues,
            'totals' => [
                'calories' => (int) round($totals['calories']),
                'protein_g' => round($totals['protein_g'], 1),
            ],
            'targets' => [
                'calorie_floor' => $calorieFloor,
                'calorie_ceiling' => $calorieCeiling,
                'protein_floor' => $proteinFloor,
                'protein_ceiling' => $proteinCeiling,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $validation
     * @return array<string, mixed>
     */
    private function tightenMealBehavior(array $profile, array $baseBehavior, int $attempt, array $validation): array
    {
        $issues = is_array($validation['issues'] ?? null) ? $validation['issues'] : [];
        $goalCalories = (int) data_get($profile, 'targets.daily_goal_calories', $baseBehavior['daily_calories'] ?? 1800);
        $goalBucket = (string) ($profile['goal_bucket'] ?? 'maintain');
        $dailyCalories = (int) ($baseBehavior['daily_calories'] ?? $goalCalories);

        if (in_array('too_high_calories', $issues, true)) {
            $dailyCalories = min($dailyCalories, $goalCalories + ($goalBucket === 'gain' ? 80 : 20));
        } elseif (in_array('too_low_calories', $issues, true)) {
            $dailyCalories = max($dailyCalories, $goalCalories - ($goalBucket === 'loss' ? 90 : 25));
        } else {
            $dailyCalories = $goalCalories;
        }

        return [
            ...$baseBehavior,
            'logging_mode' => 'freestyle',
            'daily_calories' => $this->clampDailyCalories(
                $dailyCalories,
                $profile['targets'] ?? [],
                (int) data_get($profile, 'targets.tdee_kcal', $goalCalories)
            ),
            'include_breakfast' => in_array('too_low_calories', $issues, true)
                ? true
                : (bool) ($baseBehavior['include_breakfast'] ?? false),
            'include_drink' => in_array('too_low_calories', $issues, true)
                ? true
                : false,
            'include_snack' => in_array('too_low_calories', $issues, true)
                ? true
                : (($goalBucket === 'gain' && $attempt < 2 && $goalCalories >= 2400)),
            'single_item_meals' => ! in_array('too_low_calories', $issues, true),
            'prefer_lower_protein' => in_array('too_high_protein', $issues, true) || in_array('too_high_calories', $issues, true),
            'prefer_energy_dense' => in_array('too_low_calories', $issues, true),
        ];
    }

    private function foodCatalogAnomalies(): FoodCatalogAnomalyService
    {
        return $this->foodCatalogAnomalies ??= app(FoodCatalogAnomalyService::class);
    }

    private function seedWorkoutHistory(User $user, array $profile): void
    {
        if ($profile['workout_days'] <= 0 || $profile['workout_start']->greaterThan($this->activityEndCeiling)) {
            return;
        }

        $this->ensureWorkoutSessionOnStartDate($user, $profile);

        $weekStart = $profile['workout_start']->startOfWeek();
        while ($weekStart->lessThanOrEqualTo($this->activityEndCeiling)) {
            $desiredSessions = $this->desiredSessionsForWeek($profile);
            $sessionWeekdays = $this->sessionWeekdays($profile['workout_days']);
            $focuses = $this->sessionFocuses($profile['workout_days']);
            $weekEnd = $weekStart->endOfWeek();

            /** @var \Illuminate\Support\Collection<int,string> $existingDates */
            $existingDates = WorkoutLog::query()
                ->where('user_id', $user->id)
                ->whereBetween('performed_at', [$weekStart->startOfDay(), $weekEnd->endOfDay()])
                ->get(['performed_at'])
                ->toBase()
                ->map(fn ($log) => CarbonImmutable::parse($log->performed_at)->toDateString())
                ->unique()
                ->values();

            if ($existingDates->count() >= min($desiredSessions, $profile['workout_days'])) {
                $weekStart = $weekStart->addWeek();

                continue;
            }

            foreach ($sessionWeekdays as $weekdayIndex => $weekday) {
                $sessionDate = $weekStart->addDays($weekday - 1);
                if ($sessionDate->lessThan($profile['workout_start']) || $sessionDate->greaterThan($this->activityEndCeiling)) {
                    continue;
                }

                if ($existingDates->contains($sessionDate->toDateString())) {
                    continue;
                }

                if ($existingDates->count() >= $desiredSessions) {
                    break;
                }

                $focus = $focuses[($weekdayIndex + $existingDates->count()) % count($focuses)];
                if ($this->createWorkoutSessionForDate($user, $profile, $sessionDate, $focus)) {
                    $existingDates->push($sessionDate->toDateString());
                }
            }

            $weekStart = $weekStart->addWeek();
        }

        $this->ensureWorkoutSessionOnEndDate($user, $profile);
    }

    private function ensureWorkoutSessionOnStartDate(User $user, array $profile): void
    {
        $startDate = $profile['workout_start']->startOfDay();
        $focus = $this->sessionFocuses($profile['workout_days'])[0] ?? 'full_body';
        $this->ensureWorkoutSessionOnBoundaryDate($user, $profile, $startDate, $focus);
    }

    private function ensureWorkoutSessionOnEndDate(User $user, array $profile): void
    {
        $endDate = ($profile['meal_end'] ?? $this->activityEndCeiling)->startOfDay();
        $focuses = $this->sessionFocuses($profile['workout_days']);
        $focus = $focuses[count($focuses) - 1] ?? 'full_body';
        $this->ensureWorkoutSessionOnBoundaryDate($user, $profile, $endDate, $focus);
    }

    private function ensureWorkoutSessionOnBoundaryDate(
        User $user,
        array $profile,
        CarbonImmutable $boundaryDate,
        string $fallbackFocus,
    ): void {
        if ($boundaryDate->greaterThan($this->activityEndCeiling)) {
            return;
        }

        $hasBoundaryLog = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('performed_at', [$boundaryDate->startOfDay(), $boundaryDate->endOfDay()])
            ->exists();

        if ($hasBoundaryLog) {
            return;
        }

        $this->createWorkoutSessionForDate($user, $profile, $boundaryDate, $fallbackFocus);
    }

    private function createWorkoutSessionForDate(
        User $user,
        array $profile,
        CarbonImmutable $sessionDate,
        string $focus,
    ): bool {
        $exerciseNames = $this->exerciseNamesForFocus($profile, $focus);
        $exercises = collect($exerciseNames)
            ->map(fn (string $name) => $this->exercisesByName->get($this->normalizeKey($name)))
            ->filter(fn ($exercise) => $exercise instanceof Exercise)
            ->filter(fn (Exercise $exercise) => $this->exerciseIsAllowedForUser($exercise, $profile))
            ->take(4)
            ->values();

        if ($exercises->isEmpty()) {
            return false;
        }

        $log = WorkoutLog::query()->create([
            'user_id' => $user->id,
            'performed_at' => $sessionDate->setTime(18, 0),
            'duration_min' => $this->durationForSession($profile, $focus, $sessionDate),
            'mood' => $this->workoutMood($profile['scenario']),
            'energy' => $this->workoutEnergy($profile['scenario']),
            'notes' => 'synthetic_seeded '.$profile['scenario'].' session focused on '.$focus.'.',
            'meta' => [
                'seeded' => true,
                'source' => 'synthetic_seed',
                'scenario' => $profile['scenario'],
                'focus' => $focus,
                'location' => $user->workout_location ?? 'unknown',
            ],
        ]);

        foreach ($exercises as $exerciseOrder => $exercise) {
            foreach (range(0, 2) as $setOrder) {
                WorkoutLogSet::query()->create([
                    'workout_log_id' => $log->id,
                    'exercise_id' => $exercise->id,
                    'order_index' => $setOrder,
                    'weight_kg' => $this->weightForExercise($profile, $exercise, $setOrder, $exerciseOrder),
                    'reps' => $this->repsForExercise($profile, $exercise, $setOrder),
                    'duration_sec' => $this->durationForExercise($exercise),
                    'is_warmup' => $setOrder === 0 && $exerciseOrder === 0,
                    'notes' => $setOrder === 0 && $exerciseOrder === 0 ? 'synthetic_seeded warm-up set.' : null,
                    'meta' => [
                        'seeded' => true,
                        'source' => 'synthetic_seed',
                        'scenario' => $profile['scenario'],
                    ],
                ]);
            }
        }

        return true;
    }

    private function durationForSession(array $profile, string $focus, CarbonImmutable $date): int
    {
        $base = match ($focus) {
            'conditioning' => 42,
            'full_body' => 48,
            default => 44,
        };

        $scenarioOffset = match ($profile['scenario']) {
            'steady_progress' => 6,
            'plateau' => 2,
            'regression' => -5,
            default => 0,
        };

        $weekendOffset = $date->isWeekend() ? -3 : 0;

        return (int) max(24, min(70, $base + $scenarioOffset + $weekendOffset));
    }

    private function desiredSessionsForWeek(array $profile): int
    {
        $limit = $profile['workout_days'];

        return match ($profile['scenario']) {
            'steady_progress' => max(1, min($limit, $limit - ($limit >= 5 ? 1 : 0))),
            'plateau' => max(1, min($limit, (int) ceil($limit * 0.7))),
            'regression' => max(1, min($limit, (int) floor($limit * 0.5))),
            'rebound' => max(1, min($limit, (int) ceil($limit * 0.75))),
            default => max(1, $limit),
        };
    }

    private function sessionWeekdays(int $count): array
    {
        return match ($count) {
            1 => [3],
            2 => [2, 5],
            3 => [1, 3, 5],
            4 => [1, 2, 4, 6],
            5 => [1, 2, 3, 5, 6],
            6 => [1, 2, 3, 4, 5, 6],
            default => [1, 2, 3, 4, 5, 6, 7],
        };
    }

    private function sessionFocuses(int $workoutDays): array
    {
        return match (true) {
            $workoutDays <= 1 => ['full_body'],
            $workoutDays === 2 => ['upper', 'lower'],
            $workoutDays === 3 => ['push', 'pull', 'legs'],
            $workoutDays === 4 => ['upper', 'lower', 'full_body', 'conditioning'],
            default => ['push', 'pull', 'legs', 'upper', 'conditioning', 'lower', 'full_body'],
        };
    }

    private function exerciseNamesForFocus(array $profile, string $focus): array
    {
        $issueText = strtolower(implode(' ', array_map(
            fn (array $issue): string => (string) ($issue['label'] ?? ''),
            $profile['issues'] ?? []
        )));
        $age = (int) ($profile['targets']['age'] ?? 30);
        $needsJointFriendly = $age >= 50 || Str::contains($issueText, ['knee', 'ankle', 'lower back', 'postpartum']);

        $home = [
            'push' => ['Incline Push Up', 'Dumbbell Floor Press', 'Standing Resistance Band Chest Fly', 'Seated Dumbbell Lateral Raise', 'Bodyweight Triceps Extension'],
            'pull' => ['Resistance Band Row', 'Band Pull Apart', 'Dumbbell Curl', 'Dumbbell Hammer Curl', 'Concentration Curl'],
            'legs' => ['Goblet Squat', 'Chair Squat', 'Bodyweight Lunge', 'Dumbbell Romanian Deadlift', 'Bodyweight Leg Curl'],
            'conditioning' => ['Chair Step Ups', 'Shadow Boxing', 'Bodyweight Squat', 'Incline Push Up', 'Plank'],
            'upper' => ['Incline Push Up', 'Dumbbell Floor Press', 'Resistance Band Row', 'Dumbbell Hammer Curl', 'Seated Dumbbell Lateral Raise'],
            'lower' => ['Goblet Squat', 'Dumbbell Romanian Deadlift', 'Bodyweight Lunge', 'Bodyweight Leg Curl', 'Chair Step Ups'],
            'full_body' => ['Dumbbell Floor Press', 'Resistance Band Row', 'Goblet Squat', 'Dumbbell Romanian Deadlift', 'Plank'],
        ];

        $gym = [
            'push' => ['Machine Chest Press', 'Cable Chest Press', 'Dumbbell Chest Fly', 'Cable Pushdown With Rope', 'Seated Dumbbell Lateral Raise'],
            'pull' => ['Seated Cable Row', 'Lat Pulldown', 'Cable Face Pull (Rope)', 'Machine Bicep Curl', 'Cable Hammer Curl With Rope'],
            'legs' => ['Leg Press', 'Box Squat', 'Lying Leg Curl', 'Leg Extension', 'Leg Press Calf Raise'],
            'conditioning' => ['Chair Step Ups', 'Bodyweight Squat', 'Seated Cable Row', 'Cable Chest Press', 'Plank'],
            'upper' => ['Machine Chest Press', 'Seated Cable Row', 'Lat Pulldown', 'Cable Pushdown With Rope', 'Machine Bicep Curl'],
            'lower' => ['Leg Press', 'Box Squat', 'Lying Leg Curl', 'Leg Extension', 'Dumbbell Step Up'],
            'full_body' => ['Machine Chest Press', 'Seated Cable Row', 'Leg Press', 'Dumbbell Romanian Deadlift', 'Cable Pushdown With Rope'],
        ];

        if ($needsJointFriendly) {
            $home['legs'] = ['Chair Squat', 'Bodyweight Squat', 'Goblet Squat', 'Bodyweight Leg Curl', 'Chair Step Ups'];
            $home['lower'] = ['Chair Squat', 'Bodyweight Squat', 'Goblet Squat', 'Bodyweight Leg Curl', 'Chair Step Ups'];
            $home['conditioning'] = ['Chair Step Ups', 'Shadow Boxing', 'Bodyweight Squat', 'Band Pull Apart', 'Plank'];

            $gym['legs'] = ['Leg Press', 'Box Squat', 'Lying Leg Curl', 'Leg Extension', 'Leg Press Calf Raise'];
            $gym['lower'] = ['Leg Press', 'Box Squat', 'Lying Leg Curl', 'Leg Extension', 'Leg Press Calf Raise'];
            $gym['conditioning'] = ['Chair Step Ups', 'Bodyweight Squat', 'Machine Chest Press', 'Seated Cable Row', 'Plank'];
        }

        return match ($profile['workout_location']) {
            'gym' => $gym[$focus] ?? [],
            'both' => array_values(array_unique(array_merge($gym[$focus] ?? [], $home[$focus] ?? []))),
            default => $home[$focus] ?? [],
        };
    }

    private function exerciseIsAllowedForUser(Exercise $exercise, array $profile): bool
    {
        $conditions = collect($exercise->conditions ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $stress = collect($exercise->joint_stress ?? [])->mapWithKeys(fn ($value, $key) => [$this->normalizeKey((string) $key) => $this->normalizeKey((string) $value)]);
        $issues = collect($profile['issues'])->map(fn ($issue) => $this->normalizeKey($issue['label']))->all();

        foreach ($issues as $issue) {
            if (Str::contains($issue, 'shoulder') && ($conditions->contains('shoulder impingement caution') || $stress->get('shoulders') === 'high')) {
                return false;
            }

            if (Str::contains($issue, ['ankle', 'knee']) && ($conditions->contains('knee pain caution') || in_array($stress->get('ankles'), ['high', 'medium'], true) || in_array($stress->get('knees'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, 'wrist') && ($conditions->contains('wrist pain caution') || in_array($stress->get('wrists'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, ['lower back', 'postpartum']) && ($conditions->contains('lower back caution') || in_array($stress->get('lower back'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, ['asthma', 'high blood pressure', 'hypertension', 'migraine', 'sleep apnea']) && Str::contains($this->normalizeKey($exercise->name), ['jump', 'high knees', 'burpee'])) {
                return false;
            }
        }

        return true;
    }

    private function workoutMood(string $scenario): string
    {
        return match ($scenario) {
            'steady_progress' => 'focused',
            'plateau' => 'steady',
            'regression' => 'tired',
            default => 'motivated',
        };
    }

    private function workoutEnergy(string $scenario): string
    {
        return match ($scenario) {
            'steady_progress' => 'high',
            'plateau' => 'moderate',
            'regression' => 'low',
            default => 'moderate-high',
        };
    }

    private function weightForExercise(array $profile, Exercise $exercise, int $setOrder, int $exerciseOrder): ?float
    {
        $name = $this->normalizeKey($exercise->name);
        $age = (int) ($profile['targets']['age'] ?? 30);
        $activity = (string) ($profile['activity_key'] ?? '');
        $issueText = strtolower(implode(' ', array_map(
            fn (array $issue): string => (string) ($issue['label'] ?? ''),
            $profile['issues'] ?? []
        )));

        if (Str::contains($name, [
            'push-up',
            'stretch',
            'boxing',
            'jack',
            'high knees',
            'chair step-ups',
            'chair step ups',
            'chair squat',
            'air squat',
            'bodyweight',
            'band pull-apart',
            'band pull apart',
            'band external shoulder rotation',
            'child s pose',
            'child\'s pose',
            'towel calf stretch',
            'plank',
        ])) {
            return null;
        }

        $base = match (true) {
            Str::contains($name, ['leg press', 'belt squat', 'box squat', 'goblet squat', 'dumbbell squat']) => $profile['weight_kg'] * 0.28,
            Str::contains($name, ['romanian deadlift']) => $profile['weight_kg'] * 0.20,
            Str::contains($name, ['bench', 'chest press', 'floor press']) => $profile['weight_kg'] * 0.16,
            Str::contains($name, ['row', 'pulldown', 'face pull']) => $profile['weight_kg'] * 0.18,
            Str::contains($name, ['chest fly']) => $profile['weight_kg'] * 0.08,
            Str::contains($name, ['curl']) => $profile['weight_kg'] * 0.07,
            Str::contains($name, ['pushdown', 'kickback', 'triceps extension', 'triceps pushdown']) => $profile['weight_kg'] * 0.09,
            Str::contains($name, ['leg curl', 'leg extension', 'calf']) => $profile['weight_kg'] * 0.14,
            Str::contains($name, ['lateral raise']) => $profile['weight_kg'] * 0.05,
            Str::contains($name, ['step up']) => $profile['weight_kg'] * 0.10,
            default => $profile['weight_kg'] * 0.11,
        };

        $experienceMultiplier = match (true) {
            str_contains($activity, 'athlete') => 1.12,
            str_contains($activity, 'very') => 1.05,
            str_contains($activity, 'sedentary') => 0.82,
            default => 0.95,
        };
        $scenarioMultiplier = match ($profile['scenario']) {
            'steady_progress' => 1.0,
            'plateau' => 1.0,
            'regression' => 0.84,
            default => 0.9,
        };
        $ageMultiplier = match (true) {
            $age >= 55 => 0.72,
            $age >= 45 => 0.82,
            default => 1.0,
        };
        $issueMultiplier = $issueText !== '' ? 0.84 : 1.0;
        $maxWeight = match (true) {
            Str::contains($name, ['leg press']) => 90,
            Str::contains($name, ['belt squat', 'box squat', 'goblet squat', 'dumbbell squat']) => 50,
            Str::contains($name, ['romanian deadlift']) => 45,
            Str::contains($name, ['bench', 'chest press', 'floor press']) => 40,
            Str::contains($name, ['row', 'pulldown', 'face pull']) => 45,
            Str::contains($name, ['chest fly']) => 16,
            Str::contains($name, ['curl']) => 16,
            Str::contains($name, ['pushdown', 'kickback', 'triceps extension', 'triceps pushdown']) => 22,
            Str::contains($name, ['leg curl', 'leg extension', 'calf']) => 30,
            Str::contains($name, ['lateral raise']) => 10,
            Str::contains($name, ['step up']) => 20,
            default => 24,
        };
        if ($age >= 50 || $issueText !== '') {
            $maxWeight = (int) round($maxWeight * 0.8);
        }

        $weight = ($base * $experienceMultiplier * $scenarioMultiplier * $ageMultiplier * $issueMultiplier)
            + ($exerciseOrder * 0.8)
            + ($setOrder * 0.4);

        return round(max(4, min($maxWeight, $weight)), 1);
    }

    private function repsForExercise(array $profile, Exercise $exercise, int $setOrder): int
    {
        $name = $this->normalizeKey($exercise->name);

        if (Str::contains($name, ['stretch'])) {
            return 1;
        }

        if (Str::contains($name, ['boxing'])) {
            return 45 + ($setOrder * 15);
        }

        if (Str::contains($name, ['plank'])) {
            return 1;
        }

        $base = match ($profile['scenario']) {
            'steady_progress' => 10,
            'plateau' => 11,
            'regression' => 8,
            default => 9,
        };

        if (Str::contains($name, ['push-up', 'squat', 'lunge', 'step up'])) {
            $base += 2;
        }

        return $base + $setOrder;
    }

    private function durationForExercise(Exercise $exercise): ?int
    {
        $name = $this->normalizeKey($exercise->name);

        return match (true) {
            Str::contains($name, ['stretch']) => 30,
            Str::contains($name, ['boxing']) => 60,
            Str::contains($name, ['plank']) => 40,
            default => null,
        };
    }

    private function seedMeasurementHistory(User $user, array $profile): void
    {
        if ($profile['measurement_start']->greaterThan($profile['measurement_end'])) {
            return;
        }

        $dates = $this->measurementDates($profile['measurement_start'], $profile['measurement_end']);
        $existingByDate = Measurement::query()
            ->where('user_id', $user->id)
            ->whereBetween('measured_at', [$profile['measurement_start']->toDateString(), $profile['measurement_end']->toDateString()])
            ->orderBy('measured_at')
            ->get()
            ->keyBy(fn (Measurement $measurement) => CarbonImmutable::parse($measurement->measured_at)->toDateString());

        $targetWeight = $existingByDate->last()?->weight_kg !== null
            ? (float) $existingByDate->last()->weight_kg
            : $profile['weight_kg'];
        $measurementSpanDays = max(0, $profile['measurement_start']->diffInDays($profile['measurement_end']));
        $startWeight = $this->startingWeightForScenario($targetWeight, $profile, count($dates), $measurementSpanDays);
        $tracksHeight = $this->shouldTrackHeight($user);
        $heightAnchor = $profile['height_cm'] ?? $this->inferredHeightForUser($user);
        $latestWeight = $targetWeight;

        foreach ($dates as $index => $date) {
            $dateKey = $date->toDateString();
            $expectedWeight = $this->weightForMeasurement($startWeight, $targetWeight, $profile, $index, count($dates));
            $expectedHeight = $tracksHeight ? $this->heightForDate($heightAnchor, $user, $date, $profile['measurement_start']) : null;

            if ($existingByDate->has($dateKey)) {
                /** @var Measurement $existing */
                $existing = $existingByDate->get($dateKey);

                if ($existing->weight_kg !== null) {
                    $latestWeight = (float) $existing->weight_kg;
                }

                if ($tracksHeight && $expectedHeight !== null && $existing->height_cm === null) {
                    $existing->forceFill([
                        'height_cm' => $expectedHeight,
                        'notes' => trim(((string) $existing->notes).' Height snapshot added by append-only history seeder.'),
                    ])->save();
                }

                continue;
            }

            $measurement = Measurement::query()->create([
                'user_id' => $user->id,
                'measured_at' => $dateKey,
                'weight_kg' => $expectedWeight,
                'height_cm' => $expectedHeight,
                'notes' => sprintf(
                    'synthetic_seeded %d-%d day check-in for %s.',
                    $this->measurementMinGapDays,
                    $this->measurementMaxGapDays,
                    $profile['scenario']
                ),
            ]);

            $latestWeight = (float) $measurement->weight_kg;
        }

        if ($user->weight_kg === null || abs((float) $user->weight_kg - $latestWeight) > 0.01) {
            $user->forceFill(['weight_kg' => round($latestWeight, 2)])->save();
        }

        if ($user->height_cm === null && $heightAnchor !== null) {
            $user->forceFill(['height_cm' => $heightAnchor])->save();
        }
    }

    private function seedWaterHistory(User $user, array $profile): void
    {
        $start = $profile['meal_start'] instanceof CarbonImmutable
            ? $profile['meal_start']->startOfDay()
            : $this->activityStartFloor;
        $end = $profile['meal_end'] instanceof CarbonImmutable
            ? $profile['meal_end']->startOfDay()
            : $this->activityEndCeiling;

        if ($start->greaterThan($end)) {
            return;
        }

        DB::table('water_intakes')
            ->where('user_id', $user->id)
            ->whereBetween('for_day', [$start->toDateString(), $end->toDateString()])
            ->delete();

        $targetWaterMl = max(
            1400,
            (int) round(((int) data_get($profile, 'targets.water_ml', 2200)) / 50) * 50
        );

        $rows = [];
        $date = $start;
        while ($date->lessThanOrEqualTo($end)) {
            $pattern = abs(crc32($user->id.'|'.$date->toDateString().'|water')) % 100;
            $scenarioMultiplier = match ($profile['scenario'] ?? 'plateau') {
                'steady_progress' => $date->isWeekend() ? 0.92 : 0.98,
                'plateau' => $date->isWeekend() ? 0.82 : 0.88,
                'regression' => $date->isWeekend() ? 0.60 : 0.72,
                'rebound' => $date->month === 12 ? 0.70 : ($date->isWeekend() ? 0.86 : 0.94),
                default => $date->isWeekend() ? 0.84 : 0.90,
            };
            $patternOffset = match (true) {
                $pattern < 12 => -450,
                $pattern < 35 => -250,
                $pattern < 72 => 0,
                $pattern < 90 => 150,
                default => 250,
            };
            $activityBonus = $this->waterActivityBonus($profile, $date);
            $ml = (int) round(($targetWaterMl * $scenarioMultiplier) + $patternOffset + $activityBonus);
            $ml = max(1000, min(4600, (int) round($ml / 50) * 50));

            $rows[] = [
                'user_id' => $user->id,
                'for_day' => $date->toDateString(),
                'ml' => $ml,
                'drank_at' => $date->setTime(20, 30)->toDateTimeString(),
                'created_at' => $date->setTime(20, 35)->toDateTimeString(),
                'updated_at' => $date->setTime(20, 35)->toDateTimeString(),
            ];

            if (count($rows) >= 250) {
                DB::table('water_intakes')->insert($rows);
                $rows = [];
            }

            $date = $date->addDay();
        }

        if ($rows !== []) {
            DB::table('water_intakes')->insert($rows);
        }
    }

    private function waterActivityBonus(array $profile, CarbonImmutable $date): int
    {
        $bonus = 0;
        $activityKey = (string) ($profile['activity_key'] ?? '');

        if (str_contains($activityKey, 'very') || str_contains($activityKey, 'athlete')) {
            $bonus += 250;
        } elseif (str_contains($activityKey, 'sedentary')) {
            $bonus -= 100;
        }

        if ((int) ($profile['workout_days'] ?? 0) >= 4 && in_array($date->dayOfWeekIso, $this->sessionWeekdays((int) $profile['workout_days']), true)) {
            $bonus += 250;
        }

        return $bonus;
    }

    private function measurementDates(CarbonImmutable $start, ?CarbonImmutable $end = null): array
    {
        $end ??= $this->measurementEndCeiling ?? $this->today;

        if ($start->greaterThan($end)) {
            return [];
        }

        $dates = [];
        $cursor = $start;
        $preferLongStep = true;

        while ($cursor->lessThan($end)) {
            $dates[] = $cursor;
            $remainingDays = $cursor->diffInDays($end);
            $candidateSteps = $this->candidateMeasurementSteps($preferLongStep);
            $selectedStep = null;

            foreach ($candidateSteps as $step) {
                $afterStep = $remainingDays - $step;
                if ($afterStep < 0) {
                    continue;
                }

                if ($afterStep === 0 || $this->canReachWithMeasurementSpacing($afterStep)) {
                    $selectedStep = $step;
                    break;
                }
            }

            if ($selectedStep === null) {
                $dates[] = $end;
                break;
            }

            $cursor = $cursor->addDays($selectedStep);
            $preferLongStep = ! $preferLongStep;
        }

        if (! collect($dates)->contains(fn (CarbonImmutable $date) => $date->isSameDay($end))) {
            $dates[] = $end;
        }

        return $dates;
    }

    private function candidateMeasurementSteps(bool $preferLongStep): array
    {
        $steps = range($this->measurementMinGapDays, $this->measurementMaxGapDays);

        return $preferLongStep ? array_reverse($steps) : $steps;
    }

    private function canReachWithMeasurementSpacing(int $days): bool
    {
        if ($days === 0) {
            return true;
        }

        if ($days < $this->measurementMinGapDays) {
            return false;
        }

        $reachable = array_fill(0, $days + 1, false);
        $reachable[0] = true;

        for ($distance = 0; $distance <= $days; $distance++) {
            if (! $reachable[$distance]) {
                continue;
            }

            for ($step = $this->measurementMinGapDays; $step <= $this->measurementMaxGapDays; $step++) {
                $next = $distance + $step;
                if ($next <= $days) {
                    $reachable[$next] = true;
                }
            }
        }

        return $reachable[$days] ?? false;
    }

    private function resolveMeasurementBoundary(mixed $value, CarbonImmutable $fallback): CarbonImmutable
    {
        $raw = is_string($value) ? trim($value) : '';
        if ($raw === '') {
            return $fallback;
        }

        return CarbonImmutable::parse($raw, config('app.timezone', 'UTC'))->startOfDay();
    }

    private function startingWeightForScenario(float $targetWeight, array $profile, int $points, int $spanDays): float
    {
        if ($points <= 1 || $spanDays <= 0) {
            return round($targetWeight, 2);
        }

        $spanWeeks = max(0.6, $spanDays / 7);
        $delta = match ($profile['goal_bucket']) {
            'loss' => match ($profile['scenario']) {
                'steady_progress' => 0.38,
                'plateau' => 0.14,
                'regression' => -0.10,
                default => 0.24,
            },
            'gain' => match ($profile['scenario']) {
                'steady_progress' => -0.22,
                'plateau' => -0.08,
                'regression' => 0.10,
                default => -0.14,
            },
            default => match ($profile['scenario']) {
                'steady_progress' => 0.03,
                'plateau' => 0.01,
                'regression' => 0.08,
                default => 0.05,
            },
        };

        return round($targetWeight + ($delta * $spanWeeks), 2);
    }

    private function weightForMeasurement(float $startWeight, float $targetWeight, array $profile, int $index, int $count): float
    {
        $progress = $count <= 1 ? 1.0 : $index / ($count - 1);
        $weight = $startWeight + (($targetWeight - $startWeight) * $progress);
        $midpoint = (int) floor(($count - 1) / 2);

        if ($index > 0 && $index < ($count - 1)) {
            $weight += ((($index * 17) % 5) - 2) * 0.03;
        }

        if ($profile['scenario'] === 'rebound' && $index < ($count - 1)) {
            $weight += 0.15;
        }

        if ($profile['scenario'] === 'regression' && $index > 0 && $index < ($count - 1)) {
            $weight += 0.1;
        }

        if ($profile['scenario'] === 'plateau' && $index >= $midpoint && $index < ($count - 1)) {
            $weight += match ($profile['goal_bucket']) {
                'loss' => 0.05,
                'gain' => -0.04,
                default => 0.02,
            };
        }

        return round($weight, 2);
    }

    private function inferNamePart(User $user, int $index): string
    {
        $fullName = trim((string) ($user->name ?? ''));
        if ($fullName !== '') {
            $parts = preg_split('/\s+/', $fullName) ?: [];
            if (isset($parts[$index]) && trim((string) $parts[$index]) !== '') {
                return trim((string) $parts[$index]);
            }
        }

        $emailLocal = explode('@', (string) $user->email)[0] ?? 'member';
        $emailLocal = preg_replace('/[^A-Za-z0-9]+/', ' ', $emailLocal) ?? 'member';
        $parts = array_values(array_filter(array_map('trim', explode(' ', $emailLocal))));

        if (isset($parts[$index]) && $parts[$index] !== '') {
            return Str::title($parts[$index]);
        }

        return $index === 0 ? 'Member' : 'Hayetak';
    }

    private function goalDefaultsForUser(User $user): array
    {
        if ($user->role === User::ROLE_TRAINER) {
            return [
                'dietary_goal' => 'Balanced Nutrition',
                'fitness_goal' => 'Build Muscle',
                'diet_name' => 'High-Protein',
            ];
        }

        if ($user->role === User::ROLE_NUTRITIONIST) {
            return [
                'dietary_goal' => 'Maintenance',
                'fitness_goal' => 'Maintain',
                'diet_name' => 'Mediterranean',
            ];
        }

        if ($user->role === User::ROLE_ADMIN) {
            return [
                'dietary_goal' => 'Maintenance',
                'fitness_goal' => 'Maintain',
                'diet_name' => 'Mediterranean',
            ];
        }

        $options = [
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Lose Weight', 'diet_name' => 'Mediterranean'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Maintain', 'diet_name' => 'DASH'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Build Muscle', 'diet_name' => 'High-Protein'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Improve Endurance', 'diet_name' => 'Low-Carb'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Recomposition', 'diet_name' => 'Mediterranean'],
        ];

        return $options[$user->id % count($options)];
    }

    private function defaultActivityLevelForUser(User $user): string
    {
        return match ((string) $user->role) {
            User::ROLE_TRAINER => 'Very Active',
            User::ROLE_NUTRITIONIST => 'Moderately Active',
            User::ROLE_ADMIN => 'Lightly Active',
            default => match ($user->id % 5) {
                0 => 'Sedentary',
                1 => 'Lightly Active',
                2 => 'Moderately Active',
                3 => 'Very Active',
                default => 'Lightly Active',
            },
        };
    }

    private function defaultWorkoutLocationForUser(User $user): string
    {
        return match ((string) $user->role) {
            User::ROLE_TRAINER => 'gym',
            User::ROLE_NUTRITIONIST => 'both',
            User::ROLE_ADMIN => 'home',
            default => match ($user->id % 3) {
                0 => 'home',
                1 => 'gym',
                default => 'both',
            },
        };
    }

    private function dietFailureReasonsForUser(User $user): array
    {
        $reasonPool = [
            'Hunger/low energy',
            'Cravings',
            'Time/meal prep burden',
            'Social/lifestyle conflicts',
            'Travel/routine changes',
            'Too restrictive',
            'Lack of results',
            'Confusing guidance',
            'Too expensive',
        ];

        $first = $reasonPool[$user->id % count($reasonPool)];
        $second = $reasonPool[($user->id + 3) % count($reasonPool)];

        return array_values(array_unique([$first, $second]));
    }

    private function tableMedicalSummary(User $user): string
    {
        return $user->medicalHistories
            ->pluck('value')
            ->filter()
            ->implode(', ');
    }

    private function defaultCityForUser(User $user): string
    {
        $cities = ['Beirut', 'Byblos', 'Tripoli', 'Saida', 'Jounieh', 'Zahle'];

        return $cities[$user->id % count($cities)];
    }

    private function isSeededDemoUser(User $user): bool
    {
        $email = strtolower(trim((string) ($user->email ?? '')));

        return $email !== '' && (
            str_contains($email, 'hayetak.local')
            || str_contains($email, '@clients.')
            || str_contains($email, 'example.')
        );
    }

    private function normalizeKey(string $value): string
    {
        return trim(Str::of($value)->lower()->replace(['_', '/', ','], ' ')->squish()->toString());
    }

    private function shouldTrackHeight(User $user): bool
    {
        if (($user->age ?? 0) > 0 && (int) $user->age <= 20) {
            return true;
        }

        return $user->id % 3 === 0;
    }

    private function inferredHeightForUser(User $user): ?int
    {
        if ($user->height_cm !== null) {
            return (int) $user->height_cm;
        }

        $base = $this->normalizeKey((string) $user->gender) === 'female' ? 162 : 174;
        $offset = (($user->id * 3) % 11) - 5;

        return (int) max(148, min(198, $base + $offset));
    }

    private function heightForDate(
        int $heightAnchor,
        User $user,
        CarbonImmutable $date,
        CarbonImmutable $startDate,
    ): ?int {
        $weeksFromStart = (int) floor($startDate->diffInDays($date) / 7);

        if ($weeksFromStart === 0) {
            return $heightAnchor;
        }

        if (($user->age ?? 0) > 0 && (int) $user->age <= 20 && $weeksFromStart >= 8) {
            return min(205, $heightAnchor + 1);
        }

        if ($user->id % 5 === 0 && $weeksFromStart % 12 === 0) {
            return $heightAnchor;
        }

        return null;
    }
}
