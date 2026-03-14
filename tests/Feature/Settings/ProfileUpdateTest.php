<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->first_name)->toBe('Test');
    expect($user->last_name)->toBe('User');
    expect($user->email_verified_at)->not->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    $this->assertSoftDeleted('users', ['id' => $user->id]);
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('height and weight measurements can be saved from the profile page', function () {
    $user = User::factory()->create([
        'height_cm' => 178,
        'weight_kg' => 80,
    ]);

    $date = '2026-03-14';

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.measurements'), [
            'date' => $date,
            'type' => 'weight',
            'value' => 78.4,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.measurements'), [
            'date' => $date,
            'type' => 'height',
            'value' => 181,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect(DB::table('measurements')
        ->where('user_id', $user->id)
        ->where('measured_at', $date)
        ->first())
        ->not->toBeNull();

    $row = DB::table('measurements')
        ->where('user_id', $user->id)
        ->where('measured_at', $date)
        ->first();

    expect((float) $row->weight_kg)->toBe(78.4)
        ->and((int) $row->height_cm)->toBe(181)
        ->and((int) $user->fresh()->height_cm)->toBe(181)
        ->and((float) $user->fresh()->weight_kg)->toBe(78.4);
});
