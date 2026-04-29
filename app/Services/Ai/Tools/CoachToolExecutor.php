<?php

namespace App\Services\Ai\Tools;

use App\Models\User;

class CoachToolExecutor
{
    public function __construct(
        private readonly AiToolRegistry $registry,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function modelToolDefinitions(): array
    {
        return array_map(
            static fn (AiTool $tool): array => [
                'type' => 'function',
                'name' => $tool->name(),
                'description' => $tool->description(),
                'parameters' => $tool->schema(),
            ],
            $this->registry->all()
        );
    }

    public function executeByName(User $user, string $toolName, array $arguments): array
    {
        $tool = $this->registry->find($toolName);
        if (! $tool) {
            throw new \RuntimeException("Unknown AI tool [{$toolName}].");
        }

        return $tool->execute($user, $arguments);
    }

    /**
     * @return array{calls: array<int, array<string, mixed>>, results: array<int, array<string, mixed>>, warnings: array<int, string>}
     */
    public function planAndExecute(User $user, string $question, array $runtimeContext = [], array $classification = []): array
    {
        $plannedCalls = $this->plannedCalls($question, $runtimeContext, $classification);
        $results = [];
        $warnings = [];

        foreach ($plannedCalls as $call) {
            $name = (string) ($call['name'] ?? '');
            $arguments = is_array($call['arguments'] ?? null) ? $call['arguments'] : [];

            if ($name === '') {
                continue;
            }

            try {
                $output = $this->executeByName($user, $name, $arguments);
                $results[] = [
                    'name' => $name,
                    'arguments' => $arguments,
                    'ok' => true,
                    'output' => $output,
                ];
            } catch (\Throwable $e) {
                $results[] = [
                    'name' => $name,
                    'arguments' => $arguments,
                    'ok' => false,
                    'error' => $e->getMessage(),
                ];
                $warnings[] = "Tool [{$name}] failed: ".$e->getMessage();
            }
        }

        return [
            'calls' => $plannedCalls,
            'results' => $results,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    /**
     * @return array<int, array{name: string, arguments: array<string, mixed>}>
     */
    private function plannedCalls(string $question, array $runtimeContext, array $classification): array
    {
        $text = mb_strtolower(trim($question));
        $feature = mb_strtolower((string) ($classification['feature'] ?? ''));
        $calls = [];

        if ($this->containsAny($text, [
            'recipe',
            'recipes',
            'snack',
            'dinner',
            'breakfast',
            'lunch',
            'meal',
            'ingredients',
            'suggest chicken',
            'banana and yogurt',
            'eggs conflict',
            'egg conflict',
            'safe alternative',
        ])) {
            $calls[] = [
                'name' => 'search_recipes',
                'arguments' => [
                    'query' => $question,
                    'constraints' => [
                        'diet_type' => (string) ($runtimeContext['diet_type'] ?? ''),
                    ],
                    'available_ingredients' => $this->normalizeList($runtimeContext['available_ingredients'] ?? []),
                    'limit' => 5,
                ],
            ];
        }

        if ($this->containsAny($text, ['calories', 'calorie', 'protein', 'carbs', 'fat', 'macros', 'macro', 'logs', 'based on both'])) {
            $calls[] = [
                'name' => 'get_day_macros',
                'arguments' => [
                    'date' => $this->resolveRequestedDate($text, $runtimeContext),
                ],
            ];
        }

        if ($this->containsAny($text, ['last 7', 'last seven', 'last week', 'this week', 'weekly', 'week summary', 'logs', 'based on both', 'every day for the next 14 days', 'next 14 days'])) {
            $calls[] = [
                'name' => 'summarize_last_7_days',
                'arguments' => [
                    'anchor_date' => $this->resolveRequestedDate($text, $runtimeContext),
                ],
            ];
        }

        if (
            $feature === 'workout'
            || $this->containsAny($text, ['exercise alternative', 'alternative exercise', 'instead of', 'injury', 'pain', 'knee', 'shoulder', 'back', 'home equipment', '20 minutes', 'deadlift', 'squat'])
        ) {
            $calls[] = [
                'name' => 'suggest_exercise_alternatives',
                'arguments' => [
                    'target' => $question,
                    'equipment' => $this->normalizeList($runtimeContext['available_equipment'] ?? []),
                    'injuries' => $this->normalizeList($runtimeContext['injuries'] ?? []),
                    'workout_location' => $runtimeContext['workout_location'] ?? null,
                    'limit' => 4,
                ],
            ];
        }

        if ($this->containsAny($text, ['nearby', 'near me', 'gym', 'nutritionist', 'dietitian', 'trainer nearby'])) {
            $calls[] = [
                'name' => 'find_gyms_or_nutritionists',
                'arguments' => [
                    'lat' => $runtimeContext['lat'] ?? null,
                    'lng' => $runtimeContext['lng'] ?? null,
                    'goal' => $runtimeContext['goal'] ?? null,
                    'limit' => 6,
                ],
            ];
        }

        // Keep automatic execution light and deterministic.
        return array_slice($this->uniqueCalls($calls), 0, 3);
    }

    /**
     * @param  array<int, array{name: string, arguments: array<string, mixed>}>  $calls
     * @return array<int, array{name: string, arguments: array<string, mixed>}>
     */
    private function uniqueCalls(array $calls): array
    {
        $seen = [];
        $unique = [];

        foreach ($calls as $call) {
            $name = (string) ($call['name'] ?? '');
            if ($name === '' || isset($seen[$name])) {
                continue;
            }

            $seen[$name] = true;
            $unique[] = [
                'name' => $name,
                'arguments' => is_array($call['arguments'] ?? null) ? $call['arguments'] : [],
            ];
        }

        return $unique;
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            $candidate = trim((string) $needle);
            if ($candidate !== '' && str_contains($haystack, $candidate)) {
                return true;
            }
        }

        return false;
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

    private function resolveRequestedDate(string $text, array $runtimeContext): ?string
    {
        $selectedDate = trim((string) ($runtimeContext['selected_date'] ?? ''));

        if ($selectedDate !== '') {
            return $selectedDate;
        }

        if (str_contains($text, 'yesterday')) {
            return now()->subDay()->toDateString();
        }
        if (str_contains($text, 'tomorrow')) {
            return now()->addDay()->toDateString();
        }

        return now()->toDateString();
    }
}
