<?php

namespace App\Services\Ai\Audit;

use App\Models\PlannerAuditRun;
use App\Models\User;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\PlannerHealthService;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Seed\SeededPlanCleanupService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Throwable;

class PlannerAuditRunner
{
    public function __construct(
        private readonly PlannerService $planner,
        private readonly PlannerRunQualityScorer $scorer,
        private readonly SeededPlanCleanupService $planCleanup,
        private readonly PlannerAuditStructureValidator $structureValidator,
        private readonly PlannerHealthService $plannerHealth,
    ) {}

    public function run(PlannerAuditRun $run, ?string $reportBase = null): PlannerAuditRun
    {
        if ($run->status === 'running') {
            return $run;
        }

        $horizons = $this->normalizeHorizons($run->horizon_days ?? []);
        $executionMode = PlannerAuditExecutionMode::normalize((string) data_get($run->summary_json ?? [], 'execution_mode'));
        $users = $this->resolveUsers($run);
        $totalUsers = $users->count();
        $totalRuns = $totalUsers * count($horizons);
        $reportBase = $this->sanitizeReportBase($reportBase ?: $this->defaultReportBase());
        $scope = $this->scopeLabel($run);
        $selectedUserIds = $this->selectedUserIds($run);
        $selectedUserLimit = $this->selectedUserLimit($run);
        $preflight = $this->structureValidator->preflight();
        $providerPreflight = $this->providerPreflight($executionMode);

        $run->forceFill([
            'status' => 'running',
            'horizon_days' => $horizons,
            'total_users' => $totalUsers,
            'total_runs' => $totalRuns,
            'completed_runs' => 0,
            'success_runs' => 0,
            'failed_runs' => 0,
            'current_user_id' => null,
            'current_user_email' => null,
            'current_horizon_days' => null,
            'average_run_ms' => null,
            'eta_seconds' => null,
            'eta_updated_at' => null,
            'started_at' => now(),
            'finished_at' => null,
            'report_paths' => null,
            'summary_json' => [
                'report_base' => $reportBase,
                'scope' => $scope,
                'horizons' => $horizons,
                'execution_mode' => $executionMode,
                'execution_mode_description' => PlannerAuditExecutionMode::description($executionMode),
                'selected_user_ids' => $selectedUserIds,
                'selected_user_limit' => $selectedUserLimit,
                'structure_preflight' => $preflight,
                'provider_preflight' => $providerPreflight,
            ],
            'last_error' => null,
        ])->save();

        $rows = [];
        $failures = [];
        $qualitySum = 0.0;
        $qualityCount = 0;
        $durationSumMs = 0;
        $completedRuns = 0;
        $successRuns = 0;
        $failedRuns = 0;
        $validatedRuns = 0;
        $structureWarningRuns = 0;
        $structureFailureRuns = 0;
        $structureWarningCount = 0;
        $structureIssueCount = 0;
        $lastEtaUpdateAt = null;
        $cleanupSummary = [
            'users_processed' => 0,
            'nutrition_deleted' => 0,
            'workout_deleted' => 0,
        ];

        try {
            if (! ($preflight['ok'] ?? false)) {
                throw new \RuntimeException('Planner audit preflight failed: '.implode(' | ', (array) ($preflight['issues'] ?? [])));
            }
            if (! ($providerPreflight['ok'] ?? false)) {
                throw new \RuntimeException('Planner audit provider preflight failed: '.implode(' | ', (array) ($providerPreflight['issues'] ?? [])));
            }

            $this->withExecutionMode($executionMode, function () use (
                $users,
                $horizons,
                $run,
                $reportBase,
                $totalUsers,
                $totalRuns,
                &$rows,
                &$failures,
                $preflight,
                $providerPreflight,
                &$qualitySum,
                &$qualityCount,
                &$durationSumMs,
                &$completedRuns,
                &$successRuns,
                &$failedRuns,
                &$validatedRuns,
                &$structureWarningRuns,
                &$structureFailureRuns,
                &$structureWarningCount,
                &$structureIssueCount,
                &$lastEtaUpdateAt
            ): void {
                $lastHorizon = end($horizons);

                foreach ($users as $index => $user) {
                    foreach ($horizons as $horizon) {
                        $run->forceFill([
                            'current_user_id' => (int) $user->id,
                            'current_user_email' => (string) $user->email,
                            'current_horizon_days' => $horizon,
                        ])->save();

                        $startedAt = microtime(true);
                        $status = 'success';
                        $provider = null;
                        $model = null;
                        $quality = [
                            'quality_percentage' => 0.0,
                            'passed_checks' => 0,
                            'total_checks' => 0,
                        ];
                        $errorType = null;
                        $errorMessage = null;
                        $dietDaysCount = 0;
                        $workoutDaysCount = 0;
                        $reviewAfterDays = 0;
                        $structureValidation = [
                            'ok' => true,
                            'issues' => [],
                            'warnings' => [],
                            'issue_count' => 0,
                            'warning_count' => 0,
                        ];

                        try {
                            $result = $this->planner->generate($user, [
                                'regenerate' => true,
                                'reason' => sprintf('planner_audit_%dd_run_%d', $horizon, $run->id),
                                'created_by' => (int) $run->requested_by,
                                'plan_horizon_days' => $horizon,
                                'generate_diet' => true,
                                'generate_workout' => true,
                            ]);

                            $plan = is_array($result['plan'] ?? null) ? $result['plan'] : [];
                            $provider = (string) ($result['provider'] ?? '');
                            $model = (string) ($result['model'] ?? '');
                            $dietDaysCount = is_array(data_get($plan, 'diet.days')) ? count(data_get($plan, 'diet.days')) : 0;
                            $workoutDaysCount = is_array(data_get($plan, 'workout.weekly_schedule')) ? count(data_get($plan, 'workout.weekly_schedule')) : 0;
                            $reviewAfterDays = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
                            $quality = is_array($result['quality'] ?? null)
                                ? $result['quality']
                                : $this->scorer->score($user, $plan, $horizon);
                            $qualitySum += (float) ($quality['quality_percentage'] ?? 0.0);
                            $qualityCount++;
                            $structureValidation = $this->structureValidator->validatePersisted($user, $result, $horizon);
                            $validatedRuns++;
                            $structureWarningCount += (int) ($structureValidation['warning_count'] ?? 0);
                            $structureIssueCount += (int) ($structureValidation['issue_count'] ?? 0);

                            if ((int) ($structureValidation['warning_count'] ?? 0) > 0) {
                                $structureWarningRuns++;
                            }

                            if (! ($structureValidation['ok'] ?? false)) {
                                $status = 'error';
                                $errorType = 'planner_structure_validation';
                                $errorMessage = $this->summarizeStructureIssues($structureValidation);
                                $failedRuns++;
                                $structureFailureRuns++;
                                $failures[] = [
                                    'user_id' => (int) $user->id,
                                    'email' => (string) $user->email,
                                    'role' => (string) $user->role,
                                    'horizon_days' => $horizon,
                                    'error_type' => $errorType,
                                    'error_message' => $errorMessage,
                                    'structure_issues' => array_values($structureValidation['issues'] ?? []),
                                    'structure_warnings' => array_values($structureValidation['warnings'] ?? []),
                                ];
                            } else {
                                $successRuns++;
                            }
                        } catch (Throwable $e) {
                            report($e);

                            $status = 'error';
                            $errorType = $e::class;
                            $errorMessage = mb_substr(
                                trim(str_replace(["\r", "\n"], ' ', $e->getMessage())),
                                0,
                                500
                            );
                            $failedRuns++;
                            $failures[] = [
                                'user_id' => (int) $user->id,
                                'email' => (string) $user->email,
                                'role' => (string) $user->role,
                                'horizon_days' => $horizon,
                                'error_type' => $errorType,
                                'error_message' => $errorMessage,
                            ];
                        }

                        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
                        $durationSumMs += $durationMs;
                        $completedRuns++;

                        $rows[] = [
                            'run_index' => $completedRuns,
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
                            'structure_ok' => (bool) ($structureValidation['ok'] ?? false),
                            'structure_issue_count' => (int) ($structureValidation['issue_count'] ?? 0),
                            'structure_warning_count' => (int) ($structureValidation['warning_count'] ?? 0),
                            'structure_issues' => array_values($structureValidation['issues'] ?? []),
                            'structure_warnings' => array_values($structureValidation['warnings'] ?? []),
                            'error_type' => $errorType,
                            'error_message' => $errorMessage,
                        ];

                        $run->forceFill($this->progressPayload(
                            $run,
                            $reportBase,
                            $horizons,
                            $completedRuns,
                            $successRuns,
                            $failedRuns,
                            $totalUsers,
                            $totalRuns,
                            $durationSumMs,
                            $qualitySum,
                            $qualityCount,
                            $preflight,
                            $providerPreflight,
                            $validatedRuns,
                            $structureWarningRuns,
                            $structureFailureRuns,
                            $structureWarningCount,
                            $structureIssueCount,
                            $lastEtaUpdateAt
                        ))->save();

                        $lastEtaUpdateAt = $run->eta_updated_at;

                        $hasMoreRuns = $index < $totalUsers - 1 || $horizon !== $lastHorizon;
                        $this->applyGpuCooldown(
                            $this->gpuLoadProfile($this->currentGpuLoad($run)),
                            $completedRuns,
                            $totalRuns,
                            $hasMoreRuns
                        );
                    }
                }
            });

            $cleanupSummary = $this->planCleanup->cleanupForUsers($users);

            $summary = $this->summaryPayload(
                $reportBase,
                $scope,
                $horizons,
                $executionMode,
                $completedRuns,
                $successRuns,
                $failedRuns,
                $totalUsers,
                $totalRuns,
                $qualitySum,
                $qualityCount,
                $selectedUserIds,
                $selectedUserLimit,
                $cleanupSummary,
                $preflight,
                $providerPreflight,
                $validatedRuns,
                $structureWarningRuns,
                $structureFailureRuns,
                $structureWarningCount,
                $structureIssueCount
            );
            $paths = $this->writeReports($reportBase, $summary, $rows, $failures);

            $run->forceFill([
                'status' => 'completed',
                'completed_runs' => $completedRuns,
                'success_runs' => $successRuns,
                'failed_runs' => $failedRuns,
                'average_run_ms' => $completedRuns > 0 ? (int) round($durationSumMs / $completedRuns) : null,
                'eta_seconds' => 0,
                'eta_updated_at' => now(),
                'finished_at' => now(),
                'current_user_id' => null,
                'current_user_email' => null,
                'current_horizon_days' => null,
                'report_paths' => $paths,
                'summary_json' => $summary,
                'last_error' => null,
            ])->save();
        } catch (Throwable $e) {
            report($e);

            $summary = $this->summaryPayload(
                $reportBase,
                $scope,
                $horizons,
                $executionMode,
                $completedRuns,
                $successRuns,
                $failedRuns,
                $totalUsers,
                $totalRuns,
                $qualitySum,
                $qualityCount,
                $selectedUserIds,
                $selectedUserLimit,
                $cleanupSummary,
                $preflight,
                $providerPreflight,
                $validatedRuns,
                $structureWarningRuns,
                $structureFailureRuns,
                $structureWarningCount,
                $structureIssueCount
            );
            $paths = $this->writeReports($reportBase, $summary, $rows, $failures);

            $run->forceFill([
                'status' => 'failed',
                'completed_runs' => $completedRuns,
                'success_runs' => $successRuns,
                'failed_runs' => $failedRuns,
                'average_run_ms' => $completedRuns > 0 ? (int) round($durationSumMs / $completedRuns) : null,
                'finished_at' => now(),
                'current_user_id' => null,
                'current_user_email' => null,
                'current_horizon_days' => null,
                'report_paths' => $paths,
                'summary_json' => $summary,
                'last_error' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();
        }

        return $run->fresh();
    }

    private function progressPayload(
        PlannerAuditRun $run,
        string $reportBase,
        array $horizons,
        int $completedRuns,
        int $successRuns,
        int $failedRuns,
        int $totalUsers,
        int $totalRuns,
        int $durationSumMs,
        float $qualitySum,
        int $qualityCount,
        array $preflight,
        array $providerPreflight,
        int $validatedRuns,
        int $structureWarningRuns,
        int $structureFailureRuns,
        int $structureWarningCount,
        int $structureIssueCount,
        mixed $lastEtaUpdateAt
    ): array {
        $averageRunMs = $completedRuns > 0 ? (int) round($durationSumMs / $completedRuns) : null;
        $remainingRuns = max(0, $totalRuns - $completedRuns);
        $now = CarbonImmutable::now();
        $shouldRefreshEta = $lastEtaUpdateAt === null
            || ! $lastEtaUpdateAt instanceof \Carbon\CarbonInterface
            || $lastEtaUpdateAt->diffInRealSeconds($now) >= 300
            || $completedRuns >= $totalRuns;

        $payload = [
            'completed_runs' => $completedRuns,
            'success_runs' => $successRuns,
            'failed_runs' => $failedRuns,
            'average_run_ms' => $averageRunMs,
            'summary_json' => $this->summaryPayload(
                $reportBase,
                $this->scopeLabel($run),
                $horizons,
                PlannerAuditExecutionMode::normalize((string) data_get($run->summary_json ?? [], 'execution_mode')),
                $completedRuns,
                $successRuns,
                $failedRuns,
                $totalUsers,
                $totalRuns,
                $qualitySum,
                $qualityCount,
                $this->selectedUserIds($run),
                $this->selectedUserLimit($run),
                data_get($run->summary_json ?? [], 'legacy_plan_cleanup', [
                    'users_processed' => 0,
                    'nutrition_deleted' => 0,
                    'workout_deleted' => 0,
                ]),
                data_get($run->summary_json ?? [], 'structure_preflight', $preflight),
                data_get($run->summary_json ?? [], 'provider_preflight', $providerPreflight),
                (int) data_get($run->summary_json ?? [], 'structure_validation.validated_runs', $validatedRuns),
                (int) data_get($run->summary_json ?? [], 'structure_validation.warning_runs', $structureWarningRuns),
                (int) data_get($run->summary_json ?? [], 'structure_validation.failure_runs', $structureFailureRuns),
                (int) data_get($run->summary_json ?? [], 'structure_validation.warning_count', $structureWarningCount),
                (int) data_get($run->summary_json ?? [], 'structure_validation.issue_count', $structureIssueCount)
            ),
        ];

        if ($shouldRefreshEta) {
            $payload['eta_seconds'] = $averageRunMs !== null ? (int) ceil(($averageRunMs * $remainingRuns) / 1000) : null;
            $payload['eta_updated_at'] = $now;
        }

        return $payload;
    }

    private function summaryPayload(
        string $reportBase,
        string $scope,
        array $horizons,
        string $executionMode,
        int $completedRuns,
        int $successRuns,
        int $failedRuns,
        int $totalUsers,
        int $totalRuns,
        float $qualitySum,
        int $qualityCount,
        array $selectedUserIds,
        ?int $selectedUserLimit,
        array $cleanupSummary,
        array $preflight,
        array $providerPreflight,
        int $validatedRuns,
        int $structureWarningRuns,
        int $structureFailureRuns,
        int $structureWarningCount,
        int $structureIssueCount
    ): array {
        return [
            'report_base' => $reportBase,
            'scope' => $scope,
            'horizons' => $horizons,
            'execution_mode' => $executionMode,
            'execution_mode_description' => PlannerAuditExecutionMode::description($executionMode),
            'selected_user_ids' => $selectedUserIds,
            'selected_user_limit' => $selectedUserLimit,
            'total_users' => $totalUsers,
            'runs_total' => $totalRuns,
            'runs_completed' => $completedRuns,
            'runs_success' => $successRuns,
            'runs_failed' => $failedRuns,
            'success_percentage' => $completedRuns > 0 ? round(($successRuns / $completedRuns) * 100, 2) : 0.0,
            'average_quality_percentage' => $qualityCount > 0 ? round($qualitySum / $qualityCount, 2) : 0.0,
            'structure_preflight' => [
                'ok' => (bool) ($preflight['ok'] ?? false),
                'issues' => array_values($preflight['issues'] ?? []),
            ],
            'provider_preflight' => [
                'ok' => (bool) ($providerPreflight['ok'] ?? true),
                'mode' => (string) ($providerPreflight['mode'] ?? $executionMode),
                'issues' => array_values($providerPreflight['issues'] ?? []),
                'recommendation' => (string) ($providerPreflight['recommendation'] ?? ''),
            ],
            'structure_validation' => [
                'validated_runs' => $validatedRuns,
                'warning_runs' => $structureWarningRuns,
                'failure_runs' => $structureFailureRuns,
                'warning_count' => $structureWarningCount,
                'issue_count' => $structureIssueCount,
            ],
            'legacy_plan_cleanup' => [
                'users_processed' => (int) ($cleanupSummary['users_processed'] ?? 0),
                'nutrition_deleted' => (int) ($cleanupSummary['nutrition_deleted'] ?? 0),
                'workout_deleted' => (int) ($cleanupSummary['workout_deleted'] ?? 0),
            ],
        ];
    }

    private function writeReports(string $reportBase, array $summary, array $rows, array $failures): array
    {
        $jsonPath = base_path('tmp'.DIRECTORY_SEPARATOR.$reportBase.'.json');
        $mdPath = base_path('tmp'.DIRECTORY_SEPARATOR.$reportBase.'.md');
        File::ensureDirectoryExists(dirname($jsonPath));

        $payload = [
            'summary' => array_merge($summary, [
                'generated_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            ]),
            'rows' => $rows,
            'failures' => $failures,
            'planner_output_changes' => [
                'diet uses meal_options grouped by meal type instead of day-assigned meals',
                'breakfast/lunch/dinner reject snack-style meal names more aggressively',
                'portion labels and meal-name matching are normalized for more realistic servings',
                'workout day labels stay aligned to Monday-Sunday order',
                'recovery-only drills are stripped from training-day exercise lists',
                'quality scoring now tolerates core/accessory finishers without flagging valid split structure',
                'audit now blocks success when persisted nutrition/workout plan rows fail the new structure checks',
            ],
        ];

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        File::put($mdPath, $this->renderMarkdown($payload));

        return [
            'json' => $jsonPath,
            'md' => $mdPath,
        ];
    }

    private function renderMarkdown(array $payload): string
    {
        $summary = (array) ($payload['summary'] ?? []);
        $lines = [];
        $lines[] = '# Planner Generated Audit';
        $lines[] = '';
        $lines[] = '- Generated at: '.(string) ($summary['generated_at'] ?? '');
        $lines[] = '- Scope: '.(string) ($summary['scope'] ?? 'all non-admin users');
        $lines[] = '- Horizons: '.implode(', ', (array) ($summary['horizons'] ?? []));
        $lines[] = '- Execution mode: '.(string) ($summary['execution_mode'] ?? PlannerAuditExecutionMode::DEFAULT);
        $lines[] = '- Execution mode note: '.(string) ($summary['execution_mode_description'] ?? '');
        $lines[] = '- Total users: '.(int) ($summary['total_users'] ?? 0);
        $lines[] = '- Runs total: '.(int) ($summary['runs_total'] ?? 0);
        $lines[] = '- Runs completed: '.(int) ($summary['runs_completed'] ?? 0);
        $lines[] = '- Runs success: '.(int) ($summary['runs_success'] ?? 0);
        $lines[] = '- Runs failed: '.(int) ($summary['runs_failed'] ?? 0);
        $lines[] = '- Success percentage: '.number_format((float) ($summary['success_percentage'] ?? 0.0), 2).'%';
        $lines[] = '- Average quality percentage: '.number_format((float) ($summary['average_quality_percentage'] ?? 0.0), 2).'%';
        $lines[] = '- Structure preflight: '.((bool) data_get($summary, 'structure_preflight.ok', false) ? 'passed' : 'failed');
        $lines[] = '- Provider preflight: '.((bool) data_get($summary, 'provider_preflight.ok', true) ? 'passed' : 'failed');
        $lines[] = '- Structure warning count: '.(int) data_get($summary, 'structure_validation.warning_count', 0);
        $lines[] = '- Structure issue count: '.(int) data_get($summary, 'structure_validation.issue_count', 0);
        $lines[] = '- Legacy nutrition rows cleaned: '.(int) data_get($summary, 'legacy_plan_cleanup.nutrition_deleted', 0);
        $lines[] = '- Legacy workout rows cleaned: '.(int) data_get($summary, 'legacy_plan_cleanup.workout_deleted', 0);

        $preflightIssues = (array) data_get($summary, 'structure_preflight.issues', []);
        if ($preflightIssues !== []) {
            $lines[] = '';
            $lines[] = '## Structure Preflight Issues';
            foreach ($preflightIssues as $issue) {
                $lines[] = '- '.(string) $issue;
            }
        }

        $providerIssues = (array) data_get($summary, 'provider_preflight.issues', []);
        if ($providerIssues !== []) {
            $lines[] = '';
            $lines[] = '## Provider Preflight Issues';
            foreach ($providerIssues as $issue) {
                $lines[] = '- '.(string) $issue;
            }
            $recommendation = trim((string) data_get($summary, 'provider_preflight.recommendation', ''));
            if ($recommendation !== '') {
                $lines[] = '- Recommendation: '.$recommendation;
            }
        }

        $lines[] = '';
        $lines[] = '## Planner Output Changes';
        foreach ((array) ($payload['planner_output_changes'] ?? []) as $item) {
            $lines[] = '- '.(string) $item;
        }

        $rows = (array) ($payload['rows'] ?? []);
        if ($rows !== []) {
            $lines[] = '';
            $lines[] = '## Run Results';
            $lines[] = '';
            $lines[] = '| User ID | Email | Role | Horizon | Status | Quality | Structure | Warnings | Duration ms | Error |';
            $lines[] = '|---:|---|---|---:|---|---:|---:|---:|---:|---|';
            foreach ($rows as $row) {
                $lines[] = sprintf(
                    '| %d | %s | %s | %d | %s | %0.2f | %d | %d | %d | %s |',
                    (int) ($row['user_id'] ?? 0),
                    $this->mdCell((string) ($row['email'] ?? '')),
                    $this->mdCell((string) ($row['role'] ?? '')),
                    (int) ($row['horizon_days'] ?? 0),
                    $this->mdCell((string) ($row['status'] ?? '')),
                    (float) ($row['quality_percentage'] ?? 0.0),
                    (int) ($row['structure_issue_count'] ?? 0),
                    (int) ($row['structure_warning_count'] ?? 0),
                    (int) ($row['duration_ms'] ?? 0),
                    $this->mdCell((string) ($row['error_message'] ?? ''))
                );
            }
        }

        $failures = (array) ($payload['failures'] ?? []);
        if ($failures !== []) {
            $lines[] = '';
            $lines[] = '## Failures';
            foreach ($failures as $failure) {
                $lines[] = sprintf(
                    '- User #%d (%s), %d-day: %s',
                    (int) ($failure['user_id'] ?? 0),
                    (string) ($failure['email'] ?? ''),
                    (int) ($failure['horizon_days'] ?? 0),
                    (string) ($failure['error_message'] ?? '')
                );

                foreach ((array) ($failure['structure_issues'] ?? []) as $issue) {
                    $lines[] = '  - Structure issue: '.(string) $issue;
                }

                foreach ((array) ($failure['structure_warnings'] ?? []) as $warning) {
                    $lines[] = '  - Structure warning: '.(string) $warning;
                }
            }
        }

        return implode("\n", $lines)."\n";
    }

    private function normalizeHorizons(array $horizons): array
    {
        $normalized = array_map(function ($value): int {
            $days = (int) $value;
            if ($days <= 14) {
                return 14;
            }
            if ($days <= 21) {
                return 21;
            }

            return 28;
        }, $horizons !== [] ? $horizons : [14, 21, 28]);

        $normalized = array_values(array_unique($normalized));
        sort($normalized);

        return $normalized;
    }

    private function gpuLoadProfile(string $gpuLoad): array
    {
        return PlannerAuditGpuLoad::profile($gpuLoad);
    }

    private function currentGpuLoad(PlannerAuditRun $run): string
    {
        $gpuLoad = PlannerAuditRun::query()
            ->whereKey($run->id)
            ->value('gpu_load');

        return PlannerAuditGpuLoad::normalize((string) ($gpuLoad ?? $run->gpu_load));
    }

    private function resolveUsers(PlannerAuditRun $run): Collection
    {
        $query = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->orderBy('id');

        $selectedUserIds = $this->selectedUserIds($run);
        if ($selectedUserIds !== []) {
            $query->whereIn('id', $selectedUserIds);
        }

        $users = $query->get(['id', 'name', 'email', 'role']);
        $selectedUserLimit = $this->selectedUserLimit($run);
        if ($selectedUserLimit !== null && $selectedUserLimit > 0) {
            $users = $users->take($selectedUserLimit)->values();
        }

        return $users->values();
    }

    private function scopeLabel(PlannerAuditRun $run): string
    {
        $hasSelectedUsers = $this->selectedUserIds($run) !== [];
        $selectedUserLimit = $this->selectedUserLimit($run);

        if ($hasSelectedUsers) {
            return 'selected non-admin users';
        }

        if ($selectedUserLimit !== null && $selectedUserLimit > 0) {
            return 'limited non-admin users';
        }

        return 'all non-admin users';
    }

    /**
     * @return list<int>
     */
    private function selectedUserIds(PlannerAuditRun $run): array
    {
        return collect(data_get($run->summary_json ?? [], 'selected_user_ids', []))
            ->map(static fn ($value): int => (int) $value)
            ->filter(static fn (int $value): bool => $value > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function selectedUserLimit(PlannerAuditRun $run): ?int
    {
        $limit = (int) data_get($run->summary_json ?? [], 'selected_user_limit', 0);

        return $limit > 0 ? $limit : null;
    }

    /**
     * @template TReturn
     *
     * @param  callable(): TReturn  $callback
     * @return TReturn
     */
    private function withExecutionMode(string $executionMode, callable $callback): mixed
    {
        $overrides = PlannerAuditExecutionMode::configOverrides($executionMode);
        if ($overrides === []) {
            return $callback();
        }

        $snapshot = [];
        foreach ($overrides as $key => $value) {
            $snapshot[$key] = config($key);
            config()->set($key, $value);
        }

        try {
            return $callback();
        } finally {
            foreach ($snapshot as $key => $value) {
                config()->set($key, $value);
            }
        }
    }

    private function applyGpuCooldown(array $profile, int $completedRuns, int $totalRuns, bool $hasMoreRuns): void
    {
        if (! $hasMoreRuns) {
            return;
        }

        $sleepMs = max(0, (int) ($profile['sleep_ms'] ?? 0));
        if ($sleepMs > 0) {
            usleep($sleepMs * 1000);
        }

        $batchSize = max(0, (int) ($profile['batch_size'] ?? 0));
        $batchPause = max(0, (int) ($profile['batch_pause_seconds'] ?? 0));
        if ($batchSize > 0 && $batchPause > 0 && $completedRuns < $totalRuns && $completedRuns % $batchSize === 0) {
            sleep($batchPause);
        }
    }

    private function defaultReportBase(): string
    {
        return 'PlannerGenerated'.CarbonImmutable::now(config('app.timezone', 'UTC'))->format('dF');
    }

    private function sanitizeReportBase(string $value): string
    {
        $clean = preg_replace('/[^A-Za-z0-9_-]+/', '', trim($value)) ?? '';

        return $clean !== '' ? $clean : $this->defaultReportBase();
    }

    private function mdCell(string $value): string
    {
        return str_replace(
            ["\r\n", "\n", "\r", '|'],
            ['<br>', '<br>', '<br>', '\|'],
            trim($value)
        );
    }

    private function summarizeStructureIssues(array $structureValidation): string
    {
        $issues = array_values(array_filter(array_map(
            static fn ($issue): string => trim((string) $issue),
            (array) ($structureValidation['issues'] ?? [])
        )));

        if ($issues === []) {
            return 'Persisted planner structure validation failed.';
        }

        return mb_substr(implode(' | ', array_slice($issues, 0, 3)), 0, 500);
    }

    private function providerPreflight(string $executionMode): array
    {
        $mode = PlannerAuditExecutionMode::normalize($executionMode);
        if ($mode !== 'live') {
            return [
                'ok' => true,
                'mode' => $mode,
                'issues' => [],
                'recommendation' => '',
            ];
        }

        $health = $this->plannerHealth->snapshot();
        $issues = [];
        $baseUrl = (string) data_get($health, 'checks.ollama.base_url', '');
        $model = (string) data_get($health, 'checks.ollama.model', '');

        if (! (bool) data_get($health, 'checks.ollama.reachable', false)) {
            $issues[] = sprintf(
                'Live planner audit requires Ollama to be reachable at %s.',
                $baseUrl !== '' ? $baseUrl : 'the configured planner base URL'
            );
        } elseif (! (bool) data_get($health, 'checks.ollama.model_loaded', true)) {
            $issues[] = sprintf(
                'Live planner audit requires the configured planner model to be loaded%s.',
                $model !== '' ? sprintf(' (%s)', $model) : ''
            );
        }

        return [
            'ok' => $issues === [],
            'mode' => $mode,
            'issues' => $issues,
            'recommendation' => (string) ($health['recommendation'] ?? ''),
        ];
    }
}
