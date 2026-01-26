<?php

namespace App\Services\Ai\Plan\Persistence;

use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanMeal;
use App\Models\NutritionPlanItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class NutritionPlanPersister
{
    /**
     * Persist validated nutrition plan into:
     * nutrition_plans -> nutrition_plan_days -> nutrition_plan_meals -> nutrition_plan_items
     */
    public function persist(User $user, array $validatedDiet, int $aiRequestId): NutritionPlan
    {
        return DB::transaction(function () use ($user, $validatedDiet, $aiRequestId) {

            // Deactivate previous active plan for this user (optional)
            NutritionPlan::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            $plan = NutritionPlan::create([
                'user_id' => $user->id,

                // ✅ THIS is the missing link
                'ai_request_id' => $aiRequestId,

                'name' => $validatedDiet['name'] ?? 'Nutrition Plan',
                'goal' => $validatedDiet['goal'] ?? null,
                'start_date' => $validatedDiet['start_date'] ?? null,
                'duration_days' => $validatedDiet['duration_days'] ?? 7,
                'is_active' => true,

                // In your DB this may be targets_json or targets; keep as targets if your model casts it
                'targets' => $validatedDiet['targets'] ?? [],

                // Keep meta for debugging/traceability (optional)
                'meta' => array_merge($validatedDiet['meta'] ?? [], [
                    'ai_request_id' => $aiRequestId,
                    'schema_version' => 'plan_v1',
                ]),
            ]);

            foreach (($validatedDiet['days'] ?? []) as $dayData) {
                $day = NutritionPlanDay::create([
                    'nutrition_plan_id' => $plan->id,
                    'day_index' => $dayData['day_index'],
                    'date' => $dayData['date'] ?? null,
                    'notes' => $dayData['notes'] ?? null,
                ]);

                foreach (($dayData['meals'] ?? []) as $mealData) {
                    $meal = NutritionPlanMeal::create([
                        'nutrition_plan_day_id' => $day->id,
                        'meal_type' => $mealData['meal_type'],
                        'order' => $mealData['order'] ?? 1,
                        'notes' => $mealData['notes'] ?? null,
                    ]);

                    foreach (($mealData['items'] ?? []) as $itemData) {
                        NutritionPlanItem::create([
                            'nutrition_plan_meal_id' => $meal->id,
                            'food_id' => $itemData['food_id'],
                            'servings' => $itemData['servings'] ?? null,
                            'grams' => $itemData['grams'] ?? null,
                            'sort_order' => $itemData['sort_order'] ?? 1,
                            'notes' => $itemData['notes'] ?? null,
                        ]);
                    }
                }
            }

            return $plan;
        });
    }
}
