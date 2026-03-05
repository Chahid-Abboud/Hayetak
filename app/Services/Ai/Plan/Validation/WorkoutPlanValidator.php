<?php

namespace App\Services\Ai\Plan\Validation;

use Illuminate\Support\Arr;

class WorkoutPlanValidator
{
    /**
     * Validate + normalize workout_plan JSON structure.
     *
     * Expected structure:
     * workout_plan: {
     *   name, goal, notes?, meta?,
     *   days: [
     *     { day_index, name?, notes?, meta?, exercises: [
     *        { exercise_id, order_index?, sets, reps_min?, reps_max?, rest_seconds?, rpe_target?, rir_target?, notes? }
     *     ]}
     *   ]
     * }
     *
     * Rules enforced:
     * - exercise_id must be in allowed_exercise_ids
     * - if exercise_id in caution_exercise_ids -> must include a caution note
     * - day_index must be integer 1..7 (or 1..max_day_index)
     * - no duplicate exercise_id within the same day
     * - sets/reps/rest sanity boundaries
     */
    public function validate(
        array $workoutPlan,
        array $allowedExerciseIds,
        array $cautionExerciseIds = [],
        array $options = []
    ): array {
        $errors = [];

        $allowedSet = $this->toBoolSet($allowedExerciseIds);
        $cautionSet = $this->toBoolSet($cautionExerciseIds);

        $maxDayIndex = (int) ($options['max_day_index'] ?? 7);
        $expectedDaysPerWeek = $options['expected_days_per_week'] ?? null; // int|null
        $requireCautionNote = (bool) ($options['require_caution_note'] ?? true);

        // Basic fields
        $name = trim((string) Arr::get($workoutPlan, 'name', ''));
        $goal = trim((string) Arr::get($workoutPlan, 'goal', ''));
        $days = Arr::get($workoutPlan, 'days', null);

        if ($name === '') {
            $errors[] = 'workout_plan.name is required';
        }
        if ($goal === '') {
            $errors[] = 'workout_plan.goal is required';
        }
        if (! is_array($days) || empty($days)) {
            $errors[] = 'workout_plan.days must be a non-empty array';
        }

        if (! empty($errors)) {
            throw new ValidationException($errors);
        }

        // Validate days count if provided
        if (is_int($expectedDaysPerWeek) && count($days) !== $expectedDaysPerWeek) {
            $errors[] = "workout_plan.days must contain exactly {$expectedDaysPerWeek} days";
        }

        $normalizedDays = [];
        $seenDayIndex = [];

        foreach ($days as $di => $day) {
            if (! is_array($day)) {
                $errors[] = "workout_plan.days[$di] must be an object";

                continue;
            }

            $dayIndex = Arr::get($day, 'day_index', null);
            if (! is_int($dayIndex)) {
                // allow numeric string
                if (is_numeric($dayIndex)) {
                    $dayIndex = (int) $dayIndex;
                }
            }

            if (! is_int($dayIndex) || $dayIndex < 1 || $dayIndex > $maxDayIndex) {
                $errors[] = "workout_plan.days[$di].day_index must be an integer between 1 and {$maxDayIndex}";

                continue;
            }

            if (isset($seenDayIndex[$dayIndex])) {
                $errors[] = "Duplicate day_index {$dayIndex} in workout_plan.days";

                continue;
            }
            $seenDayIndex[$dayIndex] = true;

            $dayExercises = Arr::get($day, 'exercises', null);
            if (! is_array($dayExercises) || empty($dayExercises)) {
                $errors[] = "workout_plan.days[$di].exercises must be a non-empty array";

                continue;
            }

            $normalizedExercises = [];
            $seenExerciseInDay = [];

            foreach ($dayExercises as $ei => $exRow) {
                if (! is_array($exRow)) {
                    $errors[] = "workout_plan.days[$di].exercises[$ei] must be an object";

                    continue;
                }

                $exerciseId = Arr::get($exRow, 'exercise_id', null);
                if (! is_int($exerciseId)) {
                    if (is_numeric($exerciseId)) {
                        $exerciseId = (int) $exerciseId;
                    }
                }
                if (! is_int($exerciseId) || $exerciseId <= 0) {
                    $errors[] = "Invalid exercise_id at workout_plan.days[$di].exercises[$ei]";

                    continue;
                }

                // Allowed list enforcement
                if (! isset($allowedSet[$exerciseId])) {
                    $errors[] = "exercise_id {$exerciseId} is not allowed (workout_plan.days[$di].exercises[$ei])";

                    continue;
                }

                // No duplicates within the same day
                if (isset($seenExerciseInDay[$exerciseId])) {
                    $errors[] = "Duplicate exercise_id {$exerciseId} within day_index {$dayIndex}";

                    continue;
                }
                $seenExerciseInDay[$exerciseId] = true;

                // Sanity checks
                $sets = Arr::get($exRow, 'sets', null);
                if (! is_int($sets)) {
                    if (is_numeric($sets)) {
                        $sets = (int) $sets;
                    }
                }
                if (! is_int($sets) || $sets < 1 || $sets > 12) {
                    $errors[] = "sets must be 1..12 for exercise_id {$exerciseId} (day_index {$dayIndex})";

                    continue;
                }

                $repsMin = Arr::get($exRow, 'reps_min', null);
                $repsMax = Arr::get($exRow, 'reps_max', null);

                if ($repsMin !== null && ! is_int($repsMin)) {
                    if (is_numeric($repsMin)) {
                        $repsMin = (int) $repsMin;
                    }
                }
                if ($repsMax !== null && ! is_int($repsMax)) {
                    if (is_numeric($repsMax)) {
                        $repsMax = (int) $repsMax;
                    }
                }

                // If reps provided, validate range
                if ($repsMin !== null || $repsMax !== null) {
                    if ($repsMin === null || $repsMax === null) {
                        $errors[] = "Both reps_min and reps_max must be provided together for exercise_id {$exerciseId}";

                        continue;
                    }
                    if ($repsMin < 1 || $repsMax < 1 || $repsMin > 50 || $repsMax > 50 || $repsMin > $repsMax) {
                        $errors[] = "Invalid reps range for exercise_id {$exerciseId} (must be 1..50 and reps_min <= reps_max)";

                        continue;
                    }
                }

                $rest = Arr::get($exRow, 'rest_seconds', null);
                if ($rest !== null && ! is_int($rest)) {
                    if (is_numeric($rest)) {
                        $rest = (int) $rest;
                    }
                }
                if ($rest !== null && ($rest < 0 || $rest > 600)) {
                    $errors[] = "rest_seconds must be 0..600 for exercise_id {$exerciseId}";

                    continue;
                }

                $rpe = Arr::get($exRow, 'rpe_target', null);
                if ($rpe !== null && ! is_float($rpe) && ! is_int($rpe)) {
                    if (is_numeric($rpe)) {
                        $rpe = (float) $rpe;
                    }
                }
                if ($rpe !== null && ($rpe < 5.0 || $rpe > 10.0)) {
                    $errors[] = "rpe_target must be 5..10 for exercise_id {$exerciseId}";

                    continue;
                }

                $rir = Arr::get($exRow, 'rir_target', null);
                if ($rir !== null && ! is_int($rir)) {
                    if (is_numeric($rir)) {
                        $rir = (int) $rir;
                    }
                }
                if ($rir !== null && ($rir < 0 || $rir > 6)) {
                    $errors[] = "rir_target must be 0..6 for exercise_id {$exerciseId}";

                    continue;
                }

                $notes = trim((string) Arr::get($exRow, 'notes', ''));

                // Caution rule: require a note that acknowledges caution
                if ($requireCautionNote && isset($cautionSet[$exerciseId])) {
                    if ($notes === '' || ! $this->looksLikeCautionNote($notes)) {
                        $errors[] = "exercise_id {$exerciseId} is caution but missing a caution note (day_index {$dayIndex})";

                        continue;
                    }
                }

                $orderIndex = Arr::get($exRow, 'order_index', $ei + 1);
                if (! is_int($orderIndex)) {
                    if (is_numeric($orderIndex)) {
                        $orderIndex = (int) $orderIndex;
                    }
                }
                if (! is_int($orderIndex) || $orderIndex < 1 || $orderIndex > 50) {
                    $orderIndex = $ei + 1;
                }

                $normalizedExercises[] = [
                    'exercise_id' => $exerciseId,
                    'order_index' => $orderIndex,
                    'sets' => $sets,
                    'reps_min' => $repsMin,
                    'reps_max' => $repsMax,
                    'rest_seconds' => $rest,
                    'rpe_target' => $rpe,
                    'rir_target' => $rir,
                    'notes' => $notes !== '' ? $notes : null,
                ];
            }

            // Sort exercises by order_index to be deterministic
            usort($normalizedExercises, fn ($a, $b) => $a['order_index'] <=> $b['order_index']);

            $normalizedDays[] = [
                'day_index' => $dayIndex,
                'name' => ($n = trim((string) Arr::get($day, 'name', ''))) !== '' ? $n : "Day {$dayIndex}",
                'notes' => ($dn = trim((string) Arr::get($day, 'notes', ''))) !== '' ? $dn : null,
                'meta' => is_array(Arr::get($day, 'meta')) ? Arr::get($day, 'meta') : [],
                'exercises' => $normalizedExercises,
            ];
        }

        // Sort days by day_index to be deterministic
        usort($normalizedDays, fn ($a, $b) => $a['day_index'] <=> $b['day_index']);

        if (! empty($errors)) {
            throw new ValidationException($errors);
        }

        return [
            'name' => $name,
            'goal' => $goal,
            'notes' => ($wn = trim((string) Arr::get($workoutPlan, 'notes', ''))) !== '' ? $wn : null,
            'meta' => is_array(Arr::get($workoutPlan, 'meta')) ? Arr::get($workoutPlan, 'meta') : [],
            'days' => $normalizedDays,
        ];
    }

    private function toBoolSet(array $ids): array
    {
        $set = [];
        foreach ($ids as $id) {
            if (is_numeric($id)) {
                $set[(int) $id] = true;
            }
        }

        return $set;
    }

    private function looksLikeCautionNote(string $notes): bool
    {
        $n = mb_strtolower($notes);

        // Keep it simple: accept common caution keywords
        return str_contains($n, 'pain') ||
               str_contains($n, 'caution') ||
               str_contains($n, 'avoid') ||
               str_contains($n, 'neutral grip') ||
               str_contains($n, 'range of motion') ||
               str_contains($n, 'stop') ||
               str_contains($n, 'injury');
    }
}
