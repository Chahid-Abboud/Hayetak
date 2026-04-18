<?php

namespace App\Services\Ai\Models;

use App\Models\AiRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class ProgressPredictionModel
{
    /** @var array<int, \Illuminate\Support\Collection<int, object>> */
    private array $measurementCache = [];

    public function predict(User $user, array $profile, array $context, array $plan, int $horizonDays): array
    {
        $horizonDays = $this->normalizePlanHorizonDays($horizonDays);
        $weeks = max(1.0, $horizonDays / 7.0);
        $currentWeight = $this->latestKnownWeight($user);
        $goalMode = $this->goalMode($profile);

        $baseWeeklyRate = $this->baseWeeklyRateKg($goalMode, $profile);
        $adherenceMultiplier = $this->adherenceMultiplier($context, $plan, $profile);
        $adjustedWeeklyRate = $baseWeeklyRate * $adherenceMultiplier;

        $feedbackDelta = $this->recentPredictionErrorPerWeek($user);
        if ($feedbackDelta === null) {
            $previous = $this->latestPreviousPrediction($user);
            if (is_array($previous)) {
                $priorProjected = (float) ($previous['projected_body_weight_kg'] ?? $currentWeight);
                $priorWeeks = max(1.0, ((int) ($previous['horizon_days'] ?? 14)) / 7.0);
                // Positive value means user changed less than predicted.
                $feedbackDelta = ($currentWeight - $priorProjected) / $priorWeeks;
            }
        }
        if ($feedbackDelta !== null) {
            // Move the next projection in the same direction as observed real-world error.
            $adjustedWeeklyRate += ($feedbackDelta * 0.35);
        }

        $strengthGainWeekly = $this->strengthWeeklyGainPercent($goalMode, $adherenceMultiplier);
        $strengthProjection = [
            'upper_body_compound_pct' => round($strengthGainWeekly * $weeks, 1),
            'lower_body_compound_pct' => round(($strengthGainWeekly + 0.2) * $weeks, 1),
        ];
        $modelName = 'hayetak_progress_predictor_v1';
        $inferenceSource = 'heuristic';
        $confidence = $this->confidenceLabel($adherenceMultiplier, $feedbackDelta);
        $guardrailNote = null;

        $mlPrediction = $this->predictWithTrainedModel(
            $user,
            $profile,
            $context,
            $plan,
            $horizonDays,
            $goalMode,
            $currentWeight,
            $adjustedWeeklyRate
        );

        if (is_array($mlPrediction) && is_numeric($mlPrediction['weight_change_kg'] ?? null)) {
            $mlWeeklyRate = ((float) $mlPrediction['weight_change_kg']) / $weeks;
            $guardrail = $this->mlBlendGuardrailDecision(
                $confidence,
                $context,
                $plan,
                $goalMode,
                $mlWeeklyRate,
                $adjustedWeeklyRate
            );

            if ((bool) ($guardrail['allow'] ?? false)) {
                // Blend model output with the heuristic + feedback signal to keep behavior stable.
                $adjustedWeeklyRate = ($adjustedWeeklyRate * 0.25) + ($mlWeeklyRate * 0.75);
                $adjustedWeeklyRate = $this->clampWeeklyRate($adjustedWeeklyRate, $goalMode);
                $inferenceSource = 'ml_blend';
                $modelName = (string) ($mlPrediction['model_name'] ?? $modelName);

                if (is_numeric($mlPrediction['strength_progress_pct'] ?? null)) {
                    $strengthTotal = (float) $mlPrediction['strength_progress_pct'];
                    $strengthProjection = [
                        'upper_body_compound_pct' => round($strengthTotal, 1),
                        'lower_body_compound_pct' => round($strengthTotal + 0.2, 1),
                    ];
                }
            } else {
                $adjustedWeeklyRate = $this->clampWeeklyRate($adjustedWeeklyRate, $goalMode);
                $guardrailNote = (string) ($guardrail['reason'] ?? 'ml_guardrail_blocked');
                Log::info('Progress predictor ML blend blocked by guardrail; heuristic fallback applied.', [
                    'user_id' => $user->id,
                    'reason' => $guardrailNote,
                    'confidence' => $confidence,
                ]);
            }
        } else {
            $adjustedWeeklyRate = $this->clampWeeklyRate($adjustedWeeklyRate, $goalMode);
        }

        $expectedWeightChange = round($adjustedWeeklyRate * $weeks, 2);
        $projectedWeight = round($currentWeight + $expectedWeightChange, 2);

        return [
            'model_name' => $modelName,
            'horizon_days' => $horizonDays,
            'baseline_weight_kg' => round($currentWeight, 2),
            'expected_weight_change_kg' => $expectedWeightChange,
            'projected_body_weight_kg' => $projectedWeight,
            'strength_projection' => $strengthProjection,
            'confidence' => $confidence,
            'inference_source' => $inferenceSource,
            'feedback_adjustment' => [
                'base_weekly_weight_change_kg' => round($baseWeeklyRate, 2),
                'adjusted_weekly_weight_change_kg' => round($adjustedWeeklyRate, 2),
                'last_prediction_error_kg_per_week' => $feedbackDelta !== null ? round($feedbackDelta, 2) : null,
                'notes' => $this->feedbackNotes($guardrailNote),
            ],
        ];
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

    private function baseWeeklyRateKg(string $goalMode, array $profile): float
    {
        $days = (int) ($profile['workout_days_per_week'] ?? 3);

        return match ($goalMode) {
            'lose' => $days >= 4 ? -0.55 : -0.45,
            'gain' => $days >= 4 ? 0.35 : 0.25,
            default => -0.05,
        };
    }

    private function adherenceMultiplier(array $context, array $plan, array $profile): float
    {
        $nutritionAvg = (array) data_get($context, 'recent_history.nutrition_last_7_days.averages', []);
        $recentCalories = (int) ($nutritionAvg['calories'] ?? 0);
        $targetCalories = (int) data_get($plan, 'diet.daily_targets.calories_kcal', 0);
        $workoutSessions = (int) data_get($context, 'recent_history.workouts_last_7_days.sessions', 0);
        $targetSessions = max(1, (int) ($profile['workout_days_per_week'] ?? 3));

        $nutritionScore = 1.0;
        if ($targetCalories > 0 && $recentCalories > 0) {
            $ratio = $recentCalories / $targetCalories;
            if ($ratio > 1.2 || $ratio < 0.75) {
                $nutritionScore = 0.82;
            } elseif ($ratio > 1.1 || $ratio < 0.85) {
                $nutritionScore = 0.9;
            } else {
                $nutritionScore = 1.05;
            }
        }

        $trainingScore = min(1.12, max(0.75, $workoutSessions / $targetSessions));

        return max(0.7, min(1.2, ($nutritionScore * 0.6) + ($trainingScore * 0.4)));
    }

    private function clampWeeklyRate(float $rate, string $goalMode): float
    {
        return match ($goalMode) {
            'lose' => max(-1.1, min(-0.08, $rate)),
            'gain' => max(0.08, min(0.9, $rate)),
            default => max(-0.25, min(0.25, $rate)),
        };
    }

    private function strengthWeeklyGainPercent(string $goalMode, float $adherenceMultiplier): float
    {
        $base = match ($goalMode) {
            'gain' => 1.6,
            'lose' => 0.7,
            default => 1.0,
        };

        return max(0.3, min(3.2, $base * $adherenceMultiplier));
    }

    private function confidenceLabel(float $adherenceMultiplier, ?float $feedbackDelta): string
    {
        $uncertainty = abs((float) $feedbackDelta);
        if ($adherenceMultiplier >= 1.0 && $uncertainty <= 0.25) {
            return 'high';
        }
        if ($adherenceMultiplier >= 0.85 && $uncertainty <= 0.45) {
            return 'medium';
        }

        return 'low';
    }

    private function feedbackNotes(?string $guardrailNote = null): string
    {
        $base = 'Prediction auto-adjusts using adherence signals and measured real-world error when available.';
        if ($guardrailNote === null || trim($guardrailNote) === '') {
            return $base;
        }

        return $base.' ML blend guardrail fallback: '.$guardrailNote.'.';
    }

    /**
     * @return array{allow: bool, reason?: string}
     */
    private function mlBlendGuardrailDecision(
        string $confidence,
        array $context,
        array $plan,
        string $goalMode,
        float $mlWeeklyRate,
        float $heuristicWeeklyRate
    ): array {
        $settings = (array) config('ai.progress_predictor.inference.guardrails', []);
        if (! (bool) ($settings['enabled'] ?? true)) {
            return ['allow' => true];
        }

        $minConfidence = strtolower(trim((string) ($settings['min_confidence_for_ml'] ?? 'medium')));
        if ($this->confidenceRank($confidence) < $this->confidenceRank($minConfidence)) {
            return ['allow' => false, 'reason' => 'low_confidence'];
        }

        $requireMacroTargets = (bool) ($settings['require_macro_targets'] ?? true);
        if ($requireMacroTargets) {
            $targets = is_array(data_get($plan, 'diet.daily_targets')) ? data_get($plan, 'diet.daily_targets') : [];
            $targetCalories = (int) ($targets['calories_kcal'] ?? 0);
            $targetProtein = (int) ($targets['protein_g'] ?? 0);
            if ($targetCalories <= 0 || $targetProtein <= 0) {
                return ['allow' => false, 'reason' => 'missing_macro_targets'];
            }
        }

        $nutritionAvg = (array) data_get($context, 'recent_history.nutrition_last_7_days.averages', []);
        $mealLoggedDays = (int) ($nutritionAvg['days_logged'] ?? 0);
        $minMealLoggedDays = max(0, (int) ($settings['min_meal_logged_days'] ?? 0));
        if ($mealLoggedDays < $minMealLoggedDays) {
            return ['allow' => false, 'reason' => 'insufficient_meal_logs'];
        }

        $workoutSessions = (int) data_get($context, 'recent_history.workouts_last_7_days.sessions', 0);
        $minWorkoutSessions = max(0, (int) ($settings['min_workout_sessions'] ?? 0));
        if ($workoutSessions < $minWorkoutSessions) {
            return ['allow' => false, 'reason' => 'insufficient_workout_sessions'];
        }

        $maxGap = (float) ($settings['max_ml_vs_heuristic_weekly_delta_kg'] ?? 0.8);
        if ($maxGap > 0 && abs($mlWeeklyRate - $heuristicWeeklyRate) > $maxGap) {
            return ['allow' => false, 'reason' => 'ml_delta_too_far_from_heuristic'];
        }

        $maxAbsRate = (float) ($settings['max_abs_ml_weekly_rate_kg'] ?? 1.2);
        if ($maxAbsRate > 0 && abs($mlWeeklyRate) > $maxAbsRate) {
            return ['allow' => false, 'reason' => 'ml_weekly_rate_out_of_bounds'];
        }

        $goalBounds = match ($goalMode) {
            'lose' => ['min' => -1.25, 'max' => -0.02],
            'gain' => ['min' => 0.02, 'max' => 0.95],
            default => ['min' => -0.35, 'max' => 0.35],
        };

        if ($mlWeeklyRate < $goalBounds['min'] || $mlWeeklyRate > $goalBounds['max']) {
            return ['allow' => false, 'reason' => 'ml_weekly_rate_conflicts_with_goal'];
        }

        return ['allow' => true];
    }

    private function confidenceRank(string $label): int
    {
        return match (strtolower(trim($label))) {
            'high' => 3,
            'medium' => 2,
            default => 1,
        };
    }

    private function predictWithTrainedModel(
        User $user,
        array $profile,
        array $context,
        array $plan,
        int $horizonDays,
        string $goalMode,
        float $currentWeight,
        float $heuristicWeeklyRate
    ): ?array {
        if (! (bool) config('ai.progress_predictor.inference.enabled', false)) {
            return null;
        }

        $scriptPath = base_path((string) config('ai.progress_predictor.inference.script', 'scripts/predict_progress_from_features.py'));
        $modelDir = base_path((string) config('ai.progress_predictor.inference.model_dir', 'storage/app/ai/models/progress_predictor_v1'));
        $pythonBin = (string) config('ai.progress_predictor.inference.python_bin', 'python');
        $timeout = (float) config('ai.progress_predictor.inference.timeout_seconds', 8);

        if (! is_file($scriptPath) || ! is_dir($modelDir) || ! is_file($modelDir.'/weight_change_model.joblib')) {
            return null;
        }

        $features = $this->buildInferenceFeatureRow(
            $user,
            $profile,
            $context,
            $plan,
            $horizonDays,
            $goalMode,
            $currentWeight,
            $heuristicWeeklyRate
        );

        $workingDir = is_dir(dirname($scriptPath)) ? dirname($scriptPath) : null;
        $process = new Process([$pythonBin, $scriptPath, '--model-dir', $modelDir], $workingDir);
        $process->setTimeout($timeout);
        $process->setInput(json_encode(['features' => $features], JSON_THROW_ON_ERROR));

        try {
            $process->run();
            if (! $process->isSuccessful()) {
                Log::warning('Progress predictor inference process failed.', [
                    'exit_code' => $process->getExitCode(),
                    'error' => trim($process->getErrorOutput()),
                ]);

                return null;
            }

            $decoded = json_decode(trim($process->getOutput()), true);
            if (! is_array($decoded) || ! ($decoded['ok'] ?? false)) {
                return null;
            }

            return [
                'model_name' => (string) ($decoded['model_name'] ?? 'hayetak_progress_predictor_v1'),
                'weight_change_kg' => is_numeric($decoded['weight_change_kg'] ?? null) ? (float) $decoded['weight_change_kg'] : null,
                'strength_progress_pct' => is_numeric($decoded['strength_progress_pct'] ?? null) ? (float) $decoded['strength_progress_pct'] : null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Progress predictor inference threw an exception; using heuristic fallback.', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function buildInferenceFeatureRow(
        User $user,
        array $profile,
        array $context,
        array $plan,
        int $horizonDays,
        string $goalMode,
        float $currentWeight,
        float $heuristicWeeklyRate
    ): array {
        $targets = is_array(data_get($plan, 'diet.daily_targets')) ? data_get($plan, 'diet.daily_targets') : [];
        $dietDays = is_array(data_get($plan, 'diet.days')) ? data_get($plan, 'diet.days') : [];
        $weeklySchedule = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        $nutritionAvg = (array) data_get($context, 'recent_history.nutrition_last_7_days.averages', []);
        $workouts7 = (array) data_get($context, 'recent_history.workouts_last_7_days', []);

        $targetCalories = $this->toIntOrNull($targets['calories_kcal'] ?? null);
        $targetProtein = $this->toIntOrNull($targets['protein_g'] ?? null);
        $avgCalories = $this->toFloatOrNull($nutritionAvg['avg_calories'] ?? null);
        $avgProtein = $this->toFloatOrNull($nutritionAvg['avg_protein_g'] ?? null);
        $avgCarbs = $this->toFloatOrNull($nutritionAvg['avg_carbs_g'] ?? null);
        $avgFat = $this->toFloatOrNull($nutritionAvg['avg_fat_g'] ?? null);
        $loggedDays = max(0, (int) ($nutritionAvg['days_logged'] ?? 0));

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

        $plannedSnackNames = [];
        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                if (strtolower(trim((string) ($meal['meal_code'] ?? ''))) !== 'snack') {
                    continue;
                }
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = strtolower(trim((string) ($item['name'] ?? '')));
                    if ($name !== '') {
                        $plannedSnackNames[] = $name;
                    }
                }
            }
        }

        $recentWorkoutFeatures = $this->recentWorkoutFeatureStats((int) $user->id);
        $snackVarietyCount = (int) DB::table('meal_entries as me')
            ->where('me.user_id', $user->id)
            ->where('me.meal_type', 'snack')
            ->whereDate('me.eaten_at', '>=', CarbonImmutable::today()->subDays(6)->toDateString())
            ->whereDate('me.eaten_at', '<=', CarbonImmutable::today()->toDateString())
            ->distinct('me.food_id')
            ->count('me.food_id');

        return [
            'horizon_days' => $horizonDays,
            'goal_mode' => $goalMode,
            'gender' => strtolower(trim((string) ($profile['gender'] ?? 'unknown'))),
            'age' => $this->toIntOrNull($profile['age'] ?? null),
            'height_cm' => $this->toIntOrNull($profile['height_cm'] ?? null),
            'diet_type' => strtolower(trim((string) ($profile['diet_type'] ?? 'unknown'))),
            'workout_location' => strtolower(trim((string) ($profile['workout_location'] ?? 'unknown'))),
            'target_workout_days_per_week' => $this->toIntOrNull($profile['workout_days_per_week'] ?? null),
            'baseline_weight_kg' => round($currentWeight, 3),
            'target_weight_change_kg' => round($heuristicWeeklyRate * max(1.0, $horizonDays / 7.0), 3),
            'target_projected_weight_kg' => round($currentWeight + ($heuristicWeeklyRate * max(1.0, $horizonDays / 7.0)), 3),
            'target_calories_kcal' => $targetCalories,
            'target_protein_g' => $targetProtein,
            'target_carbs_g' => $this->toIntOrNull($targets['carbs_g'] ?? null),
            'target_fat_g' => $this->toIntOrNull($targets['fat_g'] ?? null),
            'planned_diet_days' => count($dietDays),
            'planned_unique_snacks' => count(array_unique($plannedSnackNames)),
            'planned_workout_days' => $plannedWorkoutDays,
            'planned_exercises_per_train_day_avg' => $plannedWorkoutDays > 0 ? round($plannedExerciseCount / $plannedWorkoutDays, 2) : 0.0,
            'meal_logged_days' => $loggedDays,
            'meal_logged_days_pct' => round(($loggedDays / 7) * 100, 2),
            'meal_entry_count' => null,
            'actual_avg_calories' => $avgCalories,
            'actual_avg_protein_g' => $avgProtein,
            'actual_avg_carbs_g' => $avgCarbs,
            'actual_avg_fat_g' => $avgFat,
            'snack_variety_count' => $snackVarietyCount,
            'calorie_adherence_ratio' => ($targetCalories !== null && $targetCalories > 0 && $avgCalories !== null)
                ? round($avgCalories / $targetCalories, 4)
                : null,
            'protein_adherence_ratio' => ($targetProtein !== null && $targetProtein > 0 && $avgProtein !== null)
                ? round($avgProtein / $targetProtein, 4)
                : null,
            'workout_sessions' => (int) ($workouts7['sessions'] ?? 0),
            'workout_minutes_total' => (int) ($workouts7['minutes'] ?? 0),
            'workout_avg_minutes' => ((int) ($workouts7['sessions'] ?? 0)) > 0
                ? round(((int) ($workouts7['minutes'] ?? 0)) / ((int) ($workouts7['sessions'] ?? 0)), 3)
                : 0.0,
            'workout_set_count' => $recentWorkoutFeatures['set_count'],
            'workout_unique_exercises' => $recentWorkoutFeatures['unique_exercises'],
            'workout_volume_load_kg' => $recentWorkoutFeatures['volume_load_kg'],
            'strength_baseline_index' => $recentWorkoutFeatures['strength_baseline_index'],
            'strength_final_index' => $recentWorkoutFeatures['strength_final_index'],
            'strength_progress_pct' => $recentWorkoutFeatures['strength_progress_pct'],
        ];
    }

    private function recentWorkoutFeatureStats(int $userId): array
    {
        $end = CarbonImmutable::today()->endOfDay();
        $start = $end->subDays(6)->startOfDay();

        $setRow = DB::table('workout_log_sets as ws')
            ->join('workout_logs as wl', 'wl.id', '=', 'ws.workout_log_id')
            ->where('wl.user_id', $userId)
            ->whereBetween('wl.performed_at', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->where('ws.is_warmup', false)
            ->selectRaw('COUNT(*) as set_count')
            ->selectRaw('COUNT(DISTINCT ws.exercise_id) as unique_exercises')
            ->selectRaw('COALESCE(SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)), 0) as volume_load_kg')
            ->selectRaw('COALESCE(AVG(CASE WHEN ws.weight_kg > 0 THEN ws.weight_kg ELSE NULL END), 0) as avg_weight')
            ->first();

        $avgWeight = is_numeric($setRow->avg_weight ?? null) ? (float) $setRow->avg_weight : null;

        return [
            'set_count' => (int) ($setRow->set_count ?? 0),
            'unique_exercises' => (int) ($setRow->unique_exercises ?? 0),
            'volume_load_kg' => round((float) ($setRow->volume_load_kg ?? 0.0), 3),
            'strength_baseline_index' => $avgWeight !== null ? round($avgWeight, 3) : null,
            'strength_final_index' => $avgWeight !== null ? round($avgWeight, 3) : null,
            'strength_progress_pct' => null,
        ];
    }

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function toIntOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) round((float) $value) : null;
    }

    private function latestPreviousPrediction(User $user): ?array
    {
        $row = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->first();

        if (! $row || ! is_array($row->output_json)) {
            return null;
        }

        $prediction = data_get($row->output_json, 'progress_prediction');

        return is_array($prediction) ? $prediction : null;
    }

    private function latestKnownWeight(User $user): float
    {
        $latestMeasurement = DB::table('measurements')
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->orderByDesc('measured_at')
            ->value('weight_kg');

        $weight = is_numeric($latestMeasurement)
            ? (float) $latestMeasurement
            : (float) ($user->weight_kg ?? 70.0);

        return max(35.0, min(250.0, $weight));
    }

    private function recentPredictionErrorPerWeek(User $user): ?float
    {
        $rows = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->limit(8)
            ->get(['id', 'created_at', 'output_json']);

        if ($rows->isEmpty()) {
            return null;
        }

        $weightedError = 0.0;
        $weightTotal = 0.0;
        $index = 0;

        foreach ($rows as $row) {
            $output = is_array($row->output_json) ? $row->output_json : null;
            $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : null;
            if (! is_array($prediction)) {
                $index++;
                continue;
            }

            $horizonDays = $this->normalizePlanHorizonDays((int) ($prediction['horizon_days'] ?? 14));
            $expectedChange = (float) ($prediction['expected_weight_change_kg'] ?? 0.0);
            $predictedWeekly = ($expectedChange / $horizonDays) * 7.0;

            $startDate = CarbonImmutable::parse((string) $row->created_at)->startOfDay();
            $endDate = $startDate->addDays($horizonDays - 1);

            $baseline = is_numeric($prediction['baseline_weight_kg'] ?? null)
                ? (float) $prediction['baseline_weight_kg']
                : $this->weightOnOrBefore($user->id, $startDate);
            $endWeight = $this->weightNearTargetDate($user->id, $endDate);

            if ($baseline === null || $endWeight === null || $baseline <= 0) {
                $index++;
                continue;
            }

            $actualWeekly = (($endWeight - $baseline) / $horizonDays) * 7.0;
            $errorWeekly = $actualWeekly - $predictedWeekly;

            // More recent plans get higher influence.
            $recencyWeight = max(0.3, 1.0 - ($index * 0.1));
            $weightedError += $errorWeekly * $recencyWeight;
            $weightTotal += $recencyWeight;
            $index++;
        }

        if ($weightTotal <= 0) {
            return null;
        }

        return $weightedError / $weightTotal;
    }

    private function weightOnOrBefore(int $userId, CarbonImmutable $date): ?float
    {
        $rows = $this->measurementsForUser($userId);
        if ($rows->isEmpty()) {
            return null;
        }

        $best = null;
        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            if ($rowDate->greaterThan($date)) {
                break;
            }
            $best = (float) $row->weight_kg;
        }

        return $best;
    }

    private function weightNearTargetDate(int $userId, CarbonImmutable $targetDate): ?float
    {
        $rows = $this->measurementsForUser($userId);
        if ($rows->isEmpty()) {
            return null;
        }

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

    /**
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function measurementsForUser(int $userId): Collection
    {
        if (! array_key_exists($userId, $this->measurementCache)) {
            $this->measurementCache[$userId] = DB::table('measurements')
                ->where('user_id', $userId)
                ->whereNotNull('weight_kg')
                ->orderBy('measured_at')
                ->get(['measured_at', 'weight_kg']);
        }

        return $this->measurementCache[$userId];
    }
}
