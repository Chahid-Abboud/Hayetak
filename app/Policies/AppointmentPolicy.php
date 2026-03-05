<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;

class AppointmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_NUTRITIONIST, User::ROLE_TRAINER, User::ROLE_CLIENT);
    }

    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $appointment->client_id === $user->id || $appointment->professional_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $this->view($user, $appointment);
    }
}
