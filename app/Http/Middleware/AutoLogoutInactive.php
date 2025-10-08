<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AutoLogoutInactive
{
    // 15 minutes in seconds
    private int $timeout = 15 * 60;

    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $last = $request->session()->get('last_activity_time');

            if ($last && (time() - $last) > $this->timeout) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')
                    ->with('status', 'Your session expired due to inactivity.');
            }

            $request->session()->put('last_activity_time', time());
        }

        return $next($request);
    }
}
