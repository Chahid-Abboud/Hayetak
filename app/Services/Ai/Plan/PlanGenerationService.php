<?php

namespace App\Services\Ai\Plan;

use App\Models\AiRequest;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Services\Ai\Plan\ModelClients\DummyPlanModelClient;
use App\Services\Ai\Plan\Persistence\NutritionPlanPersister;
use App\Services\Ai\Plan\UserContext\UserContextBuilder;
use App\Services\Ai\Plan\Validation\DietPlanValidator;
use Throwable;

class PlanGenerationService
{
    public function __construct(
        private readonly UserContextBuilder $contextBuilder,
        private readonly DummyPlanModelClient $modelClient,
        private readonly FoodSafetyFilter $foodSafety,
        private readonly DietPlanValidator $dietValidator,
        private readonly NutritionPlanPersister $nutritionPersister,
    ) {}

    /**
     * Generates plans for a user (dummy model for now), validates, persists,
     * and logs everything in ai_requests.
     *
     * Returns: ['ai_request_id' => int, 'nutrition_plan_id' => int|null]
     */
    public function generateForUser(User $user, int $days = 7): array
    {
        // Create request row early (and satisfy NOT NULL constraints).
        $ai = AiRequest::create([
            'user_id' => $user->id,
            'type' => AiRequest::TYPE_PLAN_GENERATOR,
            'status' => AiRequest::STATUS_PROCESSING,
            'input_context_json' => [], // will be replaced
            'output_json' => null,
        ]);

        try {
            // 1) Build context
            $context = $this->contextBuilder->build($user, $days);

            $ai->input_context_json = $context;
            $ai->save();

            // 2) Generate output using dummy client
            // Expected shape: ['nutrition_plan' => [...], 'workout_plan' => ...optional]
            $output = $this->modelClient->generate($context, $days);

            // 3) Build allowed foods
            $food = $this->foodSafety->build($user);
            $allowedFoodIds = $food['allowed_food_ids'] ?? [];

            // 4) Validate nutrition plan against allowed foods
            $nutritionPlanRaw = $output['nutrition_plan'] ?? null;
            if (!is_array($nutritionPlanRaw)) {
                throw new \RuntimeException("Model output missing nutrition_plan array");
            }

            $validatedDiet = $this->dietValidator->validate($nutritionPlanRaw, $allowedFoodIds);

            // 5) Persist nutrition plan
            $plan = $this->nutritionPersister->persist($user, $validatedDiet, (int) $ai->id);

            // 6) Store output + status
            $ai->output_json = $output;
            $ai->status = AiRequest::STATUS_SUCCEEDED;
            $ai->error_message = null;
            $ai->error_json = null;
            $ai->save();

            return [
                'ai_request_id' => (int) $ai->id,
                'nutrition_plan_id' => (int) $plan->id,
            ];
        } catch (Throwable $e) {
            // Mark as failed but do not crash the job runner/controller.
            $ai->status = AiRequest::STATUS_FAILED;
            $ai->error_message = $e->getMessage();
            $ai->error_json = [
                'exception' => class_basename($e),
                'message' => $e->getMessage(),
            ];
            $ai->save();

            return [
                'ai_request_id' => (int) $ai->id,
                'nutrition_plan_id' => null,
            ];
        }
    }

    /**
     * Convenience helper to fetch latest active plan.
     */
    public function latestActiveNutritionPlan(User $user): ?NutritionPlan
    {
        return NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest('id')
            ->first();
    }
}
