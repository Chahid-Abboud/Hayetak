<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class TwoFactorAuthenticationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [];
    }

    /**
     * Show the user's two-factor settings screen.
     *
     * Props sent to Inertia:
     * - twoFactorEnabled: whether user already enabled 2FA
     * - requiresConfirmation: whether Fortify is configured to require TOTP confirmation
     */
    public function show(TwoFactorAuthenticationRequest $request): Response|RedirectResponse
    {
        // Keep starter-pack behavior for the Fortify 2FA setup state.
        $request->ensureStateIsValid();

        if (
            Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
            && (time() - (int) $request->session()->get('auth.password_confirmed_at', 0)) > (int) config('auth.password_timeout', 10800)
        ) {
            return redirect()->route('password.confirm');
        }

        return Inertia::render('settings/security', [
            'twoFactorEnabled' => $request->user()->hasEnabledTwoFactorAuthentication(),
            'requiresConfirmation' => Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm'),
        ]);
    }
}
