<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class AppNotificationService
{
    public function planGenerated(
        User $user,
        bool $dietGenerated,
        bool $workoutGenerated,
        int $days
    ): void {
        if ($dietGenerated && $workoutGenerated) {
            $title = 'Your diet and workout plans are ready';
            $body = "Your {$days}-day diet and workout plans have been generated. Open the planner to review them.";
        } elseif ($dietGenerated) {
            $title = 'Your diet plan is ready';
            $body = "Your {$days}-day diet plan has been generated. Open the planner to review it.";
        } elseif ($workoutGenerated) {
            $title = 'Your workout plan is ready';
            $body = "Your {$days}-day workout plan has been generated. Open the planner to review it.";
        } else {
            return;
        }

        Notification::query()->create([
            'target_user_id' => $user->id,
            'created_by' => $user->id,
            'title' => $title,
            'body' => $body,
        ]);
    }

    public function chatbotResponded(User $user): void
    {
        Notification::query()->create([
            'target_user_id' => $user->id,
            'created_by' => $user->id,
            'title' => 'AI Coach replied',
            'body' => 'Your AI Coach has responded to your message. Open the coach page to continue the conversation.',
        ]);
    }
}