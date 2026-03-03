<?php

namespace App\Policies;

use App\Models\DietPlan;
use App\Models\User;

class DietPlanPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_NUTRITIONIST, User::ROLE_CLIENT);
    }

    public function view(User $user, DietPlan $dietPlan): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $dietPlan->client_id === $user->id || $dietPlan->nutritionist_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_NUTRITIONIST);
    }

    public function update(User $user, DietPlan $dietPlan): bool
    {
        return $user->isAdmin() || $dietPlan->nutritionist_id === $user->id;
    }

    public function delete(User $user, DietPlan $dietPlan): bool
    {
        return $user->isAdmin() || $dietPlan->nutritionist_id === $user->id;
    }
}

