<?php

namespace App\Services\Ai\Planner;

use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use Illuminate\Support\Facades\DB;

class PlannerProfileSyncService
{
    public function prepare(User $user, array $overrides = [], bool $persistOverrides = false): array
    {
        return DB::transaction(function () use ($user, $overrides, $persistOverrides) {
            $user->loadMissing(['prefs', 'dietaryRestrictions', 'medicalHistories']);

            $baseProfile = $this->buildBaseProfile($user);
            $mergedProfile = $this->mergeProfile($baseProfile, $overrides);

            if ($persistOverrides && $overrides !== []) {
                $this->applyPersistentProfile($user, $mergedProfile);
                $user->refresh()->loadMissing(['prefs', 'dietaryRestrictions', 'medicalHistories']);
                $baseProfile = $this->buildBaseProfile($user);
                $mergedProfile = $baseProfile;
            }

            $this->syncNormalizedTables($user, $persistOverrides ? $mergedProfile : $baseProfile);

            return $mergedProfile;
        });
    }

    private function buildBaseProfile(User $user): array
    {
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];

        $tableDietType = $user->dietaryRestrictions
            ->where('is_active', true)
            ->firstWhere('kind', 'diet_type');

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

        $medicalHistory = $this->splitMedicalHistory($user->medical_history);

        return [
            'dietary_goal' => $this->normalizeString($user->dietary_goal),
            'fitness_goal' => $this->normalizeString($user->fitness_goal),
            'diet_type' => $this->normalizeString($user->diet_name) ?: $this->normalizeString($tableDietType?->value),
            'allergies' => $this->uniqueStrings(array_merge(
                $this->normalizeStringArray($user->allergies),
                $this->normalizeStringArray($tableAllergies),
            )),
            'medical_conditions' => $this->uniqueStrings(array_merge(
                $this->extractMedicalConditions($medicalHistory),
                $this->normalizeStringArray($tableMedical),
            )),
            'injury_history' => $this->uniqueStrings(array_merge(
                $this->extractInjuries($medicalHistory),
                $this->normalizeStringArray($settings['injury_history'] ?? $settings['injuries'] ?? []),
                $this->normalizeStringArray($tableInjuries),
            )),
            'available_equipment' => $this->normalizeStringArray($settings['available_equipment'] ?? []),
            'preferred_workout_days' => $this->normalizeWorkoutDays($settings['preferred_workout_days'] ?? []),
            'workout_days_per_week' => $user->workout_days_per_week !== null ? (int) $user->workout_days_per_week : null,
            'workout_location' => $this->normalizeString($user->workout_location),
            'past_diet_failures' => $this->normalizeStringArray($user->diet_failure_reasons),
            'past_diet_failures_other' => $this->normalizeString($user->diet_failure_other),
            'has_medical_history' => (bool) $user->has_medical_history || $medicalHistory !== [],
        ];
    }

    private function mergeProfile(array $baseProfile, array $overrides): array
    {
        if (! is_array($overrides) || $overrides === []) {
            return $baseProfile;
        }

        $merged = $baseProfile;

        foreach ([
            'dietary_goal',
            'fitness_goal',
            'diet_type',
            'workout_location',
            'past_diet_failures_other',
        ] as $key) {
            if (array_key_exists($key, $overrides)) {
                $merged[$key] = $this->normalizeString($overrides[$key]);
            }
        }

        foreach ([
            'allergies',
            'medical_conditions',
            'injury_history',
            'available_equipment',
            'preferred_workout_days',
            'past_diet_failures',
        ] as $key) {
            if (array_key_exists($key, $overrides)) {
                $merged[$key] = $key === 'preferred_workout_days'
                    ? $this->normalizeWorkoutDays($overrides[$key])
                    : $this->normalizeStringArray($overrides[$key]);
            }
        }

        if (array_key_exists('workout_days_per_week', $overrides) && $overrides['workout_days_per_week'] !== null) {
            $merged['workout_days_per_week'] = max(1, min(7, (int) $overrides['workout_days_per_week']));
        }

        $merged['has_medical_history'] = ($merged['medical_conditions'] !== [] || $merged['injury_history'] !== []);

        return $merged;
    }

    private function applyPersistentProfile(User $user, array $profile): void
    {
        $user->forceFill([
            'dietary_goal' => $profile['dietary_goal'] ?: null,
            'fitness_goal' => $profile['fitness_goal'] ?: null,
            'diet_name' => $profile['diet_type'] ?: null,
            'allergies' => $profile['allergies'],
            'workout_days_per_week' => $profile['workout_days_per_week'],
            'workout_location' => $profile['workout_location'] ?: null,
            'diet_failure_reasons' => $profile['past_diet_failures'],
            'diet_failure_other' => $profile['past_diet_failures_other'] ?: null,
            'has_medical_history' => $profile['has_medical_history'],
            'medical_history' => $profile['medical_conditions'] !== []
                ? implode(', ', $profile['medical_conditions'])
                : null,
        ])->save();

        $prefs = $user->prefs ?? new UserPref(['user_id' => $user->id]);
        $settings = is_array($prefs->settings) ? $prefs->settings : [];
        $settings['injury_history'] = $profile['injury_history'];
        $settings['available_equipment'] = $profile['available_equipment'];
        $settings['preferred_workout_days'] = $profile['preferred_workout_days'];

        $prefs->fill([
            'user_id' => $user->id,
            'settings' => $settings,
        ])->save();
    }

    private function syncNormalizedTables(User $user, array $profile): void
    {
        UserDietaryRestriction::query()
            ->where('user_id', $user->id)
            ->where('source', 'profile_sync')
            ->delete();

        UserMedicalHistory::query()
            ->where('user_id', $user->id)
            ->where('source', 'profile_sync')
            ->delete();

        if ($profile['diet_type'] !== '') {
            UserDietaryRestriction::query()->create([
                'user_id' => $user->id,
                'kind' => 'diet_type',
                'value' => $profile['diet_type'],
                'source' => 'profile_sync',
                'is_active' => true,
            ]);
        }

        foreach ($profile['allergies'] as $allergy) {
            UserDietaryRestriction::query()->create([
                'user_id' => $user->id,
                'kind' => 'allergy',
                'value' => $allergy,
                'source' => 'profile_sync',
                'is_active' => true,
            ]);
        }

        foreach ($profile['medical_conditions'] as $condition) {
            UserMedicalHistory::query()->create([
                'user_id' => $user->id,
                'kind' => 'medical_condition',
                'value' => $condition,
                'source' => 'profile_sync',
                'is_active' => true,
            ]);
        }

        foreach ($profile['injury_history'] as $injury) {
            UserMedicalHistory::query()->create([
                'user_id' => $user->id,
                'kind' => 'injury',
                'value' => $injury,
                'source' => 'profile_sync',
                'is_active' => true,
            ]);
        }
    }

    private function splitMedicalHistory(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }

        $parts = preg_split('/[\r\n,;]+/', $value) ?: [];

        return $this->normalizeStringArray($parts);
    }

    private function extractMedicalConditions(array $items): array
    {
        return array_values(array_filter($items, fn (string $item): bool => ! $this->looksLikeInjury($item)));
    }

    private function extractInjuries(array $items): array
    {
        return array_values(array_filter($items, fn (string $item): bool => $this->looksLikeInjury($item)));
    }

    private function looksLikeInjury(string $value): bool
    {
        $text = strtolower($value);

        foreach (['injury', 'pain', 'sprain', 'strain', 'tear', 'fracture', 'surgery', 'tendon', 'tendinitis', 'shoulder', 'knee', 'back', 'wrist', 'ankle', 'hip', 'elbow', 'neck'] as $keyword) {
            if (str_contains($text, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeStringArray(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $clean = $this->normalizeString($item);
            if ($clean !== '') {
                $items[] = $clean;
            }
        }

        return $this->uniqueStrings($items);
    }

    private function normalizeString(mixed $value): string
    {
        return trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    }

    private function uniqueStrings(array $values): array
    {
        return array_values(array_unique(array_filter($values, fn ($value) => $value !== '')));
    }

    private function normalizeWorkoutDays(mixed $value): array
    {
        $allowed = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $items = [];

        foreach ($this->normalizeStringArray($value) as $item) {
            $day = strtolower($item);
            if (in_array($day, $allowed, true)) {
                $items[] = $day;
            }
        }

        return array_values(array_unique($items));
    }
}
