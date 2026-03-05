<?php

namespace App\Policies;

use App\Models\TrainerWorkoutPlan;
use App\Models\User;

class TrainerWorkoutPlanPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_TRAINER, User::ROLE_CLIENT);
    }

    public function view(User $user, TrainerWorkoutPlan $plan): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $plan->client_id === $user->id || $plan->trainer_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_TRAINER);
    }

    public function update(User $user, TrainerWorkoutPlan $plan): bool
    {
        return $user->isAdmin() || $plan->trainer_id === $user->id;
    }

    public function delete(User $user, TrainerWorkoutPlan $plan): bool
    {
        return $user->isAdmin() || $plan->trainer_id === $user->id;
    }
}
