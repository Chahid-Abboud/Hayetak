<?php

namespace App\Services\Ai;

use App\Jobs\Ai\GeneratePlansForUser;
use App\Models\Ai\AiRequest;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutPlan;

class AutoPlanGenerationService
{
    public function startIfNeeded(User $user, string $reason): bool
    {
        if (! $this->shouldStart($user)) {
            return false;
        }

        $defaultDays = (int) config('ai.planner.default_horizon_days', 14);
        if ($defaultDays <= 14) {
            $days = 14;
        } elseif ($defaultDays <= 21) {
            $days = 21;
        } else {
            $days = 28;
        }

        if (app()->runningUnitTests()) {
            GeneratePlansForUser::dispatch(
                userId: $user->id,
                days: $days,
                regenerate: true,
                reason: $reason,
                generateDiet: true,
                generateWorkout: true,
            );
        } else {
            GeneratePlansForUser::dispatchAfterResponse(
                userId: $user->id,
                days: $days,
                regenerate: true,
                reason: $reason,
                generateDiet: true,
                generateWorkout: true,
            );
        }

        return true;
    }

    private function shouldStart(User $user): bool
    {
        if ($user->role !== User::ROLE_CLIENT) {
            return false;
        }

        $hasActiveAiNutritionPlan = NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->exists();

        $hasActiveAiWorkoutPlan = WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->exists();

        if ($hasActiveAiNutritionPlan && $hasActiveAiWorkoutPlan) {
            return false;
        }

        $hasPendingPlannerRequest = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->whereIn('status', ['queued', 'running'])
            ->exists();

        return ! $hasPendingPlannerRequest;
    }
}
