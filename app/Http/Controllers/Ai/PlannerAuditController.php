<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StorePlannerAuditRequest;
use App\Http\Requests\Ai\UpdatePlannerAuditLoadRequest;
use App\Jobs\Ai\RunPlannerAudit;
use App\Models\Ai\Audit\PlannerAuditRun;
use App\Services\Ai\Audit\PlannerAuditExecutionMode;
use App\Services\Ai\Audit\PlannerAuditGpuLoad;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlannerAuditController extends Controller
{
    public function store(StorePlannerAuditRequest $request): JsonResponse
    {
        $user = $request->user();

        $existing = PlannerAuditRun::query()
            ->where('requested_by', $user->id)
            ->whereIn('status', ['queued', 'running'])
            ->latest('id')
            ->first();

        if ($existing) {
            return response()->json([
                'ok' => true,
                'message' => 'An audit is already in progress.',
                'audit' => $this->presentRun($existing),
            ], 202);
        }

        $horizons = is_array($request->validated('horizons'))
            ? array_values($request->validated('horizons'))
            : [14, 21, 28];
        $reportBase = $request->validated('report_base')
            ?: 'PlannerGenerated'.CarbonImmutable::now(config('app.timezone', 'UTC'))->format('dF');

        $run = PlannerAuditRun::query()->create([
            'requested_by' => $user->id,
            'status' => 'queued',
            'gpu_load' => PlannerAuditGpuLoad::normalize($request->validated('gpu_load')),
            'horizon_days' => $horizons,
            'summary_json' => [
                'report_base' => $reportBase,
                'scope' => 'all non-admin users',
                'horizons' => $horizons,
                'execution_mode' => PlannerAuditExecutionMode::normalize($request->validated('execution_mode')),
                'execution_mode_description' => PlannerAuditExecutionMode::description($request->validated('execution_mode')),
            ],
        ]);

        RunPlannerAudit::dispatch($run->id, $reportBase);

        return response()->json([
            'ok' => true,
            'message' => 'Planner audit queued.',
            'audit' => $this->presentRun($run->fresh()),
        ], 202);
    }

    public function latest(Request $request): JsonResponse
    {
        abort_unless((bool) $request->user()?->isAdmin(), 403);

        $run = PlannerAuditRun::query()
            ->where('requested_by', $request->user()->id)
            ->latest('id')
            ->first();

        return response()->json([
            'ok' => true,
            'audit' => $run ? $this->presentRun($run) : null,
        ]);
    }

    public function show(Request $request, PlannerAuditRun $plannerAuditRun): JsonResponse
    {
        abort_unless((bool) $request->user()?->isAdmin(), 403);

        return response()->json([
            'ok' => true,
            'audit' => $this->presentRun($plannerAuditRun),
        ]);
    }

    public function update(UpdatePlannerAuditLoadRequest $request, PlannerAuditRun $plannerAuditRun): JsonResponse
    {
        abort_unless((bool) $request->user()?->isAdmin(), 403);

        if (! in_array((string) $plannerAuditRun->status, ['queued', 'running'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Only queued or running audits can change workload.',
                'audit' => $this->presentRun($plannerAuditRun),
            ], 422);
        }

        $currentGpuLoad = PlannerAuditGpuLoad::normalize((string) $plannerAuditRun->gpu_load);
        $newGpuLoad = PlannerAuditGpuLoad::normalize($request->validated('gpu_load'));

        if ($currentGpuLoad !== $newGpuLoad) {
            $summary = is_array($plannerAuditRun->summary_json) ? $plannerAuditRun->summary_json : [];
            $history = collect(data_get($summary, 'gpu_load_changes', []))
                ->filter(static fn ($row): bool => is_array($row))
                ->values()
                ->all();
            $history[] = [
                'from' => $currentGpuLoad,
                'to' => $newGpuLoad,
                'changed_at' => now()->toIso8601String(),
                'changed_by' => (int) $request->user()->id,
            ];
            $summary['gpu_load_changes'] = $history;

            $plannerAuditRun->forceFill([
                'gpu_load' => $newGpuLoad,
                'summary_json' => $summary,
            ])->save();
        }

        return response()->json([
            'ok' => true,
            'message' => $currentGpuLoad === $newGpuLoad
                ? 'Planner audit workload is already set to that level.'
                : 'Planner audit workload updated. The new pacing applies on the next run cycle.',
            'audit' => $this->presentRun($plannerAuditRun->fresh()),
        ]);
    }

    private function presentRun(PlannerAuditRun $run): array
    {
        $completedRuns = (int) $run->completed_runs;
        $totalRuns = max(1, (int) $run->total_runs);
        $etaUpdatedAt = $run->eta_updated_at;

        return [
            'id' => (int) $run->id,
            'status' => (string) $run->status,
            'gpu_load' => PlannerAuditGpuLoad::normalize((string) $run->gpu_load),
            'execution_mode' => PlannerAuditExecutionMode::normalize((string) data_get($run->summary_json ?? [], 'execution_mode')),
            'horizon_days' => array_values($run->horizon_days ?? []),
            'total_users' => (int) $run->total_users,
            'total_runs' => (int) $run->total_runs,
            'completed_runs' => $completedRuns,
            'success_runs' => (int) $run->success_runs,
            'failed_runs' => (int) $run->failed_runs,
            'percent_complete' => round(($completedRuns / $totalRuns) * 100, 2),
            'current_user_id' => $run->current_user_id !== null ? (int) $run->current_user_id : null,
            'current_user_email' => $run->current_user_email,
            'current_horizon_days' => $run->current_horizon_days !== null ? (int) $run->current_horizon_days : null,
            'average_run_ms' => $run->average_run_ms !== null ? (int) $run->average_run_ms : null,
            'eta_seconds' => $run->eta_seconds !== null ? (int) $run->eta_seconds : null,
            'eta_updated_at' => $etaUpdatedAt?->toIso8601String(),
            'next_eta_update_at' => $etaUpdatedAt?->copy()->addMinutes(5)->toIso8601String(),
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'report_paths' => $run->report_paths ?? [],
            'summary' => $run->summary_json ?? [],
            'last_error' => $run->last_error,
        ];
    }
}
