<?php

namespace App\Services\Ai\Tools;

use App\Models\Exercise;
use App\Models\User;
use App\Services\Ai\Profile\UserSafetyProfileResolver;

class SuggestExerciseAlternativesTool implements AiTool
{
    public function __construct(
        private readonly UserSafetyProfileResolver $safetyProfileResolver,
    ) {}

    public function name(): string
    {
        return 'suggest_exercise_alternatives';
    }

    public function description(): string
    {
        return 'Suggests safer exercise alternatives based on target movement, available equipment, and injuries.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'target' => ['type' => 'string'],
                'equipment' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'injuries' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'workout_location' => ['type' => 'string'],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 8],
            ],
        ];
    }

    public function execute(User $user, array $arguments): array
    {
        $profile = $this->safetyProfileResolver->resolve($user);
        $target = trim((string) ($arguments['target'] ?? ''));
        $injuries = array_map('mb_strtolower', $this->normalizeList($arguments['injuries'] ?? $profile['injuries'] ?? []));
        $equipment = array_map('mb_strtolower', $this->normalizeList($arguments['equipment'] ?? $profile['available_equipment'] ?? []));
        $workoutLocation = mb_strtolower(trim((string) ($arguments['workout_location'] ?? $user->workout_location ?? '')));
        $limit = max(1, min(8, (int) ($arguments['limit'] ?? 4)));

        $baseExercise = null;
        if ($target !== '') {
            $needle = mb_strtolower($target);
            $baseExercise = Exercise::query()
                ->whereRaw('LOWER(name) LIKE ?', ['%'.$needle.'%'])
                ->orWhereRaw('LOWER(primary_muscle) LIKE ?', ['%'.$needle.'%'])
                ->orderBy('name')
                ->first();
        }

        $candidateQuery = Exercise::query()->orderBy('name');
        if ($baseExercise !== null && trim((string) $baseExercise->primary_muscle) !== '') {
            $candidateQuery->where('primary_muscle', $baseExercise->primary_muscle);
        }

        $candidates = $candidateQuery->limit(120)->get();
        $blockedNeedles = $this->blockedExerciseNeedlesForInjuries($injuries);
        $results = [];

        foreach ($candidates as $exercise) {
            if ($baseExercise !== null && (int) $exercise->id === (int) $baseExercise->id) {
                continue;
            }

            $name = trim((string) $exercise->name);
            if ($name === '') {
                continue;
            }

            $nameLower = mb_strtolower($name);
            if ($this->containsAny($nameLower, $blockedNeedles)) {
                continue;
            }

            $equipmentLabel = mb_strtolower(trim((string) ($exercise->equipment ?? 'bodyweight')));
            if (! $this->equipmentIsAllowed($equipmentLabel, $equipment, $workoutLocation, (bool) ($exercise->home_friendly ?? false))) {
                continue;
            }

            $results[] = [
                'exercise_id' => (int) $exercise->id,
                'name' => $name,
                'primary_muscle' => $exercise->primary_muscle,
                'equipment' => $exercise->equipment,
                'difficulty' => $exercise->difficulty,
                'reason' => $this->buildReason($exercise, $baseExercise, $injuries, $equipment),
            ];
        }

        if ($results === []) {
            $results = [
                [
                    'exercise_id' => null,
                    'name' => 'Bodyweight squat to chair',
                    'primary_muscle' => 'Lower body',
                    'equipment' => 'Bodyweight',
                    'difficulty' => 'Beginner',
                    'reason' => 'Fallback safe option with low equipment needs.',
                ],
                [
                    'exercise_id' => null,
                    'name' => 'Incline push-up on bench',
                    'primary_muscle' => 'Upper body',
                    'equipment' => 'Bodyweight',
                    'difficulty' => 'Beginner',
                    'reason' => 'Fallback safe option with controlled intensity.',
                ],
            ];
        }

        return [
            'target' => $target !== '' ? $target : ($baseExercise?->name ?? null),
            'base_exercise' => $baseExercise ? [
                'exercise_id' => (int) $baseExercise->id,
                'name' => (string) $baseExercise->name,
                'primary_muscle' => $baseExercise->primary_muscle,
                'equipment' => $baseExercise->equipment,
            ] : null,
            'injuries_considered' => $injuries,
            'equipment_considered' => $equipment,
            'alternatives' => array_slice($results, 0, $limit),
            'count' => min($limit, count($results)),
        ];
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

        return array_values(array_unique(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $value,
        ))));
    }

    private function blockedExerciseNeedlesForInjuries(array $injuries): array
    {
        $needles = [];

        foreach ($injuries as $injury) {
            $text = mb_strtolower(trim((string) $injury));
            if ($text === '') {
                continue;
            }

            if (str_contains($text, 'knee')) {
                array_push($needles, 'jump squat', 'depth jump', 'plyometric');
            }
            if (str_contains($text, 'shoulder')) {
                array_push($needles, 'upright row', 'behind the neck', 'overhead press');
            }
            if (str_contains($text, 'back') || str_contains($text, 'lower back')) {
                array_push($needles, 'good morning', 'heavy deadlift', 'max deadlift');
            }
            if (str_contains($text, 'wrist')) {
                array_push($needles, 'handstand');
            }
            if (str_contains($text, 'elbow')) {
                array_push($needles, 'skull crusher');
            }
        }

        return array_values(array_unique($needles));
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function equipmentIsAllowed(string $equipmentLabel, array $equipment, string $location, bool $homeFriendly): bool
    {
        if ($equipmentLabel === '' || str_contains($equipmentLabel, 'bodyweight')) {
            return true;
        }

        if ($location === 'home') {
            if ($homeFriendly) {
                return true;
            }

            if ($equipment === []) {
                return false;
            }

            foreach ($equipment as $available) {
                if ($available !== '' && (str_contains($equipmentLabel, $available) || str_contains($available, $equipmentLabel))) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    private function buildReason(Exercise $exercise, ?Exercise $baseExercise, array $injuries, array $equipment): string
    {
        $parts = [];

        if ($baseExercise !== null && trim((string) $baseExercise->primary_muscle) !== '' && trim((string) $exercise->primary_muscle) !== '') {
            $parts[] = 'Targets a similar muscle group to the requested movement.';
        }

        if ($injuries !== []) {
            $parts[] = 'Filtered against saved injury constraints.';
        }

        if ($equipment !== []) {
            $parts[] = 'Matches available equipment or bodyweight setup.';
        }

        if ($parts === []) {
            return 'General safe alternative.';
        }

        return implode(' ', $parts);
    }
}
