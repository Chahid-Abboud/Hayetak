<?php

namespace App\Services\Ai\Plan\Model;

use Carbon\Carbon;

class DummyPlanModelClient
{
    /**
     * Dummy fixed output used to test validation + persistence.
     * Uses allowed_food_ids[0] so the plan always passes FoodSafetyFilter.
     */
    public function generate(array $input): array
    {
        $days = max(1, (int)($input['days'] ?? 1));
        $allowedFoodIds = $input['allowed_food_ids'] ?? [];
        $allowedExerciseIds = $input['allowed_exercise_ids'] ?? [];

        $foodId = $allowedFoodIds[0] ?? null;
        if (!$foodId) {
            throw new \RuntimeException('DummyPlanModelClient: no allowed_food_ids provided.');
        }

        $exerciseId = $allowedExerciseIds[0] ?? null;

        $start = Carbon::now()->addDay()->startOfDay();

        // Minimal but valid nutrition plan
        $nutritionDays = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i)->format('Y-m-d');

            $nutritionDays[] = [
                'day_index' => $i + 1,
                'date' => $date,
                'meals' => [
                    [
                        'meal_type' => 'breakfast',
                        'order' => 1,
                        'items' => [
                            [
                                'food_id' => $foodId,
                                'servings' => 1.0,
                                'grams' => null,
                                'sort_order' => 1,
                            ],
                        ],
                    ],
                ],
            ];
        }

        // Workout plan placeholder (optional for now)
        $workoutDays = [];
        for ($i = 0; $i < $days; $i++) {
            $workoutDays[] = [
                'day_index' => $i + 1,
                'title' => 'Full Body (Dummy)',
                'exercises' => $exerciseId ? [
                    [
                        'exercise_id' => $exerciseId,
                        'sets' => [
                            ['reps' => 10, 'weight_kg' => null],
                            ['reps' => 10, 'weight_kg' => null],
                        ],
                    ],
                ] : [],
            ];
        }

        return [
            'nutrition_plan' => [
                'name' => 'Dummy Nutrition Plan',
                'goal' => 'Build Muscle',
                'start_date' => $start->format('Y-m-d'),
                'duration_days' => $days,
                'days' => $nutritionDays,
            ],
            'workout_plan' => [
                'name' => 'Dummy Workout Plan',
                'goal' => 'Build Muscle',
                'days' => $workoutDays,
            ],
        ];
    }
}
