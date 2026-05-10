<?php

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('builds predictor evolution, planner adaptation, and chatbot summaries', function () {
    $userWithData = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'predictor-user@example.com',
        'weight_kg' => 90,
        'dietary_goal' => 'fat loss',
        'fitness_goal' => 'lose weight',
    ]);

    $userWithoutPredictions = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email' => 'no-predictor@example.com',
        'weight_kg' => 75,
    ]);

    DB::table('measurements')->insert([
        [
            'user_id' => $userWithData->id,
            'measured_at' => '2026-03-05',
            'weight_kg' => 90,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $userWithData->id,
            'measured_at' => '2026-03-25',
            'weight_kg' => 88,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $userWithData->id,
            'measured_at' => '2026-04-15',
            'weight_kg' => 87.6,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $firstRequest = AiRequest::query()->create([
        'user_id' => $userWithData->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['profile' => ['weight_kg' => 90]],
        'output_json' => [
            'diet' => [
                'daily_targets' => ['calories_kcal' => 2100, 'protein_g' => 140],
                'days' => [
                    [
                        'day_index' => 1,
                        'meals' => [
                            [
                                'meal_code' => 'breakfast',
                                'items' => [
                                    ['name' => 'oats'],
                                    ['name' => 'egg'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'workout' => [
                'progression_rules' => ['Add 1 rep when sets feel easy'],
                'weekly_schedule' => [
                    [
                        'day_index' => 1,
                        'exercises' => [
                            ['name' => 'Squat'],
                            ['name' => 'Push Up'],
                        ],
                    ],
                ],
            ],
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 90,
                'expected_weight_change_kg' => -1.0,
                'projected_body_weight_kg' => 89.0,
                'feedback_adjustment' => [
                    'base_weekly_weight_change_kg' => -0.35,
                    'adjusted_weekly_weight_change_kg' => -0.35,
                    'last_prediction_error_kg_per_week' => null,
                ],
            ],
        ],
        'provider' => 'self_hosted',
        'model' => 'llama',
    ]);
    $firstRequest->forceFill([
        'created_at' => CarbonImmutable::parse('2026-03-05 10:00:00'),
        'updated_at' => CarbonImmutable::parse('2026-03-05 10:00:00'),
    ])->save();

    $secondRequest = AiRequest::query()->create([
        'user_id' => $userWithData->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['profile' => ['weight_kg' => 88]],
        'output_json' => [
            'diet' => [
                'daily_targets' => ['calories_kcal' => 1950, 'protein_g' => 150],
                'days' => [
                    [
                        'day_index' => 1,
                        'meals' => [
                            [
                                'meal_code' => 'breakfast',
                                'items' => [
                                    ['name' => 'yogurt'],
                                    ['name' => 'berries'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'workout' => [
                'progression_rules' => ['Add 2.5 kg when all sets are stable'],
                'weekly_schedule' => [
                    [
                        'day_index' => 1,
                        'exercises' => [
                            ['name' => 'Deadlift'],
                            ['name' => 'Row'],
                        ],
                    ],
                ],
            ],
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 88,
                'expected_weight_change_kg' => -0.8,
                'projected_body_weight_kg' => 87.2,
                'feedback_adjustment' => [
                    'base_weekly_weight_change_kg' => -0.30,
                    'adjusted_weekly_weight_change_kg' => -0.42,
                    'last_prediction_error_kg_per_week' => -0.12,
                ],
            ],
        ],
        'provider' => 'self_hosted',
        'model' => 'llama',
    ]);
    $secondRequest->forceFill([
        'created_at' => CarbonImmutable::parse('2026-03-26 10:00:00'),
        'updated_at' => CarbonImmutable::parse('2026-03-26 10:00:00'),
    ])->save();

    $conversation = AiConversation::query()->create([
        'user_id' => $userWithData->id,
        'title' => 'Test conversation',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $userWithData->id,
        'role' => 'assistant',
        'content' => 'Test answer',
        'metadata' => [
            'model' => 'llama',
            'warnings' => [],
            'quality' => [
                'quality_percentage' => 95,
            ],
        ],
    ]);

    $tag = 'pest_predictor_evolution_audit';
    $jsonPath = base_path("tmp/predictor_evolution_audit_{$tag}.json");
    $mdPath = base_path("tmp/predictor_evolution_audit_{$tag}.md");
    File::delete($jsonPath);
    File::delete($mdPath);

    $this->artisan('ai:predictor-evolution-audit', [
        '--from' => '2026-03-01',
        '--anchor' => '2026-01-01',
        '--interval-days' => 21,
        '--user-ids' => $userWithData->id.','.$userWithoutPredictions->id,
        '--include-chatbot' => 1,
        '--out-dir' => 'tmp',
        '--tag' => $tag,
    ])
        ->expectsOutputToContain('Predictor audit JSON:')
        ->expectsOutputToContain('Summary snapshot:')
        ->assertExitCode(0);

    expect(File::exists($jsonPath))->toBeTrue()
        ->and(File::exists($mdPath))->toBeTrue();

    $payload = json_decode((string) File::get($jsonPath), true);

    expect((int) data_get($payload, 'summary.users_evaluated'))->toBe(2)
        ->and((int) data_get($payload, 'summary.users_with_predictions'))->toBe(1)
        ->and((int) data_get($payload, 'summary.total_cycles'))->toBe(2)
        ->and((int) data_get($payload, 'summary.total_labeled_cycles'))->toBe(2)
        ->and((int) data_get($payload, 'chatbot.summary.total_assistant_messages'))->toBe(1);

    $firstUser = collect((array) ($payload['users'] ?? []))
        ->firstWhere('user.id', $userWithData->id);

    expect((int) data_get($firstUser, 'summary.feedback_applied_cycles'))->toBeGreaterThanOrEqual(1)
        ->and((int) data_get($firstUser, 'summary.transitions_changed'))->toBeGreaterThanOrEqual(1);
});
