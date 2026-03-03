<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $conversation->participants()->where('users.id', $user->id)->exists();
    }

    public function message(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }
}

