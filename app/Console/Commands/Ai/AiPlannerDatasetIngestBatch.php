<?php

namespace App\Console\Commands\Ai;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class AiPlannerDatasetIngestBatch extends Command
{
    protected $signature = 'ai:planner-dataset-ingest-batch
        {--incoming-dir= : Directory containing incoming CSV batch files}
        {--master-dir=storage/app/ai/training/planner_dataset : Master dataset directory}
        {--profiles=planner_profiles_template.csv : Profiles CSV filename}
        {--plan-runs=planner_plan_runs_template.csv : Plan runs CSV filename}
        {--outcomes=planner_outcomes_template.csv : Outcomes CSV filename}
        {--regen=planner_regen_feedback_template.csv : Regeneration feedback CSV filename}
        {--run-readiness=1 : Run readiness check after ingest}
        {--readiness-out-json=tmp/ai_deep_audit_safe_run/planner_dataset_readiness_latest.json : Readiness report output JSON path}
        {--dry-run=0 : Preview ingest without writing files}
    ';

    protected $description = 'Merge an incoming planner CSV batch into the master dataset and optionally run readiness checks.';

    public function handle(): int
    {
        $incomingDir = trim((string) $this->option('incoming-dir'));
        if ($incomingDir === '') {
            $this->error('Please pass --incoming-dir, for example --incoming-dir=tmp/planner_realistic_examples_1');

            return self::FAILURE;
        }

        $incomingDir = $this->resolvePath($incomingDir);
        $masterDir = $this->resolvePath((string) $this->option('master-dir'));
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $runReadiness = ((int) $this->option('run-readiness')) === 1;

        if (! File::isDirectory($incomingDir)) {
            $this->error("Incoming directory does not exist: {$incomingDir}");

            return self::FAILURE;
        }

        File::ensureDirectoryExists($masterDir);

        $datasets = [
            'profiles' => [
                'file' => (string) $this->option('profiles'),
                'key' => 'profile_id',
                'required_columns' => [
                    'profile_id',
                    'age',
                    'sex',
                    'height_cm',
                    'start_weight_kg',
                    'goal_primary',
                    'diet_type',
                    'allergies_json',
                    'medical_history_json',
                    'injury_history_json',
                    'workout_days_target_per_week',
                    'workout_location',
                    'equipment_json',
                    'past_diet_failures_text',
                ],
            ],
            'plan_runs' => [
                'file' => (string) $this->option('plan-runs'),
                'key' => 'plan_run_id',
                'required_columns' => [
                    'plan_run_id',
                    'profile_id',
                    'generated_at_utc',
                    'horizon_days',
                    'provider',
                    'model',
                    'plan_version',
                    'calorie_target',
                    'protein_target_g',
                    'carbs_target_g',
                    'fat_target_g',
                    'workout_split',
                ],
            ],
            'outcomes' => [
                'file' => (string) $this->option('outcomes'),
                'key' => 'outcome_id',
                'required_columns' => [
                    'outcome_id',
                    'plan_run_id',
                    'checkpoint_day',
                    'checkpoint_date_utc',
                    'weight_kg',
                    'adherence_workout_pct',
                    'adherence_diet_pct',
                    'injury_flareup_flag',
                    'medical_issue_flag',
                ],
            ],
            'regen' => [
                'file' => (string) $this->option('regen'),
                'key' => 'regen_event_id',
                'required_columns' => [
                    'regen_event_id',
                    'profile_id',
                    'previous_plan_run_id',
                    'new_plan_run_id',
                    'requested_at_utc',
                    'requested_reason',
                    'changed_sections_json',
                ],
            ],
        ];

        $summary = [
            'generated_at_utc' => CarbonImmutable::now('UTC')->toIso8601String(),
            'incoming_dir' => $incomingDir,
            'master_dir' => $masterDir,
            'dry_run' => $dryRun,
            'datasets' => [],
            'status' => 'ok',
            'errors' => [],
        ];

        foreach ($datasets as $name => $config) {
            $incomingPath = $incomingDir.DIRECTORY_SEPARATOR.$config['file'];
            $masterPath = $masterDir.DIRECTORY_SEPARATOR.$config['file'];

            if (! File::exists($incomingPath)) {
                $summary['status'] = 'failed';
                $summary['errors'][] = "Missing incoming file: {$incomingPath}";
                continue;
            }

            $incoming = $this->readCsv($incomingPath);
            $incomingHeaders = $incoming['headers'];
            $incomingRows = $incoming['rows'];

            $missingRequired = array_values(array_diff($config['required_columns'], $incomingHeaders));
            if ($missingRequired !== []) {
                $summary['status'] = 'failed';
                $summary['errors'][] = sprintf(
                    '%s missing required columns in incoming CSV: %s',
                    $name,
                    implode(', ', $missingRequired)
                );
                continue;
            }

            $master = File::exists($masterPath)
                ? $this->readCsv($masterPath)
                : ['headers' => $incomingHeaders, 'rows' => []];

            if ($master['headers'] === []) {
                $master['headers'] = $incomingHeaders;
            }

            $key = $config['key'];
            $masterById = [];
            foreach ($master['rows'] as $row) {
                $id = trim((string) ($row[$key] ?? ''));
                if ($id !== '') {
                    $masterById[$id] = $row;
                }
            }

            $added = 0;
            $updated = 0;
            $skippedMissingId = 0;
            foreach ($incomingRows as $row) {
                $id = trim((string) ($row[$key] ?? ''));
                if ($id === '') {
                    $skippedMissingId++;
                    continue;
                }

                if (! isset($masterById[$id])) {
                    $added++;
                    $masterById[$id] = $this->alignRowToHeaders($row, $master['headers']);
                    continue;
                }

                $incomingAligned = $this->alignRowToHeaders($row, $master['headers']);
                if ($incomingAligned !== $masterById[$id]) {
                    $updated++;
                    $masterById[$id] = $incomingAligned;
                }
            }

            ksort($masterById);
            $mergedRows = array_values($masterById);

            if (! $dryRun) {
                $this->writeCsv($masterPath, $master['headers'], $mergedRows);
            }

            $summary['datasets'][$name] = [
                'incoming_path' => $incomingPath,
                'master_path' => $masterPath,
                'key' => $key,
                'incoming_rows' => count($incomingRows),
                'existing_master_rows' => count($master['rows']),
                'merged_master_rows' => count($mergedRows),
                'added' => $added,
                'updated' => $updated,
                'skipped_missing_id' => $skippedMissingId,
                'missing_required_columns' => $missingRequired,
            ];
        }

        if ($summary['errors'] !== []) {
            foreach ($summary['errors'] as $error) {
                $this->error($error);
            }

            $summary['status'] = 'failed';
        }

        $this->table(
            ['Dataset', 'Incoming', 'Added', 'Updated', 'Master rows', 'Skipped missing ID'],
            array_map(
                static fn ($name, $data) => [
                    $name,
                    $data['incoming_rows'] ?? 0,
                    $data['added'] ?? 0,
                    $data['updated'] ?? 0,
                    $data['merged_master_rows'] ?? 0,
                    $data['skipped_missing_id'] ?? 0,
                ],
                array_keys($summary['datasets']),
                $summary['datasets']
            )
        );

        if ($runReadiness && $summary['status'] === 'ok') {
            $readinessOut = $this->resolvePath((string) $this->option('readiness-out-json'));
            $code = Artisan::call('ai:planner-dataset-readiness', [
                '--dir' => $masterDir,
                '--profiles' => (string) $this->option('profiles'),
                '--plan-runs' => (string) $this->option('plan-runs'),
                '--outcomes' => (string) $this->option('outcomes'),
                '--regen' => (string) $this->option('regen'),
                '--out-json' => $readinessOut,
            ]);

            $this->line(Artisan::output());
            $summary['readiness'] = [
                'command_exit_code' => $code,
                'out_json' => $readinessOut,
            ];
        }

        $ingestOut = base_path('tmp/ai_deep_audit_safe_run/planner_dataset_ingest_latest.json');
        File::ensureDirectoryExists(dirname($ingestOut));
        File::put($ingestOut, json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $this->info("Ingest summary saved: {$ingestOut}");

        return $summary['status'] === 'ok' ? self::SUCCESS : self::FAILURE;
    }

    private function resolvePath(string $path): string
    {
        $candidate = trim($path);
        if ($candidate === '') {
            return base_path();
        }

        if (preg_match('/^[A-Za-z]:\\\\/', $candidate) === 1 || str_starts_with($candidate, '\\')) {
            return $candidate;
        }

        return base_path($candidate);
    }

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string>>}
     */
    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if (! is_resource($handle)) {
            return ['headers' => [], 'rows' => []];
        }

        $headers = fgetcsv($handle);
        if (! is_array($headers)) {
            fclose($handle);

            return ['headers' => [], 'rows' => []];
        }

        $headers = array_map(static function ($header) {
            $value = is_string($header) ? trim($header) : '';
            $value = preg_replace('/^\xEF\xBB\xBF/u', '', $value) ?? $value;

            return $value;
        }, $headers);

        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = isset($line[$index]) ? trim((string) $line[$index]) : '';
            }

            $allEmpty = true;
            foreach ($row as $value) {
                if ($value !== '') {
                    $allEmpty = false;
                    break;
                }
            }

            if (! $allEmpty) {
                $rows[] = $row;
            }
        }
        fclose($handle);

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<int, string>  $headers
     * @return array<string, string>
     */
    private function alignRowToHeaders(array $row, array $headers): array
    {
        $aligned = [];
        foreach ($headers as $header) {
            $aligned[$header] = trim((string) ($row[$header] ?? ''));
        }

        return $aligned;
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<string, string>>  $rows
     */
    private function writeCsv(string $path, array $headers, array $rows): void
    {
        $handle = fopen($path, 'w');
        if (! is_resource($handle)) {
            return;
        }

        fputcsv($handle, $headers);
        foreach ($rows as $row) {
            $line = [];
            foreach ($headers as $header) {
                $line[] = $row[$header] ?? '';
            }
            fputcsv($handle, $line);
        }

        fclose($handle);
    }
}

