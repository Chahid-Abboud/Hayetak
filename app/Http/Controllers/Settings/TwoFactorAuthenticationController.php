<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
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
    public function show(TwoFactorAuthenticationRequest $request): Response
    {
        // Keep starter-pack behavior for the Fortify 2FA setup state.
        $request->ensureStateIsValid();

        return Inertia::render('settings/two-factor', [
            'twoFactorEnabled' => $request->user()->hasEnabledTwoFactorAuthentication(),
            'requiresConfirmation' => Features::optionEnabled(Features::twoFactorAuthentication(), 'confirm'),
        ]);
    }
}
