<?php

use App\Models\User;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\PlannerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('runs planner batch eval in resumable time-boxed slices', function () {
    User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'resumable1@example.com',
        'weight_kg' => 80,
    ]);
    User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'resumable2@example.com',
        'weight_kg' => 72,
    ]);
    User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'resumable3@example.com',
        'weight_kg' => 68,
    ]);

    $outDir = 'tmp';
    $stateFile = 'planner_batch_eval_resumable_test_state.json';
    $statePath = base_path($outDir.DIRECTORY_SEPARATOR.$stateFile);

    if (File::exists($statePath)) {
        File::delete($statePath);
    }

    $plannerMock = \Mockery::mock(PlannerService::class);
    $plannerMock->shouldReceive('generate')
        ->andReturnUsing(function (User $user, array $options): array {
            $day = (int) ($options['plan_horizon_days'] ?? 14);

            return [
                'provider' => 'mock-provider',
                'model' => 'mock-model',
                'plan' => [
                    'diet' => [
                        'days' => array_fill(0, $day, ['meals' => []]),
                    ],
                    'workout' => [
                        'weekly_schedule' => array_fill(0, 7, ['session_type' => 'train', 'exercises' => []]),
                    ],
                    'adaptive_review' => [
                        'review_after_days' => $day,
                    ],
                ],
            ];
        });
    $this->app->instance(PlannerService::class, $plannerMock);

    $scorerMock = \Mockery::mock(PlannerRunQualityScorer::class);
    $scorerMock->shouldReceive('score')
        ->andReturn([
            'quality_percentage' => 95.0,
            'passed_checks' => 8,
            'total_checks' => 8,
        ]);
    $this->app->instance(PlannerRunQualityScorer::class, $scorerMock);

    $this->artisan('ai:planner-batch-eval-resumable', [
        '--out-dir' => $outDir,
        '--state-file' => $stateFile,
        '--roles' => 'client',
        '--days' => '14',
        '--limit' => 3,
        '--sleep-ms' => 1200,
        '--batch-seconds' => 1,
        '--reset' => 1,
    ])
        ->assertExitCode(0);

    $state = json_decode((string) File::get($statePath), true);
    expect($state)->toBeArray()
        ->and((bool) ($state['completed'] ?? true))->toBeFalse()
        ->and((int) data_get($state, 'stats.runs_total', 0))->toBeGreaterThanOrEqual(1)
        ->and((int) data_get($state, 'stats.runs_total', 0))->toBeLessThan(3);

    $this->artisan('ai:planner-batch-eval-resumable', [
        '--out-dir' => $outDir,
        '--state-file' => $stateFile,
        '--roles' => 'client',
        '--days' => '14',
        '--limit' => 3,
        '--sleep-ms' => 0,
        '--batch-seconds' => 120,
    ])
        ->expectsOutputToContain('Planner resumable batch evaluation completed.')
        ->assertExitCode(0);

    $state = json_decode((string) File::get($statePath), true);
    expect((bool) ($state['completed'] ?? false))->toBeTrue()
        ->and((int) data_get($state, 'stats.runs_total', 0))->toBe(3);

    $csvPath = (string) data_get($state, 'files.csv', '');
    expect($csvPath !== '')->toBeTrue()
        ->and(File::exists($csvPath))->toBeTrue();

    $lineCount = count(array_filter(
        preg_split('/\r\n|\r|\n/', (string) File::get($csvPath)) ?: [],
        static fn (string $line): bool => trim($line) !== ''
    ));
    expect($lineCount)->toBeGreaterThanOrEqual(4);
});
