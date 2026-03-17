<?php

namespace App\Services\Ai\Chat;

class ChatIntentClassifier
{
    public function classify(string $message, array $runtimeContext = []): array
    {
        $text = mb_strtolower(trim(preg_replace('/\s+/', ' ', $message) ?? ''));

        $intent = 'general_coaching';
        $feature = 'general';
        $flags = [
            'include_last_7_days' => (bool) ($runtimeContext['include_last_7_days'] ?? false),
            'include_nearby' => false,
        ];

        if ($this->containsAny($text, ['protein', 'calories', 'calorie', 'carbs', 'fat', 'macro', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'food', 'eat', 'recipe'])) {
            $intent = 'nutrition_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
        }

        if ($this->containsAny($text, ['workout', 'exercise', 'train', 'gym', 'cardio', 'sets', 'reps', 'legs', 'push', 'pull', 'session'])) {
            $intent = 'workout_help';
            $feature = 'workout';
            $flags['include_last_7_days'] = true;
        }

        if ($this->containsAny($text, ['progress', 'measurement', 'weight trend', 'bmi', 'plateau', 'why am i not improving'])) {
            $intent = 'progress_help';
            $feature = 'progress';
            $flags['include_last_7_days'] = true;
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

        if ($this->containsAny($text, ['password', 'theme', 'appearance', 'profile', 'settings', 'two factor', '2fa', 'authenticator'])) {
            $intent = 'settings_help';
            $feature = 'settings';
        }

        return [
            'intent' => $intent,
            'feature' => $feature,
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
}
