<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\PlannerService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiPlannerBatchEval extends Command
{
    protected $signature = 'ai:planner-batch-eval
        {--roles=all : Comma-separated roles (default: all)}
        {--days=14,21,28 : Comma-separated horizon days}
        {--sleep-ms=0 : Delay between runs in milliseconds}
        {--limit=0 : Max users to process (0 means all)}
        {--from-user-id=0 : Optional minimum user id}
        {--to-user-id=0 : Optional maximum user id}
        {--out-dir=tmp : Output directory for JSON/CSV/Markdown reports}';

    protected $description = 'Run planner generation across users and emit per-run quality percentages.';

    public function handle(PlannerService $planner, PlannerRunQualityScorer $scorer): int
    {
        $days = $this->parseDays((string) $this->option('days'));
        $roles = $this->parseRoles((string) $this->option('roles'));
        $sleepMs = max(0, (int) $this->option('sleep-ms'));
        $limit = max(0, (int) $this->option('limit'));
        $fromUserId = max(0, (int) $this->option('from-user-id'));
        $toUserId = max(0, (int) $this->option('to-user-id'));
        $outDir = base_path((string) $this->option('out-dir'));

        File::ensureDirectoryExists($outDir);

        $query = User::query()->orderBy('id');
        if ($roles !== []) {
            $query->whereIn('role', $roles);
        }
        if ($fromUserId > 0) {
            $query->where('id', '>=', $fromUserId);
        }
        if ($toUserId > 0) {
            $query->where('id', '<=', $toUserId);
        }
        if ($limit > 0) {
            $query->limit($limit);
        }

        $users = $query->get(['id', 'name', 'email', 'role']);
        $startedAt = CarbonImmutable::now('UTC');
        $stamp = $startedAt->format('Ymd_His');

        $csvPath = $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_{$stamp}.csv";
        $jsonPath = $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_{$stamp}.json";
        $mdPath = $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_{$stamp}.md";

        $csv = fopen($csvPath, 'wb');
        if ($csv === false) {
            $this->error("Could not create CSV file at {$csvPath}");

            return self::FAILURE;
        }

        fputcsv($csv, [
            'run_index',
            'user_id',
            'email',
            'role',
            'horizon_days',
            'status',
            'provider',
            'model',
            'duration_ms',
            'quality_percentage',
            'quality_passed_checks',
            'quality_total_checks',
            'diet_days_count',
            'workout_days_count',
            'review_after_days',
            'error_type',
            'error_message',
        ]);

        $rows = [];
        $failures = [];
        $runIndex = 0;
        $qualitySum = 0.0;
        $qualityCount = 0;

        foreach ($users as $user) {
            foreach ($days as $day) {
                $runIndex++;
                $start = microtime(true);
                $status = 'success';
                $provider = null;
                $model = null;
                $quality = [
                    'quality_percentage' => 0.0,
                    'passed_checks' => 0,
                    'total_checks' => 0,
                    'checks' => [],
                ];
                $dietDaysCount = 0;
                $workoutDaysCount = 0;
                $reviewAfterDays = 0;
                $errorType = null;
                $errorMessage = null;

                try {
                    $result = $planner->generate($user, [
                        'regenerate' => true,
                        'reason' => "planner_batch_eval_{$day}d_{$stamp}",
                        'created_by' => (int) $user->id,
                        'plan_horizon_days' => $day,
                    ]);

                    $plan = is_array($result['plan'] ?? null) ? $result['plan'] : [];
                    $provider = (string) ($result['provider'] ?? '');
                    $model = (string) ($result['model'] ?? '');
                    $dietDaysCount = is_array(data_get($plan, 'diet.days')) ? count(data_get($plan, 'diet.days')) : 0;
                    $workoutDaysCount = is_array(data_get($plan, 'workout.weekly_schedule')) ? count(data_get($plan, 'workout.weekly_schedule')) : 0;
                    $reviewAfterDays = (int) data_get($plan, 'adaptive_review.review_after_days', 0);

                    $quality = $scorer->score($user, $plan, $day);
                    $qualitySum += (float) ($quality['quality_percentage'] ?? 0.0);
                    $qualityCount++;
                } catch (\Throwable $e) {
                    $status = 'error';
                    $errorType = $e::class;
                    $errorMessage = mb_substr(trim(str_replace(["\r", "\n"], ' ', $e->getMessage())), 0, 500);
                    $failures[] = [
                        'user_id' => (int) $user->id,
                        'email' => (string) $user->email,
                        'role' => (string) $user->role,
                        'horizon_days' => $day,
                        'error_type' => $errorType,
                        'error_message' => $errorMessage,
                    ];
                }

                $durationMs = (int) round((microtime(true) - $start) * 1000);

                $row = [
                    'run_index' => $runIndex,
                    'user_id' => (int) $user->id,
                    'email' => (string) $user->email,
                    'role' => (string) $user->role,
                    'horizon_days' => $day,
                    'status' => $status,
                    'provider' => $provider,
                    'model' => $model,
                    'duration_ms' => $durationMs,
                    'quality_percentage' => (float) ($quality['quality_percentage'] ?? 0.0),
                    'quality_passed_checks' => (int) ($quality['passed_checks'] ?? 0),
                    'quality_total_checks' => (int) ($quality['total_checks'] ?? 0),
                    'diet_days_count' => $dietDaysCount,
                    'workout_days_count' => $workoutDaysCount,
                    'review_after_days' => $reviewAfterDays,
                    'error_type' => $errorType,
                    'error_message' => $errorMessage,
                ];

                $rows[] = $row;
                fputcsv($csv, array_values($row));

                $this->line(sprintf(
                    '[%d/%d] user=%d day=%d status=%s quality=%0.2f%% duration_ms=%d',
                    $runIndex,
                    max(1, $users->count() * count($days)),
                    (int) $user->id,
                    $day,
                    $status,
                    (float) $row['quality_percentage'],
                    $durationMs
                ));

                if ($sleepMs > 0) {
                    usleep($sleepMs * 1000);
                }
            }
        }

        fclose($csv);

        $successRuns = count(array_filter($rows, static fn (array $row): bool => $row['status'] === 'success'));
        $failedRuns = count($rows) - $successRuns;
        $summary = [
            'generated_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            'filters' => [
                'roles' => $roles === [] ? ['all'] : $roles,
                'days' => $days,
                'limit' => $limit,
                'from_user_id' => $fromUserId > 0 ? $fromUserId : null,
                'to_user_id' => $toUserId > 0 ? $toUserId : null,
            ],
            'runs_total' => count($rows),
            'runs_success' => $successRuns,
            'runs_failed' => $failedRuns,
            'success_percentage' => count($rows) > 0 ? round(($successRuns / count($rows)) * 100, 2) : 0.0,
            'average_quality_percentage' => $qualityCount > 0 ? round($qualitySum / $qualityCount, 2) : 0.0,
            'csv_path' => $csvPath,
            'failures' => $failures,
        ];

        File::put($jsonPath, json_encode([
            'summary' => $summary,
            'rows' => $rows,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        File::put($mdPath, $this->renderMarkdown($summary, $failures));

        $this->info("CSV report: {$csvPath}");
        $this->info("JSON report: {$jsonPath}");
        $this->info("Markdown report: {$mdPath}");
        $this->info('Planner run success: '.number_format((float) $summary['success_percentage'], 2).'%');
        $this->info('Planner average quality: '.number_format((float) $summary['average_quality_percentage'], 2).'%');

        return self::SUCCESS;
    }

    /**
     * @return array<int, int>
     */
    private function parseDays(string $raw): array
    {
        $items = array_values(array_filter(array_map('trim', explode(',', $raw))));
        if ($items === []) {
            return [14, 21, 28];
        }

        $days = array_map(function (string $item): int {
            $n = (int) $item;
            if ($n <= 14) {
                return 14;
            }
            if ($n <= 21) {
                return 21;
            }

            return 28;
        }, $items);

        $days = array_values(array_unique($days));
        sort($days);

        return $days;
    }

    /**
     * @return array<int, string>
     */
    private function parseRoles(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '' || strtolower($raw) === 'all') {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (string $role): string => trim($role),
            explode(',', $raw)
        )));
    }

    /**
     * @param  array<string, mixed>  $summary
     * @param  array<int, array<string, mixed>>  $failures
     */
    private function renderMarkdown(array $summary, array $failures): string
    {
        $lines = [];
        $lines[] = '# Planner Batch Eval Report';
        $lines[] = '';
        $lines[] = '- Generated at: '.(string) ($summary['generated_at'] ?? '');
        $lines[] = '- Runs total: '.(int) ($summary['runs_total'] ?? 0);
        $lines[] = '- Runs success: '.(int) ($summary['runs_success'] ?? 0);
        $lines[] = '- Runs failed: '.(int) ($summary['runs_failed'] ?? 0);
        $lines[] = '- Success percentage: '.number_format((float) ($summary['success_percentage'] ?? 0), 2).'%';
        $lines[] = '- Average quality percentage: '.number_format((float) ($summary['average_quality_percentage'] ?? 0), 2).'%';
        $lines[] = '- CSV: `'.(string) ($summary['csv_path'] ?? '').'`';

        if ($failures !== []) {
            $lines[] = '';
            $lines[] = '## Failures';
            $lines[] = '';
            $lines[] = '| User ID | Email | Role | Horizon | Error Type | Error Message |';
            $lines[] = '|---:|---|---|---:|---|---|';
            foreach ($failures as $failure) {
                $lines[] = sprintf(
                    '| %d | %s | %s | %d | %s | %s |',
                    (int) ($failure['user_id'] ?? 0),
                    str_replace('|', '\\|', (string) ($failure['email'] ?? '')),
                    str_replace('|', '\\|', (string) ($failure['role'] ?? '')),
                    (int) ($failure['horizon_days'] ?? 0),
                    str_replace('|', '\\|', (string) ($failure['error_type'] ?? '')),
                    str_replace('|', '\\|', (string) ($failure['error_message'] ?? ''))
                );
            }
        }

        return implode("\n", $lines)."\n";
    }
}
