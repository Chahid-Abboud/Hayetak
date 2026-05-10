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
    public function weightHistory(int $userId): array
    {
        return Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->orderBy('measured_at')
            ->get(['measured_at', 'weight_kg'])
            ->map(static fn (Measurement $measurement): array => [
                'date' => CarbonImmutable::parse((string) $measurement->measured_at)->toDateString(),
                'type' => 'weight',
                'value' => round((float) $measurement->weight_kg, 2),
            ])
            ->values()
            ->all();
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
    public function recentPredictionTrend(int $userId, int $limit = 10): array
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

            $rows[] = [
                'plan_date' => $planDate->toDateString(),
                'feedback_period_start_date' => $planDate->toDateString(),
                'feedback_period_end_date' => $expectedEndDate->toDateString(),
                'horizon_days' => $horizonDays,
                'baseline_weight_kg' => round((float) $baselineWeight, 3),
                'projected_before_feedback_kg' => round((float) $projectedBeforeFeedback, 3),
                'projected_after_feedback_kg' => round((float) $projectedWeight, 3),
                'projected_weight_kg' => round((float) $projectedWeight, 3),
                'feedback_applied' => abs($projectedWeight - $projectedBeforeFeedback) >= 0.01,
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
