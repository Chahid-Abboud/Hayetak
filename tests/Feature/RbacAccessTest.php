<?php

use App\Models\ProfessionalVerification;
use App\Models\User;

test('admin api is forbidden for non admin users', function () {
    $client = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);

    $this->actingAs($client)
        ->get('/api/admin/users')
        ->assertForbidden();
});

test('admin api is available for admins', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->get('/api/admin/users')
        ->assertOk();
});

test('client cannot start chat with unapproved nutritionist', function () {
    $client = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);
    $nutritionist = User::factory()->create([
        'role' => User::ROLE_NUTRITIONIST,
    ]);

    $this->actingAs($client)
        ->postJson('/api/messages/conversations', ['participant_id' => $nutritionist->id])
        ->assertForbidden();
});

test('client can start chat with approved nutritionist', function () {
    $client = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);
    $nutritionist = User::factory()->create([
        'role' => User::ROLE_NUTRITIONIST,
        'verified' => true,
    ]);

    ProfessionalVerification::factory()->create([
        'user_id' => $nutritionist->id,
        'role' => User::ROLE_NUTRITIONIST,
        'review_status' => 'approved',
    ]);

    $this->actingAs($client)
        ->postJson('/api/messages/conversations', ['participant_id' => $nutritionist->id])
        ->assertCreated();
});
