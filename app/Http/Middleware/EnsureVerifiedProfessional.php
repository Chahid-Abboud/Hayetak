<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class EnsureVerifiedProfessional
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($user->hasRole(User::ROLE_TRAINER, User::ROLE_NUTRITIONIST) && ! $user->verified) {
            abort(403, 'Pending account verification. You cannot take appointments or talk to clients until verified, but you can still explore the rest of Hayetak as a client.');
        }

        return $next($request);
    }
}
