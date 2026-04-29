<?php

use App\Models\Ai\Audit\PlannerAuditRun;
use App\Models\User;
use App\Services\Ai\Audit\PlannerAuditRunner;
use App\Services\Ai\Audit\PlannerAuditStructureValidator;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\PlannerHealthService;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Seed\SeededPlanCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('fails live planner audits before generation when the ollama provider is not reachable', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'email' => 'admin@example.com',
    ]);
    User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'client@example.com',
    ]);

    $plannerMock = \Mockery::mock(PlannerService::class);
    $plannerMock->shouldNotReceive('generate');
    $this->app->instance(PlannerService::class, $plannerMock);

    $scorerMock = \Mockery::mock(PlannerRunQualityScorer::class);
    $this->app->instance(PlannerRunQualityScorer::class, $scorerMock);

    $cleanupMock = \Mockery::mock(SeededPlanCleanupService::class);
    $cleanupMock->shouldReceive('cleanupForUsers')->never();
    $this->app->instance(SeededPlanCleanupService::class, $cleanupMock);

    $validatorMock = \Mockery::mock(PlannerAuditStructureValidator::class);
    $validatorMock->shouldReceive('preflight')
        ->once()
        ->andReturn([
            'ok' => true,
            'issues' => [],
        ]);
    $this->app->instance(PlannerAuditStructureValidator::class, $validatorMock);

    $healthMock = \Mockery::mock(PlannerHealthService::class);
    $healthMock->shouldReceive('snapshot')
        ->once()
        ->andReturn([
            'recommendation' => 'Start Ollama and make sure the configured model is pulled.',
            'checks' => [
                'ollama' => [
                    'base_url' => 'http://127.0.0.1:11434',
                    'model' => 'llama3.1:8b',
                    'reachable' => false,
                    'model_loaded' => false,
                ],
            ],
        ]);
    $this->app->instance(PlannerHealthService::class, $healthMock);

    $run = PlannerAuditRun::query()->create([
        'requested_by' => $admin->id,
        'status' => 'queued',
        'gpu_load' => 'low',
        'horizon_days' => [14],
        'summary_json' => [
            'execution_mode' => 'live',
        ],
    ]);

    $result = app(PlannerAuditRunner::class)->run($run, 'PlannerLivePreflightFailureTest');

    expect($result->status)->toBe('failed')
        ->and((string) $result->last_error)->toContain('Planner audit provider preflight failed')
        ->and(data_get($result->summary_json, 'provider_preflight.ok'))->toBeFalse()
        ->and(implode(' | ', (array) data_get($result->summary_json, 'provider_preflight.issues', [])))
            ->toContain('Live planner audit requires Ollama to be reachable');
});

it('re-reads the latest gpu load from the database while an audit is in progress', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'email' => 'admin@example.com',
    ]);

    $run = PlannerAuditRun::query()->create([
        'requested_by' => $admin->id,
        'status' => 'running',
        'gpu_load' => 'low',
        'horizon_days' => [14, 21, 28],
    ]);

    $runner = new PlannerAuditRunner(
        \Mockery::mock(PlannerService::class),
        \Mockery::mock(PlannerRunQualityScorer::class),
        \Mockery::mock(SeededPlanCleanupService::class),
        \Mockery::mock(PlannerAuditStructureValidator::class),
        \Mockery::mock(PlannerHealthService::class),
    );

    $method = new ReflectionMethod($runner, 'currentGpuLoad');
    $method->setAccessible(true);

    expect($method->invoke($runner, $run))->toBe('low');

    $run->forceFill(['gpu_load' => 'high'])->save();

    expect($method->invoke($runner, $run))->toBe('high');
});
