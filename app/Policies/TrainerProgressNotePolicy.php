<?php

namespace App\Policies;

use App\Models\TrainerProgressNote;
use App\Models\User;

class TrainerProgressNotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_TRAINER, User::ROLE_CLIENT);
    }

    public function view(User $user, TrainerProgressNote $note): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $note->client_id === $user->id || $note->trainer_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(User::ROLE_ADMIN, User::ROLE_TRAINER);
    }

    public function update(User $user, TrainerProgressNote $note): bool
    {
        return $user->isAdmin() || $note->trainer_id === $user->id;
    }

    public function delete(User $user, TrainerProgressNote $note): bool
    {
        return $user->isAdmin() || $note->trainer_id === $user->id;
    }
}
