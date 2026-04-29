<?php

namespace App\Console\Commands\Ai;

use App\Models\Ai\AiRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AiPredictorEvolutionAudit extends Command
{
    protected $signature = 'ai:predictor-evolution-audit
        {--from=2026-03-01 : Include plan predictions created on/after this date (YYYY-MM-DD)}
        {--anchor=2026-01-01 : 21-day cycle anchor date (YYYY-MM-DD)}
        {--interval-days=21 : Cycle size in days used to bucket prediction evolution}
        {--tolerance-before=7 : Days allowed before target end date when matching actual weight}
        {--tolerance-after=10 : Days allowed after target end date when matching actual weight}
        {--user-ids= : Optional comma-separated user IDs}
        {--role=client : Role filter when user-ids is not provided}
        {--limit-users=0 : Optional max users to evaluate (0 = no limit)}
        {--include-chatbot=1 : Include chatbot health summary from stored assistant messages (1/0)}
        {--out-dir=tmp : Output directory for json/markdown report files}
        {--tag= : Optional file tag (defaults to timestamp)}
    ';

    protected $description = 'Audit predictor evolution every 21 days, planner feedback adaptation, plan adjustments, and chatbot quality signals.';

    public function handle(): int
    {
        $from = $this->parseDate((string) $this->option('from'));
        $anchor = $this->parseDate((string) $this->option('anchor'));
        $intervalDays = max(1, (int) $this->option('interval-days'));
        $toleranceBefore = max(0, (int) $this->option('tolerance-before'));
        $toleranceAfter = max(0, (int) $this->option('tolerance-after'));
        $includeChatbot = ((int) $this->option('include-chatbot')) === 1;
        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $stamp = trim((string) $this->option('tag')) ?: CarbonImmutable::now('UTC')->format('Ymd_His');
        $users = $this->resolveUsers(
            (string) $this->option('user-ids'),
            (string) $this->option('role'),
            max(0, (int) $this->option('limit-users'))
        );

        if ($users === []) {
            $this->error('No users matched the supplied filters.');

            return self::FAILURE;
        }

        $userIds = array_values(array_map(
            static fn (User $user): int => (int) $user->id,
            $users
        ));
        $measurementsByUser = $this->loadMeasurements($userIds);
        $requestsByUserCycle = $this->collectCyclePredictions(
            $userIds,
            $from,
            $anchor,
            $intervalDays
        );

        $usersPayload = [];
        $globalErrors = [];
        $globalStatuses = [
            'works' => 0,
            'partial' => 0,
            'not_working' => 0,
            'insufficient_data' => 0,
        ];
        $globalTransitions = [
            'total' => 0,
            'changed' => 0,
            'diet_changed' => 0,
            'workout_changed' => 0,
        ];
        $globalCycleAccuracy = [];

        foreach ($users as $user) {
            $cycles = $this->buildUserCycles(
                $user,
                $requestsByUserCycle[(int) $user->id] ?? [],
                $measurementsByUser[(int) $user->id] ?? [],
                $anchor,
                $intervalDays,
                $toleranceBefore,
                $toleranceAfter
            );

            $summary = $this->summarizeUserCycles($cycles);
            $status = (string) ($summary['planner_feedback_status'] ?? 'insufficient_data');
            if (array_key_exists($status, $globalStatuses)) {
                $globalStatuses[$status]++;
            }

            foreach ((array) ($summary['labeled_errors_kg'] ?? []) as $error) {
                if (is_numeric($error)) {
                    $globalErrors[] = (float) $error;
                }
            }

            foreach ($cycles as $cycle) {
                if (is_numeric($cycle['abs_error_kg'] ?? null)) {
                    $key = (int) ($cycle['cycle_index'] ?? 0);
                    if (! array_key_exists($key, $globalCycleAccuracy)) {
                        $globalCycleAccuracy[$key] = [];
                    }
                    $globalCycleAccuracy[$key][] = (float) $cycle['error_kg'];
                }

                if (is_array($cycle['plan_change_vs_previous'] ?? null)) {
                    $globalTransitions['total']++;
                    if ((bool) ($cycle['plan_change_vs_previous']['overall_changed'] ?? false)) {
                        $globalTransitions['changed']++;
                    }
                    if ((bool) ($cycle['plan_change_vs_previous']['diet_changed'] ?? false)) {
                        $globalTransitions['diet_changed']++;
                    }
                    if ((bool) ($cycle['plan_change_vs_previous']['workout_changed'] ?? false)) {
                        $globalTransitions['workout_changed']++;
                    }
                }
            }

            $usersPayload[] = [
                'user' => $this->userSummary($user),
                'summary' => $summary,
                'cycles' => $cycles,
            ];
        }

        $usersWithPredictions = count(array_filter(
            $usersPayload,
            static fn (array $row): bool => ((int) data_get($row, 'summary.total_cycles', 0)) > 0
        ));
        $totalCycles = array_sum(array_map(
            static fn (array $row): int => (int) data_get($row, 'summary.total_cycles', 0),
            $usersPayload
        ));
        $totalLabeled = array_sum(array_map(
            static fn (array $row): int => (int) data_get($row, 'summary.labeled_cycles', 0),
            $usersPayload
        ));

        ksort($globalCycleAccuracy);
        $accuracyByCycle = [];
        foreach ($globalCycleAccuracy as $cycleIndex => $errors) {
            $accuracyByCycle[] = [
                'cycle_index' => (int) $cycleIndex,
                'samples' => count($errors),
                'mae_kg' => $this->mae($errors),
                'rmse_kg' => $this->rmse($errors),
                'mean_signed_error_kg' => round(array_sum($errors) / max(1, count($errors)), 4),
            ];
        }

        $chatbot = $includeChatbot
            ? $this->chatbotSummary($userIds, $from)
            : ['enabled' => false];

        $payload = [
            'run' => [
                'generated_at_utc' => CarbonImmutable::now('UTC')->toIso8601String(),
                'from_date' => $from->toDateString(),
                'anchor_date' => $anchor->toDateString(),
                'interval_days' => $intervalDays,
                'weight_match_tolerance' => [
                    'days_before' => $toleranceBefore,
                    'days_after' => $toleranceAfter,
                ],
                'include_chatbot' => $includeChatbot,
            ],
            'summary' => [
                'users_evaluated' => count($usersPayload),
                'users_with_predictions' => $usersWithPredictions,
                'users_without_predictions' => count($usersPayload) - $usersWithPredictions,
                'total_cycles' => $totalCycles,
                'total_labeled_cycles' => $totalLabeled,
                'predictor_accuracy' => [
                    'mae_kg' => $this->mae($globalErrors),
                    'rmse_kg' => $this->rmse($globalErrors),
                    'samples' => count($globalErrors),
                ],
                'planner_feedback_status_counts' => $globalStatuses,
                'plan_transition_stats' => [
                    'total_transitions' => $globalTransitions['total'],
                    'changed_transitions' => $globalTransitions['changed'],
                    'diet_changed_transitions' => $globalTransitions['diet_changed'],
                    'workout_changed_transitions' => $globalTransitions['workout_changed'],
                    'changed_transition_rate_pct' => $globalTransitions['total'] > 0
                        ? round(($globalTransitions['changed'] / $globalTransitions['total']) * 100, 2)
                        : null,
                ],
            ],
            'accuracy_by_cycle_index' => $accuracyByCycle,
            'chatbot' => $chatbot,
            'users' => $usersPayload,
        ];

        $jsonPath = $outDir.DIRECTORY_SEPARATOR."predictor_evolution_audit_{$stamp}.json";
        $mdPath = $outDir.DIRECTORY_SEPARATOR."predictor_evolution_audit_{$stamp}.md";

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        File::put($mdPath, $this->renderMarkdown($payload));

        $this->info("Predictor audit JSON: {$jsonPath}");
        $this->info("Predictor audit Markdown: {$mdPath}");
        $this->line('Summary snapshot:');
        $this->line('- Users evaluated: '.(int) data_get($payload, 'summary.users_evaluated', 0));
        $this->line('- Users with predictions: '.(int) data_get($payload, 'summary.users_with_predictions', 0));
        $this->line('- Labeled cycles: '.(int) data_get($payload, 'summary.total_labeled_cycles', 0));
        $this->line('- Predictor MAE (kg): '.(string) data_get($payload, 'summary.predictor_accuracy.mae_kg', 'n/a'));
        $this->line('- Predictor RMSE (kg): '.(string) data_get($payload, 'summary.predictor_accuracy.rmse_kg', 'n/a'));
        if ($includeChatbot) {
            $this->line('- Chatbot assistant messages: '.(int) data_get($payload, 'chatbot.summary.total_assistant_messages', 0));
            $this->line('- Chatbot avg quality (%): '.(string) data_get($payload, 'chatbot.summary.avg_quality_percentage', 'n/a'));
        }

        return self::SUCCESS;
    }

    /**
     * @return array<int, User>
     */
    private function resolveUsers(string $userIdsRaw, string $role, int $limitUsers): array
    {
        $ids = collect(preg_split('/[\s,;]+/', trim($userIdsRaw)) ?: [])
            ->map(static fn ($v): int => (int) $v)
            ->filter(static fn (int $id): bool => $id > 0)
            ->unique()
            ->values()
            ->all();

        $query = User::query()->orderBy('id');

        if ($ids !== []) {
            $query->whereIn('id', $ids);
        } elseif (trim($role) !== '') {
            $query->where('role', trim($role));
        }

        if ($limitUsers > 0) {
            $query->limit($limitUsers);
        }

        return $query->get()->all();
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<int, array<int, array{date:CarbonImmutable,weight:float}>>
     */
    private function loadMeasurements(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $rows = DB::table('measurements')
            ->whereIn('user_id', $userIds)
            ->whereNotNull('weight_kg')
            ->orderBy('user_id')
            ->orderBy('measured_at')
            ->get(['user_id', 'measured_at', 'weight_kg']);

        $grouped = [];
        foreach ($rows as $row) {
            $uid = (int) $row->user_id;
            if (! array_key_exists($uid, $grouped)) {
                $grouped[$uid] = [];
            }

            $grouped[$uid][] = [
                'date' => CarbonImmutable::parse((string) $row->measured_at)->startOfDay(),
                'weight' => (float) $row->weight_kg,
            ];
        }

        return $grouped;
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<int, array<int, array<string, mixed>>>
     */
    private function collectCyclePredictions(
        array $userIds,
        CarbonImmutable $from,
        CarbonImmutable $anchor,
        int $intervalDays
    ): array {
        if ($userIds === []) {
            return [];
        }

        $rows = AiRequest::query()
            ->whereIn('user_id', $userIds)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->whereDate('created_at', '>=', $from->toDateString())
            ->orderBy('user_id')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'user_id', 'created_at', 'provider', 'model', 'output_json']);

        $perUserCycle = [];
        foreach ($rows as $row) {
            $output = is_array($row->output_json) ? $row->output_json : [];
            $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : null;
            if (! is_array($prediction)) {
                continue;
            }

            $createdAt = CarbonImmutable::parse((string) $row->created_at)->startOfDay();
            $cycleIndex = $this->cycleIndex($anchor, $createdAt, $intervalDays);
            if ($cycleIndex < 0) {
                continue;
            }

            $uid = (int) $row->user_id;
            if (! array_key_exists($uid, $perUserCycle)) {
                $perUserCycle[$uid] = [];
            }

            $existing = $perUserCycle[$uid][$cycleIndex] ?? null;
            $candidate = [
                'ai_request_id' => (int) $row->id,
                'user_id' => $uid,
                'created_at' => $createdAt,
                'provider' => $row->provider,
                'model' => $row->model,
                'output_json' => $output,
                'progress_prediction' => $prediction,
                'cycle_index' => $cycleIndex,
            ];

            if (! is_array($existing) || $candidate['ai_request_id'] >= (int) ($existing['ai_request_id'] ?? 0)) {
                $perUserCycle[$uid][$cycleIndex] = $candidate;
            }
        }

        return $perUserCycle;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cycleMap
     * @param  array<int, array{date:CarbonImmutable,weight:float}>  $measurements
     * @return array<int, array<string, mixed>>
     */
    private function buildUserCycles(
        User $user,
        array $cycleMap,
        array $measurements,
        CarbonImmutable $anchor,
        int $intervalDays,
        int $toleranceBefore,
        int $toleranceAfter
    ): array {
        if ($cycleMap === []) {
            return [];
        }

        ksort($cycleMap);
        $rows = [];
        $previousPlan = null;

        foreach ($cycleMap as $cycleIndex => $row) {
            $prediction = is_array($row['progress_prediction'] ?? null) ? $row['progress_prediction'] : [];
            $plan = is_array($row['output_json'] ?? null) ? $row['output_json'] : [];
            $generatedAt = $row['created_at'] instanceof CarbonImmutable
                ? $row['created_at']
                : CarbonImmutable::parse((string) ($row['created_at'] ?? 'now'))->startOfDay();

            $cycleStart = $anchor->addDays(((int) $cycleIndex) * $intervalDays)->startOfDay();
            $cycleEnd = $cycleStart->addDays($intervalDays - 1)->startOfDay();
            $horizonDays = $this->normalizePlanHorizonDays((int) ($prediction['horizon_days'] ?? $intervalDays));
            $predictionEnd = $generatedAt->addDays($horizonDays - 1)->startOfDay();

            $baselineWeight = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null)
                ?? $this->weightOnOrBefore($measurements, $generatedAt);
            $projectedWeight = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);

            if ($projectedWeight === null && $baselineWeight !== null) {
                $expectedChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
                if ($expectedChange !== null) {
                    $projectedWeight = $baselineWeight + $expectedChange;
                }
            }

            $actualMatch = $this->weightNearDate(
                $measurements,
                $predictionEnd,
                $toleranceBefore,
                $toleranceAfter
            );
            $actualWeight = is_array($actualMatch) ? (float) $actualMatch['weight_kg'] : null;
            $errorKg = ($actualWeight !== null && $projectedWeight !== null)
                ? round($actualWeight - $projectedWeight, 4)
                : null;

            $feedback = is_array($prediction['feedback_adjustment'] ?? null)
                ? $prediction['feedback_adjustment']
                : [];
            $baseWeekly = $this->toFloatOrNull($feedback['base_weekly_weight_change_kg'] ?? null);
            $adjustedWeekly = $this->toFloatOrNull($feedback['adjusted_weekly_weight_change_kg'] ?? null);
            $lastErrorWeekly = $this->toFloatOrNull($feedback['last_prediction_error_kg_per_week'] ?? null);
            $feedbackApplied = $lastErrorWeekly !== null
                || ($baseWeekly !== null && $adjustedWeekly !== null && abs($adjustedWeekly - $baseWeekly) >= 0.01);

            $planChange = null;
            if (is_array($previousPlan)) {
                $planChange = $this->comparePlans($previousPlan, $plan);
            }
            $previousPlan = $plan;

            $rows[] = [
                'user_id' => (int) $user->id,
                'ai_request_id' => (int) ($row['ai_request_id'] ?? 0),
                'provider' => $row['provider'] ?? null,
                'model' => $row['model'] ?? null,
                'generated_at' => $generatedAt->toDateString(),
                'cycle_index' => (int) $cycleIndex,
                'cycle_start_date' => $cycleStart->toDateString(),
                'cycle_end_date' => $cycleEnd->toDateString(),
                'prediction_horizon_days' => $horizonDays,
                'prediction_end_date' => $predictionEnd->toDateString(),
                'baseline_weight_kg' => $baselineWeight !== null ? round($baselineWeight, 3) : null,
                'projected_weight_kg' => $projectedWeight !== null ? round((float) $projectedWeight, 3) : null,
                'actual_weight_kg' => $actualWeight !== null ? round($actualWeight, 3) : null,
                'actual_weight_date' => is_array($actualMatch) ? (string) ($actualMatch['measured_at'] ?? null) : null,
                'error_kg' => $errorKg,
                'abs_error_kg' => $errorKg !== null ? round(abs($errorKg), 4) : null,
                'prediction' => [
                    'confidence' => $prediction['confidence'] ?? null,
                    'inference_source' => $prediction['inference_source'] ?? null,
                    'expected_weight_change_kg' => $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null),
                    'feedback_adjustment' => [
                        'base_weekly_weight_change_kg' => $baseWeekly,
                        'adjusted_weekly_weight_change_kg' => $adjustedWeekly,
                        'last_prediction_error_kg_per_week' => $lastErrorWeekly,
                        'feedback_applied' => $feedbackApplied,
                    ],
                ],
                'plan_change_vs_previous' => $planChange,
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cycles
     * @return array<string, mixed>
     */
    private function summarizeUserCycles(array $cycles): array
    {
        $errors = [];
        $feedbackAppliedCycles = 0;
        $transitions = 0;
        $transitionsChanged = 0;
        $transitionsDietChanged = 0;
        $transitionsWorkoutChanged = 0;

        foreach ($cycles as $cycle) {
            if (is_numeric($cycle['error_kg'] ?? null)) {
                $errors[] = (float) $cycle['error_kg'];
            }

            if ((bool) data_get($cycle, 'prediction.feedback_adjustment.feedback_applied', false)) {
                $feedbackAppliedCycles++;
            }

            if (is_array($cycle['plan_change_vs_previous'] ?? null)) {
                $transitions++;
                if ((bool) ($cycle['plan_change_vs_previous']['overall_changed'] ?? false)) {
                    $transitionsChanged++;
                }
                if ((bool) ($cycle['plan_change_vs_previous']['diet_changed'] ?? false)) {
                    $transitionsDietChanged++;
                }
                if ((bool) ($cycle['plan_change_vs_previous']['workout_changed'] ?? false)) {
                    $transitionsWorkoutChanged++;
                }
            }
        }

        $firstAbs = null;
        $lastAbs = null;
        if ($errors !== []) {
            $firstAbs = round(abs((float) $errors[0]), 4);
            $lastAbs = round(abs((float) $errors[count($errors) - 1]), 4);
        }

        $status = 'insufficient_data';
        if (count($cycles) >= 2) {
            $hasFeedbackSignal = $feedbackAppliedCycles > 0;
            $hasPlanAdjustment = $transitionsChanged > 0;
            if ($hasFeedbackSignal && $hasPlanAdjustment) {
                $status = 'works';
            } elseif ($hasFeedbackSignal || $hasPlanAdjustment) {
                $status = 'partial';
            } else {
                $status = 'not_working';
            }
        }

        return [
            'total_cycles' => count($cycles),
            'labeled_cycles' => count($errors),
            'mae_kg' => $this->mae($errors),
            'rmse_kg' => $this->rmse($errors),
            'first_labeled_abs_error_kg' => $firstAbs,
            'latest_labeled_abs_error_kg' => $lastAbs,
            'abs_error_improvement_kg' => ($firstAbs !== null && $lastAbs !== null)
                ? round($firstAbs - $lastAbs, 4)
                : null,
            'feedback_applied_cycles' => $feedbackAppliedCycles,
            'transitions_total' => $transitions,
            'transitions_changed' => $transitionsChanged,
            'transitions_diet_changed' => $transitionsDietChanged,
            'transitions_workout_changed' => $transitionsWorkoutChanged,
            'planner_feedback_status' => $status,
            'labeled_errors_kg' => $errors,
        ];
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<string, mixed>
     */
    private function chatbotSummary(array $userIds, CarbonImmutable $from): array
    {
        if ($userIds === []) {
            return ['enabled' => true, 'summary' => ['total_assistant_messages' => 0]];
        }

        $rows = DB::table('ai_messages as m')
            ->join('ai_conversations as c', 'c.id', '=', 'm.conversation_id')
            ->whereIn('c.user_id', $userIds)
            ->where('m.role', 'assistant')
            ->whereDate('m.created_at', '>=', $from->toDateString())
            ->orderBy('m.id')
            ->get([
                'm.id',
                'm.created_at',
                'm.metadata',
                'c.user_id',
            ]);

        $perUser = [];
        $qualityValues = [];
        $modelCounts = [];
        $warningMessages = 0;
        $fallbackMessages = 0;
        $safetyInterventions = 0;

        foreach ($rows as $row) {
            $uid = (int) $row->user_id;
            if (! array_key_exists($uid, $perUser)) {
                $perUser[$uid] = [
                    'assistant_messages' => 0,
                    'quality_values' => [],
                    'warning_messages' => 0,
                    'fallback_messages' => 0,
                    'safety_intervention_messages' => 0,
                    'last_message_at' => null,
                ];
            }

            $meta = $this->decodeArray($row->metadata);
            $quality = $this->toFloatOrNull(data_get($meta, 'quality.quality_percentage'));
            $warnings = is_array($meta['warnings'] ?? null) ? $meta['warnings'] : [];
            $model = trim((string) ($meta['model'] ?? ''));

            $perUser[$uid]['assistant_messages']++;
            $perUser[$uid]['last_message_at'] = CarbonImmutable::parse((string) $row->created_at)->toIso8601String();

            if ($quality !== null) {
                $qualityValues[] = $quality;
                $perUser[$uid]['quality_values'][] = $quality;
            }

            if ($warnings !== []) {
                $warningMessages++;
                $perUser[$uid]['warning_messages']++;
            }

            if ($this->isFallbackModel($model)) {
                $fallbackMessages++;
                $perUser[$uid]['fallback_messages']++;
            }

            if ($this->isSafetyIntervention($warnings)) {
                $safetyInterventions++;
                $perUser[$uid]['safety_intervention_messages']++;
            }

            if ($model !== '') {
                $modelCounts[$model] = ($modelCounts[$model] ?? 0) + 1;
            }
        }

        ksort($modelCounts);

        $userRows = [];
        $usersWithMessages = 0;
        foreach ($userIds as $uid) {
            $bucket = $perUser[$uid] ?? null;
            if (! is_array($bucket)) {
                $userRows[] = [
                    'user_id' => $uid,
                    'assistant_messages' => 0,
                    'avg_quality_percentage' => null,
                    'warning_messages' => 0,
                    'fallback_messages' => 0,
                    'safety_intervention_messages' => 0,
                    'status' => 'no_data',
                    'last_message_at' => null,
                ];
                continue;
            }

            $usersWithMessages++;
            $userQuality = (array) ($bucket['quality_values'] ?? []);
            $avgQuality = $userQuality !== []
                ? round(array_sum($userQuality) / count($userQuality), 2)
                : null;
            $assistantMessages = (int) ($bucket['assistant_messages'] ?? 0);
            $fallbackCount = (int) ($bucket['fallback_messages'] ?? 0);
            $fallbackRate = $assistantMessages > 0 ? $fallbackCount / $assistantMessages : 0.0;

            $status = 'healthy';
            if ($avgQuality === null) {
                $status = 'insufficient_quality_data';
            } elseif ($avgQuality < 75 || $fallbackRate > 0.25) {
                $status = 'needs_review';
            }

            $userRows[] = [
                'user_id' => $uid,
                'assistant_messages' => $assistantMessages,
                'avg_quality_percentage' => $avgQuality,
                'warning_messages' => (int) ($bucket['warning_messages'] ?? 0),
                'fallback_messages' => $fallbackCount,
                'safety_intervention_messages' => (int) ($bucket['safety_intervention_messages'] ?? 0),
                'status' => $status,
                'last_message_at' => $bucket['last_message_at'] ?? null,
            ];
        }

        return [
            'enabled' => true,
            'summary' => [
                'total_assistant_messages' => count($rows),
                'users_with_messages' => $usersWithMessages,
                'users_without_messages' => count($userIds) - $usersWithMessages,
                'avg_quality_percentage' => $qualityValues !== []
                    ? round(array_sum($qualityValues) / count($qualityValues), 2)
                    : null,
                'messages_with_warnings' => $warningMessages,
                'fallback_messages' => $fallbackMessages,
                'safety_intervention_messages' => $safetyInterventions,
                'model_counts' => $modelCounts,
            ],
            'users' => $userRows,
        ];
    }

    /**
     * @param  array<int, array{date:CarbonImmutable,weight:float}>  $rows
     */
    private function weightOnOrBefore(array $rows, CarbonImmutable $targetDate): ?float
    {
        $best = null;
        foreach ($rows as $row) {
            if (($row['date'] ?? null) instanceof CarbonImmutable && $row['date']->greaterThan($targetDate)) {
                break;
            }
            $best = $this->toFloatOrNull($row['weight'] ?? null);
        }

        return $best;
    }

    /**
     * @param  array<int, array{date:CarbonImmutable,weight:float}>  $rows
     * @return array{weight_kg:float,measured_at:string}|null
     */
    private function weightNearDate(
        array $rows,
        CarbonImmutable $targetDate,
        int $toleranceBefore,
        int $toleranceAfter
    ): ?array {
        $targetTs = $targetDate->getTimestamp();
        $best = null;
        $bestDistance = null;

        foreach ($rows as $row) {
            if (! (($row['date'] ?? null) instanceof CarbonImmutable)) {
                continue;
            }
            $deltaDays = (int) floor(($row['date']->getTimestamp() - $targetTs) / 86400);
            if ($deltaDays < (-1 * $toleranceBefore) || $deltaDays > $toleranceAfter) {
                continue;
            }

            $distance = abs($deltaDays);
            if ($bestDistance === null || $distance < $bestDistance) {
                $weight = $this->toFloatOrNull($row['weight'] ?? null);
                if ($weight === null) {
                    continue;
                }

                $bestDistance = $distance;
                $best = [
                    'weight_kg' => $weight,
                    'measured_at' => $row['date']->toDateString(),
                ];
            }
        }

        return $best;
    }

    /**
     * @return array<string, mixed>
     */
    private function comparePlans(array $previous, array $current): array
    {
        $prevMeals = $this->extractMealItems($previous);
        $currMeals = $this->extractMealItems($current);
        $prevExercises = $this->extractExercises($previous);
        $currExercises = $this->extractExercises($current);

        $prevTargets = $this->flattenScalarMap((array) data_get($previous, 'diet.daily_targets', []), 'target');
        $currTargets = $this->flattenScalarMap((array) data_get($current, 'diet.daily_targets', []), 'target');
        $changedTargets = $this->changedKeys($prevTargets, $currTargets);

        $prevProgression = $this->stringSignatureMap((array) data_get($previous, 'workout.progression_rules', []));
        $currProgression = $this->stringSignatureMap((array) data_get($current, 'workout.progression_rules', []));
        $prevRecovery = $this->stringSignatureMap((array) data_get($previous, 'workout.recovery_rules', []));
        $currRecovery = $this->stringSignatureMap((array) data_get($current, 'workout.recovery_rules', []));

        $mealJ = $this->jaccardSimilarity($prevMeals, $currMeals);
        $exerciseJ = $this->jaccardSimilarity($prevExercises, $currExercises);

        $dietChanged = $mealJ < 0.999 || $changedTargets !== [];
        $workoutChanged = $exerciseJ < 0.999 || $this->changedKeys($prevProgression, $currProgression) !== [] || $this->changedKeys($prevRecovery, $currRecovery) !== [];

        return [
            'overall_changed' => $dietChanged || $workoutChanged,
            'diet_changed' => $dietChanged,
            'workout_changed' => $workoutChanged,
            'meal_jaccard' => $mealJ,
            'exercise_jaccard' => $exerciseJ,
            'changed_target_keys' => $changedTargets,
            'added_meal_items' => $this->listDiff($currMeals, $prevMeals),
            'removed_meal_items' => $this->listDiff($prevMeals, $currMeals),
            'added_exercises' => $this->listDiff($currExercises, $prevExercises),
            'removed_exercises' => $this->listDiff($prevExercises, $currExercises),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function extractMealItems(array $plan): array
    {
        $names = [];
        foreach ((array) data_get($plan, 'diet.days', []) as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = mb_strtolower(trim((string) ($item['name'] ?? '')));
                    if ($name !== '') {
                        $names[$name] = $name;
                    }
                }
            }
        }

        ksort($names);

        return array_values($names);
    }

    /**
     * @return array<int, string>
     */
    private function extractExercises(array $plan): array
    {
        $names = [];
        foreach ((array) data_get($plan, 'workout.weekly_schedule', []) as $day) {
            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $name = mb_strtolower(trim((string) ($exercise['name'] ?? '')));
                if ($name !== '') {
                    $names[$name] = $name;
                }
            }
        }

        ksort($names);

        return array_values($names);
    }

    /**
     * @param  array<string, mixed>  $map
     * @return array<string, string>
     */
    private function flattenScalarMap(array $map, string $prefix): array
    {
        $flat = [];
        foreach ($map as $key => $value) {
            if (! is_scalar($value) && $value !== null) {
                continue;
            }
            $k = mb_strtolower(trim((string) $key));
            if ($k === '') {
                continue;
            }
            $flat[$prefix.'.'.$k] = is_bool($value)
                ? ($value ? 'true' : 'false')
                : (string) $value;
        }
        ksort($flat);

        return $flat;
    }

    /**
     * @param  array<int, string>  $values
     * @return array<string, string>
     */
    private function stringSignatureMap(array $values): array
    {
        $map = [];
        foreach ($values as $value) {
            $line = mb_strtolower(trim((string) $value));
            if ($line !== '') {
                $map[$line] = $line;
            }
        }
        ksort($map);

        return $map;
    }

    /**
     * @param  array<string, string>  $a
     * @param  array<string, string>  $b
     * @return array<int, string>
     */
    private function changedKeys(array $a, array $b): array
    {
        $keys = array_unique(array_merge(array_keys($a), array_keys($b)));
        sort($keys);

        $changed = [];
        foreach ($keys as $key) {
            if (($a[$key] ?? null) !== ($b[$key] ?? null)) {
                $changed[] = (string) $key;
            }
        }

        return $changed;
    }

    /**
     * @param  array<int, string>  $a
     * @param  array<int, string>  $b
     */
    private function jaccardSimilarity(array $a, array $b): float
    {
        $aSet = array_values(array_unique(array_map('mb_strtolower', $a)));
        $bSet = array_values(array_unique(array_map('mb_strtolower', $b)));

        $union = array_values(array_unique(array_merge($aSet, $bSet)));
        if ($union === []) {
            return 1.0;
        }

        $intersectionCount = count(array_intersect($aSet, $bSet));

        return round($intersectionCount / count($union), 4);
    }

    /**
     * @param  array<int, string>  $source
     * @param  array<int, string>  $baseline
     * @return array<int, string>
     */
    private function listDiff(array $source, array $baseline): array
    {
        $diff = array_values(array_diff($source, $baseline));
        sort($diff);

        return array_values(array_slice($diff, 0, 30));
    }

    /**
     * @param  array<int, float>  $errors
     */
    private function mae(array $errors): ?float
    {
        if ($errors === []) {
            return null;
        }

        $abs = array_map(static fn (float $error): float => abs($error), $errors);

        return round(array_sum($abs) / count($abs), 4);
    }

    /**
     * @param  array<int, float>  $errors
     */
    private function rmse(array $errors): ?float
    {
        if ($errors === []) {
            return null;
        }

        $sq = array_map(static fn (float $error): float => $error * $error, $errors);

        return round(sqrt(array_sum($sq) / count($sq)), 4);
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

    private function cycleIndex(CarbonImmutable $anchor, CarbonImmutable $date, int $intervalDays): int
    {
        $diffDays = $anchor->diffInDays($date, false);
        if ($diffDays < 0) {
            return -1;
        }

        return (int) floor($diffDays / $intervalDays);
    }

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    /**
     * @param  array<int, string>  $warnings
     */
    private function isSafetyIntervention(array $warnings): bool
    {
        foreach ($warnings as $warning) {
            $line = trim((string) $warning);
            if (
                str_contains($line, 'Removed a food suggestion')
                || str_contains($line, 'Adjusted the reply to respect the saved diet type')
            ) {
                return true;
            }
        }

        return false;
    }

    private function isFallbackModel(string $model): bool
    {
        $value = mb_strtolower(trim($model));

        return in_array($value, ['chat-fallback', 'safety-short-circuit'], true);
    }

    private function parseDate(string $value): CarbonImmutable
    {
        $date = trim($value);
        if ($date === '') {
            return CarbonImmutable::today('UTC')->startOfDay();
        }

        return CarbonImmutable::parse($date, 'UTC')->startOfDay();
    }

    /**
     * @return array<string, mixed>
     */
    private function userSummary(User $user): array
    {
        return [
            'id' => (int) $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'role' => $user->role,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderMarkdown(array $payload): string
    {
        $lines = [];
        $lines[] = '# Predictor Evolution Audit';
        $lines[] = '';
        $lines[] = '- Generated at (UTC): '.(string) data_get($payload, 'run.generated_at_utc', '');
        $lines[] = '- From date: '.(string) data_get($payload, 'run.from_date', '');
        $lines[] = '- Anchor date: '.(string) data_get($payload, 'run.anchor_date', '');
        $lines[] = '- Interval days: '.(int) data_get($payload, 'run.interval_days', 21);
        $lines[] = '';
        $lines[] = '## Global Summary';
        $lines[] = '';
        $lines[] = '- Users evaluated: '.(int) data_get($payload, 'summary.users_evaluated', 0);
        $lines[] = '- Users with predictions: '.(int) data_get($payload, 'summary.users_with_predictions', 0);
        $lines[] = '- Total cycles: '.(int) data_get($payload, 'summary.total_cycles', 0);
        $lines[] = '- Total labeled cycles: '.(int) data_get($payload, 'summary.total_labeled_cycles', 0);
        $lines[] = '- Predictor MAE (kg): '.(string) data_get($payload, 'summary.predictor_accuracy.mae_kg', 'n/a');
        $lines[] = '- Predictor RMSE (kg): '.(string) data_get($payload, 'summary.predictor_accuracy.rmse_kg', 'n/a');
        $lines[] = '';
        $lines[] = '## Planner Feedback Status';
        $lines[] = '';
        foreach ((array) data_get($payload, 'summary.planner_feedback_status_counts', []) as $key => $count) {
            $lines[] = '- '.$key.': '.(int) $count;
        }
        $lines[] = '';
        $lines[] = '## Plan Transition Stats';
        $lines[] = '';
        $lines[] = '- Total transitions: '.(int) data_get($payload, 'summary.plan_transition_stats.total_transitions', 0);
        $lines[] = '- Changed transitions: '.(int) data_get($payload, 'summary.plan_transition_stats.changed_transitions', 0);
        $lines[] = '- Diet changed transitions: '.(int) data_get($payload, 'summary.plan_transition_stats.diet_changed_transitions', 0);
        $lines[] = '- Workout changed transitions: '.(int) data_get($payload, 'summary.plan_transition_stats.workout_changed_transitions', 0);
        $lines[] = '- Changed transition rate (%): '.(string) data_get($payload, 'summary.plan_transition_stats.changed_transition_rate_pct', 'n/a');

        if ((bool) data_get($payload, 'chatbot.enabled', false)) {
            $lines[] = '';
            $lines[] = '## Chatbot Health';
            $lines[] = '';
            $lines[] = '- Assistant messages: '.(int) data_get($payload, 'chatbot.summary.total_assistant_messages', 0);
            $lines[] = '- Users with chatbot activity: '.(int) data_get($payload, 'chatbot.summary.users_with_messages', 0);
            $lines[] = '- Users without chatbot activity: '.(int) data_get($payload, 'chatbot.summary.users_without_messages', 0);
            $lines[] = '- Average quality (%): '.(string) data_get($payload, 'chatbot.summary.avg_quality_percentage', 'n/a');
            $lines[] = '- Fallback messages: '.(int) data_get($payload, 'chatbot.summary.fallback_messages', 0);
            $lines[] = '- Safety intervention messages: '.(int) data_get($payload, 'chatbot.summary.safety_intervention_messages', 0);
        }

        $lines[] = '';
        $lines[] = '## Per-User Snapshot';
        $lines[] = '';
        $lines[] = '| User ID | Email | Cycles | Labeled | MAE (kg) | Feedback status | Plan changed transitions |';
        $lines[] = '| --- | --- | ---: | ---: | ---: | --- | ---: |';

        foreach ((array) ($payload['users'] ?? []) as $userRow) {
            $lines[] = sprintf(
                '| %d | %s | %d | %d | %s | %s | %d |',
                (int) data_get($userRow, 'user.id', 0),
                (string) data_get($userRow, 'user.email', ''),
                (int) data_get($userRow, 'summary.total_cycles', 0),
                (int) data_get($userRow, 'summary.labeled_cycles', 0),
                (string) data_get($userRow, 'summary.mae_kg', 'n/a'),
                (string) data_get($userRow, 'summary.planner_feedback_status', 'n/a'),
                (int) data_get($userRow, 'summary.transitions_changed', 0),
            );
        }

        return implode("\n", $lines)."\n";
    }
}
