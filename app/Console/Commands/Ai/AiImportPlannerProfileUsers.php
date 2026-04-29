<?php

namespace App\Console\Commands\Ai;

use App\Services\Ai\Training\PlannerProfileDatasetUserImporter;
use Illuminate\Console\Command;

class AiImportPlannerProfileUsers extends Command
{
    protected $signature = 'ai:import-planner-profile-users
        {input-dir : Directory containing planner_profiles_template.csv and related planner dataset files}
        {--dry-run=0 : Preview import counts without writing data}
        {--source=planner_dataset_import : Source tag written to imported related rows}
        {--shared-password= : Optional shared password to set on imported accounts}
    ';

    protected $description = 'Import planner profile dataset rows into users, restrictions, medical histories, prefs, and measurements.';

    public function handle(PlannerProfileDatasetUserImporter $importer): int
    {
        $summary = $importer->import(
            (string) $this->argument('input-dir'),
            ((int) $this->option('dry-run')) === 1,
            trim((string) $this->option('source')) ?: 'planner_dataset_import',
            trim((string) $this->option('shared-password')) ?: null
        );

        $this->table(
            ['Profiles', 'Created users', 'Updated users', 'Prefs', 'Dietary rows', 'Medical rows', 'Measurements'],
            [[
                $summary['profiles'],
                $summary['created_users'],
                $summary['updated_users'],
                $summary['pref_rows_written'],
                $summary['dietary_rows_written'],
                $summary['medical_rows_written'],
                $summary['measurement_rows_written'],
            ]]
        );

        $this->info(($summary['dry_run'] ? 'Previewed' : 'Imported').' planner profile users from '.$summary['input_dir']);

        return self::SUCCESS;
    }
}
