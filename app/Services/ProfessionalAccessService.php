<?php

namespace App\Services;

use App\Models\ProfessionalClientAssignment;
use App\Models\ProfessionalVerification;
use App\Models\User;

class ProfessionalAccessService
{
    public function isAssigned(int $professionalId, int $clientId, string $professionalRole): bool
    {
        return ProfessionalClientAssignment::query()
            ->where('professional_id', $professionalId)
            ->where('client_id', $clientId)
            ->where('professional_role', $professionalRole)
            ->exists();
    }

    public function canInteract(User $actor, User $other): bool
    {
        if ($actor->isAdmin()) {
            return true;
        }

        if ($actor->id === $other->id) {
            return true;
        }

        if ($actor->hasRole(User::ROLE_CLIENT) && $this->isApprovedProfessional($other)) {
            return true;
        }

        if ($other->hasRole(User::ROLE_CLIENT) && $this->isApprovedProfessional($actor)) {
            return true;
        }

        if ($actor->hasRole(User::ROLE_CLIENT) && $other->hasRole(User::ROLE_NUTRITIONIST)) {
            return $this->isAssigned($other->id, $actor->id, User::ROLE_NUTRITIONIST);
        }

        if ($actor->hasRole(User::ROLE_CLIENT) && $other->hasRole(User::ROLE_TRAINER)) {
            return $this->isAssigned($other->id, $actor->id, User::ROLE_TRAINER);
        }

        if ($actor->hasRole(User::ROLE_NUTRITIONIST) && $other->hasRole(User::ROLE_CLIENT)) {
            return $this->isAssigned($actor->id, $other->id, User::ROLE_NUTRITIONIST);
        }

        if ($actor->hasRole(User::ROLE_TRAINER) && $other->hasRole(User::ROLE_CLIENT)) {
            return $this->isAssigned($actor->id, $other->id, User::ROLE_TRAINER);
        }

        return false;
    }

    private function isApprovedProfessional(User $user): bool
    {
        if (! $user->verified || ! $user->hasRole(User::ROLE_NUTRITIONIST, User::ROLE_TRAINER)) {
            return false;
        }

        return ProfessionalVerification::query()
            ->where('user_id', $user->id)
            ->where('role', $user->role)
            ->where('review_status', 'approved')
            ->exists();
    }
}
