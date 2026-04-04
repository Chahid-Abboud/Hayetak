<?php

namespace App\Services\Ai\Chat;

class ChatSafetyGuard
{
    public function preflight(string $question): array
    {
        $text = mb_strtolower($question);

        $urgentSignals = [
            'chest pain',
            'trouble breathing',
            'can not breathe',
            'fainting',
            'passed out',
            'severe bleeding',
            'sharp severe pain',
        ];

        foreach ($urgentSignals as $signal) {
            if (str_contains($text, $signal)) {
                return [
                    'answer' => 'That sounds urgent. Please seek medical care right away or contact local emergency help instead of relying on the chatbot.',
                    'warnings' => ['Possible medical emergency detected.'],
                ];
            }
        }

        return ['answer' => null, 'warnings' => []];
    }

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
        $looksLikeFoodSuggestion = $this->looksLikeFoodSuggestion($question, $clean, $classification);

        foreach ($allergies as $allergy) {
            if (
                $allergy !== '' &&
                ! $isRestrictionLookup &&
                $looksLikeFoodSuggestion &&
                $this->answerContainsUnsafeFoodRecommendation($clean, $allergy)
            ) {
                $clean = sprintf(
                    'I removed a food suggestion because it included your saved allergy: %s. Ask me for an alternative and I will keep it clear of that ingredient.',
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
            if ($needle !== '' && str_contains($haystack, $needle)) {
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
            'my allergies',
            'my allergens',
            'allergy list',
            'allergen list',
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

        return $this->containsAny($question, ['today', 'meals today', 'logged today', 'ate today'])
            && $this->containsAny($answer, ['logged', 'kcal', 'protein', 'carbs', 'fat']);
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
