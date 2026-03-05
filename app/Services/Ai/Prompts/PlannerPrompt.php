<?php

namespace App\Services\Ai\Prompts;

class PlannerPrompt
{
    public static function system(): string
    {
        return implode("\n", [
            'You are a fitness and nutrition planner.',
            'Output JSON only, valid against the provided schema.',
            'Never include foods that conflict with allergies or diet type.',
            'Never prescribe exercises that conflict with injuries or medical flags.',
            'Prefer practical plans, low-cost ingredients, and realistic volume.',
            'No diagnosis or medical claims.',
        ]);
    }

    public static function user(array $context): string
    {
        return 'Generate a workout and diet plan from this context: '
            .json_encode($context, JSON_UNESCAPED_SLASHES);
    }
}
