<?php

use App\Models\ProfessionalClientAssignment;
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

test('client cannot start chat with unassigned nutritionist', function () {
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

test('client can start chat with assigned nutritionist', function () {
    $client = User::factory()->create([
        'role' => User::ROLE_CLIENT,
    ]);
    $nutritionist = User::factory()->create([
        'role' => User::ROLE_NUTRITIONIST,
    ]);

    ProfessionalClientAssignment::query()->create([
        'professional_id' => $nutritionist->id,
        'client_id' => $client->id,
        'professional_role' => User::ROLE_NUTRITIONIST,
        'assigned_by' => $nutritionist->id,
    ]);

    $this->actingAs($client)
        ->postJson('/api/messages/conversations', ['participant_id' => $nutritionist->id])
        ->assertCreated();
});

