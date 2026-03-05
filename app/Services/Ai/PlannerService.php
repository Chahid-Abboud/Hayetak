<?php

namespace App\Services\Ai;

use App\Models\AiPlan;
use App\Models\User;
use App\Services\Ai\Context\PlannerContextBuilder;
use App\Services\Ai\Persistence\PlannerPersistenceService;
use App\Services\Ai\Prompts\PlannerPrompt;
use App\Services\Ai\Schemas\PlannerSchema;
use App\Services\Ai\Validation\PlannerOutputValidator;
use RuntimeException;
use Illuminate\Support\Str;

class PlannerService
{
    public function __construct(
        private readonly OpenAIClient $openAI,
        private readonly PlannerContextBuilder $contextBuilder,
        private readonly PlannerOutputValidator $validator,
        private readonly PlannerPersistenceService $persistence,
        private readonly AiUsageLogger $usageLogger,
    ) {}

    public function generate(User $user, bool $regenerate = false, ?string $reason = null, ?int $createdBy = null): array
    {
        if ($regenerate && trim((string) $reason) === '') {
            throw new RuntimeException('Regeneration reason is required.');
        }

        if (! $regenerate) {
            $existing = $this->latestPair($user);
            if ($existing) {
                return [
                    'ok' => true,
                    'generation_id' => $existing['generation_id'],
                    'version' => $existing['version'],
                    'plans' => $existing['plans'],
                    'citations' => [
                        ['source' => 'stored_plan'],
                    ],
                    'usage' => [
                        'model' => null,
                        'input_tokens' => 0,
                        'output_tokens' => 0,
                    ],
                ];
            }
        }

        $contextPayload = $this->contextBuilder->build($user);
        $context = $contextPayload['context'];
        $citations = is_array($contextPayload['citations'] ?? null) ? $contextPayload['citations'] : [];

        $response = $this->openAI->respond([
            'model' => config('ai.models.planner'),
            'input' => [
                [
                    'role' => 'system',
                    'content' => [
                        ['type' => 'input_text', 'text' => PlannerPrompt::system()],
                    ],
                ],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'input_text', 'text' => PlannerPrompt::user($context)],
                    ],
                ],
            ],
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'planner_output',
                    'schema' => PlannerSchema::definition(),
                    'strict' => true,
                ],
            ],
            'max_output_tokens' => (int) config('ai.tokens.planner_max_output', 2200),
        ]);

        $json = $response['json'];
        if (! is_array($json)) {
            throw new RuntimeException('Planner response did not return valid JSON output.');
        }

        $validated = $this->validator->validate($user, $json);
        $generationId = (string) Str::uuid();
        $persisted = $this->persistence->persist(
            $user,
            $validated,
            $generationId,
            $reason,
            $createdBy ?? $user->id
        );

        $this->usageLogger->log(
            $user,
            'planner',
            $response['usage'] ?? [],
            $response['model'] ?? (string) config('ai.models.planner'),
            $response['latency_ms'] ?? null,
            $response['id'] ?? null,
            ['generation_id' => $generationId]
        );

        return [
            'ok' => true,
            'generation_id' => $persisted['generation_id'],
            'version' => $persisted['version'],
            'plans' => $persisted['plans'],
            'citations' => $citations,
            'usage' => [
                'model' => $response['model'] ?? null,
                'input_tokens' => (int) ($response['usage']['input_tokens'] ?? 0),
                'output_tokens' => (int) ($response['usage']['output_tokens'] ?? 0),
            ],
        ];
    }

    public function latestPair(User $user): ?array
    {
        $plans = AiPlan::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['diet', 'workout'])
            ->orderByDesc('version')
            ->get()
            ->groupBy('version');

        foreach ($plans as $version => $rows) {
            $diet = $rows->firstWhere('type', 'diet');
            $workout = $rows->firstWhere('type', 'workout');
            if (! $diet || ! $workout) {
                continue;
            }

            return [
                'version' => (int) $version,
                'generation_id' => (string) $diet->generation_id,
                'plans' => [
                    'diet' => $diet->plan_json,
                    'workout' => $workout->plan_json,
                ],
            ];
        }

        return null;
    }
}

