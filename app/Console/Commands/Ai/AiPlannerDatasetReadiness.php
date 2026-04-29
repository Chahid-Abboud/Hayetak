<?php

namespace App\Console\Commands\Ai;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiPlannerDatasetReadiness extends Command
{
    protected $signature = 'ai:planner-dataset-readiness
        {--dir=docs/ai/templates : Directory containing planner CSV files}
        {--profiles=planner_profiles_template.csv : Profiles CSV filename}
        {--plan-runs=planner_plan_runs_template.csv : Plan runs CSV filename}
        {--outcomes=planner_outcomes_template.csv : Outcomes CSV filename}
        {--regen=planner_regen_feedback_template.csv : Regeneration feedback CSV filename}
        {--target-plan-cycles=120 : Minimum completed plan cycles}
        {--target-day14=120 : Minimum plan runs with day-14 outcome}
        {--target-day21=80 : Minimum plan runs with day-21 outcome}
        {--target-day28=50 : Minimum plan runs with day-28 outcome}
        {--out-json=tmp/ai_deep_audit_safe_run/planner_dataset_readiness_latest.json : Output JSON report path}
        {--fail-below-target=0 : Return non-zero code if targets are not met}
    ';

    protected $description = 'Validate planner dataset CSVs and show progress vs minimum plan/outcome targets.';

    public function handle(): int
    {
        $dir = $this->resolvePath((string) $this->option('dir'));
        $profilesPath = $this->resolvePath((string) $this->option('profiles'), $dir);
        $planRunsPath = $this->resolvePath((string) $this->option('plan-runs'), $dir);
        $outcomesPath = $this->resolvePath((string) $this->option('outcomes'), $dir);
        $regenPath = $this->resolvePath((string) $this->option('regen'), $dir);

        foreach ([$profilesPath, $planRunsPath, $outcomesPath, $regenPath] as $path) {
            if (! File::exists($path)) {
                $this->error("Missing file: {$path}");

                return self::FAILURE;
            }
        }

        $profiles = $this->readCsv($profilesPath);
        $planRuns = $this->readCsv($planRunsPath);
        $outcomes = $this->readCsv($outcomesPath);
        $regen = $this->readCsv($regenPath);

        $requiredColumns = $this->requiredColumns();
        $missingColumns = [
            'profiles' => array_values(array_diff($requiredColumns['profiles'], $profiles['headers'])),
            'plan_runs' => array_values(array_diff($requiredColumns['plan_runs'], $planRuns['headers'])),
            'outcomes' => array_values(array_diff($requiredColumns['outcomes'], $outcomes['headers'])),
            'regen' => array_values(array_diff($requiredColumns['regen'], $regen['headers'])),
        ];

        $profileIds = $this->nonEmptyIdSet($profiles['rows'], 'profile_id');
        $planRunIds = $this->nonEmptyIdSet($planRuns['rows'], 'plan_run_id');

        $planRunsProfileIds = $this->nonEmptyIdSet($planRuns['rows'], 'profile_id');
        $planRunsMissingProfiles = array_values(array_diff($planRunsProfileIds, $profileIds));
        sort($planRunsMissingProfiles);

        $outcomesPlanRunIds = $this->nonEmptyIdSet($outcomes['rows'], 'plan_run_id');
        $outcomesMissingPlanRuns = array_values(array_diff($outcomesPlanRunIds, $planRunIds));
        sort($outcomesMissingPlanRuns);

        $regenPrevIds = $this->nonEmptyIdSet($regen['rows'], 'previous_plan_run_id');
        $regenNewIds = $this->nonEmptyIdSet($regen['rows'], 'new_plan_run_id');
        $regenMissingPrev = array_values(array_diff($regenPrevIds, $planRunIds));
        $regenMissingNew = array_values(array_diff($regenNewIds, $planRunIds));
        sort($regenMissingPrev);
        sort($regenMissingNew);

        $outcomeByPlanRun = $this->outcomeCheckpointIndex($outcomes['rows']);
        $planRunRows = $planRuns['rows'];

        $planRunsWithAnyOutcome = 0;
        $planRunsWithDay14 = 0;
        $planRunsWithDay21 = 0;
        $planRunsWithDay28 = 0;
        $planRunsWithAll = 0;

        foreach ($planRunRows as $row) {
            $planRunId = trim((string) ($row['plan_run_id'] ?? ''));
            if ($planRunId === '') {
                continue;
            }

            $checkpoints = $outcomeByPlanRun[$planRunId] ?? [];
            if ($checkpoints !== []) {
                $planRunsWithAnyOutcome++;
            }
            if (isset($checkpoints['14'])) {
                $planRunsWithDay14++;
            }
            if (isset($checkpoints['21'])) {
                $planRunsWithDay21++;
            }
            if (isset($checkpoints['28'])) {
                $planRunsWithDay28++;
            }
            if (isset($checkpoints['14'], $checkpoints['21'], $checkpoints['28'])) {
                $planRunsWithAll++;
            }
        }

        $targets = [
            'plan_cycles' => max(0, (int) $this->option('target-plan-cycles')),
            'day14' => max(0, (int) $this->option('target-day14')),
            'day21' => max(0, (int) $this->option('target-day21')),
            'day28' => max(0, (int) $this->option('target-day28')),
        ];

        $actuals = [
            'plan_cycles' => $planRunsWithAnyOutcome,
            'day14' => $planRunsWithDay14,
            'day21' => $planRunsWithDay21,
            'day28' => $planRunsWithDay28,
        ];

        $gaps = [
            'plan_cycles_missing' => max(0, $targets['plan_cycles'] - $actuals['plan_cycles']),
            'day14_missing' => max(0, $targets['day14'] - $actuals['day14']),
            'day21_missing' => max(0, $targets['day21'] - $actuals['day21']),
            'day28_missing' => max(0, $targets['day28'] - $actuals['day28']),
        ];

        $progress = [
            'plan_cycles_pct' => $this->pct($actuals['plan_cycles'], $targets['plan_cycles']),
            'day14_pct' => $this->pct($actuals['day14'], $targets['day14']),
            'day21_pct' => $this->pct($actuals['day21'], $targets['day21']),
            'day28_pct' => $this->pct($actuals['day28'], $targets['day28']),
        ];

        $missingness = [
            'profiles' => $this->missingnessByColumn($profiles['rows'], $profiles['headers']),
            'plan_runs' => $this->missingnessByColumn($planRuns['rows'], $planRuns['headers']),
            'outcomes' => $this->missingnessByColumn($outcomes['rows'], $outcomes['headers']),
            'regen' => $this->missingnessByColumn($regen['rows'], $regen['headers']),
        ];

        $this->table(
            ['Dataset', 'Rows', 'Columns'],
            [
                ['profiles', count($profiles['rows']), count($profiles['headers'])],
                ['plan_runs', count($planRuns['rows']), count($planRuns['headers'])],
                ['outcomes', count($outcomes['rows']), count($outcomes['headers'])],
                ['regen', count($regen['rows']), count($regen['headers'])],
            ]
        );

        $this->table(
            ['Metric', 'Actual', 'Target', 'Missing', 'Progress %'],
            [
                ['Completed plan cycles', $actuals['plan_cycles'], $targets['plan_cycles'], $gaps['plan_cycles_missing'], $progress['plan_cycles_pct']],
                ['Runs with day-14 outcome', $actuals['day14'], $targets['day14'], $gaps['day14_missing'], $progress['day14_pct']],
                ['Runs with day-21 outcome', $actuals['day21'], $targets['day21'], $gaps['day21_missing'], $progress['day21_pct']],
                ['Runs with day-28 outcome', $actuals['day28'], $targets['day28'], $gaps['day28_missing'], $progress['day28_pct']],
            ]
        );

        $this->line('Runs with full 14/21/28 outcome set: '.$planRunsWithAll);

        $this->line('Integrity checks:');
        $this->line('- plan_runs.profile_id missing in profiles: '.count($planRunsMissingProfiles));
        $this->line('- outcomes.plan_run_id missing in plan_runs: '.count($outcomesMissingPlanRuns));
        $this->line('- regen.previous_plan_run_id missing in plan_runs: '.count($regenMissingPrev));
        $this->line('- regen.new_plan_run_id missing in plan_runs: '.count($regenMissingNew));

        $report = [
            'generated_at_utc' => CarbonImmutable::now('UTC')->toIso8601String(),
            'source' => [
                'dir' => $dir,
                'profiles' => $profilesPath,
                'plan_runs' => $planRunsPath,
                'outcomes' => $outcomesPath,
                'regen' => $regenPath,
            ],
            'row_counts' => [
                'profiles' => count($profiles['rows']),
                'plan_runs' => count($planRuns['rows']),
                'outcomes' => count($outcomes['rows']),
                'regen' => count($regen['rows']),
            ],
            'missing_columns' => $missingColumns,
            'integrity' => [
                'plan_runs_profile_id_missing_in_profiles' => $planRunsMissingProfiles,
                'outcomes_plan_run_id_missing_in_plan_runs' => $outcomesMissingPlanRuns,
                'regen_previous_plan_run_id_missing_in_plan_runs' => $regenMissingPrev,
                'regen_new_plan_run_id_missing_in_plan_runs' => $regenMissingNew,
            ],
            'targets' => $targets,
            'actuals' => $actuals,
            'gaps' => $gaps,
            'progress_pct' => $progress,
            'plan_runs_with_all_14_21_28' => $planRunsWithAll,
            'missingness' => $missingness,
        ];

        $outJson = $this->resolvePath((string) $this->option('out-json'));
        File::ensureDirectoryExists(dirname($outJson));
        File::put($outJson, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $this->info("Readiness report saved: {$outJson}");

        $hasTargetGap = array_sum($gaps) > 0;
        $hasIntegrityIssues = (
            $planRunsMissingProfiles !== [] ||
            $outcomesMissingPlanRuns !== [] ||
            $regenMissingPrev !== [] ||
            $regenMissingNew !== []
        );
        $hasSchemaIssues = (
            $missingColumns['profiles'] !== [] ||
            $missingColumns['plan_runs'] !== [] ||
            $missingColumns['outcomes'] !== [] ||
            $missingColumns['regen'] !== []
        );

        if (((int) $this->option('fail-below-target')) === 1 && ($hasTargetGap || $hasIntegrityIssues || $hasSchemaIssues)) {
            $this->error('Dataset is below target and/or has integrity/schema issues.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function resolvePath(string $path, ?string $baseDir = null): string
    {
        $candidate = trim($path);
        if ($candidate === '') {
            return $baseDir ?? base_path();
        }

        if (preg_match('/^[A-Za-z]:\\\\/', $candidate) === 1 || str_starts_with($candidate, '\\')) {
            return $candidate;
        }

        if ($baseDir !== null) {
            return rtrim($baseDir, '\/').DIRECTORY_SEPARATOR.$candidate;
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
     * @param  array<int, array<string, string>>  $rows
     * @return array<int, string>
     */
    private function nonEmptyIdSet(array $rows, string $key): array
    {
        $set = [];

        foreach ($rows as $row) {
            $value = trim((string) ($row[$key] ?? ''));
            if ($value !== '') {
                $set[$value] = true;
            }
        }

        return array_values(array_keys($set));
    }

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array<string, array<string, bool>>
     */
    private function outcomeCheckpointIndex(array $rows): array
    {
        $index = [];

        foreach ($rows as $row) {
            $planRunId = trim((string) ($row['plan_run_id'] ?? ''));
            $checkpoint = trim((string) ($row['checkpoint_day'] ?? ''));
            if ($planRunId === '' || $checkpoint === '') {
                continue;
            }

            if (! isset($index[$planRunId])) {
                $index[$planRunId] = [];
            }
            $index[$planRunId][$checkpoint] = true;
        }

        return $index;
    }

    private function pct(int $actual, int $target): float
    {
        if ($target <= 0) {
            return 100.0;
        }

        return round(min(100.0, ($actual / $target) * 100), 2);
    }

    /**
     * @param  array<int, array<string, string>>  $rows
     * @param  array<int, string>  $headers
     * @return array<string, array<string, float|int>>
     */
    private function missingnessByColumn(array $rows, array $headers): array
    {
        $total = count($rows);
        if ($total <= 0) {
            return [];
        }

        $missing = [];
        foreach ($headers as $header) {
            $count = 0;
            foreach ($rows as $row) {
                if (trim((string) ($row[$header] ?? '')) === '') {
                    $count++;
                }
            }

            if ($count > 0) {
                $missing[$header] = [
                    'missing_rows' => $count,
                    'missing_pct' => round(($count / $total) * 100, 2),
                ];
            }
        }

        return $missing;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function requiredColumns(): array
    {
        return [
            'profiles' => [
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
            'plan_runs' => [
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
            'outcomes' => [
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
            'regen' => [
                'regen_event_id',
                'profile_id',
                'previous_plan_run_id',
                'new_plan_run_id',
                'requested_at_utc',
                'requested_reason',
                'changed_sections_json',
            ],
        ];
    }
}
