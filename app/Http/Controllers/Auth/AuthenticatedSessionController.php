<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        // Starter pack uses a custom validator instead of ->authenticate()
        $user = $request->validateCredentials();

        // If 2FA feature is on and the user has it enabled → go to the challenge screen
        if (Features::enabled(Features::twoFactorAuthentication()) && $user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put([
                'login.id' => $user->getKey(),
                'login.remember' => $request->boolean('remember'),
            ]);

            return to_route('two-factor.login');
        }

        // Otherwise, log them in…
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        // …and FORCE them to enable 2FA before accessing the app
        if (Features::enabled(Features::twoFactorAuthentication())) {
            // 👇 FIXED: use the actual route name
            return to_route('two-factor.show')->with('must_enable_2fa', true);
        }

        // Fallback if 2FA feature is disabled globally
        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

       return redirect()->intended(route('dashboard'));

    }
}
