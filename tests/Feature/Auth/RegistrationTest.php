<?php

use App\Jobs\Ai\GeneratePlansForUser;
use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertStatus(200);
});

test('new users can register', function () {
    Bus::fake([GeneratePlansForUser::class]);
    Notification::fake();

    $response = $this->post(route('register.store'), [
        'first_name' => 'Test',
        'last_name' => 'User',
        'gender' => 'male',
        'age' => 25,
        'height_cm' => 175,
        'weight_kg' => 75,
        'account_type' => User::ROLE_CLIENT,
        'email' => 'test@gmail.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('verification.notice', absolute: false));
    Notification::assertSentTo(
        User::query()->where('email', 'test@gmail.com')->firstOrFail(),
        VerifyEmail::class,
    );
    Bus::assertDispatched(
        GeneratePlansForUser::class,
        fn (GeneratePlansForUser $job) => $job->reason === 'signup_initial_plan',
    );
});

test('professional users can register with verification documents', function () {
    Bus::fake([GeneratePlansForUser::class]);
    Storage::fake('private');

    $response = $this->post(route('register.store'), [
        'first_name' => 'Lina',
        'last_name' => 'Trainer',
        'gender' => 'female',
        'age' => 31,
        'height_cm' => 168,
        'weight_kg' => 61,
        'account_type' => User::ROLE_TRAINER,
        'email' => 'trainer@gmail.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'verification_full_legal_name' => 'Lina Trainer',
        'verification_license_number' => 'TR-12345',
        'verification_authority' => 'National Fitness Board',
        'verification_country_state' => 'Lebanon / Beirut',
        'verification_expiry_date' => now()->addYear()->toDateString(),
        'verification_documents' => [
            UploadedFile::fake()->create('license.pdf', 200, 'application/pdf'),
        ],
    ]);

    $response->assertRedirect(route('verification.notice', absolute: false));
    $this->assertAuthenticated();

    $user = User::query()->where('email', 'trainer@gmail.com')->firstOrFail();
    $verification = ProfessionalVerification::query()
        ->where('user_id', $user->id)
        ->firstOrFail();

    expect($user->role)->toBe(User::ROLE_TRAINER)
        ->and($user->verified)->toBeFalse()
        ->and($verification->role)->toBe(User::ROLE_TRAINER)
        ->and($verification->review_status)->toBe('pending')
        ->and($verification->documents)->toHaveCount(1);

    Storage::disk('private')->assertExists($verification->documents[0]);
    Bus::assertNotDispatched(GeneratePlansForUser::class);
});
