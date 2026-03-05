<?php

namespace App\Services\Ai\Validation;

use App\Models\User;

class PlannerOutputValidator
{
    /**
     * @throws PlannerValidationException
     */
    public function validate(User $user, array $payload): array
    {
        if (! isset($payload['diet']) || ! is_array($payload['diet'])) {
            throw new PlannerValidationException('Planner output is missing diet.');
        }

        if (! isset($payload['workout']) || ! is_array($payload['workout'])) {
            throw new PlannerValidationException('Planner output is missing workout.');
        }

        if (! isset($payload['diet']['daily_calories']) || ! isset($payload['diet']['macros'])) {
            throw new PlannerValidationException('Diet section is missing required keys.');
        }

        if (! isset($payload['workout']['weekly_schedule']) || ! is_array($payload['workout']['weekly_schedule'])) {
            throw new PlannerValidationException('Workout section is missing weekly schedule.');
        }

        $this->assertFoodSafety($user, $payload['diet']);
        $this->assertWorkoutSafety($user, $payload['workout']);

        return $payload;
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertFoodSafety(User $user, array $diet): void
    {
        $text = strtolower(json_encode($diet, JSON_UNESCAPED_SLASHES) ?: '');
        $allergies = $this->normalizeList($user->allergies);

        foreach ($allergies as $allergy) {
            if ($allergy !== '' && str_contains($text, strtolower($allergy))) {
                throw new PlannerValidationException('Diet output includes an allergen: '.$allergy);
            }
        }

        $dietType = strtolower(trim((string) ($user->diet_name ?? '')));
        $blockedByDiet = match (true) {
            str_contains($dietType, 'vegan') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey'],
            str_contains($dietType, 'vegetarian') => ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey'],
            str_contains($dietType, 'pescetarian') => ['chicken', 'beef', 'pork', 'lamb', 'turkey'],
            default => [],
        };

        foreach ($blockedByDiet as $item) {
            if (str_contains($text, $item)) {
                throw new PlannerValidationException('Diet output violates diet type: '.$item);
            }
        }
    }

    /**
     * @throws PlannerValidationException
     */
    private function assertWorkoutSafety(User $user, array $workout): void
    {
        $injuries = [];
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];
        $injuries = array_merge(
            $this->normalizeList($settings['injury_history'] ?? []),
            $this->normalizeList($settings['injuries'] ?? [])
        );

        if (empty($injuries)) {
            return;
        }

        $text = strtolower(json_encode($workout, JSON_UNESCAPED_SLASHES) ?: '');
        $rules = [
            'knee' => ['jump squat', 'plyometric squat', 'depth jump'],
            'shoulder' => ['upright row', 'behind the neck press'],
            'lower_back' => ['good morning', 'barbell row heavy', 'max deadlift'],
            'back' => ['good morning', 'max deadlift'],
            'elbow' => ['skull crusher'],
            'wrist' => ['handstand push-up'],
        ];

        foreach ($injuries as $injury) {
            $k = str_replace([' ', '-'], '_', strtolower($injury));
            foreach ($rules as $keyword => $blockedMoves) {
                if (! str_contains($k, $keyword)) {
                    continue;
                }

                foreach ($blockedMoves as $move) {
                    if (str_contains($text, strtolower($move))) {
                        throw new PlannerValidationException('Workout output conflicts with injury history.');
                    }
                }
            }
        }
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = [$value];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $text = trim((string) $item);
            if ($text !== '') {
                $items[] = $text;
            }
        }

        return array_values(array_unique($items));
    }
}
