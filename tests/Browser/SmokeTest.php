<?php

use Tests\TestCase;

use function Pest\Browser\visit;

uses(TestCase::class);

test('landing page can be rendered', function () {
    visit('/')
        ->assertSee('Nutrition & training')
        ->assertSee('Start Your Journey')
        ->assertNoConsoleLogs()
        ->assertNoJavaScriptErrors();
});

test('login page can be rendered', function () {
    visit(route('login'))
        ->assertSee('Log in to your account')
        ->assertSee('Forgot password?')
        ->assertNoConsoleLogs()
        ->assertNoJavaScriptErrors();
});

test('registration wizard can be rendered', function () {
    visit(route('register'))
        ->assertSee('Basic Information')
        ->assertSee('Create Account')
        ->assertNoConsoleLogs()
        ->assertNoJavaScriptErrors();
});
