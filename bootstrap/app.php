<?php

use App\Http\Middleware\AiRequestRateLimit;
use App\Http\Middleware\EnsureTwoFactorEnabled;
use App\Http\Middleware\EnsureVerifiedProfessional;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests; // ⬅️ add this
use App\Http\Middleware\RequireRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders([
        App\Providers\FortifyServiceProvider::class, // <— add this
    ])
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // ⬇️ keep your existing web stack
        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // ⬇️ add an alias you can use on route groups
        $middleware->alias([
            '2fa.enforced' => EnsureTwoFactorEnabled::class,
            'professional.verified' => EnsureVerifiedProfessional::class,
            'role' => RequireRole::class,
            'ai.rate_limit' => AiRequestRateLimit::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (TokenMismatchException $exception, Request $request) {
            $details = [
                'code' => 'CSRF_TOKEN_MISMATCH',
                'hint' => 'Session expired, CSRF token mismatch, or stale browser tab.',
                'path' => $request->path(),
                'method' => $request->method(),
            ];

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Your session expired or your security token is no longer valid. Please refresh and retry.',
                    'error' => $details,
                ], 419);
            }

            if ($request->header('X-Inertia')) {
                return Inertia::render('errors/http-error', [
                    'status' => 419,
                    'title' => 'Session Expired (419)',
                    'message' => 'Your session timed out or the CSRF token changed.',
                    'details' => $details,
                    'showDetails' => (bool) config('app.debug')
                        && (string) ($request->user()?->role ?? '') === 'admin',
                ])->toResponse($request)->setStatusCode(419);
            }

            return response()->view('errors.419', ['details' => $details], 419);
        });
    })->create();
