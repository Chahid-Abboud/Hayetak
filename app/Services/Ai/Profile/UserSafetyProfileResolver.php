<?php

namespace App\Services\Ai\Profile;

use App\Models\User;

class UserSafetyProfileResolver
{
    public function resolve(User $user): array
    {
        $user->loadMissing(['prefs', 'dietaryRestrictions', 'medicalHistories']);

        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];

        $tableDietType = $user->dietaryRestrictions
            ->where('is_active', true)
            ->firstWhere('kind', 'diet_type');
        $dietType = $this->cleanString($tableDietType?->value) ?: $this->cleanString($user->diet_name);

        $tableAllergies = $user->dietaryRestrictions
            ->where('is_active', true)
            ->where('kind', 'allergy')
            ->pluck('value')
            ->all();

        $tableMedical = $this->parseHistoryValues(
            $user->medicalHistories
                ->where('is_active', true)
                ->where('kind', 'medical_condition')
                ->pluck('value')
                ->all(),
            'medical_conditions'
        );

        $tableInjuries = $this->parseHistoryValues(
            $user->medicalHistories
                ->where('is_active', true)
                ->where('kind', 'injury')
                ->pluck('value')
                ->all(),
            'injuries'
        );

        $fallbackMedicalHistory = $this->parseHistoryValues($user->medical_history, 'medical_conditions');

        return [
            'diet_type' => $dietType,
            'allergies' => $this->uniqueStrings(array_merge(
                $this->normalizeList($user->allergies),
                $this->normalizeList($tableAllergies),
            )),
            'medical_conditions' => $this->uniqueStrings(array_merge(
                $fallbackMedicalHistory['medical_conditions'],
                $tableMedical['medical_conditions'],
            )),
            'injuries' => $this->uniqueStrings(array_merge(
                $this->normalizeList($settings['injury_history'] ?? $settings['injuries'] ?? []),
                $fallbackMedicalHistory['injuries'],
                $tableInjuries['injuries'],
            )),
            'available_equipment' => $this->normalizeList($settings['available_equipment'] ?? []),
        ];
    }

    private function cleanString(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [$value];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        )));
    }

    private function uniqueStrings(array $values): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $values,
        ))));
    }

    /**
     * @return array{medical_conditions: array<int, string>, injuries: array<int, string>}
     */
    private function parseHistoryValues(mixed $value, string $defaultBucket): array
    {
        $items = is_array($value) ? $value : [$value];
        $parsed = [
            'medical_conditions' => [],
            'injuries' => [],
        ];

        foreach ($items as $item) {
            foreach ($this->expandHistoryEntry($item, $defaultBucket) as $bucket => $bucketValues) {
                $parsed[$bucket] = array_merge($parsed[$bucket], $bucketValues);
            }
        }

        $parsed['medical_conditions'] = $this->uniqueStrings($parsed['medical_conditions']);
        $parsed['injuries'] = $this->uniqueStrings($parsed['injuries']);

        return $parsed;
    }

    /**
     * @return array{medical_conditions: array<int, string>, injuries: array<int, string>}
     */
    private function expandHistoryEntry(mixed $value, string $defaultBucket): array
    {
        $text = trim((string) ($value ?? ''));
        if ($text === '') {
            return [
                'medical_conditions' => [],
                'injuries' => [],
            ];
        }

        if (preg_match('/medical\s*:/i', $text) === 1 || preg_match('/injur(?:y|ies)\s*:/i', $text) === 1) {
            $medical = [];
            $injuries = [];

            if (preg_match('/medical\s*:\s*(.+?)(?=(?:\.\s*)?injur(?:y|ies)\s*:|$)/iu', $text, $matches) === 1) {
                $medical = $this->splitHistorySegment((string) ($matches[1] ?? ''));
            }

            if (preg_match('/injur(?:y|ies)\s*:\s*(.+)$/iu', $text, $matches) === 1) {
                $injuries = $this->splitHistorySegment((string) ($matches[1] ?? ''));
            }

            return [
                'medical_conditions' => $medical,
                'injuries' => $injuries,
            ];
        }

        return [
            'medical_conditions' => $defaultBucket === 'medical_conditions' ? $this->splitHistorySegment($text) : [],
            'injuries' => $defaultBucket === 'injuries' ? $this->splitHistorySegment($text) : [],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function splitHistorySegment(string $text): array
    {
        $parts = preg_split('/[\r\n,;]+/', trim($text)) ?: [];

        return $this->uniqueStrings(array_map(
            static fn ($item) => trim((string) $item, " \t\n\r\0\x0B."),
            $parts,
        ));
    }
}
