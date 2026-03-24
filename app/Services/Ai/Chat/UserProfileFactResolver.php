<?php

namespace App\Services\Ai\Chat;

use App\Models\Measurement;
use App\Models\User;

class UserProfileFactResolver
{
    public function resolve(User $user): array
    {
        $user->loadMissing('prefs');

        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];

        $latestWeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->latest('measured_at')
            ->first();

        $latestHeightMeasurement = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('height_cm')
            ->latest('measured_at')
            ->first();

        $currentWeightKg = $latestWeightMeasurement?->weight_kg ?? $user->weight_kg;
        $currentHeightCm = $latestHeightMeasurement?->height_cm ?? $user->height_cm;

        return [
            'role' => (string) ($user->role ?? User::ROLE_CLIENT),
            'age' => $user->age !== null ? (int) $user->age : null,
            'sex' => $this->cleanString($user->gender),
            'current_height_cm' => $currentHeightCm !== null ? (float) $currentHeightCm : null,
            'current_height_source' => $latestHeightMeasurement ? 'latest_measurement' : 'user_profile',
            'current_height_measured_at' => optional($latestHeightMeasurement?->measured_at)?->toDateString(),
            'current_weight_kg' => $currentWeightKg !== null ? (float) $currentWeightKg : null,
            'current_weight_source' => $latestWeightMeasurement ? 'latest_measurement' : 'user_profile',
            'current_weight_measured_at' => optional($latestWeightMeasurement?->measured_at)?->toDateString(),
            'goal' => $this->cleanString($user->fitness_goal ?: $user->dietary_goal),
            'activity_level' => $this->cleanString($user->activity_level),
            'workout_location' => $this->cleanString($user->workout_location),
            'workout_days_per_week' => $user->workout_days_per_week !== null ? (int) $user->workout_days_per_week : null,
            'diet_type' => $this->cleanString($user->diet_name),
            'allergies' => $this->normalizeList($user->allergies),
            'medical_conditions' => $this->normalizeList($user->medical_history),
            'injuries' => $this->normalizeList($settings['injury_history'] ?? $settings['injuries'] ?? []),
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
            $value = is_array($decoded) ? $decoded : [$value];
        }

        if (! is_array($value)) {
            return [];
        }

        $items = array_values(array_unique(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        ))));

        return $items;
    }
}
