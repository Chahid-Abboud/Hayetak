<?php

namespace App\Services\Ai\Evaluation;

class DeepAuditAnswerGrader
{
    public const BUCKET_GREAT = 'great';

    public const BUCKET_GOOD = 'good';

    public const BUCKET_BAD = 'bad';

    public const BUCKET_COMPLETELY_WRONG = 'completely_wrong';

    /**
     * @param  array<string, mixed>  $quality
     * @param  array<int, string>  $warnings
     * @return array{bucket: string, score: float, reasons: array<int, string>, metrics: array<string, mixed>}
     */
    public function grade(
        string $category,
        string $question,
        string $answer,
        array $quality = [],
        array $warnings = [],
    ): array {
        $normalizedQuestion = mb_strtolower(trim($question));
        $normalizedAnswer = mb_strtolower(trim($answer));
        $qualityScore = is_numeric($quality['quality_percentage'] ?? null)
            ? (float) $quality['quality_percentage']
            : 50.0;
        $qualityChecks = is_array($quality['checks'] ?? null) ? $quality['checks'] : [];
        $reasons = [];

        if ($normalizedAnswer === '') {
            return [
                'bucket' => self::BUCKET_COMPLETELY_WRONG,
                'score' => 0.0,
                'reasons' => ['empty_answer'],
                'metrics' => [
                    'quality_score' => $qualityScore,
                    'keyword_relevance' => 0.0,
                ],
            ];
        }

        if ($this->knownMismatch($normalizedQuestion, $normalizedAnswer)) {
            return [
                'bucket' => self::BUCKET_COMPLETELY_WRONG,
                'score' => 5.0,
                'reasons' => ['known_mismatch_pattern'],
                'metrics' => [
                    'quality_score' => $qualityScore,
                    'keyword_relevance' => $this->keywordRelevance($normalizedQuestion, $normalizedAnswer),
                ],
            ];
        }

        if (($qualityChecks['restriction_safe_after_review'] ?? true) === false) {
            return [
                'bucket' => self::BUCKET_COMPLETELY_WRONG,
                'score' => 10.0,
                'reasons' => ['failed_safety_review'],
                'metrics' => [
                    'quality_score' => $qualityScore,
                    'keyword_relevance' => $this->keywordRelevance($normalizedQuestion, $normalizedAnswer),
                ],
            ];
        }

        $relevance = $this->keywordRelevance($normalizedQuestion, $normalizedAnswer);
        $score = $qualityScore;

        if ($relevance >= 0.35) {
            $score += 8.0;
        } elseif ($relevance >= 0.2) {
            $score += 2.0;
        } elseif ($relevance >= 0.1) {
            $score -= 8.0;
            $reasons[] = 'low_keyword_overlap';
        } else {
            $score -= 20.0;
            $reasons[] = 'very_low_keyword_overlap';
        }

        if ($category === 'out_of_scope') {
            if ($this->looksOutOfScopeBoundary($normalizedAnswer)) {
                $score += 18.0;
            } else {
                $score -= 28.0;
                $reasons[] = 'missing_out_of_scope_boundary';
            }
        } elseif ($category === 'personalized') {
            if (! $this->looksPersonalized($normalizedAnswer)) {
                $score -= 12.0;
                $reasons[] = 'weak_personalization_signal';
            } else {
                $score += 4.0;
            }
        }

        $warningCount = count($warnings);
        if ($warningCount >= 4) {
            $score -= 10.0;
            $reasons[] = 'high_warning_count';
        } elseif ($warningCount >= 2) {
            $score -= 4.0;
            $reasons[] = 'moderate_warning_count';
        }

        if (($qualityChecks['answer_non_empty'] ?? true) === false) {
            $score -= 25.0;
            $reasons[] = 'answer_marked_empty_by_quality_check';
        }
        if (($qualityChecks['no_internal_labels'] ?? true) === false) {
            $score -= 18.0;
            $reasons[] = 'internal_labels_leaked';
        }

        $score = max(0.0, min(100.0, round($score, 2)));
        $bucket = $this->bucketFromScore($score);

        // Severe mismatch for domain boundaries should always be completely wrong.
        if (
            $category === 'out_of_scope'
            && ! $this->looksOutOfScopeBoundary($normalizedAnswer)
            && $relevance < 0.15
        ) {
            $bucket = self::BUCKET_COMPLETELY_WRONG;
            $reasons[] = 'out_of_scope_answer_not_guarded_and_irrelevant';
            $score = min($score, 25.0);
        }

        if ($reasons === []) {
            $reasons[] = 'passes_primary_rubric';
        }

        return [
            'bucket' => $bucket,
            'score' => $score,
            'reasons' => array_values(array_unique($reasons)),
            'metrics' => [
                'quality_score' => $qualityScore,
                'keyword_relevance' => round($relevance, 3),
                'warning_count' => $warningCount,
            ],
        ];
    }

    private function bucketFromScore(float $score): string
    {
        if ($score >= 85.0) {
            return self::BUCKET_GREAT;
        }
        if ($score >= 70.0) {
            return self::BUCKET_GOOD;
        }
        if ($score >= 45.0) {
            return self::BUCKET_BAD;
        }

        return self::BUCKET_COMPLETELY_WRONG;
    }

    private function looksOutOfScopeBoundary(string $answer): bool
    {
        foreach ([
            'i can help with workouts',
            'i can help with meals',
            'i can help with',
            'i do not answer unrelated',
            'out-of-scope',
            'unrelated general-topic',
            'i cannot help with that here',
            'i can’t help with that here',
            'can help with fitness and nutrition',
        ] as $needle) {
            if (str_contains($answer, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function looksPersonalized(string $answer): bool
    {
        if (preg_match('/\b\d+(\.\d+)?\b/u', $answer) === 1) {
            return true;
        }

        foreach ([
            'your ',
            'you logged',
            'saved',
            'profile',
            'allerg',
            'injur',
            'last 7 days',
            'today',
            'target',
            'plan',
        ] as $needle) {
            if (str_contains($answer, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function knownMismatch(string $question, string $answer): bool
    {
        if (
            str_contains($answer, 'i removed a food suggestion because it included your saved allergy')
            && ! str_contains($question, 'suggestion')
            && ! str_contains($question, 'alternative')
        ) {
            return true;
        }

        if (
            str_contains($answer, 'ask me for an alternative and i will keep it clear')
            && ! str_contains($question, 'alternative')
        ) {
            return true;
        }

        return false;
    }

    private function keywordRelevance(string $question, string $answer): float
    {
        $questionTokens = $this->keywords($question);
        if ($questionTokens === []) {
            return 1.0;
        }

        $matches = 0;
        foreach ($questionTokens as $token) {
            if (str_contains($answer, $token)) {
                $matches++;
            }
        }

        return $matches / count($questionTokens);
    }

    /**
     * @return array<int, string>
     */
    private function keywords(string $text): array
    {
        $clean = preg_replace('/[^a-z0-9\s]+/u', ' ', mb_strtolower($text)) ?? '';
        $tokens = preg_split('/\s+/', trim($clean)) ?: [];
        $stopwords = [
            'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'then', 'than', 'what', 'when', 'where',
            'which', 'does', 'did', 'have', 'been', 'your', 'you', 'are', 'was', 'were', 'about', 'based', 'using',
            'only', 'most', 'least', 'show', 'list', 'give', 'make', 'safe', 'also', 'please', 'should', 'could',
            'would', 'into', 'today', 'week', 'last', 'days', 'month', 'over', 'past', 'some', 'many', 'types',
        ];

        $keywords = [];
        foreach ($tokens as $token) {
            if ($token === '' || mb_strlen($token) < 4) {
                continue;
            }
            if (in_array($token, $stopwords, true)) {
                continue;
            }
            $keywords[] = $token;
        }

        return array_values(array_unique($keywords));
    }
}
