<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class TwoFactorAuthenticationController extends Controller implements HasMiddleware
{
    /**
     * Apply password confirmation (if enabled in Fortify) to the show page.
     */
    public static function middleware(): array
    {
        return Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
            ? [new Middleware('password.confirm', only: ['show'])]
            : [];
    }

    /**
     * Show the user's two-factor settings screen.
     *
     * Props sent to Inertia:
     * - twoFactorEnabled: whether user already enabled 2FA
     * - requiresConfirmation: whether Fortify is configured to require TOTP confirmation
     * - mustEnable: session flag we set after registration to force setup UI
     */
    public function show(TwoFactorAuthenticationRequest $request): Response
    {
        // Keep starter-pack behavior (ensures the state & password conf if needed)
        $request->ensureStateIsValid();

        return Inertia::render('settings/two-factor', [
            'twoFactorEnabled'     => $request->user()->hasEnabledTwoFactorAuthentication(),
            'requiresConfirmation' => Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm'),
            'mustEnable'           => (bool) $request->session()->pull('must_enable_2fa', false),
        ]);
    }
}
