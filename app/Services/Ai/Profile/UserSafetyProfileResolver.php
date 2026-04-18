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

        $tableMedical = $user->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'medical_condition')
            ->pluck('value')
            ->all();

        $tableInjuries = $user->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'injury')
            ->pluck('value')
            ->all();

        return [
            'diet_type' => $dietType,
            'allergies' => $this->uniqueStrings(array_merge(
                $this->normalizeList($user->allergies),
                $this->normalizeList($tableAllergies),
            )),
            'medical_conditions' => $this->uniqueStrings(array_merge(
                $this->normalizeList($user->medical_history),
                $this->normalizeList($tableMedical),
            )),
            'injuries' => $this->uniqueStrings(array_merge(
                $this->normalizeList($settings['injury_history'] ?? $settings['injuries'] ?? []),
                $this->normalizeList($tableInjuries),
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
}
