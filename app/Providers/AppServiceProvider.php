<?php

namespace App\Providers;

use App\Mail\TwoFactorRecoveryCodesMail;
use App\Models\AiPlan;
use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\DietPlan;
use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\NutritionPlan;
use App\Models\TrainerProgressNote;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use App\Models\WorkoutLog;
use App\Models\WorkoutPlan;
use App\Policies\AppointmentPolicy;
use App\Policies\ConversationPolicy;
use App\Policies\DietPlanPolicy;
use App\Policies\TrainerProgressNotePolicy;
use App\Policies\TrainerWorkoutPlanPolicy;
use App\Support\Ai\AiContextSyncDispatcher;
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

        User::saved(fn (User $user) => AiContextSyncDispatcher::dispatch($user->id));
        User::deleted(fn (User $user) => AiContextSyncDispatcher::dispatch($user->id));
        UserPref::saved(fn (UserPref $pref) => AiContextSyncDispatcher::dispatch((int) $pref->user_id));
        UserPref::deleted(fn (UserPref $pref) => AiContextSyncDispatcher::dispatch((int) $pref->user_id));
        UserDietaryRestriction::saved(fn (UserDietaryRestriction $restriction) => AiContextSyncDispatcher::dispatch((int) $restriction->user_id));
        UserDietaryRestriction::deleted(fn (UserDietaryRestriction $restriction) => AiContextSyncDispatcher::dispatch((int) $restriction->user_id));
        UserMedicalHistory::saved(fn (UserMedicalHistory $history) => AiContextSyncDispatcher::dispatch((int) $history->user_id));
        UserMedicalHistory::deleted(fn (UserMedicalHistory $history) => AiContextSyncDispatcher::dispatch((int) $history->user_id));
        Measurement::saved(fn (Measurement $measurement) => AiContextSyncDispatcher::dispatch((int) $measurement->user_id));
        Measurement::deleted(fn (Measurement $measurement) => AiContextSyncDispatcher::dispatch((int) $measurement->user_id));
        MealEntry::saved(fn (MealEntry $entry) => AiContextSyncDispatcher::dispatch((int) $entry->user_id));
        MealEntry::deleted(fn (MealEntry $entry) => AiContextSyncDispatcher::dispatch((int) $entry->user_id));
        WorkoutLog::saved(fn (WorkoutLog $log) => AiContextSyncDispatcher::dispatch((int) $log->user_id));
        WorkoutLog::deleted(fn (WorkoutLog $log) => AiContextSyncDispatcher::dispatch((int) $log->user_id));
        WorkoutPlan::saved(fn (WorkoutPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));
        WorkoutPlan::deleted(fn (WorkoutPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));
        NutritionPlan::saved(fn (NutritionPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));
        NutritionPlan::deleted(fn (NutritionPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));
        AiPlan::saved(fn (AiPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));
        AiPlan::deleted(fn (AiPlan $plan) => AiContextSyncDispatcher::dispatch((int) $plan->user_id));

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
