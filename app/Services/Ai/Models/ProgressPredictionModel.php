<?php

namespace App\Services\Ai\Models;

use App\Models\AiRequest;
use App\Models\User;

class ProgressPredictionModel
{
    public function predict(User $user, array $profile, array $context, array $plan, int $horizonDays): array
    {
        $horizonDays = $this->normalizePlanHorizonDays($horizonDays);
        $weeks = max(1.0, $horizonDays / 7.0);
        $currentWeight = max(35.0, min(250.0, (float) ($user->weight_kg ?? 70.0)));
        $goalMode = $this->goalMode($profile);

        $baseWeeklyRate = $this->baseWeeklyRateKg($goalMode, $profile);
        $adherenceMultiplier = $this->adherenceMultiplier($context, $plan, $profile);
        $adjustedWeeklyRate = $baseWeeklyRate * $adherenceMultiplier;

        $previous = $this->latestPreviousPrediction($user);
        $feedbackDelta = null;
        if (is_array($previous)) {
            $priorProjected = (float) ($previous['projected_body_weight_kg'] ?? $currentWeight);
            $priorWeeks = max(1.0, ((int) ($previous['horizon_days'] ?? 14)) / 7.0);
            $feedbackDelta = ($currentWeight - $priorProjected) / $priorWeeks;

            // If user underperformed or overperformed the last projection, adapt next rate.
            $adjustedWeeklyRate += ($goalMode === 'lose' ? -1 : 1) * ($feedbackDelta * 0.35);
        }

        $adjustedWeeklyRate = $this->clampWeeklyRate($adjustedWeeklyRate, $goalMode);
        $expectedWeightChange = round($adjustedWeeklyRate * $weeks, 2);
        $projectedWeight = round($currentWeight + $expectedWeightChange, 2);

        $strengthGainWeekly = $this->strengthWeeklyGainPercent($goalMode, $adherenceMultiplier);
        $strengthProjection = [
            'upper_body_compound_pct' => round($strengthGainWeekly * $weeks, 1),
            'lower_body_compound_pct' => round(($strengthGainWeekly + 0.2) * $weeks, 1),
        ];

        return [
            'model_name' => 'hayetak_progress_predictor_v1',
            'horizon_days' => $horizonDays,
            'baseline_weight_kg' => round($currentWeight, 2),
            'expected_weight_change_kg' => $expectedWeightChange,
            'projected_body_weight_kg' => $projectedWeight,
            'strength_projection' => $strengthProjection,
            'confidence' => $this->confidenceLabel($adherenceMultiplier, $feedbackDelta),
            'feedback_adjustment' => [
                'base_weekly_weight_change_kg' => round($baseWeeklyRate, 2),
                'adjusted_weekly_weight_change_kg' => round($adjustedWeeklyRate, 2),
                'last_prediction_error_kg_per_week' => $feedbackDelta !== null ? round($feedbackDelta, 2) : null,
                'notes' => 'Prediction auto-adjusts using adherence signals and prior projection error.',
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
}

