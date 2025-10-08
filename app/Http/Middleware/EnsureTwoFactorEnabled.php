<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Fortify\Features;

class EnsureTwoFactorEnabled
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Not logged in or 2FA feature disabled → do nothing.
        if (! $user || ! Features::enabled(Features::twoFactorAuthentication())) {
            return $next($request);
        }

        // Allow these while 2FA is not yet enabled.
        if ($request->routeIs([
            // Your settings screen:
            'two-factor.show',

            // All Fortify 2FA endpoints (challenge, enable/disable, QR, codes, etc.)
            'two-factor.*',

            // If confirm-password is required for the 2FA page:
            'password.confirm', 'password.confirm.*',

            // If you use email verification anywhere:
            'verification.*',

            // Always allow logout:
            'logout',
        ])) {
            return $next($request);
        }

        // Block everything else until 2FA is enabled.
        if (! $user->hasEnabledTwoFactorAuthentication()) {
            return redirect()->route('two-factor.show')
                ->with('must_enable_2fa', true);
        }

        return $next($request);
    }
}
