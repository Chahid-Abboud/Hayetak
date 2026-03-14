<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class WelcomeConversationService
{
    public const SYSTEM_EMAIL = 'messages-guide@hayetak.local';

    public function ensureForAllUsers(): void
    {
        $guide = $this->ensureSystemUser();

        User::query()
            ->where('id', '!=', $guide->id)
            ->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    $this->ensureForUser($user);
                }
            });
    }

    public function ensureForUser(User $user): Conversation
    {
        $guide = $this->ensureSystemUser();
        $conversation = $this->ensureOneToOneConversation($guide, $user);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $guide->id,
            'body' => $this->welcomeMessage(),
        ]);

        return $conversation;
    }

    public static function isSystemEmail(?string $email): bool
    {
        return mb_strtolower((string) $email) === self::SYSTEM_EMAIL;
    }

    private function ensureSystemUser(): User
    {
        return User::query()->firstOrCreate(
            ['email' => self::SYSTEM_EMAIL],
            [
                'name' => 'Hayetak Team',
                'first_name' => 'Hayetak',
                'last_name' => 'Team',
                'password' => Hash::make('password'),
                'role' => User::ROLE_ADMIN,
                'verified' => true,
                'status' => 'active',
                'city' => 'Beirut',
                'email_verified_at' => now(),
            ]
        );
    }

    private function ensureOneToOneConversation(User $a, User $b): Conversation
    {
        $existing = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $a->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $b->id))
            ->withCount('participants')
            ->get()
            ->first(fn ($conversation) => (int) $conversation->participants_count === 2);

        if ($existing) {
            return $existing;
        }

        $conversation = Conversation::query()->create([
            'created_by' => $a->id,
        ]);

        $conversation->participants()->attach([$a->id, $b->id]);

        return $conversation;
    }

    private function welcomeMessage(): string
    {
        return implode("\n", [
            'Welcome to Messages. I am the Hayetak Team system thread.',
            'How messaging works:',
            '1. Start a chat from Nearby to contact a listed trainer or dietitian.',
            '2. Open any thread here to review history and continue the conversation.',
            '3. Share goals, allergies, injuries, meal logs, workout logs, and equipment clearly so guidance stays relevant.',
            'Basic chat rules:',
            '- Keep one request per message when possible.',
            '- Do not share emergency or urgent medical issues here.',
            '- Be respectful and avoid spam or repeated duplicate messages.',
        ]);
    }
}
