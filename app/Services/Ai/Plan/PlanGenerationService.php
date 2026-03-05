<?php

namespace App\Services\Ai\Plan;

use App\Models\NutritionPlan;
use App\Models\User;
use App\Services\Ai\PlannerService;

class PlanGenerationService
{
    public function __construct(private readonly PlannerService $plannerService)
    {
    }

    /**
     * Legacy compatibility wrapper.
     */
    public function generateForUser(User $user, int $days = 7): array
    {
        $result = $this->plannerService->generate($user, true, 'legacy_pipeline', $user->id);

        $latestNutrition = $this->latestActiveNutritionPlan($user);

        return [
            'ai_request_id' => null,
            'nutrition_plan_id' => $latestNutrition?->id,
            'generation_id' => $result['generation_id'] ?? null,
            'version' => $result['version'] ?? null,
        ];
    }

    public function latestActiveNutritionPlan(User $user): ?NutritionPlan
    {
        return NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->latest('id')
            ->first();
    }
}

