<?php

namespace App\Console\Commands\Ai;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AiExportProgressPredictionData extends Command
{
    /** @var array<int, bool> */
    private array $demoUserCache = [];

    protected $signature = 'ai:export-progress-prediction-data
        {--out-jsonl=storage/app/ai/training/progress_predictor_dataset.jsonl : Output JSONL file}
        {--out-csv=storage/app/ai/training/progress_predictor_dataset.csv : Output CSV file}
        {--limit=0 : Max AI requests to scan (0 = all)}
        {--user-id=0 : Restrict export to one user}
        {--type=plan_generator : AiRequest type filter}
        {--status=completed : AiRequest status filter}
        {--include-unlabeled=0 : Keep rows that do not have an end-weight label}
        {--exclude-synthetic=0 : Drop rows with synthetic outcome labels}
        {--only-synthetic=0 : Keep only rows with synthetic outcome labels}
    ';

    protected $description = 'Export supervised rows for the progress prediction model from planner generations + real outcomes';

    public function handle(ProgressLabelReadinessService $readiness): int
    {
        $outJsonl = base_path((string) $this->option('out-jsonl'));
        $outCsv = base_path((string) $this->option('out-csv'));
        $limit = max(0, (int) $this->option('limit'));
        $userId = max(0, (int) $this->option('user-id'));
        $type = trim((string) $this->option('type'));
        $status = trim((string) $this->option('status'));
        $includeUnlabeled = ((int) $this->option('include-unlabeled')) === 1;
        $excludeSynthetic = ((int) $this->option('exclude-synthetic')) === 1;
        $onlySynthetic = ((int) $this->option('only-synthetic')) === 1;

        if ($excludeSynthetic && $onlySynthetic) {
            $this->error('Choose only one of --exclude-synthetic or --only-synthetic.');

            return self::FAILURE;
        }

        File::ensureDirectoryExists(dirname($outJsonl));
        File::ensureDirectoryExists(dirname($outCsv));

        $jsonHandle = fopen($outJsonl, 'w');
        $csvHandle = fopen($outCsv, 'w');
        if (! is_resource($jsonHandle) || ! is_resource($csvHandle)) {
            $this->error('Unable to open output files for writing.');

            return self::FAILURE;
        }

        $headers = $this->csvHeaders();
        fputcsv($csvHandle, $headers);

        $query = AiRequest::query()
            ->where('type', $type)
            ->where('status', $status)
            ->whereNotNull('input_context_json')
            ->whereNotNull('output_json')
            ->orderBy('id', 'asc');

        if ($userId > 0) {
            $query->where('user_id', $userId);
        }

        $scanned = 0;
        $written = 0;
        $weightLabeled = 0;
        $strengthLabeled = 0;
        $skippedNoProfile = 0;
        $skippedNoBaseline = 0;
        $skippedNoLabel = 0;
        $skippedSyntheticFilter = 0;

        $query->chunkById(200, function ($rows) use (
            $readiness,
            $limit,
            $includeUnlabeled,
            $headers,
            $jsonHandle,
            $csvHandle,
            &$scanned,
            &$written,
            &$weightLabeled,
            &$strengthLabeled,
            &$skippedNoProfile,
            &$skippedNoBaseline,
            &$skippedNoLabel,
            &$skippedSyntheticFilter,
            $excludeSynthetic,
            $onlySynthetic
        ) {
            foreach ($rows as $request) {
                if ($limit > 0 && $scanned >= $limit) {
                    return false;
                }

                $scanned++;
                $result = $this->buildRow($request, $includeUnlabeled, $readiness);

                if (($result['reason'] ?? null) === 'missing_profile') {
                    $skippedNoProfile++;

                    continue;
                }
                if (($result['reason'] ?? null) === 'missing_baseline_weight') {
                    $skippedNoBaseline++;

                    continue;
                }
                if (($result['reason'] ?? null) === 'missing_end_weight_label') {
                    $skippedNoLabel++;

                    continue;
                }

                $row = $result['row'] ?? null;
                if (! is_array($row)) {
                    continue;
                }
                $hasSyntheticOutcomeLabels = $this->rowHasSyntheticOutcomeLabels($row);
                if ($excludeSynthetic && $hasSyntheticOutcomeLabels) {
                    $skippedSyntheticFilter++;

                    continue;
                }
                if ($onlySynthetic && ! $hasSyntheticOutcomeLabels) {
                    $skippedSyntheticFilter++;

                    continue;
                }

                fwrite($jsonHandle, json_encode($row, JSON_UNESCAPED_UNICODE)."\n");

                $csvRow = [];
                foreach ($headers as $header) {
                    $csvRow[] = $row[$header] ?? null;
                }
                fputcsv($csvHandle, $csvRow);

                $written++;
                if ((int) ($row['has_weight_label'] ?? 0) === 1) {
                    $weightLabeled++;
                }
                if ((int) ($row['has_strength_label'] ?? 0) === 1) {
                    $strengthLabeled++;
                }
            }

            if ($limit > 0 && $scanned >= $limit) {
                return false;
            }
        });

        fclose($jsonHandle);
        fclose($csvHandle);

        $this->info("Exported {$written} rows.");
        $this->line("Scanned AI requests: {$scanned}");
        $this->line("Rows with weight labels: {$weightLabeled}");
        $this->line("Rows with strength labels: {$strengthLabeled}");
        $this->line("Skipped (missing profile): {$skippedNoProfile}");
        $this->line("Skipped (missing baseline weight): {$skippedNoBaseline}");
        $this->line("Skipped (missing end weight label): {$skippedNoLabel}");
        $this->line("Skipped (synthetic filter): {$skippedSyntheticFilter}");
        $this->line("JSONL: {$outJsonl}");
        $this->line("CSV: {$outCsv}");

        return self::SUCCESS;
    }

    /**
     * @return array{row?: array<string, mixed>, reason?: string}
     */
    private function buildRow(
        AiRequest $request,
        bool $includeUnlabeled,
        ProgressLabelReadinessService $readiness
    ): array {
        $context = $this->decodeArray($request->input_context_json);
        $output = $this->decodeArray($request->output_json);
        $profile = is_array($context['profile'] ?? null) ? $context['profile'] : [];

        if ($profile === []) {
            return ['reason' => 'missing_profile'];
        }

        $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : [];
        $targets = is_array(data_get($output, 'diet.daily_targets')) ? data_get($output, 'diet.daily_targets') : [];

        $startDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
        $horizonDays = $readiness->resolveHorizonDays($context, $output);
        $endDate = $readiness->expectedEndDate($startDate, $horizonDays);
        $historyStartDate = $startDate->subDays(6);

        $baselineFromPrediction = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null);
        $baselineFromProfile = $this->toFloatOrNull($profile['weight_kg'] ?? null);
        $baseline = $readiness->baselineWithFallback(
            (int) $request->user_id,
            $startDate,
            $baselineFromPrediction,
            $baselineFromProfile
        );
        $baselineWeight = is_array($baseline) ? (float) ($baseline['weight'] ?? 0) : null;
        if ($baselineWeight === null || $baselineWeight <= 0) {
            return ['reason' => 'missing_baseline_weight'];
        }

        $end = $readiness->endMeasurement((int) $request->user_id, $endDate);
        $endWeight = is_array($end) ? (float) ($end['weight'] ?? 0) : null;
        if ($endWeight === null && ! $includeUnlabeled) {
            return ['reason' => 'missing_end_weight_label'];
        }

        $targetCalories = $this->toIntOrNull($targets['calories_kcal'] ?? null);
        $targetProtein = $this->toIntOrNull($targets['protein_g'] ?? null);
        $targetCarbs = $this->toIntOrNull($targets['carbs_g'] ?? null);
        $targetFat = $this->toIntOrNull($targets['fat_g'] ?? null);

        $nutrition = $this->nutritionStats(
            (int) $request->user_id,
            $historyStartDate,
            $startDate,
            $targetCalories,
            $targetProtein
        );
        $workouts = $this->workoutHistoryStats((int) $request->user_id, $historyStartDate, $startDate);
        $strengthLabels = $this->strengthLabelStats((int) $request->user_id, $startDate, $endDate, $horizonDays);

        $predictedWeightChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
        $predictedWeight = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);

        $actualWeightChange = $endWeight !== null ? round($endWeight - $baselineWeight, 3) : null;
        $actualWeeklyChange = $actualWeightChange !== null ? round(($actualWeightChange / $horizonDays) * 7, 3) : null;
        $predictionError = ($actualWeightChange !== null && $predictedWeightChange !== null)
            ? round($actualWeightChange - $predictedWeightChange, 3)
            : null;

        $weeklySchedule = is_array(data_get($output, 'workout.weekly_schedule')) ? data_get($output, 'workout.weekly_schedule') : [];
        $plannedWorkoutDays = 0;
        $plannedExerciseCount = 0;
        foreach ($weeklySchedule as $day) {
            $sessionType = strtolower(trim((string) ($day['session_type'] ?? 'train')));
            $exerciseCount = is_array($day['exercises'] ?? null) ? count($day['exercises']) : 0;
            if ($sessionType !== 'rest' && $sessionType !== 'recovery' && $exerciseCount > 0) {
                $plannedWorkoutDays++;
                $plannedExerciseCount += $exerciseCount;
            }
        }
        $plannedExercisesPerDay = $plannedWorkoutDays > 0
            ? round($plannedExerciseCount / $plannedWorkoutDays, 2)
            : 0.0;

        $dietDays = is_array(data_get($output, 'diet.days')) ? data_get($output, 'diet.days') : [];
        $plannedSnackNames = [];
        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                $code = strtolower(trim((string) ($meal['meal_code'] ?? '')));
                if ($code !== 'snack') {
                    continue;
                }
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name !== '') {
                        $plannedSnackNames[] = strtolower($name);
                    }
                }
            }
        }

        $targetWorkoutDays = $this->toIntOrNull(
            $profile['workout_days_per_week']
            ?? data_get($context, 'planning_constraints.target_training_days_per_week')
            ?? null
        );

        $baselineMeasurementDate = is_array($baseline) && ($baseline['source'] ?? null) === 'measurement'
            ? (string) ($baseline['date'] ?? '')
            : null;
        $endMeasurementDate = is_array($end) ? (string) ($end['date'] ?? '') : null;
        $isSyntheticBaselineMeasurement = $this->measurementIsSynthetic((int) $request->user_id, $baselineMeasurementDate) ? 1 : 0;
        $isSyntheticEndMeasurement = $this->measurementIsSynthetic((int) $request->user_id, $endMeasurementDate) ? 1 : 0;
        $isSyntheticWeightLabel = ($isSyntheticBaselineMeasurement === 1 || $isSyntheticEndMeasurement === 1) ? 1 : 0;
        $isSyntheticWorkoutWindow = (
            ((int) ($workouts['synthetic_session_count'] ?? 0)) > 0
            || ((int) ($workouts['synthetic_set_count'] ?? 0)) > 0
        ) ? 1 : 0;
        $isDemoUser = $this->isDemoUser((int) $request->user_id) ? 1 : 0;
        $isSyntheticMealWindow = $isDemoUser;
        $isSyntheticStrengthLabel = (
            ((int) ($strengthLabels['synthetic_session_count'] ?? 0)) > 0
            || ((int) ($strengthLabels['synthetic_set_count'] ?? 0)) > 0
        ) ? 1 : 0;
        $isSyntheticRow = (
            $isSyntheticWeightLabel === 1
            || $isSyntheticStrengthLabel === 1
            || $isSyntheticMealWindow === 1
        ) ? 1 : 0;

        $row = [
            'ai_request_id' => (int) $request->id,
            'user_id' => (int) $request->user_id,
            'plan_generated_at' => $startDate->toDateString(),
            'horizon_days' => $horizonDays,
            'goal_mode' => $this->goalMode($profile),
            'gender' => strtolower(trim((string) ($profile['gender'] ?? 'unknown'))),
            'age' => $this->toIntOrNull($profile['age'] ?? null),
            'height_cm' => $this->toIntOrNull($profile['height_cm'] ?? null),
            'diet_type' => strtolower(trim((string) ($profile['diet_type'] ?? 'unknown'))),
            'workout_location' => strtolower(trim((string) ($profile['workout_location'] ?? 'unknown'))),
            'target_workout_days_per_week' => $targetWorkoutDays,
            'baseline_weight_kg' => round($baselineWeight, 3),
            'target_weight_change_kg' => $predictedWeightChange,
            'target_projected_weight_kg' => $predictedWeight,
            'target_calories_kcal' => $targetCalories,
            'target_protein_g' => $targetProtein,
            'target_carbs_g' => $targetCarbs,
            'target_fat_g' => $targetFat,
            'planned_diet_days' => count($dietDays),
            'planned_unique_snacks' => count(array_unique($plannedSnackNames)),
            'planned_workout_days' => $plannedWorkoutDays,
            'planned_exercises_per_train_day_avg' => $plannedExercisesPerDay,
            'meal_logged_days' => $nutrition['logged_days'],
            'meal_logged_days_pct' => $nutrition['logged_days_pct'],
            'meal_entry_count' => $nutrition['entry_count'],
            'actual_avg_calories' => $nutrition['avg_calories'],
            'actual_avg_protein_g' => $nutrition['avg_protein_g'],
            'actual_avg_carbs_g' => $nutrition['avg_carbs_g'],
            'actual_avg_fat_g' => $nutrition['avg_fat_g'],
            'snack_variety_count' => $nutrition['snack_variety_count'],
            'calorie_adherence_ratio' => $nutrition['calorie_adherence_ratio'],
            'protein_adherence_ratio' => $nutrition['protein_adherence_ratio'],
            'workout_sessions' => $workouts['sessions'],
            'workout_minutes_total' => $workouts['minutes_total'],
            'workout_avg_minutes' => $workouts['avg_minutes'],
            'workout_set_count' => $workouts['set_count'],
            'workout_unique_exercises' => $workouts['unique_exercises'],
            'workout_volume_load_kg' => $workouts['volume_load_kg'],
            'strength_baseline_index' => $workouts['strength_baseline_index'],
            'strength_final_index' => $workouts['strength_final_index'],
            'strength_progress_pct' => $workouts['strength_progress_pct'],
            'label_end_weight_kg' => $endWeight !== null ? round($endWeight, 3) : null,
            'label_actual_weight_change_kg' => $actualWeightChange,
            'label_actual_weekly_weight_change_kg' => $actualWeeklyChange,
            'label_prediction_error_kg' => $predictionError,
            'label_strength_progress_pct' => $strengthLabels['strength_progress_pct'],
            'has_weight_label' => $endWeight !== null ? 1 : 0,
            'has_strength_label' => $strengthLabels['strength_progress_pct'] !== null ? 1 : 0,
            'baseline_measurement_date' => $baselineMeasurementDate,
            'end_measurement_date' => $endMeasurementDate,
            'is_demo_user' => $isDemoUser,
            'is_synthetic_baseline_measurement' => $isSyntheticBaselineMeasurement,
            'is_synthetic_end_measurement' => $isSyntheticEndMeasurement,
            'is_synthetic_meal_window' => $isSyntheticMealWindow,
            'is_synthetic_weight_label' => $isSyntheticWeightLabel,
            'is_synthetic_workout_window' => $isSyntheticWorkoutWindow,
            'is_synthetic_strength_label' => $isSyntheticStrengthLabel,
            'is_synthetic_row' => $isSyntheticRow,
        ];

        return ['row' => $row];
    }

    private function goalMode(array $profile): string
    {
        $goalText = strtolower(trim(
            (string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? '')
        ));

        if ($goalText !== '' && preg_match('/lose|loss|cut|deficit|fat/', $goalText)) {
            return 'lose';
        }
        if ($goalText !== '' && preg_match('/gain|bulk|muscle|hypertrophy|strength/', $goalText)) {
            return 'gain';
        }

        return 'maintain';
    }

    private function nutritionStats(
        int $userId,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        ?int $targetCalories,
        ?int $targetProtein
    ): array {
        $row = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', '>=', $startDate->toDateString())
            ->whereDate('me.eaten_at', '<=', $endDate->toDateString())
            ->selectRaw('COUNT(*) as entry_count')
            ->selectRaw('COUNT(DISTINCT me.eaten_at) as logged_days')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings), 0) as total_calories')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings), 0) as total_protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings), 0) as total_carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings), 0) as total_fat_g')
            ->first();

        $snackVarietyCount = DB::table('meal_entries as me')
            ->where('me.user_id', $userId)
            ->where('me.meal_type', 'snack')
            ->whereDate('me.eaten_at', '>=', $startDate->toDateString())
            ->whereDate('me.eaten_at', '<=', $endDate->toDateString())
            ->distinct('me.food_id')
            ->count('me.food_id');

        $days = max(1, $startDate->diffInDays($endDate) + 1);
        $loggedDays = (int) ($row->logged_days ?? 0);
        $avgCalories = round(((float) ($row->total_calories ?? 0.0)) / $days, 3);
        $avgProtein = round(((float) ($row->total_protein_g ?? 0.0)) / $days, 3);

        return [
            'entry_count' => (int) ($row->entry_count ?? 0),
            'logged_days' => $loggedDays,
            'logged_days_pct' => round(($loggedDays / $days) * 100, 2),
            'avg_calories' => $avgCalories,
            'avg_protein_g' => $avgProtein,
            'avg_carbs_g' => round(((float) ($row->total_carbs_g ?? 0.0)) / $days, 3),
            'avg_fat_g' => round(((float) ($row->total_fat_g ?? 0.0)) / $days, 3),
            'snack_variety_count' => (int) $snackVarietyCount,
            'calorie_adherence_ratio' => ($targetCalories !== null && $targetCalories > 0)
                ? round($avgCalories / $targetCalories, 4)
                : null,
            'protein_adherence_ratio' => ($targetProtein !== null && $targetProtein > 0)
                ? round($avgProtein / $targetProtein, 4)
                : null,
        ];
    }

    private function workoutHistoryStats(
        int $userId,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate
    ): array {
        $sessionRow = DB::table('workout_logs as wl')
            ->where('wl.user_id', $userId)
            ->where('wl.performed_at', '>=', $startDate->startOfDay()->toDateTimeString())
            ->where('wl.performed_at', '<=', $endDate->endOfDay()->toDateTimeString())
            ->selectRaw('COUNT(*) as sessions')
            ->selectRaw('COALESCE(SUM(wl.duration_min), 0) as minutes_total')
            ->selectRaw("COALESCE(SUM(CASE WHEN LOWER(COALESCE(wl.notes, '')) LIKE 'synthetic_%' THEN 1 ELSE 0 END), 0) as synthetic_session_count")
            ->first();

        $setRow = DB::table('workout_log_sets as ws')
            ->join('workout_logs as wl', 'wl.id', '=', 'ws.workout_log_id')
            ->where('wl.user_id', $userId)
            ->where('wl.performed_at', '>=', $startDate->startOfDay()->toDateTimeString())
            ->where('wl.performed_at', '<=', $endDate->endOfDay()->toDateTimeString())
            ->where('ws.is_warmup', false)
            ->selectRaw('COUNT(*) as set_count')
            ->selectRaw('COUNT(DISTINCT ws.exercise_id) as unique_exercises')
            ->selectRaw('COALESCE(SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)), 0) as volume_load_kg')
            ->selectRaw('COALESCE(AVG(CASE WHEN ws.weight_kg > 0 THEN ws.weight_kg ELSE NULL END), 0) as avg_weight')
            ->selectRaw("COALESCE(SUM(CASE WHEN LOWER(COALESCE(ws.notes, '')) LIKE 'synthetic_%' OR LOWER(COALESCE(wl.notes, '')) LIKE 'synthetic_%' THEN 1 ELSE 0 END), 0) as synthetic_set_count")
            ->first();

        $sessions = (int) ($sessionRow->sessions ?? 0);
        $avgWeight = is_numeric($setRow->avg_weight ?? null)
            ? round((float) $setRow->avg_weight, 3)
            : null;

        return [
            'sessions' => $sessions,
            'minutes_total' => (int) ($sessionRow->minutes_total ?? 0),
            'avg_minutes' => $sessions > 0
                ? round(((float) ($sessionRow->minutes_total ?? 0.0)) / $sessions, 3)
                : 0.0,
            'set_count' => (int) ($setRow->set_count ?? 0),
            'unique_exercises' => (int) ($setRow->unique_exercises ?? 0),
            'volume_load_kg' => round((float) ($setRow->volume_load_kg ?? 0.0), 3),
            'synthetic_session_count' => (int) ($sessionRow->synthetic_session_count ?? 0),
            'synthetic_set_count' => (int) ($setRow->synthetic_set_count ?? 0),
            'strength_baseline_index' => $avgWeight,
            'strength_final_index' => $avgWeight,
            'strength_progress_pct' => null,
        ];
    }

    private function strengthLabelStats(
        int $userId,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        int $horizonDays
    ): array {
        $sessionRow = DB::table('workout_logs as wl')
            ->where('wl.user_id', $userId)
            ->where('wl.performed_at', '>=', $startDate->startOfDay()->toDateTimeString())
            ->where('wl.performed_at', '<=', $endDate->endOfDay()->toDateTimeString())
            ->selectRaw("COALESCE(SUM(CASE WHEN LOWER(COALESCE(wl.notes, '')) LIKE 'synthetic_%' THEN 1 ELSE 0 END), 0) as synthetic_session_count")
            ->first();

        $setRow = DB::table('workout_log_sets as ws')
            ->join('workout_logs as wl', 'wl.id', '=', 'ws.workout_log_id')
            ->where('wl.user_id', $userId)
            ->where('wl.performed_at', '>=', $startDate->startOfDay()->toDateTimeString())
            ->where('wl.performed_at', '<=', $endDate->endOfDay()->toDateTimeString())
            ->where('ws.is_warmup', false)
            ->selectRaw("COALESCE(SUM(CASE WHEN LOWER(COALESCE(ws.notes, '')) LIKE 'synthetic_%' OR LOWER(COALESCE(wl.notes, '')) LIKE 'synthetic_%' THEN 1 ELSE 0 END), 0) as synthetic_set_count")
            ->first();

        $firstPhaseEnd = $startDate->addDays(min(6, $horizonDays - 1));
        $lastPhaseStart = $endDate->subDays(min(6, $horizonDays - 1));

        $baselineSnapshot = $this->strengthSnapshot($userId, $startDate, $firstPhaseEnd);
        $finalSnapshot = $this->strengthSnapshot($userId, $lastPhaseStart, $endDate);
        $strength = $this->strengthDelta($baselineSnapshot, $finalSnapshot);

        return [
            'synthetic_session_count' => (int) ($sessionRow->synthetic_session_count ?? 0),
            'synthetic_set_count' => (int) ($setRow->synthetic_set_count ?? 0),
            'strength_progress_pct' => $strength['progress_pct'],
        ];
    }

    private function measurementIsSynthetic(int $userId, ?string $date): bool
    {
        if ($date === null || trim($date) === '') {
            return false;
        }

        $note = DB::table('measurements')
            ->where('user_id', $userId)
            ->whereDate('measured_at', $date)
            ->value('notes');

        $text = strtolower(trim((string) $note));

        return $text !== '' && str_contains($text, 'synthetic_');
    }

    private function isDemoUser(int $userId): bool
    {
        if (! array_key_exists($userId, $this->demoUserCache)) {
            $user = DB::table('users')
                ->where('id', $userId)
                ->first(['email', 'data_origin']);

            $origin = strtolower(trim((string) ($user->data_origin ?? '')));
            $email = strtolower(trim((string) ($user->email ?? '')));

            $this->demoUserCache[$userId] = match ($origin) {
                User::DATA_ORIGIN_SEEDED_DEMO, User::DATA_ORIGIN_TEST => true,
                User::DATA_ORIGIN_REAL, User::DATA_ORIGIN_IMPORTED_REAL => false,
                default => $email !== '' && (
                    str_contains($email, 'hayetak.local')
                    || str_contains($email, '@clients.')
                    || str_contains($email, 'example.')
                ),
            };
        }

        return $this->demoUserCache[$userId];
    }

    /**
     * Treat export filtering as a weight-label quality gate, not a broad seeded-context gate.
     *
     * The current shipped predictor artifact is weight-only, so synthetic workout/strength
     * labels should not block rows whose body-weight outcome is real.
     *
     * @param  array<string, mixed>  $row
     */
    private function rowHasSyntheticOutcomeLabels(array $row): bool
    {
        return (int) ($row['is_synthetic_weight_label'] ?? 0) === 1;
    }

    /**
     * @return array<int, float>
     */
    private function strengthSnapshot(int $userId, CarbonImmutable $startDate, CarbonImmutable $endDate): array
    {
        return DB::table('workout_log_sets as ws')
            ->join('workout_logs as wl', 'wl.id', '=', 'ws.workout_log_id')
            ->where('wl.user_id', $userId)
            ->where('wl.performed_at', '>=', $startDate->startOfDay()->toDateTimeString())
            ->where('wl.performed_at', '<=', $endDate->endOfDay()->toDateTimeString())
            ->where('ws.is_warmup', false)
            ->whereNotNull('ws.weight_kg')
            ->where('ws.weight_kg', '>', 0)
            ->groupBy('ws.exercise_id')
            ->selectRaw('ws.exercise_id as exercise_id')
            ->selectRaw('MAX(ws.weight_kg) as top_weight')
            ->pluck('top_weight', 'exercise_id')
            ->mapWithKeys(static function ($weight, $exerciseId): array {
                return [(int) $exerciseId => (float) $weight];
            })
            ->all();
    }

    /**
     * @param  array<int, float>  $baseline
     * @param  array<int, float>  $final
     * @return array{baseline_index: ?float, final_index: ?float, progress_pct: ?float}
     */
    private function strengthDelta(array $baseline, array $final): array
    {
        $changes = [];
        $baselineWeights = [];
        $finalWeights = [];

        foreach ($baseline as $exerciseId => $baselineWeight) {
            $finalWeight = $final[$exerciseId] ?? null;
            if ($finalWeight === null || $baselineWeight <= 0) {
                continue;
            }

            $baselineWeights[] = $baselineWeight;
            $finalWeights[] = $finalWeight;
            $changes[] = (($finalWeight - $baselineWeight) / $baselineWeight) * 100;
        }

        if ($changes === []) {
            return [
                'baseline_index' => null,
                'final_index' => null,
                'progress_pct' => null,
            ];
        }

        sort($changes);
        $medianChange = $this->median($changes);

        return [
            'baseline_index' => round(array_sum($baselineWeights) / count($baselineWeights), 3),
            'final_index' => round(array_sum($finalWeights) / count($finalWeights), 3),
            'progress_pct' => round($medianChange, 3),
        ];
    }

    /**
     * @param  array<int, float>  $values
     */
    private function median(array $values): float
    {
        $count = count($values);
        if ($count === 0) {
            return 0.0;
        }

        $middle = intdiv($count, 2);
        if ($count % 2 === 1) {
            return (float) $values[$middle];
        }

        return ((float) $values[$middle - 1] + (float) $values[$middle]) / 2.0;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function toIntOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) round((float) $value) : null;
    }

    /**
     * @return array<int, string>
     */
    private function csvHeaders(): array
    {
        return [
            'ai_request_id',
            'user_id',
            'plan_generated_at',
            'horizon_days',
            'goal_mode',
            'gender',
            'age',
            'height_cm',
            'diet_type',
            'workout_location',
            'target_workout_days_per_week',
            'baseline_weight_kg',
            'target_weight_change_kg',
            'target_projected_weight_kg',
            'target_calories_kcal',
            'target_protein_g',
            'target_carbs_g',
            'target_fat_g',
            'planned_diet_days',
            'planned_unique_snacks',
            'planned_workout_days',
            'planned_exercises_per_train_day_avg',
            'meal_logged_days',
            'meal_logged_days_pct',
            'meal_entry_count',
            'actual_avg_calories',
            'actual_avg_protein_g',
            'actual_avg_carbs_g',
            'actual_avg_fat_g',
            'snack_variety_count',
            'calorie_adherence_ratio',
            'protein_adherence_ratio',
            'workout_sessions',
            'workout_minutes_total',
            'workout_avg_minutes',
            'workout_set_count',
            'workout_unique_exercises',
            'workout_volume_load_kg',
            'strength_baseline_index',
            'strength_final_index',
            'strength_progress_pct',
            'label_end_weight_kg',
            'label_actual_weight_change_kg',
            'label_actual_weekly_weight_change_kg',
            'label_prediction_error_kg',
            'label_strength_progress_pct',
            'has_weight_label',
            'has_strength_label',
            'baseline_measurement_date',
            'end_measurement_date',
            'is_demo_user',
            'is_synthetic_baseline_measurement',
            'is_synthetic_end_measurement',
            'is_synthetic_meal_window',
            'is_synthetic_weight_label',
            'is_synthetic_workout_window',
            'is_synthetic_strength_label',
            'is_synthetic_row',
        ];
    }
}
