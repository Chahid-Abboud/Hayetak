<?php

use App\Models\Notification;
use App\Models\Ai\AiPlan;
use App\Models\Ai\AiRequest;
use App\Models\User;
use App\Models\UserPref;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

test('admin can view and update an extended user profile with preferences', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $target = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'email_verified_at' => now(),
        'verified' => false,
    ]);

    UserPref::query()->create([
        'user_id' => $target->id,
        'units' => 'metric',
        'theme' => 'system',
    ]);

    $this->actingAs($admin)
        ->getJson("/api/admin/users/{$target->id}")
        ->assertOk()
        ->assertJsonPath('user.email', $target->email)
        ->assertJsonPath('prefs.units', 'metric');

    $this->actingAs($admin)
        ->putJson("/api/admin/users/{$target->id}", [
            'first_name' => 'Nour',
            'last_name' => 'Admincheck',
            'username' => 'nour_test',
            'email' => 'nour@example.com',
            'role' => User::ROLE_TRAINER,
            'verified' => true,
            'email_verified' => false,
            'gender' => 'female',
            'age' => 29,
            'height_cm' => 168,
            'weight_kg' => 63.5,
            'dietary_goal' => 'maintenance',
            'fitness_goal' => 'strength',
            'diet_name' => 'Mediterranean',
            'allergies' => ['peanuts', 'shellfish'],
            'activity_level' => 'Moderately Active',
            'workout_days_per_week' => 4,
            'workout_location' => 'gym',
            'has_medical_history' => true,
            'medical_history' => 'Old shoulder injury',
            'tried_diet_before' => true,
            'diet_failure_reasons' => ['too restrictive'],
            'diet_failure_other' => 'Travel schedule',
            'city' => 'Beirut',
            'contact_display' => 'WhatsApp preferred',
            'professional_bio' => 'Certified coach',
            'specialties' => ['strength', 'rehab'],
            'availability_text' => 'Mon-Fri evenings',
            'profile_lat' => 33.8938,
            'profile_lng' => 35.5018,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
            'prefs' => [
                'units' => 'imperial',
                'theme' => 'dark',
                'home_gym' => 'Rack + dumbbells',
                'is_public' => true,
                'daily_goal_calories' => 2200,
                'daily_goal_protein_g' => 150.5,
                'notifications' => ['coach' => true],
                'settings' => ['beta_admin_view' => true],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('user.first_name', 'Nour')
        ->assertJsonPath('prefs.units', 'imperial')
        ->assertJsonPath('summary.notifications', 0);

    $target->refresh();
    $prefs = $target->prefs()->first();

    expect($target->first_name)->toBe('Nour')
        ->and($target->role)->toBe(User::ROLE_TRAINER)
        ->and($target->verified)->toBeTrue()
        ->and($target->email_verified_at)->toBeNull()
        ->and($target->allergies)->toBe(['peanuts', 'shellfish'])
        ->and(Hash::check('new-password-123', $target->password))->toBeTrue()
        ->and($prefs?->units)->toBe('imperial')
        ->and($prefs?->theme)->toBe('dark')
        ->and($prefs?->notifications)->toBe(['coach' => true]);
});

test('admin user index supports search and role filters', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'first_name' => 'Maya',
        'last_name' => 'Client',
        'email' => 'maya@example.com',
    ]);

    User::factory()->create([
        'role' => User::ROLE_TRAINER,
        'first_name' => 'Rami',
        'last_name' => 'Coach',
        'email' => 'rami@example.com',
        'verified' => true,
    ]);

    $this->actingAs($admin)
        ->getJson('/api/admin/users?search=rami&role=trainer&verified=true')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'rami@example.com');
});

test('admin alerts are only delivered to selected users and dismissed alerts disappear from the bell feed', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $firstRecipient = User::factory()->create();
    $secondRecipient = User::factory()->create();
    $nonRecipient = User::factory()->create();

    $this->actingAs($admin)
        ->postJson('/api/admin/notifications', [
            'title' => 'Coach update',
            'body' => 'Please review your plan changes.',
            'target_user_ids' => [$firstRecipient->id, $secondRecipient->id],
        ])
        ->assertCreated()
        ->assertJsonPath('sent', 2);

    expect(Notification::query()->count())->toBe(2);

    $firstNotificationId = Notification::query()
        ->where('target_user_id', $firstRecipient->id)
        ->value('id');

    $firstResponse = $this->actingAs($firstRecipient)
        ->getJson('/api/notifications')
        ->assertOk();

    $firstItems = $firstResponse->json('data') ?? $firstResponse->json();

    expect($firstItems)->toHaveCount(1)
        ->and(data_get($firstItems, '0.title'))->toBe('Coach update');

    $nonRecipientResponse = $this->actingAs($nonRecipient)
        ->getJson('/api/notifications')
        ->assertOk();

    $nonRecipientItems = $nonRecipientResponse->json('data') ?? $nonRecipientResponse->json();

    expect($nonRecipientItems)->toHaveCount(0);

    $this->actingAs($firstRecipient)
        ->postJson("/api/notifications/{$firstNotificationId}/read")
        ->assertOk();

    $this->actingAs($firstRecipient)
        ->postJson("/api/notifications/{$firstNotificationId}/dismiss")
        ->assertOk();

    $dismissedResponse = $this->actingAs($firstRecipient)
        ->getJson('/api/notifications')
        ->assertOk();

    $dismissedItems = $dismissedResponse->json('data') ?? $dismissedResponse->json();

    expect($dismissedItems)->toHaveCount(0);

    $this->actingAs($admin)
        ->getJson('/api/admin/notifications?status=unread')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.target_user_id', $secondRecipient->id);
});

test('admin bulk update endpoint verifies users and returns per-user summary', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $first = User::factory()->create(['verified' => false]);
    $second = User::factory()->create(['verified' => false]);

    $this->actingAs($admin)
        ->postJson('/api/admin/users/bulk-update', [
            'user_ids' => [$first->id, $second->id],
            'action' => 'verify',
        ])
        ->assertOk()
        ->assertJsonPath('summary.requested_count', 2)
        ->assertJsonPath('summary.updated_count', 2)
        ->assertJsonPath('summary.skipped_count', 0);

    expect($first->fresh()->verified)->toBeTrue()
        ->and($second->fresh()->verified)->toBeTrue();

    $this->assertDatabaseHas('admin_action_logs', [
        'action' => 'admin.users.bulk_update',
    ]);
});

test('admin bulk update validates set_status payload and handles no-change rows', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $target = User::factory()->create([
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->postJson('/api/admin/users/bulk-update', [
            'user_ids' => [$target->id],
            'action' => 'set_status',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);

    $this->actingAs($admin)
        ->postJson('/api/admin/users/bulk-update', [
            'user_ids' => [$target->id],
            'action' => 'set_status',
            'status' => 'pending',
        ])
        ->assertOk()
        ->assertJsonPath('summary.updated_count', 0)
        ->assertJsonPath('summary.skipped_count', 1)
        ->assertJsonPath('results.0.reason', 'no_change');
});

test('admin user detail exposes planner feedback metrics for model review', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $target = User::factory()->create([
        'role' => User::ROLE_CLIENT,
        'weight_kg' => 81.2,
    ]);

    AiRequest::query()->create([
        'user_id' => $target->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [],
        'provider' => 'ollama',
        'model' => 'llama3',
        'output_json' => [
            'progress_prediction' => [
                'horizon_days' => 14,
                'baseline_weight_kg' => 81.2,
                'projected_body_weight_kg' => 80.5,
                'expected_weight_change_kg' => -0.7,
                'confidence' => 'medium',
                'inference_source' => 'heuristic',
                'feedback_adjustment' => [
                    'base_weekly_weight_change_kg' => -0.4,
                    'adjusted_weekly_weight_change_kg' => -0.35,
                    'last_prediction_error_kg_per_week' => 0.1,
                    'notes' => 'Adjustment based on observed adherence.',
                ],
            ],
        ],
    ]);

    $this->actingAs($admin)
        ->getJson("/api/admin/users/{$target->id}")
        ->assertOk()
        ->assertJsonPath('recent.planner_feedback.0.provider', 'ollama')
        ->assertJsonPath('recent.planner_feedback.0.model', 'llama3')
        ->assertJsonPath('recent.planner_feedback.0.feedback_applied', true)
        ->assertJsonPath('recent.planner_feedback.0.base_weekly_weight_change_kg', -0.4)
        ->assertJsonPath('recent.planner_feedback.0.adjusted_weekly_weight_change_kg', -0.35)
        ->assertJsonPath('recent.planner_feedback.0.confidence', 'medium');
});

test('admin user detail exposes latest-versus-previous plan differences', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $target = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);

    AiPlan::query()->create([
        'user_id' => $target->id,
        'type' => 'diet',
        'plan_json' => [
            'days' => [
                [
                    'day_index' => 1,
                    'meals' => [
                        [
                            'meal_code' => 'breakfast',
                            'title' => 'Egg Toast',
                            'items' => [
                                ['name' => 'Egg Toast'],
                            ],
                        ],
                    ],
                ],
            ],
            'daily_targets' => ['calories_kcal' => 1900],
        ],
        'version' => 1,
        'generation_id' => (string) Str::uuid(),
    ]);

    AiPlan::query()->create([
        'user_id' => $target->id,
        'type' => 'diet',
        'plan_json' => [
            'days' => [
                [
                    'day_index' => 1,
                    'meals' => [
                        [
                            'meal_code' => 'breakfast',
                            'title' => 'Oat Bowl',
                            'items' => [
                                ['name' => 'Oat Bowl'],
                                ['name' => 'Greek Yogurt'],
                            ],
                        ],
                    ],
                ],
            ],
            'daily_targets' => ['calories_kcal' => 2050],
        ],
        'version' => 2,
        'generation_id' => (string) Str::uuid(),
    ]);

    AiPlan::query()->create([
        'user_id' => $target->id,
        'type' => 'workout',
        'plan_json' => [
            'weekly_schedule' => [
                [
                    'day_index' => 1,
                    'focus' => 'Push',
                    'exercises' => [
                        ['name' => 'Push Up'],
                    ],
                ],
            ],
            'progression_rules' => ['Add 1 rep each week'],
        ],
        'version' => 1,
        'generation_id' => (string) Str::uuid(),
    ]);

    AiPlan::query()->create([
        'user_id' => $target->id,
        'type' => 'workout',
        'plan_json' => [
            'weekly_schedule' => [
                [
                    'day_index' => 1,
                    'focus' => 'Upper Strength',
                    'exercises' => [
                        ['name' => 'Incline Push Up'],
                        ['name' => 'Dumbbell Row'],
                    ],
                ],
            ],
            'progression_rules' => ['Add weight when reps are stable'],
            'recovery_rules' => ['One extra mobility day'],
        ],
        'version' => 2,
        'generation_id' => (string) Str::uuid(),
    ]);

    $this->actingAs($admin)
        ->getJson("/api/admin/users/{$target->id}")
        ->assertOk()
        ->assertJsonPath('recent.plan_diffs.diet.has_previous', true)
        ->assertJsonPath('recent.plan_diffs.diet.changed', true)
        ->assertJsonPath('recent.plan_diffs.diet.current_version', 2)
        ->assertJsonPath('recent.plan_diffs.workout.has_previous', true)
        ->assertJsonPath('recent.plan_diffs.workout.changed', true)
        ->assertJsonPath('recent.plan_diffs.workout.current_version', 2);
});
