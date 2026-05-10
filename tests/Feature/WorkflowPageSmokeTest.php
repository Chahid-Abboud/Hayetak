<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('nearby page renders for authenticated clients', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);

    $this->actingAs($client)
        ->get(route('nearby'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Places'));
});

test('appointments page renders for authenticated users', function () {
    $client = User::factory()->create(['role' => User::ROLE_CLIENT]);

    $this->actingAs($client)
        ->get(route('appointments.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('appointments/index'));
});
