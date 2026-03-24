<?php

namespace App\Services\Ai\Chat;

class ChatIntentClassifier
{
    public function classify(string $message, array $runtimeContext = []): array
    {
        $text = mb_strtolower(trim(preg_replace('/\s+/', ' ', $message) ?? ''));
        $isMealRequest = $this->containsAny($text, [
            'meal',
            'breakfast',
            'lunch',
            'dinner',
            'snack',
            'food',
            'eat',
            'recipe',
            'cook',
            'make',
            'ingredient',
            'contains',
        ]);

        $intent = 'wellness_help';
        $feature = 'wellness';
        $scope = 'in_domain';
        $deterministicAction = null;
        $flags = [
            'include_last_7_days' => (bool) ($runtimeContext['include_last_7_days'] ?? false),
            'include_nearby' => false,
            'prefer_hybrid_profile' => false,
        ];

        if ($this->isLikelyOutOfDomain($text)) {
            $scope = 'out_of_domain';
            $intent = 'out_of_domain';
            $feature = 'out_of_scope';
        }

        if ($this->containsAny($text, ['protein', 'calories', 'calorie', 'carbs', 'fat', 'macro', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'food', 'eat', 'recipe', 'nutrition'])) {
            $intent = 'nutrition_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->containsAny($text, ['workout', 'exercise', 'train', 'gym', 'cardio', 'sets', 'reps', 'legs', 'push', 'pull', 'session'])) {
            $intent = 'workout_help';
            $feature = 'workout';
            $flags['include_last_7_days'] = true;
        }

        if ($this->containsAny($text, ['progress', 'measurement', 'weight trend', 'weight', 'bmi', 'plateau', 'why am i not improving'])) {
            $intent = 'progress_help';
            $feature = 'progress';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->containsAny($text, ['plan', 'program', 'routine', 'dashboard plan'])) {
            $intent = 'plan_help';
            $feature = 'plans';
            $flags['include_last_7_days'] = true;
        }

        if ($this->containsAny($text, ['nearby', 'near me', 'map', 'gym around', 'nutritionist', 'trainer nearby', 'location'])) {
            $intent = 'nearby_help';
            $feature = 'nearby';
            $flags['include_nearby'] = true;
        }

        if ($this->containsAny($text, ['message', 'appointment', 'notification', 'chat with'])) {
            $intent = 'communication_help';
            $feature = 'communication';
        }

        if ($this->containsAny($text, ['password', 'theme', 'appearance', 'profile', 'settings', 'two factor', '2fa', 'authenticator', 'not showing', 'dashboard', 'sync', 'loading', 'stale', 'app'])) {
            $intent = 'settings_help';
            $feature = 'settings';
        }

        if ($this->containsAny($text, ['recovery', 'sleep', 'hydration', 'soreness', 'stress', 'rest day', 'fatigue', 'mobility', 'stretching', 'wellness'])) {
            $intent = 'wellness_help';
            $feature = 'wellness';
        }

        if (
            $this->containsAny($text, ['allerg', 'restriction', 'diet type', 'medical condition', 'injur']) &&
            ! $isMealRequest
        ) {
            $deterministicAction = 'restriction_summary';
            $intent = 'restriction_summary_help';
            $feature = 'nutrition';
            $flags['prefer_hybrid_profile'] = true;
        }

        if (
            $this->containsAny($text, ['protein']) &&
            $this->containsAny($text, ['target', 'intake', 'how much', 'recalculate', 'suggest', 'grams'])
        ) {
            $deterministicAction = 'protein_target';
            $intent = 'protein_target_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        return [
            'intent' => $intent,
            'feature' => $feature,
            'scope' => $scope,
            'deterministic_action' => $deterministicAction,
            'context_flags' => $flags,
        ];
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function isLikelyOutOfDomain(string $text): bool
    {
        if ($text === '') {
            return false;
        }

        if ($this->containsAny($text, [
            'weather',
            'temperature',
            'rain',
            'nihilism',
            'philosophy',
            'politics',
            'election',
            'stock market',
            'bitcoin',
            'crypto',
            'movie',
            'song',
            'lyrics',
            'capital of',
            'translate',
            'history of',
            'programming',
            'code this',
        ])) {
            return true;
        }

        return false;
    }
}
