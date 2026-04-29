<?php

namespace App\Services\Ai\Evaluation;

use App\Services\Ai\Chat\ChatSafetyGuard;

class ChatResponseQualityScorer
{
    public function __construct(
        private readonly ChatSafetyGuard $safetyGuard,
    ) {}

    public function score(string $question, string $answer, array $context, array $classification = [], array $warnings = []): array
    {
        $normalizedAnswer = trim($answer);
        $safetyReview = $this->safetyGuard->review($normalizedAnswer, $context, [
            'question' => $question,
            'classification' => $classification,
        ]);
        $safetyWarnings = array_values($safetyReview['warnings'] ?? []);
        $materialSafetyIntervention = $this->containsAnyWarning($safetyWarnings, [
            'Removed a food suggestion',
            'Adjusted the reply to respect the saved diet type',
        ]);

        $checks = [
            'answer_non_empty' => $normalizedAnswer !== '',
            'no_internal_labels' => ! $this->containsInternalLabel($normalizedAnswer),
            'restriction_safe_after_review' => ! $materialSafetyIntervention,
            'warning_count_reasonable' => count($warnings) <= 3,
        ];

        $passed = count(array_filter($checks));
        $total = max(1, count($checks));

        return [
            'passed_checks' => $passed,
            'total_checks' => $total,
            'quality_percentage' => round(($passed / $total) * 100, 2),
            'checks' => $checks,
        ];
    }

    private function containsInternalLabel(string $answer): bool
    {
        $text = mb_strtolower($answer);
        foreach ([
            'personal_context',
            'active_path',
            'safety_rules',
            'core_profile_facts',
            'today_summary',
            'last_7_days_summary',
            'runtime_hints',
            'retrieval_mode',
        ] as $label) {
            if (str_contains($text, $label)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>  $warnings
     * @param  array<int, string>  $needles
     */
    private function containsAnyWarning(array $warnings, array $needles): bool
    {
        foreach ($warnings as $warning) {
            foreach ($needles as $needle) {
                if ($needle !== '' && str_contains($warning, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }
}
