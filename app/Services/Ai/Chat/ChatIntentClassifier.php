<?php

namespace App\Services\Ai\Chat;

class ChatIntentClassifier
{
    private const WORKOUT_KEYWORDS = [
        'workout',
        'exercise',
        'exercises',
        'exercice',
        'exercices',
        'train',
        'gym',
        'cardio',
        'sets',
        'reps',
        'legs',
        'push',
        'pull',
        'session',
    ];

    public function classify(string $message, array $runtimeContext = []): array
    {
        $text = mb_strtolower(trim(preg_replace('/\s+/', ' ', $message) ?? ''));
        $requestedDayOffset = $this->detectRequestedDayOffset($text);
        $isMealRequest = $this->containsAny($text, [
            'meal',
            'meals',
            'breakfast',
            'lunch',
            'dinner',
            'dessert',
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
            'requested_day_offset' => $requestedDayOffset,
        ];

        if ($this->isLikelyOutOfDomain($text)) {
            return [
                'intent' => 'out_of_domain',
                'feature' => 'out_of_scope',
                'scope' => 'out_of_domain',
                'deterministic_action' => null,
                'context_flags' => $flags,
            ];
        }

        if ($this->containsAny($text, ['protein', 'calories', 'calorie', 'carbs', 'fat', 'macro', 'meal', 'meals', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'food', 'eat', 'recipe', 'nutrition', 'plate', 'fiber', 'fibre'])) {
            $intent = 'nutrition_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if (! $isMealRequest && $this->containsAny($text, self::WORKOUT_KEYWORDS)) {
            $intent = 'workout_help';
            $feature = 'workout';
            $flags['include_last_7_days'] = true;
        }

        if ($this->containsAny($text, ['progress', 'measurement', 'weight trend', 'weight', 'bmi', 'plateau', 'why am i not improving', 'consistent this week', 'consistency this week'])) {
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

        if (! $isMealRequest && $this->containsAny($text, ['password', 'theme', 'appearance', 'profile', 'settings', 'two factor', '2fa', 'authenticator', 'not showing', 'dashboard', 'sync', 'loading', 'stale', 'app'])) {
            $intent = 'settings_help';
            $feature = 'settings';
        }

        if ($this->containsAny($text, ['recovery', 'sleep', 'hydration', 'soreness', 'stress', 'rest day', 'fatigue', 'mobility', 'stretching', 'wellness'])) {
            $intent = 'wellness_help';
            $feature = 'wellness';
        }

        if ($this->isDirectRestrictionSummaryRequest($text, $isMealRequest)) {
            $deterministicAction = 'restriction_summary';
            $intent = 'restriction_summary_help';
            $feature = 'nutrition';
            $flags['prefer_hybrid_profile'] = true;
        }

        if (
            $this->containsAny($text, ['protein']) &&
            $this->containsAny($text, ['target', 'intake', 'how much', 'recalculate', 'grams']) &&
            ! $isMealRequest &&
            ! $this->containsAny($text, ['people generally', 'generally'])
        ) {
            $deterministicAction = 'protein_target';
            $intent = 'protein_target_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->isProteinGapQuestion($text)) {
            $deterministicAction = 'protein_gap';
            $intent = 'protein_gap_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->isMealSummaryQuestion($text)) {
            $deterministicAction = 'meal_summary';
            $intent = 'meal_summary_help';
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
            $candidate = trim((string) $needle);

            if ($candidate === '') {
                continue;
            }

            if (preg_match('/(^|[^[:alnum:]_])'.preg_quote($candidate, '/').'([^[:alnum:]_]|$)/u', $haystack) === 1) {
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
            'poem',
            'resume',
            'quantum',
            'physics',
            'capital of',
            'translate',
            'world history',
            'news today',
            'football game',
            'history of',
            'programming',
            'code this',
            'code a website',
        ])) {
            return true;
        }

        return false;
    }

    private function isMealSummaryQuestion(string $text): bool
    {
        $hasMealSignal = $this->containsAny($text, [
            'meal',
            'meals',
            'breakfast',
            'lunch',
            'dinner',
            'snack',
            'food',
            'ate',
            'logged',
        ]);

        if (! $hasMealSignal) {
            return false;
        }

        if (
            $this->containsAny($text, ['what about']) &&
            $this->containsAny($text, ['today', 'yesterday', 'last night'])
        ) {
            return true;
        }

        return $this->containsAny($text, [
            'what stands out',
            'stands out',
            'summary',
            'summarize',
            'look like so far',
            'how am i doing',
            'how did i do',
            'review',
            'analyze',
            'analysis',
        ]);
    }

    private function isDirectRestrictionSummaryRequest(string $text, bool $isMealRequest): bool
    {
        if (
            $isMealRequest &&
            ! $this->containsAny($text, [
                'what foods should i avoid',
                'foods should i avoid',
                'foods to avoid',
                'what should i avoid based on my saved allergies',
                'what should i avoid based on my saved profile',
                'avoid based on my saved allergies',
                'avoid based on my saved profile',
            ])
        ) {
            return false;
        }

        if ($this->containsAny($text, self::WORKOUT_KEYWORDS)) {
            return false;
        }

        if ($this->containsAny($text, [
            'recommend',
            'suggest',
            'safe for',
            'what can i do',
            'what may i do',
            'what should i do',
            'can i do',
            'may i do',
        ])) {
            return false;
        }

        return $this->containsAny($text, [
            'what are my allergies',
            'what are my allergens',
            'what allergies do i have',
            'what allergens do i have',
            'my allergies',
            'my allergens',
            'allergy list',
            'allergen list',
            'show my allergies',
            'show my allergens',
            'tell me my allergies',
            'tell me my allergens',
            'what are my restrictions',
            'what are my dietary restrictions',
            'show my restrictions',
            'tell me my restrictions',
            'what diet type do you have saved for me',
            'what diet type do i have',
            'what is my diet type',
            'what medical conditions do you have saved for me',
            'what medical conditions do i have',
            'what is my medical history',
            'my medical history',
            'what injuries do you have saved for me',
            'what injuries do i have',
            'what is my injury history',
            'my injury history',
            'what injuries or medical conditions do you have saved for me',
            'what injuries or medical conditions do i have',
            'what about my allergens',
            'what about my allergies',
            'what about my injury history',
            'what about my medical history',
            'my allergens and my injury history',
            'my allergies and my injury history',
            'allergens and injury history',
            'allergies and injury history',
            'show my injuries',
            'tell me my injuries',
            'list my injuries',
            'show my medical conditions',
            'tell me my medical conditions',
            'list my medical conditions',
            'what foods should i avoid',
            'foods should i avoid',
            'foods to avoid',
            'what should i avoid based on my saved allergies',
            'what should i avoid based on my saved profile',
            'avoid based on my saved allergies',
            'avoid based on my saved profile',
        ]);
    }

    private function isProteinGapQuestion(string $text): bool
    {
        if (! $this->containsAny($text, ['protein'])) {
            return false;
        }

        if ($this->containsAny($text, ['people generally', 'generally'])) {
            return false;
        }

        return $this->containsAny($text, [
            'am i low on protein',
            'low on protein',
            'protein left today',
            'protein remaining today',
            'protein still need',
            'how much protein do i still need today',
            'how much protein do i have left today',
        ]);
    }

    private function detectRequestedDayOffset(string $text): ?int
    {
        if ($this->containsAny($text, ['yesterday', 'last night'])) {
            return -1;
        }

        if ($this->containsAny($text, ['today', 'so far', 'this morning', 'this afternoon', 'tonight'])) {
            return 0;
        }

        if ($this->containsAny($text, ['tomorrow'])) {
            return 1;
        }

        return null;
    }
}
