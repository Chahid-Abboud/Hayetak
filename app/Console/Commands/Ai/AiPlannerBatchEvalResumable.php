<?php

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\PlannerService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiPlannerBatchEvalResumable extends Command
{
    protected $signature = 'ai:planner-batch-eval-resumable
        {--roles=all : Comma-separated roles (default: all)}
        {--days=14,21,28 : Comma-separated horizon days}
        {--sleep-ms=0 : Delay between runs in milliseconds}
        {--limit=0 : Max users to process (0 means all)}
        {--from-user-id=0 : Optional minimum user id}
        {--to-user-id=0 : Optional maximum user id}
        {--out-dir=tmp : Output directory for reports/state}
        {--state-file= : Optional explicit state file path}
        {--batch-minutes=45 : Time budget per invocation}
        {--batch-seconds=0 : Optional explicit time budget in seconds (overrides batch-minutes)}
        {--reset=0 : Reset progress and start from beginning (1/0)}';

    protected $description = 'Run planner batch evaluation in resumable time-boxed batches.';

    public function handle(PlannerService $planner, PlannerRunQualityScorer $scorer): int
    {
        $days = $this->parseDays((string) $this->option('days'));
        $roles = $this->parseRoles((string) $this->option('roles'));
        $sleepMs = max(0, (int) $this->option('sleep-ms'));
        $limit = max(0, (int) $this->option('limit'));
        $fromUserId = max(0, (int) $this->option('from-user-id'));
        $toUserId = max(0, (int) $this->option('to-user-id'));
        $reset = ((int) $this->option('reset')) === 1;

        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $statePathRaw = trim((string) $this->option('state-file'));
        $statePath = $statePathRaw !== ''
            ? $this->resolvePath($statePathRaw, $outDir)
            : $outDir.DIRECTORY_SEPARATOR.'planner_batch_eval_resumable_state.json';

        $batchSecondsOption = (int) $this->option('batch-seconds');
        $batchSeconds = $batchSecondsOption > 0
            ? $batchSecondsOption
            : max(1, (int) round(max(1, (int) $this->option('batch-minutes')) * 60));

        $filters = [
            'roles' => $roles === [] ? ['all'] : $roles,
            'days' => $days,
            'limit' => $limit,
            'from_user_id' => $fromUserId > 0 ? $fromUserId : null,
            'to_user_id' => $toUserId > 0 ? $toUserId : null,
        ];

        $users = $this->resolveUsers($roles, $limit, $fromUserId, $toUserId);
        if ($users->isEmpty()) {
            $this->warn('No users matched the selected filters.');

            return self::SUCCESS;
        }

        $state = $this->loadOrCreateState($statePath, $outDir, $filters, $reset);
        if (($state['completed'] ?? false) === true) {
            $this->info('Batch evaluation already completed.');
            $this->line('State file: '.$statePath);
            $this->line('Use --reset=1 to start a fresh run.');

            return self::SUCCESS;
        }

        $this->assertCompatibleState($state, $filters);
        $this->ensureCsvWithHeader((string) data_get($state, 'files.csv'));

        $totalCombos = $users->count() * count($days);
        $cursorUserIndex = (int) data_get($state, 'cursor.user_index', 0);
        $cursorDayIndex = (int) data_get($state, 'cursor.day_index', 0);
        $runIndex = (int) data_get($state, 'stats.runs_total', 0);

        $invocationStarted = microtime(true);
        $runsProcessedThisInvocation = 0;

        for ($userIndex = $cursorUserIndex; $userIndex < $users->count(); $userIndex++) {
            /** @var User $user */
            $user = $users[$userIndex];
            $startDayIndex = $userIndex === $cursorUserIndex ? $cursorDayIndex : 0;

            for ($dayIndex = $startDayIndex; $dayIndex < count($days); $dayIndex++) {
                if ($runsProcessedThisInvocation > 0 && (microtime(true) - $invocationStarted) >= $batchSeconds) {
                    data_set($state, 'cursor.user_index', $userIndex);
                    data_set($state, 'cursor.day_index', $dayIndex);
                    data_set($state, 'last_invocation', [
                        'finished_at' => CarbonImmutable::now('UTC')->toIso8601String(),
                        'batch_seconds' => $batchSeconds,
                        'runs_processed' => $runsProcessedThisInvocation,
                        'status' => 'time_budget_reached',
                    ]);
                    $this->persistStateAndSummary($state, $statePath);
                    $this->info('Batch time budget reached. Progress saved.');
                    $this->line(sprintf(
                        'Resume cursor: user_index=%d, day_index=%d, completed_runs=%d/%d',
                        $userIndex,
                        $dayIndex,
                        (int) data_get($state, 'stats.runs_total', 0),
                        $totalCombos
                    ));

                    return self::SUCCESS;
                }

                $horizon = (int) $days[$dayIndex];
                $runIndex++;
                $status = 'success';
                $provider = null;
                $model = null;
                $quality = [
                    'quality_percentage' => 0.0,
                    'passed_checks' => 0,
                    'total_checks' => 0,
                ];
                $dietDaysCount = 0;
                $workoutDaysCount = 0;
                $reviewAfterDays = 0;
                $errorType = null;
                $errorMessage = null;
                $started = microtime(true);

                try {
                    $result = $planner->generate($user, [
                        'regenerate' => true,
                        'reason' => 'planner_batch_eval_resumable_'.$horizon.'d_'.(string) data_get($state, 'run_id'),
                        'created_by' => (int) $user->id,
                        'plan_horizon_days' => $horizon,
                    ]);

                    $plan = is_array($result['plan'] ?? null) ? $result['plan'] : [];
                    $provider = (string) ($result['provider'] ?? '');
                    $model = (string) ($result['model'] ?? '');
                    $dietDaysCount = is_array(data_get($plan, 'diet.days')) ? count(data_get($plan, 'diet.days')) : 0;
                    $workoutDaysCount = is_array(data_get($plan, 'workout.weekly_schedule')) ? count(data_get($plan, 'workout.weekly_schedule')) : 0;
                    $reviewAfterDays = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
                    $quality = $scorer->score($user, $plan, $horizon);

                    data_set($state, 'stats.runs_success', (int) data_get($state, 'stats.runs_success', 0) + 1);
                    data_set($state, 'stats.quality_sum', (float) data_get($state, 'stats.quality_sum', 0.0) + (float) ($quality['quality_percentage'] ?? 0.0));
                    data_set($state, 'stats.quality_count', (int) data_get($state, 'stats.quality_count', 0) + 1);
                } catch (\Throwable $e) {
                    $status = 'error';
                    $errorType = $e::class;
                    $errorMessage = mb_substr(trim(str_replace(["\r", "\n"], ' ', $e->getMessage())), 0, 500);

                    data_set($state, 'stats.runs_failed', (int) data_get($state, 'stats.runs_failed', 0) + 1);
                    $failures = (array) data_get($state, 'failures', []);
                    $failures[] = [
                        'user_id' => (int) $user->id,
                        'email' => (string) $user->email,
                        'role' => (string) $user->role,
                        'horizon_days' => $horizon,
                        'error_type' => $errorType,
                        'error_message' => $errorMessage,
                    ];
                    data_set($state, 'failures', $failures);
                }

                $durationMs = (int) round((microtime(true) - $started) * 1000);
                $row = [
                    'run_index' => $runIndex,
                    'user_id' => (int) $user->id,
                    'email' => (string) $user->email,
                    'role' => (string) $user->role,
                    'horizon_days' => $horizon,
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

                $this->appendCsvRow((string) data_get($state, 'files.csv'), $row);
                $this->appendJsonlRow((string) data_get($state, 'files.jsonl'), $row);

                data_set($state, 'stats.runs_total', (int) data_get($state, 'stats.runs_total', 0) + 1);
                $runsProcessedThisInvocation++;

                $nextDayIndex = $dayIndex + 1;
                if ($nextDayIndex < count($days)) {
                    data_set($state, 'cursor.user_index', $userIndex);
                    data_set($state, 'cursor.day_index', $nextDayIndex);
                } else {
                    data_set($state, 'cursor.user_index', $userIndex + 1);
                    data_set($state, 'cursor.day_index', 0);
                }

                $this->persistStateAndSummary($state, $statePath);

                $this->line(sprintf(
                    '[%d/%d] user=%d day=%d status=%s quality=%0.2f%% duration_ms=%d',
                    (int) data_get($state, 'stats.runs_total', 0),
                    $totalCombos,
                    (int) $user->id,
                    $horizon,
                    $status,
                    (float) $row['quality_percentage'],
                    $durationMs
                ));

                if ($sleepMs > 0) {
                    usleep($sleepMs * 1000);
                }
            }
        }

        data_set($state, 'completed', true);
        data_set($state, 'cursor.user_index', $users->count());
        data_set($state, 'cursor.day_index', 0);
        data_set($state, 'last_invocation', [
            'finished_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            'batch_seconds' => $batchSeconds,
            'runs_processed' => $runsProcessedThisInvocation,
            'status' => 'completed',
        ]);

        $this->persistStateAndSummary($state, $statePath);

        $this->info('Planner resumable batch evaluation completed.');
        $this->line('State file: '.$statePath);
        $this->line('CSV report: '.(string) data_get($state, 'files.csv'));
        $this->line('JSONL rows: '.(string) data_get($state, 'files.jsonl'));
        $this->line('Summary JSON: '.(string) data_get($state, 'files.summary_json'));
        $this->line('Summary Markdown: '.(string) data_get($state, 'files.summary_md'));

        return self::SUCCESS;
    }

    private function resolvePath(string $path, string $outDir): string
    {
        if (str_starts_with($path, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:\\\\/', $path) === 1) {
            return $path;
        }

        return $outDir.DIRECTORY_SEPARATOR.$path;
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function resolveUsers(array $roles, int $limit, int $fromUserId, int $toUserId)
    {
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

        return $query->get(['id', 'name', 'email', 'role']);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function loadOrCreateState(string $statePath, string $outDir, array $filters, bool $reset): array
    {
        if (! $reset && File::exists($statePath)) {
            $decoded = json_decode((string) File::get($statePath), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $stamp = CarbonImmutable::now('UTC')->format('Ymd_His');
        $state = [
            'run_id' => $stamp,
            'created_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            'completed' => false,
            'filters' => $filters,
            'cursor' => [
                'user_index' => 0,
                'day_index' => 0,
            ],
            'stats' => [
                'runs_total' => 0,
                'runs_success' => 0,
                'runs_failed' => 0,
                'quality_sum' => 0.0,
                'quality_count' => 0,
            ],
            'failures' => [],
            'files' => [
                'csv' => $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_resumable_{$stamp}.csv",
                'jsonl' => $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_resumable_{$stamp}.jsonl",
                'summary_json' => $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_resumable_{$stamp}.summary.json",
                'summary_md' => $outDir.DIRECTORY_SEPARATOR."plan_batch_eval_resumable_{$stamp}.summary.md",
            ],
        ];

        File::ensureDirectoryExists(dirname($statePath));
        File::put($statePath, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return $state;
    }

    /**
     * @param  array<string, mixed>  $state
     * @param  array<string, mixed>  $filters
     */
    private function assertCompatibleState(array $state, array $filters): void
    {
        $current = json_encode($filters);
        $saved = json_encode((array) ($state['filters'] ?? []));
        if ($current === $saved) {
            return;
        }

        throw new \RuntimeException('State file filters do not match current options. Use --reset=1 to start a new run.');
    }

    private function ensureCsvWithHeader(string $csvPath): void
    {
        if (File::exists($csvPath) && File::size($csvPath) > 0) {
            return;
        }

        File::ensureDirectoryExists(dirname($csvPath));
        $csv = fopen($csvPath, 'wb');
        if ($csv === false) {
            throw new \RuntimeException("Could not create CSV file at {$csvPath}");
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

        fclose($csv);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function appendCsvRow(string $csvPath, array $row): void
    {
        File::ensureDirectoryExists(dirname($csvPath));
        $csv = fopen($csvPath, 'ab');
        if ($csv === false) {
            throw new \RuntimeException("Could not append CSV row at {$csvPath}");
        }
        fputcsv($csv, array_values($row));
        fclose($csv);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function appendJsonlRow(string $jsonlPath, array $row): void
    {
        File::ensureDirectoryExists(dirname($jsonlPath));
        $line = json_encode($row, JSON_UNESCAPED_SLASHES);
        File::append($jsonlPath, ($line !== false ? $line : '{}').PHP_EOL);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function persistStateAndSummary(array $state, string $statePath): void
    {
        File::put($statePath, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $runsTotal = (int) data_get($state, 'stats.runs_total', 0);
        $runsSuccess = (int) data_get($state, 'stats.runs_success', 0);
        $runsFailed = (int) data_get($state, 'stats.runs_failed', 0);
        $qualitySum = (float) data_get($state, 'stats.quality_sum', 0.0);
        $qualityCount = (int) data_get($state, 'stats.quality_count', 0);
        $successPct = $runsTotal > 0 ? round(($runsSuccess / $runsTotal) * 100, 2) : 0.0;
        $avgQuality = $qualityCount > 0 ? round($qualitySum / $qualityCount, 2) : 0.0;

        $summary = [
            'run_id' => (string) ($state['run_id'] ?? ''),
            'created_at' => (string) ($state['created_at'] ?? ''),
            'updated_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            'completed' => (bool) ($state['completed'] ?? false),
            'filters' => (array) ($state['filters'] ?? []),
            'cursor' => (array) ($state['cursor'] ?? []),
            'runs_total' => $runsTotal,
            'runs_success' => $runsSuccess,
            'runs_failed' => $runsFailed,
            'success_percentage' => $successPct,
            'average_quality_percentage' => $avgQuality,
            'files' => (array) ($state['files'] ?? []),
            'failures' => (array) ($state['failures'] ?? []),
            'last_invocation' => (array) ($state['last_invocation'] ?? []),
        ];

        $summaryJsonPath = (string) data_get($state, 'files.summary_json');
        $summaryMdPath = (string) data_get($state, 'files.summary_md');

        if ($summaryJsonPath !== '') {
            File::ensureDirectoryExists(dirname($summaryJsonPath));
            File::put($summaryJsonPath, json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
        if ($summaryMdPath !== '') {
            File::ensureDirectoryExists(dirname($summaryMdPath));
            File::put($summaryMdPath, $this->renderMarkdown($summary, (array) ($summary['failures'] ?? [])));
        }
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
        $lines[] = '# Planner Batch Eval (Resumable) Report';
        $lines[] = '';
        $lines[] = '- Run ID: '.(string) ($summary['run_id'] ?? '');
        $lines[] = '- Updated at: '.(string) ($summary['updated_at'] ?? '');
        $lines[] = '- Completed: '.((bool) ($summary['completed'] ?? false) ? 'yes' : 'no');
        $lines[] = '- Runs total: '.(int) ($summary['runs_total'] ?? 0);
        $lines[] = '- Runs success: '.(int) ($summary['runs_success'] ?? 0);
        $lines[] = '- Runs failed: '.(int) ($summary['runs_failed'] ?? 0);
        $lines[] = '- Success percentage: '.number_format((float) ($summary['success_percentage'] ?? 0), 2).'%';
        $lines[] = '- Average quality percentage: '.number_format((float) ($summary['average_quality_percentage'] ?? 0), 2).'%';
        $lines[] = '- Cursor user index: '.(int) data_get($summary, 'cursor.user_index', 0);
        $lines[] = '- Cursor day index: '.(int) data_get($summary, 'cursor.day_index', 0);
        $lines[] = '- CSV: `'.(string) data_get($summary, 'files.csv', '').'`';
        $lines[] = '- JSONL: `'.(string) data_get($summary, 'files.jsonl', '').'`';

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
                    str_replace('|', '\|', (string) ($failure['email'] ?? '')),
                    str_replace('|', '\|', (string) ($failure['role'] ?? '')),
                    (int) ($failure['horizon_days'] ?? 0),
                    str_replace('|', '\|', (string) ($failure['error_type'] ?? '')),
                    str_replace('|', '\|', (string) ($failure['error_message'] ?? ''))
                );
            }
        }

        return implode("\n", $lines)."\n";
    }
}
