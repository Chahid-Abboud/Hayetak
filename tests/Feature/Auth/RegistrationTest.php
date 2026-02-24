<?php

use Illuminate\Support\Facades\Queue;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertStatus(200);
});

test('new users can register', function () {
    Queue::fake();

    $response = $this->post(route('register.store'), [
        'first_name' => 'Test',
        'last_name' => 'User',
        'gender' => 'male',
        'age' => 25,
        'height_cm' => 175,
        'weight_kg' => 75,
        'email' => 'test@gmail.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('verification.notice', absolute: false));
});
