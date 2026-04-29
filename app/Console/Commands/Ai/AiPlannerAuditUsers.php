<?php

namespace App\Console\Commands\Ai;

use App\Models\Ai\Audit\PlannerAuditRun;
use App\Models\User;
use App\Services\Ai\Audit\PlannerAuditExecutionMode;
use App\Services\Ai\Audit\PlannerAuditGpuLoad;
use App\Services\Ai\Audit\PlannerAuditRunner;
use Illuminate\Console\Command;

class AiPlannerAuditUsers extends Command
{
    protected $signature = 'ai:planner-audit-users
        {--gpu-load=low : GPU load pacing profile (low|medium|high)}
        {--execution-mode=standard : Audit execution mode (standard|fast-fallback|live)}
        {--report-base= : Report base filename without extension}
        {--days=14,21,28 : Comma-separated horizon days}
        {--user-ids= : Optional comma-separated non-admin user IDs}
        {--limit= : Optional non-admin user limit for targeted benchmark runs}';

    protected $description = 'Generate planner audits for all non-admin users and write PlannerGenerated-style reports.';

    public function handle(PlannerAuditRunner $runner): int
    {
        $requesterId = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->orderBy('id')
            ->value('id') ?? User::query()->orderBy('id')->value('id');

        if (! $requesterId) {
            $this->error('No users are available to own the audit run.');

            return self::FAILURE;
        }

        $horizons = array_values(array_filter(array_map(
            static fn (string $value): int => (int) trim($value),
            explode(',', (string) $this->option('days'))
        )));
        $selectedUserIds = array_values(array_filter(array_map(
            static fn (string $value): int => (int) trim($value),
            explode(',', (string) $this->option('user-ids'))
        )));
        $selectedUserLimit = max(0, (int) $this->option('limit'));

        $run = PlannerAuditRun::query()->create([
            'requested_by' => $requesterId,
            'status' => 'queued',
            'gpu_load' => PlannerAuditGpuLoad::normalize((string) $this->option('gpu-load')),
            'horizon_days' => $horizons !== [] ? $horizons : [14, 21, 28],
            'summary_json' => [
                'execution_mode' => PlannerAuditExecutionMode::normalize((string) $this->option('execution-mode')),
                'selected_user_ids' => $selectedUserIds,
                'selected_user_limit' => $selectedUserLimit > 0 ? $selectedUserLimit : null,
            ],
        ]);

        $run = $runner->run($run, trim((string) $this->option('report-base')) ?: null);

        $this->info('Planner audit status: '.(string) $run->status);
        $this->line('Report JSON: '.(string) data_get($run->report_paths ?? [], 'json', 'n/a'));
        $this->line('Report Markdown: '.(string) data_get($run->report_paths ?? [], 'md', 'n/a'));

        return $run->status === 'completed' ? self::SUCCESS : self::FAILURE;
    }
}
