<?php

use App\Jobs\Ai\GeneratePlansForUser;
use App\Models\AiRequest;
use App\Models\Notification;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('queues planner feedback cycle generations and sends day 19-23 reminders', function () {
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-04-15 09:00:00', 'UTC'));
    config()->set('ai.planner.feedback_cycle.enabled', true);
    config()->set('ai.planner.feedback_cycle.day_19_to_23_checkin_reminder_enabled', true);
    Queue::fake();

    $bootstrapUser = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);

    $staleUser = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);
    $staleRequest = AiRequest::query()->create([
        'user_id' => $staleUser->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['profile' => ['weight_kg' => 80]],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 80,
                'expected_weight_change_kg' => -0.6,
                'projected_body_weight_kg' => 79.4,
            ],
        ],
    ]);
    $staleRequest->forceFill([
        'created_at' => CarbonImmutable::parse('2026-03-01 08:00:00', 'UTC'),
        'updated_at' => CarbonImmutable::parse('2026-03-01 08:00:00', 'UTC'),
    ])->save();

    $reminderUser = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);
    $reminderRequest = AiRequest::query()->create([
        'user_id' => $reminderUser->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => ['profile' => ['weight_kg' => 70]],
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 21,
                'baseline_weight_kg' => 70,
                'expected_weight_change_kg' => -0.3,
                'projected_body_weight_kg' => 69.7,
            ],
        ],
    ]);
    $reminderRequest->forceFill([
        'created_at' => CarbonImmutable::parse('2026-03-26 08:00:00', 'UTC'),
        'updated_at' => CarbonImmutable::parse('2026-03-26 08:00:00', 'UTC'),
    ])->save();

    $this->artisan('ai:run-planner-feedback-cycles', [
        '--start-date' => '2026-01-01',
        '--anchor-date' => '2026-01-01',
        '--interval-days' => 21,
        '--plan-days' => 21,
        '--user-ids' => implode(',', [$bootstrapUser->id, $staleUser->id, $reminderUser->id]),
    ])->assertExitCode(0);

    Queue::assertPushed(GeneratePlansForUser::class, function (GeneratePlansForUser $job) use ($bootstrapUser): bool {
        return $job->userId === $bootstrapUser->id
            && $job->days === 21
            && $job->regenerate === true
            && $job->reason === 'feedback_cycle_bootstrap';
    });

    Queue::assertPushed(GeneratePlansForUser::class, function (GeneratePlansForUser $job) use ($staleUser): bool {
        return $job->userId === $staleUser->id
            && $job->days === 21
            && $job->regenerate === true
            && str_starts_with((string) $job->reason, 'feedback_cycle_regen_c');
    });

    Queue::assertNotPushed(GeneratePlansForUser::class, function (GeneratePlansForUser $job) use ($reminderUser): bool {
        return $job->userId === $reminderUser->id;
    });

    $notification = Notification::query()
        ->where('target_user_id', $reminderUser->id)
        ->latest('id')
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification?->title)->toBe('Weight Check-In Reminder')
        ->and($notification?->body)->toContain('Cycle day')
        ->and($notification?->body)->toContain((string) $reminderRequest->id);

    CarbonImmutable::setTestNow();
});
