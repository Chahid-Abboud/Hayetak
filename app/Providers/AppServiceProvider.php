<?php

namespace App\Providers;

use App\Mail\TwoFactorRecoveryCodesMail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Events\RecoveryCodesGenerated;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(RecoveryCodesGenerated::class, function (RecoveryCodesGenerated $event): void {
            $user = $event->user;

            if (! $user || ! method_exists($user, 'hasVerifiedEmail') || ! $user->hasVerifiedEmail()) {
                return;
            }

            $codes = method_exists($user, 'recoveryCodes') ? $user->recoveryCodes() : [];
            if (! is_array($codes) || count($codes) === 0) {
                return;
            }

            Mail::to($user->email)->send(new TwoFactorRecoveryCodesMail($user->name ?? 'User', $codes));
        });
    }
}
