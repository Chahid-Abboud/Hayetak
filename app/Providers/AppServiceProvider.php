<?php

namespace App\Providers;

use App\Mail\TwoFactorRecoveryCodesMail;
use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\DietPlan;
use App\Models\TrainerProgressNote;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use App\Policies\AppointmentPolicy;
use App\Policies\ConversationPolicy;
use App\Policies\DietPlanPolicy;
use App\Policies\TrainerProgressNotePolicy;
use App\Policies\TrainerWorkoutPlanPolicy;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
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
        Gate::policy(DietPlan::class, DietPlanPolicy::class);
        Gate::policy(TrainerWorkoutPlan::class, TrainerWorkoutPlanPolicy::class);
        Gate::policy(TrainerProgressNote::class, TrainerProgressNotePolicy::class);
        Gate::policy(Conversation::class, ConversationPolicy::class);
        Gate::policy(Appointment::class, AppointmentPolicy::class);

        Gate::define('admin-only', fn (User $user) => $user->isAdmin());

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
