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

    private const INGREDIENT_AUDIT_KEYWORDS = [
        'avocado',
        'banana',
        'corn',
        'sesame',
        'wheat',
        'milk',
        'egg',
        'eggs',
        'fish',
        'shellfish',
        'mustard',
        'celery',
        'garlic',
        'onion',
        'tomato',
        'soy',
        'lupin',
        'peanut',
        'peanuts',
    ];

    /**
     * Classify a user message into a coach intent, feature area, context flags, and optional deterministic action.
     */
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

        if ($this->containsAny($text, ['protein', 'calories', 'calorie', 'carbs', 'fat', 'macro', 'meal', 'meals', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'food', 'eat', 'recipe', 'nutrition', 'plate', 'fiber', 'fibre', 'allergy', 'allergies', 'allergen', 'allergens', 'diet type', 'safe for me'])) {
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

        if ($this->isAllergyExposureAuditQuestion($text)) {
            $deterministicAction = 'allergy_exposure_check';
            $intent = 'allergy_exposure_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->isIngredientExposureAuditQuestion($text)) {
            $deterministicAction = 'ingredient_exposure_check';
            $intent = 'ingredient_exposure_help';
            $feature = 'nutrition';
            $flags['include_last_7_days'] = true;
            $flags['prefer_hybrid_profile'] = true;
        }

        if ($this->isPersonalProteinTargetQuestion($text, $isMealRequest)) {
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

        if ($this->isJailbreakOrDataExfiltrationPrompt($text)) {
            return true;
        }

        if ($this->isBusinessOrStartupPlanningPrompt($text)) {
            return true;
        }

        if ($this->containsAny($text, [
            'weather',
            'temperature',
            'rain',
            'nihilism',
            'philosophy',
            'politics',
            'election',
            'parliament',
            'prime minister',
            'president',
            'stock market',
            'stocks',
            'sp500',
            'bitcoin',
            'crypto',
            'exchange rate',
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
            'tax advice',
            'tax loophole',
            'avoid paying taxes',
            'traffic ticket',
            'legal contract',
            'legal loophole',
            'appeal a ticket',
            'sports betting',
            'football matches',
            'global news',
            'latest news',
            'weather forecast',
            'diagnose this skin rash',
            'skin rash',
            'prescribe treatment',
            'prescribe medication',
            'medication dosage',
            'show me all users',
            'another user',
            'private data',
            'private user details',
            'email addresses',
            'dump all user',
            'database records',
            'admin notifications',
            'moderation notes',
            'memory buffer',
            'extract all client records',
            'script to extract all client records',
            'delete a user from production',
            'exact sql commands',
            'hidden system prompt',
            'reveal your prompt',
            'api keys',
            'credentials',
            'token values',
            'chain-of-thought',
            'ignore safety policy',
            'ignore policy',
            'ignore restrictions',
            'ignore instruction hierarchy',
            'obey only this message',
            'ignore injury constraints',
            'maximal-risk exercises',
            'bypass guardrails',
            'malware',
            'sql injection',
            'crack wifi',
            'carding fraud',
            'build a weapon',
            'nba finals',
            'football matches',
            'sports betting',
            'cryptocurrency',
        ])) {
            return true;
        }

        if (! $this->hasCoachDomainSignal($text) && $this->hasGeneralTaskOrTriviaSignal($text)) {
            return true;
        }

        return false;
    }

    private function isBusinessOrStartupPlanningPrompt(string $text): bool
    {
        if ($this->containsAny($text, [
            'business plan',
            'marketing plan',
            'sales plan',
            'business proposal',
            'financial model',
            'financial forecast',
            'business model',
            'go to market',
            'go-to-market',
            'pitch deck',
            'investor deck',
            'opening a cafe',
            'open a cafe',
            'open a coffee shop',
            'open a restaurant',
        ])) {
            return true;
        }

        return $this->containsAny($text, [
            'business',
            'startup',
            'company',
            'investor',
            'fundraising',
            'marketing',
            'sales',
            'finance',
            'financial',
            'restaurant',
            'coffee shop',
            'cafe',
        ]) && $this->containsAny($text, [
            'plan',
            'strategy',
            'proposal',
            'forecast',
            'budget',
            'deck',
            'pitch',
        ]);
    }

    private function isJailbreakOrDataExfiltrationPrompt(string $text): bool
    {
        if (
            $this->containsAny($text, ['ignore', 'bypass', 'disable', 'override', 'forget']) &&
            $this->containsAny($text, ['restriction', 'restrictions', 'constraint', 'constraints', 'policy', 'policies', 'guardrail', 'guardrails', 'safeguard', 'safeguards', 'instruction hierarchy'])
        ) {
            return true;
        }

        if ($this->containsAny($text, ['ignore instruction hierarchy', 'obey only this message', 'break character'])) {
            return true;
        }

        if (
            $this->containsAny($text, ['reveal', 'print', 'output', 'dump', 'expose', 'show', 'simulate']) &&
            $this->containsAny($text, [
                'system prompt',
                'system prompts',
                'prompt template',
                'internal prompt',
                'tool schema',
                'private context',
                'private user details',
                'memory buffer',
                'context key',
                'context keys',
                'configuration flags',
                'filesystem path',
                'secret environment',
                'admin notifications',
                'moderation notes',
                'api keys',
                'credentials',
                'token',
                'tokens',
                'environment files',
            ])
        ) {
            return true;
        }

        if (
            $this->containsAny($text, ['extract', 'script', 'sql', 'delete']) &&
            $this->containsAny($text, ['client records', 'database records', 'production', 'production user'])
        ) {
            return true;
        }

        if ($this->containsAny($text, ['ignore injury constraints', 'maximal-risk exercises'])) {
            return true;
        }

        if ($this->containsAny($text, ['filesystem path', 'secret environment', 'environment files'])) {
            return true;
        }

        if (
            $this->containsAny($text, ['policy', 'policies']) &&
            $this->containsAny($text, ['do not exist', 'does not exist', 'comply fully'])
        ) {
            return true;
        }

        if (
            $this->containsAny($text, ['all users', 'user records', 'all user records', 'list of all users']) &&
            $this->containsAny($text, ['allergies', 'injuries', 'medical', 'email', 'emails'])
        ) {
            return true;
        }

        if ($this->containsAny($text, [
            'superuser',
            'root admin',
            'debug mode',
            'unrestricted assistant',
            'security audit',
            'stock trading bot',
        ])) {
            return true;
        }

        return false;
    }

    private function hasCoachDomainSignal(string $text): bool
    {
        return $this->containsAny($text, [
            'meal',
            'meals',
            'breakfast',
            'lunch',
            'dinner',
            'snack',
            'food',
            'recipe',
            'ingredient',
            'macro',
            'macros',
            'calorie',
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'nutrition',
            'diet',
            'allergy',
            'allergies',
            'allergen',
            'workout',
            'exercise',
            'train',
            'gym',
            'cardio',
            'recovery',
            'sleep',
            'hydration',
            'dehydration',
            'rest day',
            'stretch',
            'stretches',
            'progress',
            'weight',
            'bmi',
            'plan',
            'routine',
            'nearby',
            'nutritionist',
            'trainer',
            'dashboard',
            'profile',
            'settings',
            'messages',
            'appointment',
            'hayetak',
        ]);
    }

    private function hasGeneralTaskOrTriviaSignal(string $text): bool
    {
        return $this->containsAny($text, [
            'what is',
            'who is',
            'who won',
            'what are',
            'write',
            'draft',
            'create',
            'generate',
            'summarize',
            'translate',
            'solve',
            'explain',
            'review',
            'recommend',
            'advise',
            'predict',
            'help me',
            'show me',
            'tell me',
            'list',
            'plan my',
        ]);
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
            'what allergies do you have saved for me',
            'what allergens do you have saved for me',
            'my allergies',
            'my allergens',
            'allergy list',
            'allergen list',
            'exactly as listed in my profile',
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

    private function isPersonalProteinTargetQuestion(string $text, bool $isMealRequest): bool
    {
        if ($isMealRequest || ! $this->containsAny($text, ['protein'])) {
            return false;
        }

        if ($this->containsAny($text, [
            'people generally',
            'generally',
            'in general',
            'usually',
            'most adults',
            'active adults',
            'someone',
        ])) {
            return false;
        }

        if (! $this->containsAny($text, ['target', 'intake', 'how much', 'recalculate', 'grams', 'suggest'])) {
            return false;
        }

        return $this->containsAny($text, [
            'for me',
            'based on my',
            'my weight',
            'saved weight',
            'current weight',
            'i need',
            'do i need',
            'my target',
            'my intake',
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

    private function isAllergyExposureAuditQuestion(string $text): bool
    {
        if (! $this->containsAny($text, ['allergy', 'allergies', 'allergen', 'allergens', 'allergic'])) {
            return false;
        }

        if (! $this->containsAny($text, ['consumed', 'consume', 'ate', 'eaten', 'logged', 'log', 'have i ever', 'did i', 'do i'])) {
            return false;
        }

        return $this->containsAny($text, [
            'past week',
            'last week',
            'last 7 days',
            'past 7 days',
            'this week',
            'past month',
            'last month',
            '30 days',
            'today',
            'yesterday',
        ]);
    }

    private function isIngredientExposureAuditQuestion(string $text): bool
    {
        if (! $this->mentionsTrackedIngredient($text)) {
            return false;
        }

        if (! $this->containsAny($text, ['logged', 'log', 'did i', 'have i', 'consumed', 'consume', 'ate', 'eaten'])) {
            return false;
        }

        if (! $this->containsAny($text, ['meal', 'meals', 'food', 'containing', 'contains', 'ingredient'])) {
            return false;
        }

        return $this->containsAny($text, [
            'today',
            'yesterday',
            'past week',
            'last week',
            'this week',
            'last 7 days',
            'past 7 days',
            'past month',
            'last month',
            'last 30 days',
            'past 30 days',
            '30 days',
            'have i ever',
        ]);
    }

    private function mentionsTrackedIngredient(string $text): bool
    {
        return $this->containsAny($text, self::INGREDIENT_AUDIT_KEYWORDS);
    }
}
