<?php

namespace App\Services\Ai;

use App\Models\AiRequest;
use App\Models\Measurement;
use Carbon\CarbonImmutable;

class ProgressPredictionTimelineService
{
    /**
     * @return array<int, array{date:string,type:string,value:float}>
     */
    public function recentTrustedWeights(int $userId, int $limit = 2): array
    {
        return $this->realWeightMeasurementsQuery($userId)
            ->reorder('measured_at', 'desc')
            ->limit(max(1, $limit))
            ->get()
            ->reverse()
            ->values()
            ->map(static fn (Measurement $measurement): array => [
                'date' => CarbonImmutable::parse((string) $measurement->measured_at)->toDateString(),
                'type' => 'weight',
                'value' => round((float) $measurement->weight_kg, 2),
            ])
            ->all();
    }

    /**
     * Build one predictor point per completed planner run.
     *
     * Each point represents the selected 14/21/28-day check-in window for the
     * specific plan generation date. This keeps the timeline anchored to the
     * user's real last logged weight at the time that plan was created instead of
     * expanding one plan into repeated future checkpoints.
     *
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
     *   feedback_sample_count:int,
     *   actual_weight_kg:float|null,
     *   actual_weight_date:string|null
     * }>
     */
    public function recentPredictionTrend(int $userId, int $limit = 10): array
    {
        $requests = AiRequest::query()
            ->where('user_id', $userId)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->limit(max(1, $limit))
            ->get(['id', 'created_at', 'output_json']);

        if ($requests->isEmpty()) {
            return [];
        }

        $measurements = $this->weightMeasurementsQuery($userId)
            ->get();
        $realMeasurements = $this->realWeightMeasurementsQuery($userId)
            ->get();
        $rows = [];

        foreach ($requests->reverse()->values() as $request) {
            $output = is_array($request->output_json) ? $request->output_json : [];
            $prediction = is_array($output['progress_prediction'] ?? null)
                ? $output['progress_prediction']
                : null;

            if (! is_array($prediction)) {
                continue;
            }

            $horizonDays = $this->normalizePlanHorizonDays((int) ($prediction['horizon_days'] ?? 14));
            $planDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
            $periodEnd = $planDate->addDays(max(1, $horizonDays) - 1);
            $weeksPerWindow = max(1.0, $horizonDays / 7.0);

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
                    $projectedWeight = $baselineWeight + ($adjustedWeeklyRate * $weeksPerWindow);
                }
            }

            if ($projectedWeight === null) {
                continue;
            }

            $projectedBeforeFeedback = $baseWeeklyRate !== null
                ? $baselineWeight + ($baseWeeklyRate * $weeksPerWindow)
                : $projectedWeight;

            $actualWeightMatch = $this->weightNearTargetDateFromRows($realMeasurements, $periodEnd);

            $rows[] = [
                'plan_date' => $planDate->toDateString(),
                'feedback_period_start_date' => $planDate->toDateString(),
                'feedback_period_end_date' => $periodEnd->toDateString(),
                'horizon_days' => $horizonDays,
                'baseline_weight_kg' => round((float) $baselineWeight, 3),
                'projected_before_feedback_kg' => round((float) $projectedBeforeFeedback, 3),
                'projected_after_feedback_kg' => round((float) $projectedWeight, 3),
                'projected_weight_kg' => round((float) $projectedWeight, 3),
                'feedback_applied' => abs($projectedWeight - $projectedBeforeFeedback) >= 0.01,
                'feedback_sample_count' => (int) ($feedback['feedback_sample_count'] ?? 0),
                'actual_weight_kg' => isset($actualWeightMatch['weight_kg'])
                    ? round((float) $actualWeightMatch['weight_kg'], 3)
                    : null,
                'actual_weight_date' => $actualWeightMatch['measured_at'] ?? null,
            ];
        }

        return $rows;
    }

    public function predictionSummary(int $userId): array
    {
        $totalWeightMeasurements = $this->weightMeasurementsQuery($userId)->count();
        $realWeightMeasurements = $this->realWeightMeasurementsQuery($userId)->count();
        $syntheticWeightMeasurements = max(0, $totalWeightMeasurements - $realWeightMeasurements);

        return [
            'prediction_only' => true,
            'real_weight_history_count' => $realWeightMeasurements,
            'synthetic_weight_history_count' => $syntheticWeightMeasurements,
            'actual_comparison_available' => $realWeightMeasurements >= 2,
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

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function weightMeasurementsQuery(int $userId)
    {
        return Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->orderBy('measured_at')
            ->select(['measured_at', 'weight_kg', 'notes']);
    }

    private function realWeightMeasurementsQuery(int $userId)
    {
        return $this->weightMeasurementsQuery($userId)
            ->where(static function ($query): void {
                $query->whereNull('notes')
                    ->orWhere('notes', 'not like', 'synthetic_%');
            });
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
