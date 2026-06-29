<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageModeration;
use App\Models\User;
use Illuminate\Support\Carbon;

class MessageModerationService
{
    public function moderate(Conversation $conversation, User $sender, string $body): array
    {
        $normalized = mb_strtolower(trim($body));

        $categories = [];
        $matchedTerms = [];

        foreach ($this->ruleSets() as $category => $terms) {
            $hits = [];

            foreach ($terms as $term) {
                if (str_contains($normalized, $term)) {
                    $hits[] = $term;
                }
            }

            if ($hits !== []) {
                $categories[] = $category;
                $matchedTerms[$category] = $hits;
            }
        }

        $repetition = $this->repetitionSignals($conversation, $sender, $normalized);
        $attemptCount = (int) ($repetition['same_body_count'] ?? 0) + 1;
        if ($attemptCount >= ($repetition['hard_block_threshold'] ?? PHP_INT_MAX)) {
            $categories[] = 'spam_abuse';
            $matchedTerms['spam_abuse'] = ['repeated_same_message'];
        } elseif ($attemptCount > ($repetition['escalate_threshold'] ?? PHP_INT_MAX)) {
            $categories[] = 'spam_repetition';
            $matchedTerms['spam_repetition'] = ['repeated_same_message'];
        }

        [$decision, $severity, $reason] = $this->resolveDecision($categories);

        return [
            'decision' => $decision,
            'severity' => $severity,
            'categories' => array_values($categories),
            'matched_terms' => $matchedTerms,
            'sanitized_body' => in_array($decision, ['allow', 'allow_flagged', 'escalate'], true) ? $body : null,
            'reason' => $reason,
            'provider' => (string) config('ai.messaging.moderation.provider', 'local_rules'),
            'should_deliver' => in_array($decision, ['allow', 'allow_flagged', 'escalate'], true),
            'should_escalate' => $decision === 'escalate',
            'signals' => $repetition,
        ];
    }

    public function recordAttempt(
        Conversation $conversation,
        User $sender,
        string $body,
        array $result,
        ?Message $message = null,
    ): MessageModeration {
        return MessageModeration::query()->create([
            'message_id' => $message?->id,
            'conversation_id' => $conversation->id,
            'sender_id' => $sender->id,
            'decision' => $result['decision'],
            'severity' => $result['severity'] ?? 'low',
            'categories' => $result['categories'] ?? [],
            'matched_terms' => $result['matched_terms'] ?? [],
            'original_body' => $body,
            'sanitized_body' => $result['sanitized_body'] ?? null,
            'reason' => $result['reason'] ?? null,
            'escalated_at' => ($result['should_escalate'] ?? false) ? now() : null,
            'provider' => $result['provider'] ?? 'local_rules',
        ]);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function ruleSets(): array
    {
        return (array) config('ai.messaging.moderation.rule_sets', []);
    }

    /**
     * @param  array<int, string>  $categories
     */
    private function resolveDecision(array $categories): array
    {
        $hardBlock = array_map(
            static fn ($value): string => (string) $value,
            (array) config('ai.messaging.moderation.hard_block_categories', []),
        );
        $escalate = array_map(
            static fn ($value): string => (string) $value,
            (array) config('ai.messaging.moderation.escalate_categories', []),
        );
        $allowFlag = array_map(
            static fn ($value): string => (string) $value,
            (array) config('ai.messaging.moderation.allow_flag_categories', []),
        );

        foreach ($categories as $category) {
            if (in_array($category, $hardBlock, true)) {
                return ['hard_block', 'high', 'This message appears to contain unsafe or abusive content and was not sent.'];
            }
        }

        foreach ($categories as $category) {
            if (in_array($category, $escalate, true)) {
                return ['escalate', 'medium', 'This message was delivered, but it was flagged for follow-up because it may involve a sensitive safety or privacy issue.'];
            }
        }

        foreach ($categories as $category) {
            if (in_array($category, $allowFlag, true)) {
                return ['allow_flagged', 'low', 'This message was delivered and flagged for moderation visibility.'];
            }
        }

        return ['allow', 'low', null];
    }

    private function repetitionSignals(Conversation $conversation, User $sender, string $normalizedBody): array
    {
        $windowMinutes = max(1, (int) config('ai.messaging.moderation.repetition.window_minutes', 10));
        $escalateThreshold = max(1, (int) config('ai.messaging.moderation.repetition.escalate_after_same_body_count', 2));
        $hardBlockThreshold = max($escalateThreshold + 1, (int) config('ai.messaging.moderation.repetition.hard_block_after_same_body_count', 4));
        $since = Carbon::now()->subMinutes($windowMinutes);

        $sameBodyCount = MessageModeration::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', $sender->id)
            ->where('created_at', '>=', $since)
            ->get(['original_body'])
            ->filter(fn (MessageModeration $row): bool => mb_strtolower(trim((string) $row->original_body)) === $normalizedBody)
            ->count();

        return [
            'window_minutes' => $windowMinutes,
            'same_body_count' => $sameBodyCount,
            'attempt_count' => $sameBodyCount + 1,
            'escalate_threshold' => $escalateThreshold,
            'hard_block_threshold' => $hardBlockThreshold,
        ];
    }
}
