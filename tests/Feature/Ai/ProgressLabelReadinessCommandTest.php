<?php

use App\Models\Ai\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('reports ready and pending planner rows for progress labels', function () {
    $readyUser = User::factory()->create([
        'weight_kg' => 80,
        'age' => 30,
        'gender' => 'male',
        'height_cm' => 178,
    ]);

    $pendingUser = User::factory()->create([
        'weight_kg' => 72,
        'age' => 28,
        'gender' => 'female',
        'height_cm' => 165,
    ]);

    $readyGeneratedAt = now()->subDays(25)->startOfDay();
    $pendingGeneratedAt = now()->subDays(20)->startOfDay();

    $readyRequest = AiRequest::query()->create([
        'user_id' => $readyUser->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 80,
                'age' => 30,
                'gender' => 'male',
                'height_cm' => 178,
            ],
            'planning_constraints' => [
                'plan_horizon_days' => 14,
            ],
        ],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 80,
            ],
        ],
    ]);
    $readyRequest->forceFill([
        'created_at' => $readyGeneratedAt,
        'updated_at' => $readyGeneratedAt,
    ])->save();

    $pendingRequest = AiRequest::query()->create([
        'user_id' => $pendingUser->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [
            'profile' => [
                'weight_kg' => 72,
                'age' => 28,
                'gender' => 'female',
                'height_cm' => 165,
            ],
            'planning_constraints' => [
                'plan_horizon_days' => 14,
            ],
        ],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 72,
            ],
        ],
    ]);
    $pendingRequest->forceFill([
        'created_at' => $pendingGeneratedAt,
        'updated_at' => $pendingGeneratedAt,
    ])->save();

    DB::table('measurements')->insert([
        [
            'user_id' => $readyUser->id,
            'measured_at' => $readyGeneratedAt->subDay()->toDateString(),
            'weight_kg' => 80,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $readyUser->id,
            'measured_at' => $readyGeneratedAt->addDays(13)->toDateString(),
            'weight_kg' => 78.9,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $pendingUser->id,
            'measured_at' => $pendingGeneratedAt->subDay()->toDateString(),
            'weight_kg' => 72,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $this->artisan('ai:list-progress-label-readiness')
        ->expectsOutputToContain('Total scanned: 2')
        ->expectsOutputToContain('Ready rows: 1')
        ->expectsOutputToContain('Pending rows: 1')
        ->expectsOutputToContain('Pending by reason - missing_end: 1')
        ->assertExitCode(0);
});
