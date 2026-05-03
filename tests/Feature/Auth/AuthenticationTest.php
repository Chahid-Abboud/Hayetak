<?php

use App\Jobs\Ai\GeneratePlansForUser;
use App\Models\AiRequest;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutPlan;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    Bus::fake();
});

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertStatus(200)
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('csrf_token', session()->token())
        );
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->withoutTwoFactor()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
    Bus::assertDispatched(
        GeneratePlansForUser::class,
        fn (GeneratePlansForUser $job) => $job->userId === $user->id && $job->reason === 'login_missing_plan_autostart',
    );
});

test('login does not auto-dispatch planner generation when active ai plans already exist', function () {
    $user = User::factory()->withoutTwoFactor()->create([
        'role' => User::ROLE_CLIENT,
    ]);

    $request = AiRequest::query()->create([
        'user_id' => $user->id,
        'type' => 'plan_generator',
        'status' => 'completed',
        'input_context_json' => [],
        'output_json' => [],
        'provider' => 'ollama',
        'model' => 'llama3.1:8b',
        'prompt_version' => 'hayetak_planner_v2',
        'schema_version' => 'hayetak_plan_v2',
        'usage_json' => [],
    ]);

    NutritionPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Nutrition',
        'is_active' => true,
        'duration_days' => 7,
        'meta' => [],
    ]);

    WorkoutPlan::query()->create([
        'user_id' => $user->id,
        'ai_request_id' => $request->id,
        'name' => 'AI Workout',
        'is_active' => true,
        'is_public' => false,
        'duration_days' => 7,
        'meta' => [],
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
    Bus::assertNotDispatched(GeneratePlansForUser::class);
});

test('login ignores api intended urls and redirects to dashboard', function () {
    $user = User::factory()->withoutTwoFactor()->create();

    $response = $this
        ->withSession(['url.intended' => '/api/notifications'])
        ->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('guest api requests return json unauthenticated instead of redirecting to login', function () {
    $response = $this->get('/api/notifications');

    $response
        ->assertStatus(401)
        ->assertJson(['message' => 'Unauthenticated.']);
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    if (! Features::canManageTwoFactorAuthentication()) {
        $this->markTestSkipped('Two-factor authentication is not enabled.');
    }

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->create();

    $user->forceFill([
        'two_factor_secret' => encrypt('test-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['code1', 'code2'])),
        'two_factor_confirmed_at' => now(),
    ])->save();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(implode('|', [$user->email, '127.0.0.1']), amount: 10);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');

    $errors = session('errors');

    $this->assertStringContainsString('Too many login attempts', $errors->first('email'));
});
