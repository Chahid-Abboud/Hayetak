<?php

use App\Models\User;

test('unverified professionals see the custom pending verification 403 page', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_TRAINER,
        'verified' => false,
    ]);

    $this->actingAs($user)
        ->get('/api/trainer-workout-plans')
        ->assertForbidden()
        ->assertSee('Pending Account Verification')
        ->assertSee('You cannot take appointments or talk to clients until verified, but you can still explore the rest of Hayetak as a client.');
});
