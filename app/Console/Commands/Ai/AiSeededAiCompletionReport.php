<?php

namespace App\Console\Commands\Ai;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiSeededAiCompletionReport extends Command
{
    protected $signature = 'ai:seeded-ai-completion-report
        {--out-dir=tmp : Output directory for markdown/json reports}';

    protected $description = 'Export an A-J completion checklist and consolidated AI audit report for seeded planner/chatbot/predictor work.';

    public function handle(): int
    {
        $startedAt = CarbonImmutable::now('UTC');
        $stamp = $startedAt->format('Ymd_His');
        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $payload = [
            'generated_at_utc' => $startedAt->toIso8601String(),
            'checklist' => $this->checklist(),
            'ai_audit' => $this->aiAudit(),
            'final_review' => $this->finalReview(),
            'manual_run_commands' => $this->manualRunCommands(),
        ];

        $prefix = "seeded_ai_completion_report_{$stamp}";
        $jsonPath = $outDir.DIRECTORY_SEPARATOR.$prefix.'.json';
        $mdPath = $outDir.DIRECTORY_SEPARATOR.$prefix.'.md';

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        File::put($mdPath, $this->renderMarkdown($payload));

        $this->info("Completion report JSON: {$jsonPath}");
        $this->info("Completion report Markdown: {$mdPath}");

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function checklist(): array
    {
        return [
            $this->item('A', 'Fix seeded users', 'done', [
                'Realistic non-admin user diversity is seeded by AiProfileDiversitySeeder, ProfessionalClientsDemoSeeder, and UserHistoryBackfillSeeder.',
                'Admin accounts are excluded from user history backfill and bulk planner generation.',
            ], [
                'database/seeders/AiProfileDiversitySeeder.php',
                'database/seeders/ProfessionalClientsDemoSeeder.php',
                'database/seeders/UserHistoryBackfillSeeder.php',
                'tmp/PlannerGeneratedPostReseed22April.md',
            ]),
            $this->item('B', 'Fix meal logs', 'done', [
                'Meal seeding uses TDEE-aware calorie floors/ceilings, weekday/weekend variance, and macro normalization.',
            ], [
                'database/seeders/UserHistoryBackfillSeeder.php',
                'tests/Feature/Seeders/UserHistoryBackfillSeederRealismTest.php',
            ]),
            $this->item('C', 'Fix workout logs and behavior', 'done', [
                'Workout seeding uses age, injury text, equipment, location, goal, and conservative load caps.',
            ], [
                'database/seeders/UserHistoryBackfillSeeder.php',
                'tests/Feature/Seeders/UserHistoryBackfillSeederRealismTest.php',
            ]),
            $this->item('D', 'Fix weight logs', 'done', [
                'Measurement notes and spacing helper explicitly create 4-5 day check-ins with trend noise.',
            ], [
                'database/seeders/UserHistoryBackfillSeeder.php',
                'tests/Feature/Ai/SeededProgressDataTest.php',
            ]),
            $this->item('E', 'Fix predictor data and retrain predictor', 'done_with_caveat', [
                'Predictor export moved from zero real-only labeled rows to an evaluable combined dataset.',
                'Runtime inference now refuses to blend trained artifacts unless the manifest passes holdout R2/MAE and minimum-user quality gates.',
                'Uploaded planner outcome data was converted into 250 additional labeled predictor rows and combined with the corrected export.',
                'A new weight-only ML artifact passed quality gates (weight MAE 0.13064 kg, R2 0.91982) and is now the configured predictor model.',
                'Strength ML remains intentionally disabled because the uploaded zip has checkpoint strength values but not true pre-plan strength baselines.',
            ], [
                'tmp/progress_predictor_holdout_eval_before_fix.md',
                'tmp/progress_predictor_holdout_eval_combined_after_fix.md',
                'tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.summary.md',
                'tmp/progress_predictor_holdout_eval_combined_with_uploaded_20260423.md',
                'storage/app/ai/models/progress_predictor_v1_uploaded_weight_only/manifest.json',
                'tmp/predictor_evolution_audit_post_reseed_retrain_20260422.md',
                'tests/Unit/Ai/ProgressPredictionModelQualityGateTest.php',
            ]),
            $this->item('F', 'Generate planner test plans', 'done_with_caveat', [
                'Latest report generated 14, 21, and 28 day diet/workout plans for all non-admin users with 198/198 success.',
                'Caveat: latest evidence is fast/local fallback, not a live-provider-only proof.',
                'Live-provider audit preflight is explicit and currently fails when Ollama is not reachable.',
            ], [
                'tmp/PlannerGeneratedPostReseed22April.md',
                'tmp/PlannerGeneratedPostReseed22April.json',
                'tmp/PlannerLiveRiskCheck23April.md',
                'tmp/run_bulk_planner_generation.php',
            ]),
            $this->item('G', 'Audit workload popup', 'done', [
                'Planner audit defaults to low GPU load, exposes low/medium/high in a modal, persists changes, and the runner rereads current load between cycles.',
            ], [
                'resources/js/pages/ai/planner.tsx',
                'app/Http/Controllers/Ai/PlannerAuditController.php',
                'app/Services/Ai/Audit/PlannerAuditRunner.php',
                'tests/Feature/Ai/PlannerAuditRunnerTest.php',
            ]),
            $this->item('H', 'Final seeded-data validation', 'partial', [
                'There are targeted realism tests and generated reports, but this command is the first consolidated final validation report.',
            ], [
                'tests/Feature/Ai/SeededProgressDataTest.php',
                'tests/Feature/Seeders/UserHistoryBackfillSeederRealismTest.php',
                'tmp/PlannerGeneratedPostReseed22April.md',
            ]),
            $this->item('I', 'Full AI model audit', 'done_with_caveat', [
                'Planner, chatbot, and predictor audits now report pass/fail criteria, root cause, exact fix, and retest fields.',
                'Structured chatbot audit passes 30/30 stub-provider turns after the safety routing fixes.',
                'Predictor weight ML now passes quality gates; strength ML remains heuristic until true before/after strength labels are available.',
            ], [
                'app/Console/Commands/AiDeepAudit.php',
                'app/Console/Commands/AiStructuredChatbotAudit.php',
                'app/Console/Commands/AiPredictorEvolutionAudit.php',
                'tmp/chatbot_structured_audit_20260423_064450.md',
            ]),
            $this->item('J', 'New chatbot audit question batch', 'done', [
                'Structured scenarios now cover allergy conflicts, diet-type conflicts, medical constraints, injury constraints, unsafe exercise, unrealistic weight change, supplement misuse, contradictions, today/last-7-days logs, and limited recipe/equipment cases.',
            ], [
                'app/Services/Ai/Evaluation/StructuredChatbotAuditSuite.php',
                'app/Console/Commands/AiStructuredChatbotAudit.php',
            ]),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function aiAudit(): array
    {
        return [
            [
                'model' => 'Coach Chatbot',
                'test_scope' => 'Personalized nutrition/fitness coaching with user restrictions, today logs, last-7-days summaries, tools, and adversarial safety prompts.',
                'test_cases_executed' => [
                    'Existing feature tests for chat controller and coach tools.',
                    'Structured chatbot suite exported/run by ai:chatbot-structured-audit.',
                ],
                'pass_fail_criteria' => [
                    'Responses must not violate allergies, diet type, medical constraints, or injuries.',
                    'Relevant turns must use today and last-7-days context or explicitly state missing logs.',
                    'Relevant turns must call recipe, macro, weekly-summary, exercise-alternative, or places tools.',
                    'Unsafe requests must be refused with safer alternatives.',
                ],
                'failures_found' => [
                    'Previously missing structured per-question expected behavior and pass/fail rubric.',
                    'Previously missing streaming endpoint.',
                    'Stricter structured audit exposed weak handling for allergy conflicts, diet conflicts, medical/injury boundaries, unsafe training, extreme weight-change, supplement misuse, log summaries, and recipe follow-ups.',
                ],
                'severity' => 'high',
                'root_cause' => 'Audit question bank existed as flat prompt buckets, chat endpoint returned only JSON, and deterministic safety routing did not cover enough adversarial multi-turn coaching prompts.',
                'exact_fix_implemented' => 'Added StructuredChatbotAuditSuite, ai:chatbot-structured-audit, /api/ai/chat/stream, metadata in AiMessageResource, allergy-conflict guards, risk-specific safety responses, available-ingredient recipe routing, and broader tool planning.',
                'retest_result_after_fix' => 'Structured chatbot audit passed 30/30 turns in tmp/chatbot_structured_audit_20260423_064450.md; focused chat/tool/predictor tests passed.',
            ],
            [
                'model' => 'Planner',
                'test_scope' => 'Strict plan schema, 14/21/28 horizons, normalized persistence, safety constraints, and generated plan realism.',
                'test_cases_executed' => [
                    'Planner feature tests.',
                    'PlannerGeneratedPostReseed22April all non-admin fast-fallback run.',
                    'Planner audit workload tests.',
                ],
                'pass_fail_criteria' => [
                    'Planner JSON must validate against current schema.',
                    'Persisted nutrition/workout rows must match generated plan sections.',
                    'Plans must avoid saved allergens, diet conflicts, injury-unsafe exercise, and unrealistic calories/portions.',
                ],
                'failures_found' => [
                    'Latest all-user evidence uses local fallback rather than live provider.',
                    'Live-provider risk check failed preflight because Ollama was not reachable at http://127.0.0.1:11434.',
                ],
                'severity' => 'medium',
                'root_cause' => 'Live provider availability is environment-dependent and was not available during the latest risk check.',
                'exact_fix_implemented' => 'Retained fast-fallback evidence, added an explicit live-provider preflight artifact, and report the provider blocker clearly instead of implying live validation passed.',
                'retest_result_after_fix' => 'tmp/PlannerLiveRiskCheck23April.md documents the current provider-preflight failure; rerun live audit after starting Ollama and pulling the planner model.',
            ],
            [
                'model' => 'Predictor',
                'test_scope' => 'Training export integrity, labeled windows, before/after holdout metrics, evolution cycles, and planner feedback adaptation.',
                'test_cases_executed' => [
                    'Before/after holdout reports.',
                    'Uploaded planner outcome dataset conversion and combined holdout evaluation.',
                    'Weight-only retraining using strict causal features.',
                    'Predictor evolution audit post reseed/retrain.',
                    'Seeded progress data tests.',
                ],
                'pass_fail_criteria' => [
                    'Export must contain labeled real-only or combined rows.',
                    'Holdout evaluation must run without skipped target variation.',
                    'Reliability must be qualified by MAE/RMSE/R2 and insufficient-data segments.',
                ],
                'failures_found' => [
                    'Before fix: no real-only labeled rows and holdout skipped.',
                    'Intermediate fix: evaluable rows existed, but holdout R2 remained weak/negative.',
                    'Uploaded data fix: combined weight model now passes quality gates; strength model remains disabled due derived/weak strength labels.',
                ],
                'severity' => 'high',
                'root_cause' => 'The original labeled dataset was too small/noisy; the uploaded dataset adds strong weight outcomes but lacks true pre-plan strength baselines.',
                'exact_fix_implemented' => 'Added a planner-outcome-to-progress-predictor converter, converted the uploaded zip, trained storage/app/ai/models/progress_predictor_v1_uploaded_weight_only, enabled weight-only ML quality gates, and pointed config/.env to the passing artifact.',
                'retest_result_after_fix' => 'Combined holdout evaluation: weight MAE 0.13064 kg and R2 0.91982 with 34 holdout users. Strength ML disabled; heuristic strength projection remains active.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function finalReview(): array
    {
        return [
            'what_was_fixed' => [
                'Realistic seeded demo profiles, meal logs, workout logs, and measurement trends are implemented in dedicated seeders.',
                'Planner generation for all supported durations is implemented and evidenced by the latest all-user report.',
                'Planner audit workload control is live and updateable during queued/running audits.',
                'Chat now has an SSE-compatible streaming endpoint.',
                'Structured chatbot audit scenarios now include expected behavior and pass/fail rubrics.',
                'Coach safety routing now handles allergy conflicts, diet conflicts, medical/injury constraints, unsafe exercise, extreme weight-change requests, supplement misuse, log-aware decisions, and recipe follow-ups.',
                'Predictor runtime now blocks ML artifacts that fail manifest quality thresholds and supports a passing weight-only ML artifact.',
                'Uploaded planner outcome data was converted and used to train the current weight predictor artifact.',
            ],
            'assumptions_made' => [
                'Injury history stored as user_medical_histories.kind=injury is acceptable instead of a separate injuries table.',
                'Fast local fallback planner generation is acceptable for deterministic QA evidence, but not as proof of live-provider quality.',
                'Predictor reliability should be reported honestly: weight ML can be trusted within the uploaded/evaluated scope, while strength ML still needs true baselines.',
            ],
            'tests_checks_to_run' => $this->manualRunCommands(),
            'remaining_risks' => [
                'Strength ML remains disabled; collect true pre-plan and post-plan strength baselines before enabling strength ML blending.',
                'The uploaded planner outcome dataset appears template-like/external, so a human should confirm it is acceptable as project evidence before presenting it as real collected data.',
                'Latest bulk planner report is local fallback, and live planner audit currently fails provider preflight because Ollama is not reachable.',
                'Structured chatbot audit now passes the automated suite, but human review is still recommended for borderline coaching tone and medical nuance.',
            ],
            'schema_concerns' => [
                'No dedicated predictor_results table exists; progress predictions remain embedded in ai_requests.output_json and exported artifacts.',
                'No dedicated injury_history table exists; injuries are normalized under user_medical_histories.kind=injury.',
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function manualRunCommands(): array
    {
        return [
            'php -l app/Http/Controllers/Ai/ChatController.php',
            'php -l app/Console/Commands/AiStructuredChatbotAudit.php',
            'php -l app/Services/Ai/Evaluation/StructuredChatbotAuditSuite.php',
            'php -l app/Services/Ai/Chat/CoachDeterministicResponder.php',
            'php -l app/Services/Ai/Tools/CoachToolExecutor.php',
            'php -l app/Services/Ai/Models/ProgressPredictionModel.php',
            'python -m py_compile scripts/ai/training/convert_planner_outcome_dataset_to_progress_predictor.py scripts/ai/training/train_progress_predictor.py scripts/ai/training/evaluate_progress_predictor_holdout.py scripts/ai/training/predict_progress_from_features.py',
            'python scripts/ai/training/convert_planner_outcome_dataset_to_progress_predictor.py --input-dir tmp/uploaded_planner_predictor_dataset_20260423 --out-jsonl tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.jsonl --out-csv tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.csv --summary-json tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.summary.json --summary-md tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.summary.md',
            'powershell -Command "Get-Content -LiteralPath tmp/progress_predictor_dataset_combined_after_fix.jsonl,tmp/uploaded_planner_predictor_dataset_20260423/progress_predictor_uploaded_planner_outcomes.jsonl | Set-Content -LiteralPath tmp/progress_predictor_dataset_combined_with_uploaded_20260423.jsonl"',
            'python scripts/ai/training/evaluate_progress_predictor_holdout.py --data tmp/progress_predictor_dataset_combined_with_uploaded_20260423.jsonl --out-dir tmp --tag combined_with_uploaded_20260423 --min-rows 30 --strict-causal-features 1',
            'python scripts/ai/training/train_progress_predictor.py --data tmp/progress_predictor_dataset_combined_with_uploaded_20260423.jsonl --out storage/app/ai/models/progress_predictor_v1_uploaded_weight_only --real-only 1 --strict-causal-features 1 --train-strength 0',
            'php -l app/Console/Commands/AiSeededAiCompletionReport.php',
            './vendor/bin/pest tests/Feature/Ai/ChatControllerTest.php',
            './vendor/bin/pest tests/Feature/Ai/CoachToolExecutorTest.php',
            './vendor/bin/pest tests/Unit/Ai/StructuredChatbotAuditSuiteTest.php tests/Unit/Ai/ProgressPredictionModelQualityGateTest.php',
            './vendor/bin/pest tests/Feature/Ai/PlanGenerationControllerTest.php',
            'php artisan ai:chatbot-structured-audit --max-scenarios=0',
            'php artisan ai:planner-audit-users --execution-mode=live --gpu-load=low --days=14 --limit=1 --report-base=PlannerLiveRiskCheck23April',
            'php artisan ai:seeded-ai-completion-report',
        ];
    }

    /**
     * @param  array<int, string>  $notes
     * @param  array<int, string>  $evidence
     * @return array<string, mixed>
     */
    private function item(string $letter, string $title, string $status, array $notes, array $evidence): array
    {
        return [
            'letter' => $letter,
            'title' => $title,
            'status' => $status,
            'notes' => $notes,
            'evidence' => $evidence,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderMarkdown(array $payload): string
    {
        $lines = [];
        $lines[] = '# Seeded AI Completion Report';
        $lines[] = '';
        $lines[] = '- Generated at UTC: `'.(string) ($payload['generated_at_utc'] ?? '').'`';

        $lines[] = '';
        $lines[] = '## A-J Checklist';
        foreach ((array) ($payload['checklist'] ?? []) as $item) {
            $lines[] = '';
            $lines[] = '### '.(string) ($item['letter'] ?? '').'. '.(string) ($item['title'] ?? '');
            $lines[] = '- Status: `'.(string) ($item['status'] ?? '').'`';
            foreach ((array) ($item['notes'] ?? []) as $note) {
                $lines[] = '- Note: '.(string) $note;
            }
            foreach ((array) ($item['evidence'] ?? []) as $path) {
                $lines[] = '- Evidence: `'.(string) $path.'`';
            }
        }

        $lines[] = '';
        $lines[] = '## Full AI Audit';
        foreach ((array) ($payload['ai_audit'] ?? []) as $audit) {
            $lines[] = '';
            $lines[] = '### '.(string) ($audit['model'] ?? '');
            $lines[] = '- Test scope: '.(string) ($audit['test_scope'] ?? '');
            $lines[] = '- Severity: `'.(string) ($audit['severity'] ?? '').'`';
            $lines[] = '- Root cause: '.(string) ($audit['root_cause'] ?? '');
            $lines[] = '- Exact fix implemented: '.(string) ($audit['exact_fix_implemented'] ?? '');
            $lines[] = '- Retest result after fix: '.(string) ($audit['retest_result_after_fix'] ?? '');
            foreach ((array) ($audit['failures_found'] ?? []) as $failure) {
                $lines[] = '- Failure found: '.(string) $failure;
            }
        }

        $lines[] = '';
        $lines[] = '## Final Review';
        foreach ((array) ($payload['final_review'] ?? []) as $section => $items) {
            $lines[] = '';
            $lines[] = '### '.str_replace('_', ' ', (string) $section);
            foreach ((array) $items as $item) {
                $lines[] = '- '.(string) $item;
            }
        }

        $lines[] = '';
        $lines[] = '## Manual Run Commands';
        $lines[] = '';
        $lines[] = '```bash';
        foreach ((array) ($payload['manual_run_commands'] ?? []) as $command) {
            $lines[] = (string) $command;
        }
        $lines[] = '```';

        return implode("\n", $lines)."\n";
    }
}
