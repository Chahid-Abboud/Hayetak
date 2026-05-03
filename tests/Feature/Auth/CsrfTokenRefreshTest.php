<?php

test('csrf token refresh endpoint returns the active session token', function () {
    $response = $this->getJson(route('csrf-token'));

    $response
        ->assertOk()
        ->assertJson([
            'csrf_token' => session()->token(),
        ]);
});
