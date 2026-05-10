<?php

namespace App\Jobs\Ai;

use App\Models\PlannerAuditRun;
use App\Services\Ai\Audit\PlannerAuditRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunPlannerAudit implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        public int $auditRunId,
        public ?string $reportBase = null,
    ) {}

    public function handle(PlannerAuditRunner $runner): void
    {
        $run = PlannerAuditRun::query()->find($this->auditRunId);
        if (! $run) {
            return;
        }

        $runner->run($run, $this->reportBase);
    }
}
