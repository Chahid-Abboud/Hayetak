<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppNotificationService
{
    public function planGenerated(
        User $user,
        bool $dietGenerated,
        bool $workoutGenerated,
        int $days
    ): void {
        if ($dietGenerated && $workoutGenerated) {
            $title = "Diet and workout plans generated";
            $body = "Your {$days}-day diet and workout plans are ready. Open the planner to review them.";
        } elseif ($dietGenerated) {
            $title = "Diet plan generated";
            $body = "Your {$days}-day diet plan is ready. Open the planner to review it.";
        } elseif ($workoutGenerated) {
            $title = "Workout plan generated";
            $body = "Your {$days}-day workout plan is ready. Open the planner to review it.";
        } else {
            return;
        }

        Notification::query()->create([
            "target_user_id" => $user->id,
            "created_by" => $user->id,
            "title" => $title,
            "body" => $body,
        ]);
    }

    public function chatbotResponded(User $user): void
    {
        Notification::query()->create([
            "target_user_id" => $user->id,
            "created_by" => $user->id,
            "title" => "AI Coach replied",
            "body" => "Your AI Coach has responded to your message. Open the coach page to continue the conversation.",
        ]);
    }

    public function appointmentRequested(
        User $client,
        User $professional,
        string $scheduledAt,
        ?string $notes = null,
    ): void {
        Notification::query()->create([
            "target_user_id" => $professional->id,
            "created_by" => $client->id,
            "title" => "New appointment request",
            "body" => "{$client->display_name} has requested an appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A"),
        ]);

        $messageBody = "Appointment requested for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
        if (is_string($notes) && trim($notes) !== '') {
            $messageBody .= "\nNote: " . trim($notes);
        }

        DB::transaction(function () use ($client, $professional, $messageBody) {
            $conversation = $this->ensureConversation($client, $professional, $client->id);
            $conversation->touch();

            Message::query()->create([
                "conversation_id" => $conversation->id,
                "sender_id" => $client->id,
                "body" => $messageBody,
            ]);
        });
    }

    public function appointmentStatusChanged(
        User $actor,
        User $client,
        User $professional,
        string $status,
        string $scheduledAt
    ): void {
        $isProfessional = (int) $actor->id === (int) $professional->id;
        $targetUser = $client;
        $fromName = $professional->display_name;

        if ($status === "accepted") {
            $title = "Appointment confirmed";
            $body = "{$fromName} has confirmed your appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
            $messageBody = "Appointment confirmed for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
        } elseif ($status === "declined") {
            $title = "Appointment declined";
            $body = "{$fromName} has declined your appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
            $messageBody = "Appointment declined for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
        } elseif ($status === "cancelled") {
            if ($isProfessional) {
                $title = "Appointment cancelled by professional";
                $body = "{$fromName} has cancelled your appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
                $messageBody = "Appointment cancelled by professional for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
            } else {
                $title = "Appointment cancelled";
                $body = "You cancelled your appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
                $messageBody = "Appointment cancelled for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
                $targetUser = $professional;
            }
        } elseif ($status === "completed") {
            $title = "Appointment completed";
            $body = "Your appointment on " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A") . " has been marked as completed.";
            $messageBody = "Appointment completed for " . \Carbon\Carbon::parse($scheduledAt)->format("M j, Y g:i A");
        } else {
            $title = "Appointment updated";
            $body = "Your appointment status has been updated to: {$status}";
            $messageBody = "Appointment status changed to: {$status}";
        }

        Notification::query()->create([
            "target_user_id" => $targetUser->id,
            "created_by" => $actor->id,
            "title" => $title,
            "body" => $body,
        ]);

        DB::transaction(function () use ($client, $professional, $messageBody, $actor) {
            $conversation = $this->ensureConversation($client, $professional, $actor->id);
            $conversation->touch();

            Message::query()->create([
                "conversation_id" => $conversation->id,
                "sender_id" => $actor->id,
                "body" => $messageBody,
            ]);
        });
    }

    public function checkupReminder(
        User $professional,
        User $client,
        string $notes = ""
    ): void {
        $title = "Check-up reminder from " . $professional->display_name;
        $body = $notes ?: "Your " . $professional->role . " has requested a check-up. Please schedule an appointment.";

        Notification::query()->create([
            "target_user_id" => $client->id,
            "created_by" => $professional->id,
            "title" => $title,
            "body" => $body,
        ]);

        DB::transaction(function () use ($client, $professional, $notes) {
            $conversation = $this->ensureConversation($client, $professional, $professional->id);
            $conversation->touch();

            $messageBody = $notes ?: "Your " . $professional->role . " has requested a check-up. Please schedule an appointment.";

            Message::query()->create([
                "conversation_id" => $conversation->id,
                "sender_id" => $professional->id,
                "body" => $messageBody,
            ]);
        });
    }

    public function dietPlanShared(User $professional, User $client, string $title, ?string $notes = null, bool $updated = false): void
    {
        $action = $updated ? 'updated' : 'shared';
        $notificationTitle = $updated ? 'Diet plan updated' : 'New diet plan';
        $notificationBody = "{$professional->display_name} has {$action} your diet plan \"{$title}\".";
        $messageBody = "I {$action} your diet plan: {$title}.";

        if (is_string($notes) && trim($notes) !== '') {
            $messageBody .= "\nNote: " . Str::limit(trim($notes), 240);
        }

        $this->notifyAndMessagePeer($professional, $client, $notificationTitle, $notificationBody, $messageBody);
    }

    public function workoutPlanShared(User $professional, User $client, string $title, ?string $notes = null, bool $updated = false): void
    {
        $action = $updated ? 'updated' : 'shared';
        $notificationTitle = $updated ? 'Workout program updated' : 'New workout program';
        $notificationBody = "{$professional->display_name} has {$action} your workout program \"{$title}\".";
        $messageBody = "I {$action} your workout program: {$title}.";

        if (is_string($notes) && trim($notes) !== '') {
            $messageBody .= "\nNote: " . Str::limit(trim($notes), 240);
        }

        $this->notifyAndMessagePeer($professional, $client, $notificationTitle, $notificationBody, $messageBody);
    }

    private function notifyAndMessagePeer(
        User $actor,
        User $target,
        string $title,
        string $body,
        string $messageBody,
    ): void {
        Notification::query()->create([
            'target_user_id' => $target->id,
            'created_by' => $actor->id,
            'title' => $title,
            'body' => $body,
        ]);

        DB::transaction(function () use ($actor, $target, $messageBody) {
            $conversation = $this->ensureConversation($actor, $target, $actor->id);
            $conversation->touch();

            Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $actor->id,
                'body' => $messageBody,
            ]);
        });
    }

    private function ensureConversation(User $left, User $right, int $createdBy): Conversation
    {
        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $left->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $right->id))
            ->withCount('participants')
            ->get()
            ->first(fn ($row) => (int) $row->participants_count === 2);

        if ($conversation) {
            return $conversation;
        }

        $conversation = Conversation::query()->create([
            'created_by' => $createdBy,
        ]);
        $conversation->participants()->attach([$left->id, $right->id]);

        return $conversation;
    }
}
