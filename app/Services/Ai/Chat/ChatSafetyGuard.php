<?php

namespace App\Services\Ai\Chat;

class ChatSafetyGuard
{
    /**
     * Block unsafe or out-of-domain requests before any model provider is called.
     */
    public function preflight(string $question): array
    {
        $text = mb_strtolower($question);

        if ($this->containsAny($text, [
            'blood pressure medicine',
            'dose insulin',
            'dosing insulin',
            'thyroid medication',
            'sleeping pills',
            'antidepressant dose',
            'ibuprofen should i take',
            'medication plan',
            'change my medication',
            'adjust my medication',
            'exact amount of caffeine',
            'how much caffeine',
            'caffeine should i take',
        ])) {
            return $this->boundary(
                'I cannot tell you how to dose, change, or time medication around training. Please follow your prescriber\'s instructions and ask your doctor or pharmacist before changing anything. I can help with general workout, meal, hydration, and recovery planning that does not alter medication use.',
                'Medication dosing or treatment adjustment request blocked.'
            );
        }

        if ($this->containsAny($text, [
            'steroid cycle',
            'sarms',
            'illegal substances',
            'banned substances',
            'fat burner stack',
            'fat-burner stack',
            'drug stack',
            'drug-assisted',
            'hard to detect',
            'performance-enhancing drug',
            'boost testosterone',
            'testosterone as fast',
            'testosterone safely',
        ])) {
            return $this->boundary(
                'I cannot help with steroid, banned-substance, drug-stack, or unsafe fat-burner advice. I can help you build a safer plan using training progression, realistic nutrition targets, sleep, and recovery.',
                'Dangerous supplement, steroid, or drug-use request blocked.'
            );
        }

        if ($this->containsAny($text, [
            'lose 10 kg in 7 days',
            'lose 10kg in 7 days',
            'lose 5 kg in 3 days',
            'lose 5kg in 3 days',
            'stop drinking water',
            'avoid food and water',
            'dehydrate myself',
            'extreme fasting',
            'crash diet',
        ])) {
            return $this->boundary(
                'I cannot help with extreme weight-loss, dehydration, or crash-diet tactics. Those can be unsafe and will not create sustainable fat loss. A safer approach is a moderate calorie deficit, normal hydration, adequate protein, and a realistic weekly pace.',
                'Extreme weight-loss or dehydration request blocked.'
            );
        }

        if ($this->containsAny($text, [
            'fake my food logs',
            'hide steroid use',
            'bypass my meal tracking',
            'manipulate my workout logs',
            'make my weight-loss results look better',
            'cheat my calorie target',
            'hack my friend',
        ])) {
            return $this->boundary(
                'I cannot help with deception, hiding unsafe behavior, bypassing tracking, or illegal activity. I can help you make the plan easier to follow honestly and adjust it if it is not realistic.',
                'Harmful misuse or deception request blocked.'
            );
        }

        if ($this->containsAny($text, [
            'university essay',
            'help me with my taxes',
            'legal advice',
            'business contract',
            'cover letter',
        ])) {
            return $this->boundary(
                'I cannot handle that request inside Hayetak. I can help with fitness, nutrition, workouts, meal planning, recovery, and safe habit coaching.',
                'Non-domain task blocked.'
            );
        }

        if ($this->containsAny($text, [
            'eat a small amount anyway',
            'if i’m allergic',
            'if i\'m allergic',
            'ignore my allergy',
            'push through sharp pain',
            'ignore my doctor',
            'supplement even if it gave me a rash',
            'finish the session and deal with it later',
        ])) {
            return $this->boundary(
                'I cannot encourage you to ignore allergies, sharp pain, medical guidance, rashes, or dizziness. Stop the risky action, choose the safer alternative, and get medical advice when symptoms are severe, persistent, or unusual.',
                'Safety-boundary pushing request blocked.'
            );
        }

        $urgentSignals = [
            'chest pain',
            'trouble breathing',
            'can not breathe',
            'short of breath',
            'dizzy',
            'dizziness',
            'lightheaded',
            'severe headache',
            'headache that will not go away',
            'headache that won\'t go away',
            'sharp stomach pain',
            'stomach pain after eating',
            'nauseous during high-intensity',
            'rash after using',
            'heart races',
            'heart is racing',
            'swollen knee',
            'severe back pain',
            'fainting',
            'feel faint',
            'passed out',
            'severe bleeding',
            'sharp severe pain',
        ];

        foreach ($urgentSignals as $signal) {
            if (str_contains($text, $signal)) {
                return [
                    'answer' => 'I cannot diagnose symptoms or tell you it is safe to continue training. Stop the activity now. If the symptom is severe, persistent, sudden, or includes chest pain, trouble breathing, fainting, severe headache, severe abdominal pain, or unusual swelling, seek urgent medical care or local emergency help. For non-urgent but recurring symptoms, speak with a healthcare professional before training again.',
                    'warnings' => ['Possible medical emergency detected.'],
                ];
            }
        }

        return ['answer' => null, 'warnings' => []];
    }

    private function boundary(string $answer, string $warning): array
    {
        return [
            'answer' => $answer,
            'warnings' => [$warning],
        ];
    }

    /**
     * Inspect generated answers and rewrite unsafe food/diet conflicts into safer guidance.
     */
    public function review(string $answer, array $context, array $options = []): array
    {
        $warnings = [];
        $clean = trim($answer);
        $question = mb_strtolower(trim((string) ($options['question'] ?? '')));
        $classification = is_array($options['classification'] ?? null) ? $options['classification'] : [];

        if ($clean === '') {
            $clean = 'I could not generate a useful reply yet. Please try again, or ask a shorter question about meals, workouts, plans, progress, nearby help, or settings.';
            $warnings[] = 'Empty model response replaced with fallback text.';
        }

        $sanitized = $this->sanitizeInternalAiPhrasing($clean);
        if ($sanitized !== $clean) {
            $clean = $sanitized;
            $warnings[] = 'Internal AI phrasing was normalized to plain English.';
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);
        $isRestrictionLookup = $this->isRestrictionLookupQuestion($question);
        $isIngredientHistoryLookup = $this->isIngredientHistoryLookupQuestion($question);
        $looksLikeFoodSuggestion = $this->looksLikeFoodSuggestion($question, $clean, $classification);

        foreach ($allergies as $allergy) {
            if (
                $allergy !== '' &&
                ! $isRestrictionLookup &&
                ! $isIngredientHistoryLookup &&
                $looksLikeFoodSuggestion &&
                $this->answerContainsUnsafeFoodRecommendation($clean, $allergy)
            ) {
                $clean = sprintf(
                    'I removed one suggested item because it conflicts with your saved allergy (%s). I can suggest a safer alternative that avoids it.',
                    $allergy,
                );
                $warnings[] = 'Removed a food suggestion that matched the allergy list.';
                break;
            }
        }

        $dietType = mb_strtolower((string) ($context['restrictions']['diet_type'] ?? ''));
        $meatTerms = ['chicken', 'beef', 'lamb', 'fish', 'tuna', 'turkey'];

        if ($dietType === 'vegan' && $this->containsAny($clean, array_merge($meatTerms, ['egg', 'eggs', 'yogurt', 'labneh', 'milk', 'cheese']))) {
            $clean = 'I kept the advice general because your diet type is vegan. Pick a vegan option that fits your target macros, such as legumes, tofu, grains, or plant-based dairy alternatives.';
            $warnings[] = 'Adjusted the reply to respect the saved diet type.';
        } elseif ($dietType === 'vegetarian' && $this->containsAny($clean, $meatTerms)) {
            $clean = 'I kept the advice general because your diet type is vegetarian. Choose a vegetarian protein source like eggs, dairy, legumes, tofu, or beans depending on your preferences.';
            $warnings[] = 'Adjusted the reply to respect the saved diet type.';
        }

        return [
            'answer' => $clean,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    private function containsAny(string $answer, array $needles): bool
    {
        $haystack = mb_strtolower($answer);

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

    private function isRestrictionLookupQuestion(string $question): bool
    {
        return $this->containsAny($question, [
            'what are my allergies',
            'what are the allergies',
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
            'what are my restrictions',
            'what are my dietary restrictions',
            'what diet type do i have',
            'what injuries do i have',
            'what medical conditions do i have',
            'what is my injury history',
            'what is my medical history',
            'my injury history',
            'my medical history',
            'what about my allergens',
            'what about my allergies',
            'what about my injury history',
            'what about my medical history',
            'allergens and injury history',
            'allergies and injury history',
        ]);
    }

    private function looksLikeFoodSuggestion(string $question, string $answer, array $classification): bool
    {
        $feature = mb_strtolower((string) ($classification['feature'] ?? ''));
        $normalizedQuestion = mb_strtolower($question);
        $normalizedAnswer = mb_strtolower($answer);

        if ($this->isHistoricalAllergyAuditQuestion($normalizedQuestion)) {
            return false;
        }

        if ($this->isIngredientHistoryLookupQuestion($normalizedQuestion)) {
            return false;
        }

        if ($this->isReflectiveNutritionAnalysis($normalizedQuestion, $normalizedAnswer)) {
            return false;
        }

        if ($feature === 'nutrition' && $this->containsAny($question, [
            'suggest',
            'recommend',
            'recipe',
            'meal',
            'snack',
            'breakfast',
            'lunch',
            'dinner',
            'dessert',
            'what should i eat',
            'choose',
        ])) {
            return true;
        }

        return $this->containsAny($normalizedAnswer, [
            'try ',
            'eat ',
            'have ',
            'choose ',
            'use ',
            'mix ',
            'layer ',
            'top with ',
            'serve it with ',
            'snack',
            'meal',
            'breakfast',
            'lunch',
            'dinner',
            'dessert',
            'recipe',
        ]);
    }

    private function isReflectiveNutritionAnalysis(string $question, string $answer): bool
    {
        if (! $this->containsAny($question, ['what stands out', 'summary', 'summarize', 'analyze', 'analysis', 'review'])) {
            return false;
        }

        return $this->containsAny($question, [
            'today',
            'meals today',
            'logged today',
            'ate today',
            'past week',
            'last week',
            'last 7 days',
            'past 7 days',
            'this week',
            'past month',
            'last month',
            'last 30 days',
            'past 30 days',
            '30 days',
        ])
            && $this->containsAny($answer, ['logged', 'kcal', 'protein', 'carbs', 'fat']);
    }

    private function isHistoricalAllergyAuditQuestion(string $question): bool
    {
        if (! $this->containsAny($question, ['allergy', 'allergies', 'allergic', 'allergen', 'allergens'])) {
            return false;
        }

        if (! $this->containsAny($question, ['consumed', 'consume', 'ate', 'eaten', 'logged', 'log', 'have i ever', 'did i', 'do i'])) {
            return false;
        }

        return $this->containsAny($question, [
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

    private function isIngredientHistoryLookupQuestion(string $question): bool
    {
        if (! $this->containsAny($question, ['logged', 'log', 'did i', 'have i', 'consumed', 'consume', 'ate', 'eaten'])) {
            return false;
        }

        if (! $this->containsAny($question, ['meal', 'meals', 'food', 'containing', 'contains', 'ingredient'])) {
            return false;
        }

        return $this->containsAny($question, [
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

    private function answerContainsUnsafeFoodRecommendation(string $answer, string $allergy): bool
    {
        $normalized = mb_strtolower($answer);

        foreach ($this->extractRecommendationSegments($normalized) as $segment) {
            if ($this->segmentIsAvoidanceContext($segment, $allergy)) {
                continue;
            }

            if (
                $this->containsWholeWord($segment, $allergy) &&
                $this->containsAny($segment, [
                    'try ',
                    'eat ',
                    'have ',
                    'choose ',
                    'use ',
                    'mix ',
                    'layer ',
                    'top with ',
                    'serve it with ',
                    'recipe',
                    'dessert',
                    'snack',
                    'meal',
                    'breakfast',
                    'lunch',
                    'dinner',
                    'dip',
                    'parfait',
                    'panna cotta',
                ])
            ) {
                return true;
            }
        }

        return false;
    }

    private function containsWholeWord(string $text, string $term): bool
    {
        $candidate = trim($term);
        if ($candidate === '') {
            return false;
        }

        return preg_match('/\b'.preg_quote($candidate, '/').'\b/u', $text) === 1;
    }

    private function segmentIsAvoidanceContext(string $segment, string $allergy): bool
    {
        if ($allergy === '' || ! str_contains($segment, $allergy)) {
            return false;
        }

        $escapedAllergy = preg_quote($allergy, '/');
        $avoidancePattern = '/\b(avoid|without|exclude|free of|allergy to|allergic to|no)\b[^.!?\n]{0,60}\b'.$escapedAllergy.'\b/u';

        if (preg_match($avoidancePattern, $segment) === 1) {
            return true;
        }

        return $this->containsAny($segment, [
            'safe for your allergy',
            'safe alternative',
            'avoid your saved allergy',
            'avoid your allergies',
            'not safe for you',
            'conflicts with your saved allergy',
            'conflicts with your allergies',
        ]);
    }

    private function extractRecommendationSegments(string $answer): array
    {
        $segments = preg_split('/[\r\n]+|(?<=[\.\!\?])\s+/', $answer) ?: [];

        return array_values(array_filter(array_map(
            static fn ($segment) => trim($segment),
            $segments,
        )));
    }

    private function sanitizeInternalAiPhrasing(string $answer): string
    {
        $clean = $answer;

        $replacements = [
            '/\bbased on your PERSONAL_CONTEXT\b/i' => 'based on your profile',
            '/\bBased on your PERSONAL_CONTEXT\b/i' => 'Based on your profile',
            '/\bThis information comes directly from your user profile\b/i' => 'This is based on your saved profile',
            '/\bdirectly from your user profile\b/i' => 'based on your saved profile',
            '/\bPERSONAL_CONTEXT\b/i' => 'your profile',
            '/\bCORE_PROFILE_FACTS\b/i' => 'your saved profile',
            '/\bSAFETY_RULES\b/i' => 'your saved restrictions',
            '/\bTODAY_SUMMARY\b/i' => 'today\'s summary',
            '/\bLAST_7_DAYS_SUMMARY\b/i' => 'your last 7 days',
            '/\bRECENT_CONVERSATION\b/i' => 'our recent conversation',
            '/\bRUNTIME_HINTS\b/i' => 'the details you shared',
            '/\bACTIVE_PATH\b/i' => 'the available context',
            '/\bRETRIEVAL_MODE\b/i' => 'the available context',
        ];

        foreach ($replacements as $pattern => $replacement) {
            $clean = preg_replace($pattern, $replacement, $clean) ?? $clean;
        }

        // Keep intentional line breaks (recipes, steps, lists), only normalize inline spacing.
        $lines = preg_split('/\R/u', $clean) ?: [$clean];
        $normalizedLines = array_map(
            static fn (string $line) => trim((string) (preg_replace('/[ \t]+/u', ' ', $line) ?? $line)),
            $lines,
        );
        $normalizedLines = array_values(array_filter(
            $normalizedLines,
            static fn (string $line) => $line !== '',
        ));

        return implode("\n", $normalizedLines);
    }
}
