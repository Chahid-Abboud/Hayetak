<?php

namespace App\Services\Ai\Persistence;

use App\Models\AiPlan;
use App\Models\Exercise;
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use App\Models\WorkoutPlanExercise;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PlannerPersistenceService
{
    public function persist(
        User $user,
        array $validatedOutput,
        string $generationId,
        ?string $notes = null,
        ?int $createdBy = null
    ): array {
        return DB::transaction(function () use ($user, $validatedOutput, $generationId, $notes, $createdBy) {
            $version = $this->nextVersion($user->id);

            $dietPlan = AiPlan::query()->create([
                'user_id' => $user->id,
                'type' => 'diet',
                'plan_json' => $validatedOutput['diet'],
                'version' => $version,
                'notes' => $notes,
                'created_by' => $createdBy ?? $user->id,
                'generation_id' => $generationId,
            ]);

            $workoutPlan = AiPlan::query()->create([
                'user_id' => $user->id,
                'type' => 'workout',
                'plan_json' => $validatedOutput['workout'],
                'version' => $version,
                'notes' => $notes,
                'created_by' => $createdBy ?? $user->id,
                'generation_id' => $generationId,
            ]);

            $this->syncNutritionPlan($user, $validatedOutput['diet'], $dietPlan->id, $version, $generationId);
            $this->syncWorkoutPlan($user, $validatedOutput['workout'], $workoutPlan->id, $version, $generationId);

            return [
                'version' => $version,
                'generation_id' => $generationId,
                'plans' => [
                    'diet' => $dietPlan->plan_json,
                    'workout' => $workoutPlan->plan_json,
                ],
            ];
        });
    }

    private function nextVersion(int $userId): int
    {
        $last = (int) AiPlan::query()->where('user_id', $userId)->max('version');

        return max(1, $last + 1);
    }

    private function syncNutritionPlan(User $user, array $diet, int $aiPlanId, int $version, string $generationId): void
    {
        NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $mealStructure = is_array($diet['meal_structure'] ?? null) ? $diet['meal_structure'] : [];
        $sampleMeals = is_array($diet['sample_meals'] ?? null) ? $diet['sample_meals'] : [];
        $sampleByMeal = [];
        foreach ($sampleMeals as $sample) {
            $mealKey = strtolower((string) ($sample['meal'] ?? ''));
            if ($mealKey !== '') {
                $sampleByMeal[$mealKey] = is_array($sample['options'] ?? null) ? $sample['options'] : [];
            }
        }

        $daysCount = max(1, min(7, (int) ($user->workout_days_per_week ?? 7)));
        $start = Carbon::today();

        $plan = NutritionPlan::query()->create([
            'user_id' => $user->id,
            'ai_request_id' => null,
            'name' => 'AI Diet Plan v'.$version,
            'goal' => $user->dietary_goal ?: null,
            'start_date' => $start->toDateString(),
            'duration_days' => $daysCount,
            'is_active' => true,
            'targets_json' => [
                'daily_calories' => (int) ($diet['daily_calories'] ?? 0),
                'macros' => $diet['macros'] ?? [],
            ],
            'meta' => [
                'source' => 'ai_plans',
                'ai_plan_id' => $aiPlanId,
                'generation_id' => $generationId,
                'version' => $version,
            ],
        ]);

        for ($dayIndex = 1; $dayIndex <= $daysCount; $dayIndex++) {
            $day = NutritionPlanDay::query()->create([
                'nutrition_plan_id' => $plan->id,
                'day_index' => $dayIndex,
                'date' => $start->copy()->addDays($dayIndex - 1)->toDateString(),
                'notes' => null,
            ]);

            foreach ($mealStructure as $idx => $meal) {
                $mealName = strtolower(trim((string) ($meal['meal'] ?? '')));
                $mealType = $this->normalizeMealType($mealName);
                $options = $sampleByMeal[$mealName] ?? $sampleByMeal[$mealType] ?? [];

                NutritionPlanMeal::query()->create([
                    'nutrition_plan_day_id' => $day->id,
                    'meal_type' => $mealType,
                    'order' => $idx + 1,
                    'notes' => ! empty($options) ? implode(' | ', array_slice($options, 0, 2)) : null,
                ]);
            }
        }
    }

    private function syncWorkoutPlan(User $user, array $workout, int $aiPlanId, int $version, string $generationId): void
    {
        WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $plan = WorkoutPlan::query()->create([
            'user_id' => $user->id,
            'ai_request_id' => null,
            'name' => 'AI Workout Plan v'.$version,
            'goal' => $user->fitness_goal ?: null,
            'notes' => null,
            'is_active' => true,
            'is_public' => false,
            'meta' => [
                'source' => 'ai_plans',
                'ai_plan_id' => $aiPlanId,
                'generation_id' => $generationId,
                'version' => $version,
                'progression_rules' => $workout['progression_rules'] ?? [],
                'substitutions' => $workout['substitutions'] ?? [],
            ],
        ]);

        $schedule = is_array($workout['weekly_schedule'] ?? null) ? $workout['weekly_schedule'] : [];
        $exerciseLookup = Exercise::query()
            ->select(['id', 'name'])
            ->get()
            ->mapWithKeys(fn (Exercise $e) => [strtolower($e->name) => $e->id])
            ->all();

        $usedDayIndexes = [];
        foreach ($schedule as $offset => $dayData) {
            $dayName = (string) ($dayData['day'] ?? '');
            $dayIndex = $this->resolveDayIndex($dayName, $offset + 1, $usedDayIndexes);
            $usedDayIndexes[] = $dayIndex;

            $day = WorkoutPlanDay::query()->create([
                'workout_plan_id' => $plan->id,
                'day_index' => $dayIndex,
                'name' => (string) ($dayData['focus'] ?? ('Day '.$dayIndex)),
                'notes' => null,
            ]);

            $items = is_array($dayData['exercises'] ?? null) ? $dayData['exercises'] : [];
            $seenExercise = [];

            foreach ($items as $order => $exercise) {
                $name = strtolower(trim((string) ($exercise['name'] ?? '')));
                if ($name === '') {
                    continue;
                }

                $exerciseId = $exerciseLookup[$name] ?? null;
                if (! $exerciseId || isset($seenExercise[$exerciseId])) {
                    continue;
                }

                $seenExercise[$exerciseId] = true;

                $sets = max(1, (int) ($exercise['sets'] ?? 3));
                [$repsMin, $repsMax] = $this->parseRepRange((string) ($exercise['reps'] ?? '8-12'));

                WorkoutPlanExercise::query()->create([
                    'workout_plan_day_id' => $day->id,
                    'exercise_id' => $exerciseId,
                    'order_index' => $order,
                    'sets' => $sets,
                    'reps_min' => $repsMin,
                    'reps_max' => $repsMax,
                    'rest_seconds' => max(30, (int) ($exercise['rest_sec'] ?? 60)),
                    'rpe_target' => max(5, min(10, (float) ($exercise['rpe'] ?? 7))),
                    'rir_target' => null,
                    'notes' => (string) ($exercise['form_cue'] ?? ''),
                ]);
            }
        }
    }

    private function normalizeMealType(string $meal): string
    {
        return match (true) {
            str_contains($meal, 'break') => 'breakfast',
            str_contains($meal, 'lunch') => 'lunch',
            str_contains($meal, 'dinner') => 'dinner',
            str_contains($meal, 'snack') => 'snack',
            default => 'snack',
        };
    }

    private function resolveDayIndex(string $dayName, int $fallback, array $used): int
    {
        $map = [
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
            'sunday' => 7,
        ];

        $key = strtolower(trim($dayName));
        $candidate = $map[$key] ?? $fallback;
        $candidate = max(1, min(7, $candidate));

        if (! in_array($candidate, $used, true)) {
            return $candidate;
        }

        for ($i = 1; $i <= 7; $i++) {
            if (! in_array($i, $used, true)) {
                return $i;
            }
        }

        return $candidate;
    }

    private function parseRepRange(string $value): array
    {
        if (preg_match('/(\d+)\s*-\s*(\d+)/', $value, $m)) {
            $min = (int) $m[1];
            $max = (int) $m[2];

            return [min($min, $max), max($min, $max)];
        }

        $single = (int) preg_replace('/\D+/', '', $value);
        if ($single > 0) {
            return [$single, $single];
        }

        return [8, 12];
    }
}
