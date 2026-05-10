<?php

namespace App\Console\Commands\Ai;

use App\Models\AiRequest;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class AiListProgressLabelReadiness extends Command
{
    protected $signature = 'ai:list-progress-label-readiness
        {--from= : Filter generation date >= YYYY-MM-DD}
        {--to= : Filter generation date <= YYYY-MM-DD}
        {--user-id=0 : Restrict to one user id}
        {--limit=200 : Max rows to display}
        {--only-pending=0 : Show only pending rows}
        {--only-ready=0 : Show only ready rows}
    ';

    protected $description = 'List which planner generations are label-ready vs pending for progress-model training';

    public function handle(ProgressLabelReadinessService $readiness): int
    {
        $from = trim((string) $this->option('from'));
        $to = trim((string) $this->option('to'));
        $userId = max(0, (int) $this->option('user-id'));
        $limit = max(1, (int) $this->option('limit'));
        $onlyPending = ((int) $this->option('only-pending')) === 1;
        $onlyReady = ((int) $this->option('only-ready')) === 1;

        $query = AiRequest::query()
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('input_context_json')
            ->whereNotNull('output_json')
            ->orderByDesc('id');

        if ($userId > 0) {
            $query->where('user_id', $userId);
        }
        if ($from !== '') {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to !== '') {
            $query->whereDate('created_at', '<=', $to);
        }

        $headers = [
            'ai_request_id',
            'user_id',
            'generation_date',
            'horizon_days',
            'expected_end_date',
            'baseline_weight_found',
            'end_weight_found',
            'has_weight_label',
            'baseline_measurement_date',
            'end_measurement_date',
            'missing_reason',
            'next_needed_action',
        ];

        $rows = [];
        $scanned = 0;
        $ready = 0;
        $pending = 0;
        $pendingByReason = [
            'missing_baseline' => 0,
            'missing_end' => 0,
            'missing_both' => 0,
        ];

        foreach ($query->cursor() as $request) {
            $scanned++;
            $context = $this->decodeArray($request->input_context_json);
            $output = $this->decodeArray($request->output_json);

            $generationDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
            $horizonDays = $readiness->resolveHorizonDays($context, $output);
            $expectedEndDate = $readiness->expectedEndDate($generationDate, $horizonDays);

            $profileWeight = $this->toFloatOrNull(data_get($context, 'profile.weight_kg'));
            $predictionBaseline = $this->toFloatOrNull(data_get($output, 'progress_prediction.baseline_weight_kg'));

            $baseline = $readiness->baselineWithFallback(
                (int) $request->user_id,
                $generationDate,
                $predictionBaseline,
                $profileWeight
            );
            $end = $readiness->endMeasurement((int) $request->user_id, $expectedEndDate);

            $baselineFound = $baseline !== null;
            $endFound = $end !== null;
            $hasWeightLabel = $baselineFound && $endFound;
            $missingReason = $this->missingReason($baselineFound, $endFound);

            if ($hasWeightLabel) {
                $ready++;
            } else {
                $pending++;
                if (isset($pendingByReason[$missingReason])) {
                    $pendingByReason[$missingReason]++;
                }
            }

            if ($onlyReady && ! $hasWeightLabel) {
                continue;
            }
            if ($onlyPending && $hasWeightLabel) {
                continue;
            }

            $rows[] = [
                (int) $request->id,
                (int) $request->user_id,
                $generationDate->toDateString(),
                $horizonDays,
                $expectedEndDate->toDateString(),
                $baselineFound ? 1 : 0,
                $endFound ? 1 : 0,
                $hasWeightLabel ? 1 : 0,
                $baselineFound && ($baseline['source'] ?? '') === 'measurement' ? (string) $baseline['date'] : null,
                $endFound ? (string) $end['date'] : null,
                $hasWeightLabel ? 'none' : $missingReason,
                $this->nextNeededAction($hasWeightLabel, $missingReason, $expectedEndDate),
            ];

            if (count($rows) >= $limit) {
                break;
            }
        }

        $this->table($headers, $rows);
        $this->line("Total scanned: {$scanned}");
        $this->line("Ready rows: {$ready}");
        $this->line("Pending rows: {$pending}");
        $this->line("Pending by reason - missing_baseline: {$pendingByReason['missing_baseline']}");
        $this->line("Pending by reason - missing_end: {$pendingByReason['missing_end']}");
        $this->line("Pending by reason - missing_both: {$pendingByReason['missing_both']}");

        return self::SUCCESS;
    }

    private function missingReason(bool $baselineFound, bool $endFound): string
    {
        if (! $baselineFound && ! $endFound) {
            return 'missing_both';
        }
        if (! $baselineFound) {
            return 'missing_baseline';
        }
        if (! $endFound) {
            return 'missing_end';
        }

        return 'none';
    }

    private function nextNeededAction(bool $ready, string $missingReason, CarbonImmutable $expectedEndDate): string
    {
        if ($ready) {
            return 'Ready for supervised export.';
        }

        return match ($missingReason) {
            'missing_baseline' => 'Add a baseline weight measurement on or near generation date.',
            'missing_both' => 'Add baseline and end-window measurements.',
            default => 'Log an end-window weight measurement near '.$expectedEndDate->toDateString().'.',
        };
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
}
