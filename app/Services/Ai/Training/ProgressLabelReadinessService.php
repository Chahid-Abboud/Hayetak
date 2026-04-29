<?php

namespace App\Services\Ai\Training;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProgressLabelReadinessService
{
    /** @var array<int, \Illuminate\Support\Collection<int, object>> */
    private array $measurementCache = [];

    /** @var array<int, ?float> */
    private array $userWeightCache = [];

    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, mixed>  $output
     */
    public function resolveHorizonDays(array $context, array $output): int
    {
        $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : [];

        return $this->normalizePlanHorizonDays(
            (int) (
                $prediction['horizon_days']
                ?? data_get($output, 'adaptive_review.review_after_days')
                ?? data_get($context, 'planning_constraints.plan_horizon_days')
                ?? 14
            )
        );
    }

    public function normalizePlanHorizonDays(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    public function expectedEndDate(CarbonImmutable $generationDate, int $horizonDays): CarbonImmutable
    {
        return $generationDate->addDays(max(1, $horizonDays) - 1);
    }

    /**
     * @return array{weight: float, date: string, source: string}|null
     */
    public function baselineMeasurement(int $userId, CarbonImmutable $generationDate): ?array
    {
        $rows = $this->measurementsForUser($userId);
        if ($rows->isEmpty()) {
            return null;
        }

        $bestDate = null;
        $bestWeight = null;

        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            if ($rowDate->greaterThan($generationDate)) {
                break;
            }

            $bestDate = $rowDate->toDateString();
            $bestWeight = (float) $row->weight_kg;
        }

        if ($bestDate !== null && $bestWeight !== null) {
            return [
                'weight' => $bestWeight,
                'date' => $bestDate,
                'source' => 'measurement',
            ];
        }

        // Fallback to first measurement within +3 days of generation date.
        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            $deltaDays = (int) floor(($rowDate->getTimestamp() - $generationDate->getTimestamp()) / 86400);
            if ($deltaDays >= 0 && $deltaDays <= 3) {
                return [
                    'weight' => (float) $row->weight_kg,
                    'date' => $rowDate->toDateString(),
                    'source' => 'measurement',
                ];
            }
        }

        return null;
    }

    /**
     * @return array{weight: float, date: string, source: string}|null
     */
    public function baselineWithFallback(
        int $userId,
        CarbonImmutable $generationDate,
        ?float $predictionBaseline = null,
        ?float $profileWeight = null
    ): ?array {
        $baseline = $this->baselineMeasurement($userId, $generationDate);
        if ($baseline !== null) {
            return $baseline;
        }

        if ($predictionBaseline !== null && $predictionBaseline > 0) {
            return [
                'weight' => $predictionBaseline,
                'date' => $generationDate->toDateString(),
                'source' => 'prediction_baseline',
            ];
        }

        if ($profileWeight !== null && $profileWeight > 0) {
            return [
                'weight' => $profileWeight,
                'date' => $generationDate->toDateString(),
                'source' => 'profile_weight',
            ];
        }

        $userWeight = $this->userWeight($userId);
        if ($userWeight !== null && $userWeight > 0) {
            return [
                'weight' => $userWeight,
                'date' => $generationDate->toDateString(),
                'source' => 'user_weight',
            ];
        }

        return null;
    }

    /**
     * @return array{weight: float, date: string, source: string}|null
     */
    public function endMeasurement(int $userId, CarbonImmutable $targetDate): ?array
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
                $best = [
                    'weight' => (float) $row->weight_kg,
                    'date' => $rowDate->toDateString(),
                    'source' => 'measurement',
                ];
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

    private function userWeight(int $userId): ?float
    {
        if (! array_key_exists($userId, $this->userWeightCache)) {
            $value = DB::table('users')->where('id', $userId)->value('weight_kg');
            $this->userWeightCache[$userId] = is_numeric($value) ? (float) $value : null;
        }

        return $this->userWeightCache[$userId];
    }
}
