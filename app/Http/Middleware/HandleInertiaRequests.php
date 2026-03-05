<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $u = $request->user();

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],

            // ✅ Share a SAFE, explicit shape for the signed-in user
            'auth' => [
                'user' => $u ? [
                    'id' => $u->id,
                    'email' => $u->email,
                    'name' => $u->name ?? null,
                    'first_name' => $u->first_name ?? null,
                    'last_name' => $u->last_name ?? null,
                    'username' => $u->username ?? null,
                    'gender' => $u->gender ?? null,
                    'age' => $u->age ?? null,
                    'height_cm' => $u->height_cm ?? null,
                    'weight_kg' => $u->weight_kg ?? null,
                    'role' => $u->role ?? 'client',
                    'verified' => (bool) ($u->verified ?? false),
                    'status' => $u->status ?? null,
                    // Two-factor state (optional, helpful for UI badges)
                    'two_factor_enabled' => (bool) ($u->two_factor_secret ?? false),
                ] : null,
            ],

            // Common UI state
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            // ✅ Flash messages (lazy so they aren’t serialized unless accessed)
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ]);
    }
}
