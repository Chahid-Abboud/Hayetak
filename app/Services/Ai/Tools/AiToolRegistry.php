<?php

namespace App\Services\Ai\Tools;

class AiToolRegistry
{
    /**
     * @return array<int, AiTool>
     */
    public function all(): array
    {
        return [
            app(SearchRecipesTool::class),
            app(GetDayMacrosTool::class),
            app(SummarizeLast7DaysTool::class),
            app(SuggestExerciseAlternativesTool::class),
            app(FindGymsOrNutritionistsTool::class),
        ];
    }

    public function find(string $name): ?AiTool
    {
        foreach ($this->all() as $tool) {
            if ($tool->name() === $name) {
                return $tool;
            }
        }

        return null;
    }
}
