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
            'what allergies do i have',
            'my allergies',
            'allergy list',
            'what are my restrictions',
            'what are my dietary restrictions',
            'what diet type do i have',
            'what injuries do i have',
            'what medical conditions do i have',
        ]);
    }

    private function looksLikeFoodSuggestion(string $question, string $answer, array $classification): bool
    {
        $feature = mb_strtolower((string) ($classification['feature'] ?? ''));

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

        return $this->containsAny(mb_strtolower($answer), [
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

    private function answerContainsUnsafeFoodRecommendation(string $answer, string $allergy): bool
    {
        $normalized = mb_strtolower($answer);

        foreach ($this->extractRecommendationSegments($normalized) as $segment) {
            if (
                str_contains($segment, $allergy) &&
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

    private function extractRecommendationSegments(string $answer): array
    {
        $segments = preg_split('/[\r\n]+|(?<=[\.\!\?])\s+/', $answer) ?: [];

        return array_values(array_filter(array_map(
            static fn ($segment) => trim($segment),
            $segments,
        )));
    }
}
