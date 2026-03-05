<?php

/**
 * routes/settings.php
 *
 * Purpose:
 * All authenticated “Settings” pages live here (Profile, Password, Appearance, Two-Factor).
 * Loaded from routes/web.php and protected by the `auth` middleware.
 *
 * Notes:
 * - Two-factor route is named `two-factor.show` so redirects like
 *   `return redirect()->route('two-factor.show')` work after register/login.
 */

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    /** Redirect /settings -> /settings/profile */
    Route::redirect('settings', '/settings/profile');

    /** ---------------- Profile page (Inertia view) ---------------- */
    Route::get('settings/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    /** ---- Actions the React page calls ---- */

    // Save the “Basic Info” card
    Route::post('settings/profile/update', [ProfileController::class, 'updateBasics'])
        ->name('profile.updateBasics');

    // Back-compat: if anything PATCHes /settings/profile, handle with the same method
    Route::patch('settings/profile', [ProfileController::class, 'updateBasics'])
        ->name('profile.update');

    // Save the “Preferences” card
    Route::post('settings/profile/prefs', [ProfileController::class, 'updatePrefs'])
        ->name('profile.updatePrefs');

    // Add a measurement (weight/height)
    Route::post('settings/profile/measurements', [ProfileController::class, 'storeMeasurement'])
        ->name('profile.measurements');

    // Optional: delete account
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');

    /** ---------------- Password settings ---------------- */
    Route::get('settings/password', [PasswordController::class, 'edit'])
        ->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    /** ---------------- Appearance (simple Inertia view) ---------------- */
    Route::get('settings/appearance', fn () => Inertia::render('settings/appearance'))
        ->name('appearance.edit');

    /** ---------------- Two-Factor Authentication ----------------
     * IMPORTANT: Keep the name `two-factor.show`.
     */
    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->middleware('verified')
        ->name('two-factor.show');
});
