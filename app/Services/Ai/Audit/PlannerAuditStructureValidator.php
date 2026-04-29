<?php

namespace App\Services\Ai\Audit;

use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutPlan;
use Illuminate\Support\Facades\Schema;

class PlannerAuditStructureValidator
{
    public function preflight(): array
    {
        $issues = [];

        $requiredTables = [
            'ai_requests' => ['id', 'user_id', 'output_json'],
            'ai_plans' => ['id', 'user_id', 'ai_request_id', 'type', 'plan_json', 'generation_id'],
            'nutrition_plans' => ['id', 'user_id', 'ai_request_id', 'duration_days', 'is_active', 'targets_json', 'meta'],
            'nutrition_plan_days' => ['id', 'nutrition_plan_id', 'day_index', 'date'],
            'nutrition_plan_meals' => ['id', 'nutrition_plan_day_id', 'meal_type', 'order'],
            'nutrition_plan_items' => ['id', 'nutrition_plan_meal_id', 'food_id'],
            'workout_plans' => ['id', 'user_id', 'ai_request_id', 'duration_days', 'is_active', 'meta'],
            'workout_plan_days' => ['id', 'workout_plan_id', 'day_index', 'meta'],
            'workout_plan_day_exercises' => ['id', 'workout_plan_day_id', 'exercise_id'],
        ];

        foreach ($requiredTables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                $issues[] = sprintf("Missing required planner audit table '%s'.", $table);

                continue;
            }

            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    $issues[] = sprintf("Missing required column '%s.%s'.", $table, $column);
                }
            }
        }

        return [
            'ok' => $issues === [],
            'issues' => $issues,
        ];
    }

    public function validatePersisted(User $user, array $result, int $horizonDays): array
    {
        $issues = [];
        $warnings = [];
        $persisted = is_array($result['persisted'] ?? null) ? $result['persisted'] : [];

        $nutritionPlanId = isset($persisted['nutrition_plan_id']) ? (int) $persisted['nutrition_plan_id'] : 0;
        $workoutPlanId = isset($persisted['workout_plan_id']) ? (int) $persisted['workout_plan_id'] : 0;

        if ($nutritionPlanId <= 0) {
            $issues[] = 'Missing persisted nutrition plan id.';
        }
        if ($workoutPlanId <= 0) {
            $issues[] = 'Missing persisted workout plan id.';
        }

        $nutritionPlan = $nutritionPlanId > 0
            ? NutritionPlan::query()
                ->with(['days.meals.items'])
                ->find($nutritionPlanId)
            : null;
        $workoutPlan = $workoutPlanId > 0
            ? WorkoutPlan::query()
                ->with(['days.exercises'])
                ->find($workoutPlanId)
            : null;

        $nutritionSummary = $this->validateNutritionPlan($user, $nutritionPlan, $horizonDays);
        $workoutSummary = $this->validateWorkoutPlan($user, $workoutPlan, $horizonDays);

        $issues = array_values(array_merge($issues, $nutritionSummary['issues'], $workoutSummary['issues']));
        $warnings = array_values(array_merge($warnings, $nutritionSummary['warnings'], $workoutSummary['warnings']));

        return [
            'ok' => $issues === [],
            'issues' => $issues,
            'warnings' => $warnings,
            'issue_count' => count($issues),
            'warning_count' => count($warnings),
            'nutrition' => $nutritionSummary['metrics'],
            'workout' => $workoutSummary['metrics'],
        ];
    }

    private function validateNutritionPlan(User $user, ?NutritionPlan $plan, int $horizonDays): array
    {
        $issues = [];
        $warnings = [];

        if (! $plan) {
            return [
                'issues' => ['Persisted nutrition plan row was not found.'],
                'warnings' => [],
                'metrics' => [
                    'days_count' => 0,
                    'empty_meal_count' => 0,
                    'unmatched_meal_count' => 0,
                ],
            ];
        }

        if ((int) $plan->user_id !== (int) $user->id) {
            $issues[] = 'Persisted nutrition plan belongs to the wrong user.';
        }
        if (! (bool) $plan->is_active) {
            $issues[] = 'Persisted nutrition plan is not active.';
        }
        if ((int) $plan->duration_days !== $horizonDays) {
            $issues[] = sprintf(
                'Persisted nutrition plan duration is %d instead of %d days.',
                (int) $plan->duration_days,
                $horizonDays
            );
        }
        if (! is_array($plan->targets_json) || $plan->targets_json === []) {
            $issues[] = 'Persisted nutrition plan targets are missing.';
        }

        $meta = is_array($plan->meta) ? $plan->meta : [];
        if ((string) ($meta['source'] ?? '') !== 'ai_plans') {
            $issues[] = 'Persisted nutrition plan meta.source is not ai_plans.';
        }
        if (! isset($meta['ai_plan_id'])) {
            $issues[] = 'Persisted nutrition plan meta.ai_plan_id is missing.';
        }

        $days = $plan->days;
        if ($days->count() !== $horizonDays) {
            $issues[] = sprintf(
                'Persisted nutrition plan has %d day rows instead of %d.',
                $days->count(),
                $horizonDays
            );
        }

        $emptyMealCount = 0;
        $unmatchedMealCount = 0;
        foreach ($days as $expectedIndex => $day) {
            $requiredDayIndex = $expectedIndex + 1;
            if ((int) $day->day_index !== $requiredDayIndex) {
                $issues[] = sprintf(
                    'Persisted nutrition day order is broken at expected day %d.',
                    $requiredDayIndex
                );
            }

            $mealTypes = $day->meals
                ->pluck('meal_type')
                ->map(static fn ($value): string => strtolower(trim((string) $value)))
                ->values()
                ->all();

            foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealType) {
                if (! in_array($mealType, $mealTypes, true)) {
                    $issues[] = sprintf(
                        'Persisted nutrition day %d is missing the %s meal row.',
                        (int) $day->day_index,
                        $mealType
                    );
                }
            }

            foreach ($day->meals as $meal) {
                $itemCount = $meal->items->count();
                $notes = strtolower((string) ($meal->notes ?? ''));
                $hasUnmatched = str_contains($notes, 'planned items:');

                if ($itemCount === 0) {
                    $emptyMealCount++;
                    $warnings[] = sprintf(
                        'Persisted nutrition day %d %s meal has no matched food rows.',
                        (int) $day->day_index,
                        (string) $meal->meal_type
                    );
                }

                if ($hasUnmatched) {
                    $unmatchedMealCount++;
                    $warnings[] = sprintf(
                        'Persisted nutrition day %d %s meal still contains unmatched planned items in notes.',
                        (int) $day->day_index,
                        (string) $meal->meal_type
                    );
                }
            }
        }

        return [
            'issues' => array_values(array_unique($issues)),
            'warnings' => array_values(array_unique($warnings)),
            'metrics' => [
                'days_count' => $days->count(),
                'empty_meal_count' => $emptyMealCount,
                'unmatched_meal_count' => $unmatchedMealCount,
            ],
        ];
    }

    private function validateWorkoutPlan(User $user, ?WorkoutPlan $plan, int $horizonDays): array
    {
        $issues = [];
        $warnings = [];

        if (! $plan) {
            return [
                'issues' => ['Persisted workout plan row was not found.'],
                'warnings' => [],
                'metrics' => [
                    'days_count' => 0,
                    'train_days_count' => 0,
                    'unmatched_day_count' => 0,
                ],
            ];
        }

        if ((int) $plan->user_id !== (int) $user->id) {
            $issues[] = 'Persisted workout plan belongs to the wrong user.';
        }
        if (! (bool) $plan->is_active) {
            $issues[] = 'Persisted workout plan is not active.';
        }
        if ((int) $plan->duration_days !== $horizonDays) {
            $issues[] = sprintf(
                'Persisted workout plan duration is %d instead of %d days.',
                (int) $plan->duration_days,
                $horizonDays
            );
        }

        $meta = is_array($plan->meta) ? $plan->meta : [];
        if ((string) ($meta['source'] ?? '') !== 'ai_plans') {
            $issues[] = 'Persisted workout plan meta.source is not ai_plans.';
        }
        if ((int) ($meta['plan_horizon_days'] ?? 0) !== $horizonDays) {
            $issues[] = sprintf(
                'Persisted workout plan meta.plan_horizon_days is %d instead of %d.',
                (int) ($meta['plan_horizon_days'] ?? 0),
                $horizonDays
            );
        }

        $days = $plan->days;
        if ($days->count() !== 7) {
            $issues[] = sprintf(
                'Persisted workout plan has %d day rows instead of 7.',
                $days->count()
            );
        }

        $trainDaysCount = 0;
        $unmatchedDayCount = 0;
        foreach ($days as $expectedIndex => $day) {
            $requiredDayIndex = $expectedIndex + 1;
            if ((int) $day->day_index !== $requiredDayIndex) {
                $issues[] = sprintf(
                    'Persisted workout day order is broken at expected day %d.',
                    $requiredDayIndex
                );
            }

            $dayMeta = is_array($day->meta) ? $day->meta : [];
            if (trim((string) ($dayMeta['day_label'] ?? '')) === '') {
                $issues[] = sprintf('Persisted workout day %d is missing day_label metadata.', (int) $day->day_index);
            }

            $sessionType = strtolower(trim((string) ($dayMeta['session_type'] ?? '')));
            if ($sessionType === '') {
                $issues[] = sprintf('Persisted workout day %d is missing session_type metadata.', (int) $day->day_index);
            }

            if ($sessionType === 'train') {
                $trainDaysCount++;
                $exerciseCount = $day->exercises->count();
                if ($exerciseCount < 4 || $exerciseCount > 6) {
                    $issues[] = sprintf(
                        'Persisted workout day %d has %d exercises instead of the expected 4-6.',
                        (int) $day->day_index,
                        $exerciseCount
                    );
                }
            }

            $unmatchedExercises = is_array($dayMeta['unmatched_exercises'] ?? null)
                ? array_values(array_filter($dayMeta['unmatched_exercises']))
                : [];
            if ($unmatchedExercises !== []) {
                $unmatchedDayCount++;
                $warnings[] = sprintf(
                    'Persisted workout day %d still has unmatched exercises: %s.',
                    (int) $day->day_index,
                    implode(', ', array_slice($unmatchedExercises, 0, 3))
                );
            }
        }

        return [
            'issues' => array_values(array_unique($issues)),
            'warnings' => array_values(array_unique($warnings)),
            'metrics' => [
                'days_count' => $days->count(),
                'train_days_count' => $trainDaysCount,
                'unmatched_day_count' => $unmatchedDayCount,
            ],
        ];
    }
}
