<?php

namespace App\Console\Commands\Ai;

use App\Models\AiConversation;
use App\Models\AiRequest;
use App\Models\Measurement;
use App\Models\User;
use App\Services\Ai\Chat\ChatOrchestrator;
use App\Services\Ai\Evaluation\DeepAuditAnswerGrader;
use App\Services\Ai\Evaluation\DeepAuditQuestionBank;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\Models\ProgressPredictionModel;
use App\Services\Ai\PlannerService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

class AiDeepAudit extends Command
{
    protected $signature = 'ai:deep-audit
        {--user-ids= : Comma-separated user IDs. If omitted, diverse accounts are auto-selected from DB.}
        {--max-accounts=3 : Number of accounts to include when auto-selecting from DB.}
        {--questions-per-category=100 : Number of questions for each category.}
        {--chat-full-users=1 : Number of users to run the full 300-question matrix on.}
        {--chat-secondary-per-category=30 : Questions per category for remaining users.}
        {--chat-batch-size=10 : Number of questions per batch before pausing (to reduce GPU load).}
        {--chat-batch-break-seconds=8 : Pause duration between chat batches.}
        {--chat-category-break-seconds=15 : Pause duration after each chat category.}
        {--planner-horizon=21 : Planner horizon days used for regeneration checks (14/21/28).}
        {--planner-break-seconds=20 : Pause duration between planner users.}
        {--predictor-holdout=0 : Run Python holdout evaluation for predictor accuracy (1/0).}
        {--out-dir=tmp : Output directory for JSON and Markdown reports.}
        {--skip-chat=0 : Skip chatbot audit (1/0).}
        {--skip-planner=0 : Skip planner audit (1/0).}
        {--skip-predictor=0 : Skip prediction model audit (1/0).}';

    protected $description = 'Run deep AI audit: 300-question chatbot matrix, planner regeneration logic, and predictor wiring/accuracy/adaptation checks.';

    public function handle(
        ChatOrchestrator $orchestrator,
        DeepAuditQuestionBank $questionBank,
        DeepAuditAnswerGrader $grader,
        PlannerService $planner,
        PlannerRunQualityScorer $plannerScorer,
    ): int {
        $startedAt = CarbonImmutable::now('UTC');
        $stamp = $startedAt->format('Ymd_His');
        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $maxAccounts = max(1, (int) $this->option('max-accounts'));
        $questionsPerCategory = max(1, (int) $this->option('questions-per-category'));
        $chatFullUsers = max(0, (int) $this->option('chat-full-users'));
        $chatSecondaryPerCategory = max(1, (int) $this->option('chat-secondary-per-category'));
        $chatBatchSize = max(1, (int) $this->option('chat-batch-size'));
        $chatBatchBreakSeconds = max(0, (int) $this->option('chat-batch-break-seconds'));
        $chatCategoryBreakSeconds = max(0, (int) $this->option('chat-category-break-seconds'));
        $plannerHorizon = $this->normalizeHorizon((int) $this->option('planner-horizon'));
        $plannerBreakSeconds = max(0, (int) $this->option('planner-break-seconds'));

        $users = $this->resolveUsers((string) $this->option('user-ids'), $maxAccounts);
        if ($users === []) {
            $this->error('No users found for deep audit.');

            return self::FAILURE;
        }

        $bank = $questionBank->build($questionsPerCategory);
        $skipChat = ((int) $this->option('skip-chat')) === 1;
        $skipPlanner = ((int) $this->option('skip-planner')) === 1;
        $skipPredictor = ((int) $this->option('skip-predictor')) === 1;

        $payload = [
            'run' => [
                'started_at_utc' => $startedAt->toIso8601String(),
                'finished_at_utc' => null,
                'run_id' => $stamp,
                'options' => [
                    'user_ids' => (string) $this->option('user-ids'),
                    'max_accounts' => $maxAccounts,
                    'questions_per_category' => $questionsPerCategory,
                    'chat_full_users' => $chatFullUsers,
                    'chat_secondary_per_category' => $chatSecondaryPerCategory,
                    'chat_batch_size' => $chatBatchSize,
                    'chat_batch_break_seconds' => $chatBatchBreakSeconds,
                    'chat_category_break_seconds' => $chatCategoryBreakSeconds,
                    'planner_horizon' => $plannerHorizon,
                    'planner_break_seconds' => $plannerBreakSeconds,
                    'predictor_holdout' => ((int) $this->option('predictor-holdout')) === 1,
                    'skip_chat' => $skipChat,
                    'skip_planner' => $skipPlanner,
                    'skip_predictor' => $skipPredictor,
                ],
            ],
            'audited_users' => array_map(fn (User $user): array => $this->userSummary($user), $users),
            'question_bank' => $bank,
            'chat' => null,
            'planner' => null,
            'predictor' => null,
        ];

        if (! $skipChat) {
            $this->info(sprintf('Running chatbot deep audit (%d users, full users=%d, secondary per category=%d, batch=%d, break=%ds)...', count($users), $chatFullUsers, $chatSecondaryPerCategory, $chatBatchSize, $chatBatchBreakSeconds));
            $payload['chat'] = $this->runChatAudit(
                $users,
                $bank,
                $orchestrator,
                $grader,
                $chatFullUsers,
                $chatSecondaryPerCategory,
                $chatBatchSize,
                $chatBatchBreakSeconds,
                $chatCategoryBreakSeconds,
            );
        }

        if (! $skipPlanner) {
            $this->info('Running planner regeneration and logic audit...');
            $payload['planner'] = $this->runPlannerAudit($users, $planner, $plannerScorer, $plannerHorizon, $stamp, $plannerBreakSeconds);
        }

        if (! $skipPredictor) {
            $this->info('Running prediction model wiring, accuracy, and adaptation audit...');
            $payload['predictor'] = $this->runPredictorAudit($users, $plannerHorizon, $outDir, $stamp);
        }

        $finishedAt = CarbonImmutable::now('UTC');
        $payload['run']['finished_at_utc'] = $finishedAt->toIso8601String();
        $payload['run']['duration_seconds'] = (int) round(abs((float) $finishedAt->diffInSeconds($startedAt)));

        $jsonPath = $outDir.DIRECTORY_SEPARATOR."ai_deep_audit_{$stamp}.json";
        $mdPath = $outDir.DIRECTORY_SEPARATOR."ai_deep_audit_{$stamp}.md";

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        File::put($mdPath, $this->renderMarkdown($payload));

        $this->info("Deep audit JSON: {$jsonPath}");
        $this->info("Deep audit Markdown: {$mdPath}");

        return self::SUCCESS;
    }

    /**
     * @param  array<int, User>  $users
     * @param  array<string, array<int, string>>  $bank
     * @return array<string, mixed>
     */
    private function runChatAudit(
        array $users,
        array $bank,
        ChatOrchestrator $orchestrator,
        DeepAuditAnswerGrader $grader,
        int $fullUsers,
        int $secondaryPerCategory,
        int $batchSize,
        int $batchBreakSeconds,
        int $categoryBreakSeconds,
    ): array {
        $globalBuckets = $this->emptyBucketCounters();
        $globalByCategory = [
            'personalized' => $this->emptyBucketCounters(),
            'general_guidance' => $this->emptyBucketCounters(),
            'out_of_scope' => $this->emptyBucketCounters(),
        ];
        $userResults = [];
        $totalQuestions = 0;

        foreach ($users as $userIndex => $user) {
            $scope = $userIndex < $fullUsers ? 'full' : 'secondary';
            $this->line(sprintf('  Chat audit user #%d (%s)', $user->id, $user->email));
            $perUser = [
                'user' => $this->userSummary($user),
                'scope' => $scope,
                'entries' => [],
                'summary' => [
                    'total_questions' => 0,
                    'buckets' => $this->emptyBucketCounters(),
                    'by_category' => [
                        'personalized' => $this->emptyBucketCounters(),
                        'general_guidance' => $this->emptyBucketCounters(),
                        'out_of_scope' => $this->emptyBucketCounters(),
                    ],
                ],
            ];

            $categoryKeys = array_keys($bank);
            foreach ($categoryKeys as $categoryIndex => $category) {
                $questions = (array) ($bank[$category] ?? []);
                $categoryQuestions = $questions;
                if ($scope !== 'full') {
                    $categoryQuestions = array_values(array_slice($questions, 0, min($secondaryPerCategory, count($questions))));
                }

                $conversation = AiConversation::query()->create([
                    'user_id' => $user->id,
                    'title' => 'Deep audit '.str_replace('_', ' ', $category).' '.CarbonImmutable::now()->toDateTimeString(),
                    'last_message_at' => now(),
                ]);

                $runtimeContext = [
                    'screen_context' => 'coach',
                    'include_last_7_days' => $category !== 'out_of_scope',
                ];

                $count = count($categoryQuestions);
                foreach ($categoryQuestions as $index => $question) {
                    $totalQuestions++;
                    $perUser['summary']['total_questions']++;

                    try {
                        $result = $orchestrator->handle($user, $question, $runtimeContext, $conversation);
                        $answer = (string) data_get($result, 'assistant_message.content', '');
                        $warnings = array_values($result['warnings'] ?? []);
                        $quality = is_array($result['quality'] ?? null) ? $result['quality'] : [];
                        $grade = $grader->grade($category, $question, $answer, $quality, $warnings);

                        $entry = [
                            'question_id' => $this->questionId($category, $index + 1),
                            'category' => $category,
                            'index' => $index + 1,
                            'question' => $question,
                            'answer' => $answer,
                            'bucket' => $grade['bucket'],
                            'score' => $grade['score'],
                            'grade_reasons' => $grade['reasons'],
                            'grade_metrics' => $grade['metrics'],
                            'quality' => $quality,
                            'intent' => (string) ($result['intent'] ?? ''),
                            'feature' => (string) ($result['feature'] ?? ''),
                            'provider' => (string) ($result['provider'] ?? ''),
                            'model' => (string) ($result['model'] ?? ''),
                            'warnings' => $warnings,
                            'used_context_keys' => array_values($result['used_context_keys'] ?? []),
                            'conversation_id' => (int) data_get($result, 'conversation.id', 0),
                        ];
                    } catch (Throwable $e) {
                        $entry = [
                            'question_id' => $this->questionId($category, $index + 1),
                            'category' => $category,
                            'index' => $index + 1,
                            'question' => $question,
                            'answer' => '',
                            'bucket' => DeepAuditAnswerGrader::BUCKET_COMPLETELY_WRONG,
                            'score' => 0.0,
                            'grade_reasons' => ['exception_during_orchestration', $e::class],
                            'grade_metrics' => ['quality_score' => 0.0, 'keyword_relevance' => 0.0, 'warning_count' => 0],
                            'quality' => [],
                            'intent' => '',
                            'feature' => '',
                            'provider' => '',
                            'model' => 'exception',
                            'warnings' => [$this->truncate($e->getMessage(), 220)],
                            'used_context_keys' => [],
                            'conversation_id' => (int) $conversation->id,
                            'error' => [
                                'type' => $e::class,
                                'message' => $this->truncate($e->getMessage(), 400),
                            ],
                        ];
                    }

                    $bucket = (string) $entry['bucket'];
                    if (! array_key_exists($bucket, $globalBuckets)) {
                        $bucket = DeepAuditAnswerGrader::BUCKET_COMPLETELY_WRONG;
                        $entry['bucket'] = $bucket;
                    }

                    $globalBuckets[$bucket]++;
                    $globalByCategory[$category][$bucket]++;
                    $perUser['summary']['buckets'][$bucket]++;
                    $perUser['summary']['by_category'][$category][$bucket]++;

                    $perUser['entries'][] = $entry;

                    if (($index + 1) % 20 === 0 || $index + 1 === $count) {
                        $this->line(sprintf('    %s: %d/%d', $category, $index + 1, $count));
                    }

                    if (
                        $batchBreakSeconds > 0
                        && $batchSize > 0
                        && ($index + 1) % $batchSize === 0
                        && ($index + 1) < $count
                    ) {
                        $this->line(sprintf('    %s: cooling break %ds after batch %d', $category, $batchBreakSeconds, (int) (($index + 1) / $batchSize)));
                        sleep($batchBreakSeconds);
                    }
                }

                if ($categoryBreakSeconds > 0 && $categoryIndex < count($categoryKeys) - 1) {
                    $this->line(sprintf('    %s: category break %ds', $category, $categoryBreakSeconds));
                    sleep($categoryBreakSeconds);
                }
            }

            $userResults[] = $perUser;
        }

        return [
            'summary' => [
                'full_users' => $fullUsers,
                'secondary_per_category' => $secondaryPerCategory,
                'total_questions' => $totalQuestions,
                'bucket_counts' => $globalBuckets,
                'bucket_percentages' => $this->bucketPercentages($globalBuckets, $totalQuestions),
                'by_category' => array_map(
                    fn (array $counts): array => [
                        'counts' => $counts,
                        'percentages' => $this->bucketPercentages($counts, array_sum($counts)),
                    ],
                    $globalByCategory
                ),
            ],
            'users' => $userResults,
        ];
    }

    /**
     * @param  array<int, User>  $users
     * @return array<string, mixed>
     */
    private function runPlannerAudit(
        array $users,
        PlannerService $planner,
        PlannerRunQualityScorer $plannerScorer,
        int $horizonDays,
        string $stamp,
        int $plannerBreakSeconds,
    ): array {
        $rows = [];
        $success = 0;

        foreach ($users as $userIndex => $user) {
            $this->line(sprintf('  Planner audit user #%d (%s)', $user->id, $user->email));
            $row = [
                'user' => $this->userSummary($user),
                'horizon_days' => $horizonDays,
                'status' => 'success',
                'existing_generation' => null,
                'regen_a' => null,
                'regen_b' => null,
                'comparisons' => null,
                'logic_checks' => null,
                'errors' => [],
            ];

            try {
                $existing = $planner->latestPair($user);
                if (is_array($existing)) {
                    $existingPlan = is_array($existing['plan'] ?? null) ? $existing['plan'] : [];
                    $row['existing_generation'] = [
                        'version' => (int) ($existing['version'] ?? 0),
                        'ai_request_id' => (int) ($existing['ai_request_id'] ?? 0),
                        'provider' => $existing['provider'] ?? null,
                        'model' => $existing['model'] ?? null,
                        'plan_hash' => $this->planHash($existingPlan),
                        'quality' => $plannerScorer->score($user, $existingPlan, $horizonDays),
                    ];
                }

                $regenA = $planner->generate($user, [
                    'regenerate' => true,
                    'reason' => "deep_audit_regen_a_{$stamp}",
                    'created_by' => (int) $user->id,
                    'plan_horizon_days' => $horizonDays,
                ]);
                $regenB = $planner->generate($user, [
                    'regenerate' => true,
                    'reason' => "deep_audit_regen_b_{$stamp}",
                    'created_by' => (int) $user->id,
                    'plan_horizon_days' => $horizonDays,
                ]);

                $planA = is_array($regenA['plan'] ?? null) ? $regenA['plan'] : [];
                $planB = is_array($regenB['plan'] ?? null) ? $regenB['plan'] : [];

                $row['regen_a'] = [
                    'ai_request_id' => (int) ($regenA['ai_request_id'] ?? 0),
                    'version' => (int) ($regenA['version'] ?? 0),
                    'provider' => $regenA['provider'] ?? null,
                    'model' => $regenA['model'] ?? null,
                    'plan_hash' => $this->planHash($planA),
                    'quality' => is_array($regenA['quality'] ?? null) ? $regenA['quality'] : $plannerScorer->score($user, $planA, $horizonDays),
                ];
                $row['regen_b'] = [
                    'ai_request_id' => (int) ($regenB['ai_request_id'] ?? 0),
                    'version' => (int) ($regenB['version'] ?? 0),
                    'provider' => $regenB['provider'] ?? null,
                    'model' => $regenB['model'] ?? null,
                    'plan_hash' => $this->planHash($planB),
                    'quality' => is_array($regenB['quality'] ?? null) ? $regenB['quality'] : $plannerScorer->score($user, $planB, $horizonDays),
                ];

                $comparisonExistingA = is_array($row['existing_generation'])
                    ? $this->comparePlans(
                        is_array($existing['plan'] ?? null) ? $existing['plan'] : [],
                        $planA
                    )
                    : null;
                $comparisonAB = $this->comparePlans($planA, $planB);

                $row['comparisons'] = [
                    'existing_vs_regen_a' => $comparisonExistingA,
                    'regen_a_vs_regen_b' => $comparisonAB,
                ];

                $row['logic_checks'] = [
                    'regen_a' => $this->evaluatePlanLogic($planA, $user, $horizonDays),
                    'regen_b' => $this->evaluatePlanLogic($planB, $user, $horizonDays),
                ];
                $success++;
            } catch (Throwable $e) {
                $row['status'] = 'error';
                $row['errors'][] = [
                    'type' => $e::class,
                    'message' => $this->truncate($e->getMessage(), 400),
                ];
            }

            $rows[] = $row;

            if ($plannerBreakSeconds > 0 && $userIndex < count($users) - 1) {
                $this->line(sprintf('  Planner cooldown break %ds', $plannerBreakSeconds));
                sleep($plannerBreakSeconds);
            }
        }

        return [
            'summary' => [
                'users_total' => count($users),
                'users_success' => $success,
                'users_failed' => count($users) - $success,
                'horizon_days' => $horizonDays,
            ],
            'users' => $rows,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function evaluatePlanLogic(array $plan, User $user, int $horizonDays): array
    {
        $dietDays = is_array(data_get($plan, 'diet.days')) ? data_get($plan, 'diet.days') : [];
        $grocery = is_array(data_get($plan, 'diet.grocery_list')) ? data_get($plan, 'diet.grocery_list') : [];
        $weekly = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        $targetDays = max(1, (int) ($user->workout_days_per_week ?? 3));

        $mealItemCount = 0;
        $emptyMealBlocks = 0;
        foreach ($dietDays as $day) {
            $meals = is_array($day['meals'] ?? null) ? $day['meals'] : [];
            foreach ($meals as $meal) {
                $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
                if ($items === []) {
                    $emptyMealBlocks++;
                }
                $mealItemCount += count($items);
            }
        }

        $trainDays = 0;
        $emptyTrainDays = 0;
        foreach ($weekly as $day) {
            $session = mb_strtolower(trim((string) ($day['session_type'] ?? 'train')));
            $exercises = is_array($day['exercises'] ?? null) ? $day['exercises'] : [];
            if (! in_array($session, ['rest', 'recovery'], true)) {
                $trainDays++;
                if ($exercises === []) {
                    $emptyTrainDays++;
                }
            }
        }

        $checks = [
            'diet_days_match_horizon' => count($dietDays) === $this->normalizeHorizon($horizonDays),
            'grocery_list_present' => count($grocery) > 0,
            'meal_items_present' => $mealItemCount > 0,
            'no_empty_meal_blocks' => $emptyMealBlocks === 0,
            'weekly_schedule_has_7_days' => count($weekly) === 7,
            'train_days_not_empty' => $emptyTrainDays === 0,
            'train_days_roughly_match_profile_target' => abs($trainDays - $targetDays) <= 2,
            'progress_prediction_present' => is_array(data_get($plan, 'progress_prediction')),
        ];

        $passed = count(array_filter($checks));
        $total = count($checks);

        return [
            'passed_checks' => $passed,
            'total_checks' => $total,
            'quality_percentage' => $total > 0 ? round(($passed / $total) * 100, 2) : 0.0,
            'derived' => [
                'meal_item_count' => $mealItemCount,
                'empty_meal_blocks' => $emptyMealBlocks,
                'train_days' => $trainDays,
                'empty_train_days' => $emptyTrainDays,
                'target_train_days' => $targetDays,
            ],
            'checks' => $checks,
        ];
    }

    /**
     * @param  array<int, User>  $users
     * @return array<string, mixed>
     */
    private function runPredictorAudit(
        array $users,
        int $plannerHorizon,
        string $outDir,
        string $stamp,
    ): array {
        $inferenceEnabled = (bool) config('ai.progress_predictor.inference.enabled', false);
        $modelDir = base_path((string) config('ai.progress_predictor.inference.model_dir', 'storage/app/ai/models/progress_predictor_v1_real_only'));
        $scriptPath = base_path((string) config('ai.progress_predictor.inference.script', 'scripts/ai/training/predict_progress_from_features.py'));
        $pythonBin = (string) config('ai.progress_predictor.inference.python_bin', 'python');

        $runtimeSamples = [];
        foreach ($users as $user) {
            $request = AiRequest::query()
                ->where('user_id', $user->id)
                ->where('type', 'plan_generator')
                ->where('status', 'completed')
                ->whereNotNull('output_json')
                ->latest('id')
                ->first(['id', 'created_at', 'provider', 'model', 'output_json']);

            $prediction = $request && is_array($request->output_json)
                ? data_get($request->output_json, 'progress_prediction')
                : null;

            $runtimeSamples[] = [
                'user' => $this->userSummary($user),
                'latest_ai_request_id' => (int) ($request?->id ?? 0),
                'latest_ai_request_created_at' => optional($request?->created_at)?->toIso8601String(),
                'provider' => $request?->provider,
                'model' => $request?->model,
                'prediction' => is_array($prediction) ? $prediction : null,
            ];
        }

        $visibilityChecks = [
            'home_controller_exposes_progress_prediction' => $this->fileContains(
                app_path('Http/Controllers/HomeController.php'),
                'progressPrediction'
            ),
            'home_controller_exposes_prediction_trend' => $this->fileContains(
                app_path('Http/Controllers/HomeController.php'),
                'predictionTrend'
            ),
            'dashboard_page_renders_prediction' => $this->fileContains(
                base_path('resources/js/pages/dashboard.tsx'),
                'progressPrediction'
            ),
            'planner_page_renders_feedback_adjustment' => $this->fileContains(
                base_path('resources/js/pages/ai/planner.tsx'),
                'feedback_adjustment'
            ),
        ];

        $exportJsonl = $outDir.DIRECTORY_SEPARATOR."progress_predictor_dataset_{$stamp}.jsonl";
        $exportCsv = $outDir.DIRECTORY_SEPARATOR."progress_predictor_dataset_{$stamp}.csv";

        $exportStatus = 'not_run';
        $exportOutput = '';
        $runHoldout = ((int) $this->option('predictor-holdout')) === 1;
        $holdoutStatus = $runHoldout ? 'not_run' : 'skipped';
        $holdoutProcessOutput = '';
        $holdoutEvaluation = null;

        try {
            Artisan::call('ai:export-progress-prediction-data', [
                '--out-jsonl' => $this->relativePath($exportJsonl),
                '--out-csv' => $this->relativePath($exportCsv),
                '--include-unlabeled' => 0,
                '--exclude-synthetic' => 1,
            ]);
            $exportStatus = 'ok';
            $exportOutput = trim(Artisan::output());
        } catch (Throwable $e) {
            $exportStatus = 'error';
            $exportOutput = $this->truncate($e->getMessage(), 400);
        }

        if ($runHoldout && $exportStatus === 'ok' && File::exists($exportJsonl)) {
            try {
                $cmd = implode(' ', [
                    escapeshellarg($pythonBin),
                    escapeshellarg(base_path('scripts/ai/training/evaluate_progress_predictor_holdout.py')),
                    '--data',
                    escapeshellarg($exportJsonl),
                    '--out-dir',
                    escapeshellarg($outDir),
                    '--tag',
                    escapeshellarg($stamp),
                ]);

                $outputLines = [];
                $exitCode = 0;
                exec($cmd.' 2>&1', $outputLines, $exitCode);
                $holdoutProcessOutput = trim(implode("\n", $outputLines));

                if ($exitCode === 0) {
                    $holdoutStatus = 'ok';
                    $pathPayload = json_decode($holdoutProcessOutput, true);
                    if (is_array($pathPayload) && is_string($pathPayload['json'] ?? null) && File::exists($pathPayload['json'])) {
                        $decodedEval = json_decode((string) File::get($pathPayload['json']), true);
                        if (is_array($decodedEval)) {
                            $holdoutEvaluation = $decodedEval;
                        }
                    }
                } else {
                    $holdoutStatus = 'error';
                }
            } catch (Throwable $e) {
                $holdoutStatus = 'error';
                $holdoutProcessOutput = $this->truncate($e->getMessage(), 400);
            }
        }

        $onlineAccuracy = $this->predictionErrorStats(array_map(
            static fn (User $user): int => (int) $user->id,
            $users
        ));

        $adaptationSimulation = $this->runBackdatedAdaptationSimulation($users, $plannerHorizon, $stamp);

        return [
            'summary' => [
                'inference_enabled' => $inferenceEnabled,
                'model_dir' => $modelDir,
                'model_dir_exists' => is_dir($modelDir),
                'script_path' => $scriptPath,
                'script_exists' => is_file($scriptPath),
                'weight_model_exists' => is_file($modelDir.DIRECTORY_SEPARATOR.'weight_change_model.joblib'),
                'strength_model_exists' => is_file($modelDir.DIRECTORY_SEPARATOR.'strength_progress_model.joblib'),
                'manifest_exists' => is_file($modelDir.DIRECTORY_SEPARATOR.'manifest.json'),
            ],
            'visibility_checks' => $visibilityChecks,
            'runtime_samples' => $runtimeSamples,
            'dataset_export' => [
                'status' => $exportStatus,
                'jsonl_path' => $exportJsonl,
                'csv_path' => $exportCsv,
                'output' => $exportOutput,
            ],
            'holdout_evaluation' => [
                'enabled' => $runHoldout,
                'status' => $holdoutStatus,
                'process_output' => $holdoutProcessOutput,
                'metrics' => $holdoutEvaluation,
            ],
            'online_accuracy' => $onlineAccuracy,
            'adaptation_simulation' => $adaptationSimulation,
        ];
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<string, mixed>
     */
    private function predictionErrorStats(array $userIds): array
    {
        if ($userIds === []) {
            return [
                'samples' => 0,
                'mae_kg' => null,
                'rmse_kg' => null,
                'notes' => 'No users supplied for online prediction error stats.',
            ];
        }

        $rows = AiRequest::query()
            ->whereIn('user_id', $userIds)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->limit(200)
            ->get(['id', 'user_id', 'created_at', 'output_json']);

        $errors = [];
        foreach ($rows as $row) {
            $output = is_array($row->output_json) ? $row->output_json : [];
            $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : null;
            if (! is_array($prediction)) {
                continue;
            }

            $horizon = $this->normalizeHorizon((int) ($prediction['horizon_days'] ?? 14));
            $startDate = CarbonImmutable::parse((string) $row->created_at)->startOfDay();
            $endDate = $startDate->addDays($horizon - 1);

            $baseline = is_numeric($prediction['baseline_weight_kg'] ?? null)
                ? (float) $prediction['baseline_weight_kg']
                : $this->weightOnOrBefore((int) $row->user_id, $startDate);
            $actualEnd = $this->weightNearDate((int) $row->user_id, $endDate, 10);
            if ($baseline === null || $actualEnd === null) {
                continue;
            }

            $expectedChange = is_numeric($prediction['expected_weight_change_kg'] ?? null)
                ? (float) $prediction['expected_weight_change_kg']
                : (is_numeric($prediction['projected_body_weight_kg'] ?? null)
                    ? ((float) $prediction['projected_body_weight_kg'] - $baseline)
                    : null);
            if ($expectedChange === null) {
                continue;
            }

            $actualChange = (float) $actualEnd - (float) $baseline;
            $errors[] = $actualChange - $expectedChange;
        }

        if ($errors === []) {
            return [
                'samples' => 0,
                'mae_kg' => null,
                'rmse_kg' => null,
                'notes' => 'No labeled prediction windows were found with both baseline and end weight.',
            ];
        }

        $abs = array_map(static fn (float $error): float => abs($error), $errors);
        $sq = array_map(static fn (float $error): float => $error * $error, $errors);

        return [
            'samples' => count($errors),
            'mae_kg' => round(array_sum($abs) / count($abs), 4),
            'rmse_kg' => round(sqrt(array_sum($sq) / count($sq)), 4),
            'notes' => 'Computed from recent completed planner requests with measurable horizon-end check-ins.',
        ];
    }

    /**
     * @param  array<int, User>  $users
     * @return array<string, mixed>
     */
    private function runBackdatedAdaptationSimulation(
        array $users,
        int $plannerHorizon,
        string $stamp,
    ): array {
        $horizonDays = max(21, $this->normalizeHorizon($plannerHorizon));
        $baselineDate = CarbonImmutable::create(2026, 3, 5, 12, 0, 0, 'UTC');
        $targetDate = $baselineDate->addDays($horizonDays - 1);

        $candidate = $this->pickAdaptiveUser($users, $baselineDate);
        if (! $candidate) {
            return [
                'status' => 'skipped',
                'reason' => 'no_user_with_measurements_near_baseline_window',
            ];
        }

        $baselineWeight = $this->weightNearDate((int) $candidate->id, $baselineDate, 7);
        if ($baselineWeight === null) {
            return [
                'status' => 'skipped',
                'reason' => 'baseline_weight_not_available',
                'user' => $this->userSummary($candidate),
            ];
        }

        $syntheticEndMeasurement = false;
        $endWeight = $this->weightNearDate((int) $candidate->id, $targetDate, 7);
        if ($endWeight === null) {
            $endWeight = $this->syntheticEndWeight($candidate, $baselineWeight);
            $existingExact = Measurement::query()
                ->where('user_id', $candidate->id)
                ->whereDate('measured_at', $targetDate->toDateString())
                ->first();

            if ($existingExact) {
                $existingExact->forceFill([
                    'weight_kg' => $endWeight,
                    'notes' => trim((string) $existingExact->notes.' synthetic_deep_audit_adaptation_end'),
                ])->save();
            } else {
                Measurement::query()->create([
                    'user_id' => $candidate->id,
                    'measured_at' => $targetDate->toDateString(),
                    'weight_kg' => $endWeight,
                    'notes' => 'synthetic_deep_audit_adaptation_end',
                ]);
            }
            $syntheticEndMeasurement = true;
        }

        try {
            $sourceRequest = AiRequest::query()
                ->where('user_id', $candidate->id)
                ->where('type', 'plan_generator')
                ->where('status', 'completed')
                ->whereNotNull('input_context_json')
                ->whereNotNull('output_json')
                ->latest('id')
                ->first();

            if (! $sourceRequest || ! is_array($sourceRequest->input_context_json) || ! is_array($sourceRequest->output_json)) {
                return [
                    'status' => 'skipped',
                    'reason' => 'no_completed_plan_request_with_context',
                    'user' => $this->userSummary($candidate),
                ];
            }

            $seedOutput = $sourceRequest->output_json;
            $seedPrediction = is_array(data_get($seedOutput, 'progress_prediction')) ? data_get($seedOutput, 'progress_prediction') : [];
            $seedPrediction['horizon_days'] = $horizonDays;
            $seedPrediction['baseline_weight_kg'] = round($baselineWeight, 2);
            if (is_numeric($seedPrediction['expected_weight_change_kg'] ?? null)) {
                $seedPrediction['projected_body_weight_kg'] = round(
                    (float) $seedPrediction['baseline_weight_kg'] + (float) $seedPrediction['expected_weight_change_kg'],
                    2
                );
            }
            data_set($seedOutput, 'progress_prediction', $seedPrediction);

            $seedRequest = AiRequest::query()->create([
                'user_id' => (int) $candidate->id,
                'type' => 'plan_generator',
                'status' => 'completed',
                'provider' => (string) ($sourceRequest->provider ?? 'seed'),
                'model' => (string) ($sourceRequest->model ?? 'seed'),
                'prompt_version' => (string) ($sourceRequest->prompt_version ?? 'seed'),
                'schema_version' => (string) ($sourceRequest->schema_version ?? 'seed'),
                'input_context_json' => $sourceRequest->input_context_json,
                'output_json' => $seedOutput,
                'usage_json' => is_array($sourceRequest->usage_json) ? $sourceRequest->usage_json : [],
                'error_json' => null,
            ]);
            $seedRequest->forceFill([
                'created_at' => $baselineDate->toDateTimeString(),
                'updated_at' => $baselineDate->toDateTimeString(),
            ])->save();

            $predictor = app(ProgressPredictionModel::class);
            $profile = is_array(data_get($sourceRequest->input_context_json, 'profile'))
                ? data_get($sourceRequest->input_context_json, 'profile')
                : [];
            $context = $sourceRequest->input_context_json;
            $plan = $sourceRequest->output_json;

            $prediction = $predictor->predict(
                $candidate,
                $profile,
                $context,
                $plan,
                $horizonDays
            );

            $baseWeekly = is_numeric(data_get($prediction, 'feedback_adjustment.base_weekly_weight_change_kg'))
                ? (float) data_get($prediction, 'feedback_adjustment.base_weekly_weight_change_kg')
                : null;
            $adjustedWeekly = is_numeric(data_get($prediction, 'feedback_adjustment.adjusted_weekly_weight_change_kg'))
                ? (float) data_get($prediction, 'feedback_adjustment.adjusted_weekly_weight_change_kg')
                : null;
            $lastError = is_numeric(data_get($prediction, 'feedback_adjustment.last_prediction_error_kg_per_week'))
                ? (float) data_get($prediction, 'feedback_adjustment.last_prediction_error_kg_per_week')
                : null;

            $adapted = $lastError !== null
                && $baseWeekly !== null
                && $adjustedWeekly !== null
                && abs($adjustedWeekly - $baseWeekly) >= 0.01;

            return [
                'status' => 'ok',
                'user' => $this->userSummary($candidate),
                'baseline_date' => $baselineDate->toDateString(),
                'target_date' => $targetDate->toDateString(),
                'horizon_days' => $horizonDays,
                'baseline_weight_kg' => round($baselineWeight, 2),
                'end_weight_kg' => round((float) $endWeight, 2),
                'synthetic_end_measurement_used' => $syntheticEndMeasurement,
                'seed_ai_request_id' => (int) $seedRequest->id,
                'source_ai_request_id' => (int) $sourceRequest->id,
                'followup_prediction' => $prediction,
                'adapted' => $adapted,
                'adaptation_signal' => [
                    'last_prediction_error_kg_per_week' => $lastError,
                    'base_weekly_weight_change_kg' => $baseWeekly,
                    'adjusted_weekly_weight_change_kg' => $adjustedWeekly,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'error',
                'user' => $this->userSummary($candidate),
                'message' => $this->truncate($e->getMessage(), 400),
                'error_type' => $e::class,
            ];
        }
    }

    /**
     * @param  array<int, User>  $users
     */
    private function pickAdaptiveUser(array $users, CarbonImmutable $baselineDate): ?User
    {
        foreach ($users as $user) {
            $weight = $this->weightNearDate((int) $user->id, $baselineDate, 7);
            if ($weight !== null) {
                return $user;
            }
        }

        return User::query()
            ->where('role', User::ROLE_CLIENT)
            ->whereExists(function ($query) use ($baselineDate) {
                $query->select(DB::raw(1))
                    ->from('measurements as m')
                    ->whereColumn('m.user_id', 'users.id')
                    ->whereDate('m.measured_at', '>=', $baselineDate->subDays(7)->toDateString())
                    ->whereDate('m.measured_at', '<=', $baselineDate->addDays(7)->toDateString());
            })
            ->orderBy('id')
            ->first();
    }

    private function syntheticEndWeight(User $user, float $baselineWeight): float
    {
        $goalText = mb_strtolower(trim((string) ($user->dietary_goal ?? '').' '.(string) ($user->fitness_goal ?? '')));

        if (preg_match('/lose|loss|cut|deficit|fat/u', $goalText) === 1) {
            return round($baselineWeight + 0.9, 2);
        }
        if (preg_match('/gain|bulk|muscle|hypertrophy|strength/u', $goalText) === 1) {
            return round($baselineWeight - 0.7, 2);
        }

        return round($baselineWeight + 0.5, 2);
    }

    private function weightOnOrBefore(int $userId, CarbonImmutable $date): ?float
    {
        $row = Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->whereDate('measured_at', '<=', $date->toDateString())
            ->orderByDesc('measured_at')
            ->first(['weight_kg']);

        return $row && is_numeric($row->weight_kg) ? (float) $row->weight_kg : null;
    }

    private function weightNearDate(int $userId, CarbonImmutable $targetDate, int $toleranceDays): ?float
    {
        $rows = Measurement::query()
            ->where('user_id', $userId)
            ->whereNotNull('weight_kg')
            ->whereDate('measured_at', '>=', $targetDate->subDays($toleranceDays)->toDateString())
            ->whereDate('measured_at', '<=', $targetDate->addDays($toleranceDays)->toDateString())
            ->get(['measured_at', 'weight_kg']);

        if ($rows->isEmpty()) {
            return null;
        }

        $best = null;
        $bestDistance = null;
        $targetTs = $targetDate->startOfDay()->getTimestamp();
        foreach ($rows as $row) {
            $rowTs = CarbonImmutable::parse((string) $row->measured_at)->startOfDay()->getTimestamp();
            $distance = abs((int) floor(($rowTs - $targetTs) / 86400));
            if ($bestDistance === null || $distance < $bestDistance) {
                $bestDistance = $distance;
                $best = (float) $row->weight_kg;
            }
        }

        return $best;
    }

    /**
     * @return array<string, mixed>
     */
    private function comparePlans(array $a, array $b): array
    {
        $hashA = $this->planHash($a);
        $hashB = $this->planHash($b);
        $mealA = $this->extractMealItemNames($a);
        $mealB = $this->extractMealItemNames($b);
        $exerciseA = $this->extractExerciseNames($a);
        $exerciseB = $this->extractExerciseNames($b);

        return [
            'different' => $hashA !== $hashB,
            'hash_a' => $hashA,
            'hash_b' => $hashB,
            'meal_item_counts' => ['a' => count($mealA), 'b' => count($mealB)],
            'exercise_counts' => ['a' => count($exerciseA), 'b' => count($exerciseB)],
            'meal_jaccard' => $this->jaccardSimilarity($mealA, $mealB),
            'exercise_jaccard' => $this->jaccardSimilarity($exerciseA, $exerciseB),
            'meal_added' => array_values(array_diff($mealB, $mealA)),
            'meal_removed' => array_values(array_diff($mealA, $mealB)),
            'exercise_added' => array_values(array_diff($exerciseB, $exerciseA)),
            'exercise_removed' => array_values(array_diff($exerciseA, $exerciseB)),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function extractMealItemNames(array $plan): array
    {
        $names = [];
        $dietDays = is_array(data_get($plan, 'diet.days')) ? data_get($plan, 'diet.days') : [];
        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name !== '') {
                        $names[] = mb_strtolower($name);
                    }
                }
            }
        }

        return array_values(array_unique($names));
    }

    /**
     * @return array<int, string>
     */
    private function extractExerciseNames(array $plan): array
    {
        $names = [];
        $days = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        foreach ($days as $day) {
            foreach ((array) ($day['exercises'] ?? []) as $exercise) {
                $name = trim((string) ($exercise['name'] ?? ''));
                if ($name !== '') {
                    $names[] = mb_strtolower($name);
                }
            }
        }

        return array_values(array_unique($names));
    }

    /**
     * @param  array<int, string>  $a
     * @param  array<int, string>  $b
     */
    private function jaccardSimilarity(array $a, array $b): float
    {
        $setA = array_values(array_unique($a));
        $setB = array_values(array_unique($b));
        $intersection = array_intersect($setA, $setB);
        $union = array_unique(array_merge($setA, $setB));

        if ($union === []) {
            return 1.0;
        }

        return round(count($intersection) / count($union), 4);
    }

    private function planHash(array $plan): string
    {
        return hash('sha256', json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}');
    }

    /**
     * @return array<int, User>
     */
    private function resolveUsers(string $userIdsRaw, int $maxAccounts): array
    {
        $rawIds = array_values(array_filter(array_map(
            static fn (string $value): int => (int) trim($value),
            explode(',', $userIdsRaw)
        )));
        $rawIds = array_values(array_unique(array_filter($rawIds, static fn (int $value): bool => $value > 0)));

        if ($rawIds !== []) {
            $users = User::query()
                ->whereIn('id', $rawIds)
                ->orderBy('id')
                ->get();

            return $users->all();
        }

        $users = User::query()
            ->withCount(['mealEntries', 'workoutLogs', 'dietaryRestrictions', 'medicalHistories'])
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            return [];
        }

        $picked = [];
        $seen = [];
        $maxAccounts = max(1, $maxAccounts);

        $clients = $users->where('role', User::ROLE_CLIENT)->values();
        $roles = $users->whereIn('role', [User::ROLE_ADMIN, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])->values();

        $highRisk = $clients->sortByDesc(function (User $user): int {
            $allergyCount = count($this->normalizeList($user->allergies));

            return (int) ($user->meal_entries_count ?? 0)
                + (int) ($user->workout_logs_count ?? 0)
                + ($allergyCount * 15)
                + ((int) ($user->medical_histories_count ?? 0) * 12);
        })->first();
        $this->pickUser($highRisk, $picked, $seen);

        $specialDiet = $clients->first(function (User $user) use ($seen): bool {
            if (isset($seen[$user->id])) {
                return false;
            }
            $diet = mb_strtolower(trim((string) $user->diet_name));

            foreach (['vegan', 'vegetarian', 'keto', 'paleo', 'low fodmap', 'whole30', 'dash'] as $needle) {
                if (str_contains($diet, $needle)) {
                    return true;
                }
            }

            return false;
        });
        $this->pickUser($specialDiet, $picked, $seen);

        $lowData = $clients
            ->sortBy(function (User $user): int {
                return (int) ($user->meal_entries_count ?? 0) + (int) ($user->workout_logs_count ?? 0);
            })
            ->first(fn (User $user): bool => ! isset($seen[$user->id]));
        $this->pickUser($lowData, $picked, $seen);

        $nonClientRole = $roles->first(fn (User $user): bool => ! isset($seen[$user->id]));
        $this->pickUser($nonClientRole, $picked, $seen);

        $remaining = $clients
            ->sortByDesc(fn (User $user): int => (int) ($user->meal_entries_count ?? 0) + (int) ($user->workout_logs_count ?? 0))
            ->filter(fn (User $user): bool => ! isset($seen[$user->id]));

        foreach ($remaining as $candidate) {
            if (count($picked) >= $maxAccounts) {
                break;
            }
            $this->pickUser($candidate, $picked, $seen);
        }

        $picked = array_slice($picked, 0, $maxAccounts);
        if ($picked === []) {
            return [$users->first()];
        }

        return $picked;
    }

    /**
     * @param  array<int, User>  $picked
     * @param  array<int, true>  $seen
     */
    private function pickUser(?User $user, array &$picked, array &$seen): void
    {
        if (! $user) {
            return;
        }
        if (isset($seen[$user->id])) {
            return;
        }

        $picked[] = $user;
        $seen[$user->id] = true;
    }

    /**
     * @return array<string, mixed>
     */
    private function userSummary(User $user): array
    {
        return [
            'id' => (int) $user->id,
            'email' => (string) $user->email,
            'role' => (string) $user->role,
            'diet_type' => (string) ($user->diet_name ?? ''),
            'allergies' => $this->normalizeList($user->allergies),
            'workout_location' => (string) ($user->workout_location ?? ''),
            'workout_days_per_week' => $user->workout_days_per_week !== null ? (int) $user->workout_days_per_week : null,
            'meal_entries_count' => isset($user->meal_entries_count) ? (int) $user->meal_entries_count : null,
            'workout_logs_count' => isset($user->workout_logs_count) ? (int) $user->workout_logs_count : null,
            'dietary_restrictions_count' => isset($user->dietary_restrictions_count) ? (int) $user->dietary_restrictions_count : null,
            'medical_histories_count' => isset($user->medical_histories_count) ? (int) $user->medical_histories_count : null,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $text = trim((string) $item);
            if ($text !== '') {
                $items[] = $text;
            }
        }

        return array_values(array_unique($items));
    }

    private function normalizeHorizon(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    /**
     * @return array<string, int>
     */
    private function emptyBucketCounters(): array
    {
        return [
            DeepAuditAnswerGrader::BUCKET_GREAT => 0,
            DeepAuditAnswerGrader::BUCKET_GOOD => 0,
            DeepAuditAnswerGrader::BUCKET_BAD => 0,
            DeepAuditAnswerGrader::BUCKET_COMPLETELY_WRONG => 0,
        ];
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<string, float>
     */
    private function bucketPercentages(array $counts, int $total): array
    {
        $total = max(0, $total);
        if ($total === 0) {
            return array_map(static fn (): float => 0.0, $counts);
        }

        $result = [];
        foreach ($counts as $key => $value) {
            $result[$key] = round(($value / $total) * 100, 2);
        }

        return $result;
    }

    private function questionId(string $category, int $index): string
    {
        return sprintf('%s-%03d', $category, $index);
    }

    private function fileContains(string $path, string $needle): bool
    {
        if (! File::exists($path)) {
            return false;
        }

        return str_contains((string) File::get($path), $needle);
    }

    private function truncate(string $value, int $max): string
    {
        $clean = trim(preg_replace('/\s+/', ' ', $value) ?? '');
        if (mb_strlen($clean) <= $max) {
            return $clean;
        }

        return mb_substr($clean, 0, $max - 3).'...';
    }

    private function relativePath(string $absolutePath): string
    {
        $base = rtrim(base_path(), '\/');
        $path = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $absolutePath);
        $normalizedBase = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $base);

        if (str_starts_with($path, $normalizedBase.DIRECTORY_SEPARATOR)) {
            return substr($path, strlen($normalizedBase) + 1);
        }

        return $absolutePath;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderMarkdown(array $payload): string
    {
        $lines = [];
        $lines[] = '# AI Deep Audit Report';
        $lines[] = '';
        $lines[] = '- Run ID: `'.(string) data_get($payload, 'run.run_id', '').'`';
        $lines[] = '- Started (UTC): `'.(string) data_get($payload, 'run.started_at_utc', '').'`';
        $lines[] = '- Finished (UTC): `'.(string) data_get($payload, 'run.finished_at_utc', '').'`';
        $lines[] = '- Duration (seconds): `'.(string) data_get($payload, 'run.duration_seconds', '').'`';

        $lines[] = '';
        $lines[] = '## Audited Accounts';
        $lines[] = '';
        $lines[] = '| ID | Role | Email | Diet | Allergies | Workout Location | Days/Week |';
        $lines[] = '|---:|---|---|---|---|---|---:|';
        foreach ((array) ($payload['audited_users'] ?? []) as $user) {
            $lines[] = sprintf(
                '| %d | %s | %s | %s | %s | %s | %s |',
                (int) ($user['id'] ?? 0),
                $this->mdCell((string) ($user['role'] ?? '')),
                $this->mdCell((string) ($user['email'] ?? '')),
                $this->mdCell((string) ($user['diet_type'] ?? '')),
                $this->mdCell(implode(', ', (array) ($user['allergies'] ?? []))),
                $this->mdCell((string) ($user['workout_location'] ?? '')),
                $this->mdCell((string) ($user['workout_days_per_week'] ?? ''))
            );
        }

        $questionBank = (array) ($payload['question_bank'] ?? []);
        $lines[] = '';
        $lines[] = '## Question Bank';
        foreach ($questionBank as $category => $questions) {
            $lines[] = '';
            $lines[] = '### '.str_replace('_', ' ', (string) $category);
            foreach ((array) $questions as $index => $question) {
                $lines[] = sprintf('%d. %s', $index + 1, (string) $question);
            }
        }

        $chat = (array) ($payload['chat'] ?? []);
        if ($chat !== []) {
            $summary = (array) ($chat['summary'] ?? []);
            $lines[] = '';
            $lines[] = '## Chatbot Audit Summary';
            $lines[] = '';
            $lines[] = '- Total questions run: `'.(int) ($summary['total_questions'] ?? 0).'`';
            $bucketCounts = (array) ($summary['bucket_counts'] ?? []);
            $bucketPercentages = (array) ($summary['bucket_percentages'] ?? []);
            foreach ($bucketCounts as $bucket => $count) {
                $lines[] = sprintf(
                    '- %s: `%d` (%0.2f%%)',
                    $bucket,
                    (int) $count,
                    (float) ($bucketPercentages[$bucket] ?? 0.0)
                );
            }

            foreach ((array) ($chat['users'] ?? []) as $userEntry) {
                $user = (array) ($userEntry['user'] ?? []);
                $lines[] = '';
                $lines[] = sprintf(
                    '### Chat Results - User #%d (%s)',
                    (int) ($user['id'] ?? 0),
                    (string) ($user['email'] ?? '')
                );
                $lines[] = '- Scope: `'.(string) ($userEntry['scope'] ?? 'full').'`';
                $uSummary = (array) data_get($userEntry, 'summary.buckets', []);
                $lines[] = '';
                $lines[] = sprintf(
                    '- Buckets: great `%d`, good `%d`, bad `%d`, completely_wrong `%d`',
                    (int) ($uSummary[DeepAuditAnswerGrader::BUCKET_GREAT] ?? 0),
                    (int) ($uSummary[DeepAuditAnswerGrader::BUCKET_GOOD] ?? 0),
                    (int) ($uSummary[DeepAuditAnswerGrader::BUCKET_BAD] ?? 0),
                    (int) ($uSummary[DeepAuditAnswerGrader::BUCKET_COMPLETELY_WRONG] ?? 0)
                );

                $lines[] = '';
                $lines[] = '| Question ID | Bucket | Score | Intent | Question | Answer |';
                $lines[] = '|---|---|---:|---|---|---|';
                foreach ((array) ($userEntry['entries'] ?? []) as $entry) {
                    $lines[] = sprintf(
                        '| %s | %s | %0.2f | %s | %s | %s |',
                        $this->mdCell((string) ($entry['question_id'] ?? '')),
                        $this->mdCell((string) ($entry['bucket'] ?? '')),
                        (float) ($entry['score'] ?? 0.0),
                        $this->mdCell((string) ($entry['intent'] ?? '')),
                        $this->mdCell((string) ($entry['question'] ?? '')),
                        $this->mdCell($this->truncate((string) ($entry['answer'] ?? ''), 420))
                    );
                }
            }
        }

        $planner = (array) ($payload['planner'] ?? []);
        if ($planner !== []) {
            $lines[] = '';
            $lines[] = '## Planner Audit';
            $lines[] = '';
            $lines[] = '- Users total: `'.(int) data_get($planner, 'summary.users_total', 0).'`';
            $lines[] = '- Users success: `'.(int) data_get($planner, 'summary.users_success', 0).'`';
            $lines[] = '- Users failed: `'.(int) data_get($planner, 'summary.users_failed', 0).'`';
            $lines[] = '- Horizon days: `'.(int) data_get($planner, 'summary.horizon_days', 0).'`';

            foreach ((array) ($planner['users'] ?? []) as $row) {
                $user = (array) ($row['user'] ?? []);
                $lines[] = '';
                $lines[] = sprintf('### Planner Results - User #%d (%s)', (int) ($user['id'] ?? 0), (string) ($user['email'] ?? ''));
                $lines[] = '- Status: `'.(string) ($row['status'] ?? '').'`';
                if (is_array($row['comparisons'] ?? null)) {
                    $diff = data_get($row, 'comparisons.regen_a_vs_regen_b.different') ? 'yes' : 'no';
                    $mealJ = (float) data_get($row, 'comparisons.regen_a_vs_regen_b.meal_jaccard', 0.0);
                    $exerciseJ = (float) data_get($row, 'comparisons.regen_a_vs_regen_b.exercise_jaccard', 0.0);
                    $lines[] = sprintf('- Regenerate A vs B changed: `%s` (meal Jaccard `%0.4f`, exercise Jaccard `%0.4f`)', $diff, $mealJ, $exerciseJ);
                }

                $logicA = data_get($row, 'logic_checks.regen_a');
                $logicB = data_get($row, 'logic_checks.regen_b');
                if (is_array($logicA)) {
                    $lines[] = '- Logic quality A: `'.(float) ($logicA['quality_percentage'] ?? 0.0).'%`';
                }
                if (is_array($logicB)) {
                    $lines[] = '- Logic quality B: `'.(float) ($logicB['quality_percentage'] ?? 0.0).'%`';
                }
                foreach ((array) ($row['errors'] ?? []) as $error) {
                    $lines[] = '- Error: `'.(string) ($error['type'] ?? '').'` '.(string) ($error['message'] ?? '');
                }
            }
        }

        $predictor = (array) ($payload['predictor'] ?? []);
        if ($predictor !== []) {
            $lines[] = '';
            $lines[] = '## Prediction Model Audit';
            $lines[] = '';
            $lines[] = '- Inference enabled: `'.((bool) data_get($predictor, 'summary.inference_enabled', false) ? 'true' : 'false').'`';
            $lines[] = '- Model directory exists: `'.((bool) data_get($predictor, 'summary.model_dir_exists', false) ? 'true' : 'false').'`';
            $lines[] = '- Inference script exists: `'.((bool) data_get($predictor, 'summary.script_exists', false) ? 'true' : 'false').'`';
            $lines[] = '- Weight model exists: `'.((bool) data_get($predictor, 'summary.weight_model_exists', false) ? 'true' : 'false').'`';
            $lines[] = '- Strength model exists: `'.((bool) data_get($predictor, 'summary.strength_model_exists', false) ? 'true' : 'false').'`';
            $lines[] = '- Manifest exists: `'.((bool) data_get($predictor, 'summary.manifest_exists', false) ? 'true' : 'false').'`';

            $lines[] = '';
            $lines[] = '### Visibility Checks';
            foreach ((array) ($predictor['visibility_checks'] ?? []) as $key => $ok) {
                $lines[] = sprintf('- %s: `%s`', $key, $ok ? 'true' : 'false');
            }

            $lines[] = '';
            $lines[] = '### Runtime Samples';
            $lines[] = '';
            $lines[] = '| User | AI Request | Inference Source | Model Name | Confidence |';
            $lines[] = '|---|---:|---|---|---|';
            foreach ((array) ($predictor['runtime_samples'] ?? []) as $sample) {
                $user = (array) ($sample['user'] ?? []);
                $prediction = is_array($sample['prediction'] ?? null) ? $sample['prediction'] : [];
                $lines[] = sprintf(
                    '| %s | %d | %s | %s | %s |',
                    $this->mdCell(sprintf('#%d %s', (int) ($user['id'] ?? 0), (string) ($user['email'] ?? ''))),
                    (int) ($sample['latest_ai_request_id'] ?? 0),
                    $this->mdCell((string) ($prediction['inference_source'] ?? 'n/a')),
                    $this->mdCell((string) ($prediction['model_name'] ?? 'n/a')),
                    $this->mdCell((string) ($prediction['confidence'] ?? 'n/a'))
                );
            }

            $lines[] = '';
            $lines[] = '### Accuracy';
            $lines[] = '- Online samples: `'.(int) data_get($predictor, 'online_accuracy.samples', 0).'`';
            $lines[] = '- Online MAE (kg): `'.(string) data_get($predictor, 'online_accuracy.mae_kg', 'n/a').'`';
            $lines[] = '- Online RMSE (kg): `'.(string) data_get($predictor, 'online_accuracy.rmse_kg', 'n/a').'`';
            $lines[] = '- Holdout status: `'.(string) data_get($predictor, 'holdout_evaluation.status', 'not_run').'`';
            $lines[] = '- Holdout weight MAE: `'.(string) data_get($predictor, 'holdout_evaluation.metrics.weight_holdout_eval.mae', 'n/a').'`';
            $lines[] = '- Holdout weight R2: `'.(string) data_get($predictor, 'holdout_evaluation.metrics.weight_holdout_eval.r2', 'n/a').'`';
            $lines[] = '- Holdout strength MAE: `'.(string) data_get($predictor, 'holdout_evaluation.metrics.strength_holdout_eval.mae', 'n/a').'`';
            $lines[] = '- Holdout strength R2: `'.(string) data_get($predictor, 'holdout_evaluation.metrics.strength_holdout_eval.r2', 'n/a').'`';

            $adapt = data_get($predictor, 'adaptation_simulation');
            if (is_array($adapt)) {
                $lines[] = '';
                $lines[] = '### Adaptation Simulation (Backdated >= 21 Days)';
                $lines[] = '- Status: `'.(string) ($adapt['status'] ?? 'unknown').'`';
                if (($adapt['status'] ?? '') === 'ok') {
                    $lines[] = '- User: `#'.(int) data_get($adapt, 'user.id', 0).' '.(string) data_get($adapt, 'user.email', '').'`';
                    $lines[] = '- Baseline date: `'.(string) ($adapt['baseline_date'] ?? '').'`';
                    $lines[] = '- Target date: `'.(string) ($adapt['target_date'] ?? '').'`';
                    $lines[] = '- Horizon: `'.(int) ($adapt['horizon_days'] ?? 0).'`';
                    $lines[] = '- Adapted: `'.((bool) ($adapt['adapted'] ?? false) ? 'true' : 'false').'`';
                    $lines[] = '- Last prediction error (kg/week): `'.(string) data_get($adapt, 'adaptation_signal.last_prediction_error_kg_per_week', 'n/a').'`';
                    $lines[] = '- Base weekly change (kg): `'.(string) data_get($adapt, 'adaptation_signal.base_weekly_weight_change_kg', 'n/a').'`';
                    $lines[] = '- Adjusted weekly change (kg): `'.(string) data_get($adapt, 'adaptation_signal.adjusted_weekly_weight_change_kg', 'n/a').'`';
                } else {
                    $lines[] = '- Reason: `'.(string) ($adapt['reason'] ?? ($adapt['message'] ?? 'n/a')).'`';
                }
            }
        }

        return implode("\n", $lines)."\n";
    }

    private function mdCell(string $value): string
    {
        return str_replace(
            ["\r\n", "\n", "\r", '|'],
            ['<br>', '<br>', '<br>', '\|'],
            trim($value)
        );
    }
}
