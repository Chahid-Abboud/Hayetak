<?php

use App\Models\Ai\Audit\PlannerAuditRun;
use App\Models\User;
use App\Services\Ai\Audit\PlannerAuditRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('stores execution mode and user filters when starting the planner audit command', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'email' => 'admin@example.com',
    ]);
    $clientA = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'client-a@example.com',
    ]);
    $clientB = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'client-b@example.com',
    ]);

    $runnerMock = \Mockery::mock(PlannerAuditRunner::class);
    $runnerMock->shouldReceive('run')
        ->once()
        ->andReturnUsing(function (PlannerAuditRun $run, ?string $reportBase) use ($clientA, $clientB): PlannerAuditRun {
            expect($reportBase)->toBe('BenchmarkSample')
                ->and($run->gpu_load)->toBe('medium')
                ->and($run->horizon_days)->toBe([14, 21])
                ->and(data_get($run->summary_json, 'execution_mode'))->toBe('live')
                ->and(data_get($run->summary_json, 'selected_user_ids'))->toBe([$clientA->id, $clientB->id])
                ->and(data_get($run->summary_json, 'selected_user_limit'))->toBe(2);

            $run->forceFill([
                'status' => 'completed',
                'report_paths' => [
                    'json' => base_path('tmp/benchmark-sample.json'),
                    'md' => base_path('tmp/benchmark-sample.md'),
                ],
            ])->save();

            return $run->fresh();
        });
    $this->app->instance(PlannerAuditRunner::class, $runnerMock);

    $this->artisan('ai:planner-audit-users', [
        '--gpu-load' => 'medium',
        '--execution-mode' => 'live-model',
        '--days' => '14,21',
        '--user-ids' => $clientA->id.','.$clientB->id,
        '--limit' => 2,
        '--report-base' => 'BenchmarkSample',
    ])
        ->expectsOutputToContain('Planner audit status: completed')
        ->assertExitCode(0);

    $run = PlannerAuditRun::query()->latest('id')->firstOrFail();

    expect($run->requested_by)->toBe($admin->id)
        ->and(data_get($run->summary_json, 'execution_mode'))->toBe('live')
        ->and(data_get($run->summary_json, 'selected_user_limit'))->toBe(2);
});
