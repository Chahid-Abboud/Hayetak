<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

test('restore users from sql dump recreates missing users and preserves profile fields', function () {
    $existing = User::factory()->create([
        'username' => 'restored_user',
        'email' => 'existing@example.com',
    ]);

    $dumpPath = storage_path('framework/testing/restore-users-test.sql');

    File::ensureDirectoryExists(dirname($dumpPath));
    File::put($dumpPath, <<<SQL
INSERT INTO "public"."users" ("id", "name", "email", "email_verified_at", "password", "remember_token", "created_at", "updated_at", "two_factor_secret", "two_factor_recovery_codes", "two_factor_confirmed_at", "first_name", "last_name", "username", "gender", "age", "height_cm", "weight_kg", "has_medical_history", "medical_history", "dietary_goal", "fitness_goal", "diet_name", "allergies", "activity_level", "workout_days_per_week", "workout_location", "tried_diet_before", "diet_failure_reasons", "diet_failure_other", "role", "verified", "status", "deleted_at", "professional_bio", "specialties", "city", "contact_display", "profile_lat", "profile_lng", "availability_text") VALUES (44, 'Restored User', 'restored@example.com', NULL, '$2y$12\$exampleRestoredHash', NULL, '2026-04-10 08:30:00', '2026-04-19 11:45:00', NULL, NULL, NULL, 'Restored', 'User', 'restored_user', 'female', 31, 168, 64.5, true, 'asthma', 'maintenance', 'strength', 'Mediterranean', '["Peanuts","Sesame"]', 'Moderately Active', 4, 'gym', true, '["Too restrictive","Social/lifestyle conflicts"]', NULL, 'client', false, 'active', NULL, NULL, NULL, 'Beirut', 'WhatsApp preferred', NULL, NULL, NULL);
SQL);

    $this->artisan('users:restore-from-sql-dump', [
        'path' => $dumpPath,
    ])->assertExitCode(0);

    $restored = User::query()->where('email', 'restored@example.com')->first();

    expect($restored)->not->toBeNull()
        ->and($restored->id)->not->toBe($existing->id)
        ->and($restored->first_name)->toBe('Restored')
        ->and($restored->last_name)->toBe('User')
        ->and($restored->username)->toBe('restored_user_r1')
        ->and($restored->gender)->toBe('female')
        ->and($restored->age)->toBe(31)
        ->and($restored->height_cm)->toBe(168)
        ->and((string) $restored->weight_kg)->toBe('64.50')
        ->and($restored->medical_history)->toBe('asthma')
        ->and($restored->dietary_goal)->toBe('maintenance')
        ->and($restored->fitness_goal)->toBe('strength')
        ->and($restored->diet_name)->toBe('Mediterranean')
        ->and($restored->allergies)->toBe(['Peanuts', 'Sesame'])
        ->and($restored->diet_failure_reasons)->toBe(['Too restrictive', 'Social/lifestyle conflicts'])
        ->and($restored->city)->toBe('Beirut')
        ->and($restored->role)->toBe(User::ROLE_CLIENT)
        ->and($restored->verified)->toBeFalse();
});
