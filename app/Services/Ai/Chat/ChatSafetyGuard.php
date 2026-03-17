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

    public function review(string $answer, array $context): array
    {
        $warnings = [];
        $clean = trim($answer);

        if ($clean === '') {
            $clean = 'I could not generate a useful reply yet. Please try again, or ask a shorter question about meals, workouts, plans, progress, nearby help, or settings.';
            $warnings[] = 'Empty model response replaced with fallback text.';
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);
        foreach ($allergies as $allergy) {
            if ($allergy !== '' && str_contains(mb_strtolower($clean), $allergy)) {
                $clean = 'I cannot safely recommend that because it conflicts with your saved allergy settings. Choose a different food in Meal Tracker or ask me for an alternative that avoids it.';
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
}
