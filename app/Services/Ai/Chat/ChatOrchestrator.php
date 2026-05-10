<?php

namespace App\Services\Ai\Chat;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\User;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Evaluation\ChatResponseQualityScorer;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use App\Services\Ai\Tools\CoachToolExecutor;
use App\Services\AppNotificationService;
use Illuminate\Support\Str;
use RuntimeException;

class ChatOrchestrator
{
  public function __construct(
    private readonly ChatIntentClassifier $classifier,
    private readonly ChatContextBuilder $contextBuilder,
    private readonly ChatSafetyGuard $safetyGuard,
    private readonly CoachDeterministicResponder $deterministicResponder,
    private readonly ChatModelManager $modelManager,
    private readonly CoachToolExecutor $toolExecutor,
    private readonly ChatResponseQualityScorer $qualityScorer,
    private readonly AiUsageLogger $usageLogger,
    private readonly FeatureConfigResolver $features,
    private readonly AppNotificationService $notifications,
) {}

    /**
     * Run the complete coach pipeline: classify, gather context, call tools/model/fallbacks, review safety, and persist messages.
     */
    public function handle(
        User $user,
        string $message,
        array $runtimeContext = [],
        ?AiConversation $conversation = null,
    ): array {
        $question = trim($message);
        $conversation ??= AiConversation::query()->create([
            'user_id' => $user->id,
            'title' => $this->makeTitle($question),
            'last_message_at' => now(),
        ]);

        if ($conversation->user_id !== $user->id) {
            throw new RuntimeException('This conversation does not belong to the current user.');
        }

        $classification = $this->classifier->classify($question, $runtimeContext);

        $userMessage = AiMessage::query()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $question,
            'metadata' => [
                'screen_context' => $runtimeContext['screen_context'] ?? 'coach',
                'intent' => $classification['intent'],
                'feature' => $classification['feature'],
            ],
        ]);

        $preflight = $this->safetyGuard->preflight($question);
        $provider = $this->features->provider(FeatureConfigResolver::FEATURE_CHAT);
        $contextBundle = $this->contextBuilder->build($user, $runtimeContext, $conversation, $classification);
        $tooling = [
            'calls' => [],
            'results' => [],
            'warnings' => [],
        ];

        $toolRuntime = array_merge($runtimeContext, [
            'diet_type' => data_get($contextBundle, 'context.restrictions.diet_type'),
            'injuries' => data_get($contextBundle, 'context.restrictions.injuries', []),
            'available_equipment' => data_get($contextBundle, 'context.user_profile.available_equipment', []),
            'workout_location' => data_get($contextBundle, 'context.user_profile.workout_location'),
        ]);
        $tooling = $this->toolExecutor->planAndExecute($user, $question, $toolRuntime, $classification);

        if (($tooling['results'] ?? []) !== []) {
            $contextBundle['context']['tool_results'] = $tooling['results'];
            $contextBundle['used_context_keys'][] = 'tool_results';
            $contextBundle['used_context_keys'] = array_values(array_unique($contextBundle['used_context_keys']));
        }

        $override = $this->deterministicResponder->respond($user, $question, $contextBundle['context'], $classification);

        $model = 'safety-short-circuit';
        $answer = (string) ($preflight['answer'] ?? '');
        $warnings = array_values(array_unique(array_merge($preflight['warnings'] ?? [], $tooling['warnings'] ?? [])));
        $usage = [
            'input_tokens' => 0,
            'output_tokens' => 0,
            'total_tokens' => 0,
        ];
        $providerRequestId = null;
        $latencyMs = null;

        if ($answer === '') {
            if ($override !== null) {
                $answer = (string) ($override['answer'] ?? '');
                $warnings = array_values(array_unique(array_merge($warnings, $override['warnings'] ?? [])));
                $model = (string) ($override['model'] ?? 'coach-policy');
                $chatMetadata = array_filter([
                    'chat_path' => $override['chat_path'] ?? null,
                    'mode_label' => $override['mode_label'] ?? null,
                    'reason' => $override['reason'] ?? null,
                ], fn ($value) => $value !== null && $value !== []);
            } else {
                try {
                    $result = $this->modelManager->client()->respond(
                        $question,
                        $contextBundle['context'],
                        [
                            'user_id' => $user->id,
                            'intent' => $classification['intent'],
                            'feature' => $classification['feature'],
                            'screen_context' => $runtimeContext['screen_context'] ?? 'coach',
                            'conversation_id' => $conversation->id,
                        ],
                    );
                    if (is_array($result['tool_results'] ?? null) && $result['tool_results'] !== []) {
                        $tooling['results'] = array_values(array_merge($tooling['results'] ?? [], $result['tool_results']));
                    }

                    $reviewed = $this->safetyGuard->review(
                        (string) ($result['answer'] ?? ''),
                        $contextBundle['context'],
                        [
                            'question' => $question,
                            'classification' => $classification,
                        ],
                    );
                    $answer = $reviewed['answer'];
                    $warnings = array_values(array_unique(array_merge(
                        $warnings,
                        $result['warnings'] ?? [],
                        $reviewed['warnings'] ?? [],
                    )));
                    $model = (string) ($result['model'] ?? 'unknown-chat-model');
                    $usage = $result['usage'] ?? $usage;
                    $providerRequestId = $result['provider_request_id'] ?? null;
                    $latencyMs = is_numeric($result['latency_ms'] ?? null)
                        ? (int) $result['latency_ms']
                        : null;
                    $chatPath = is_string($result['chat_path'] ?? null)
                        ? (string) $result['chat_path']
                        : null;
                    $chatMetadata = array_filter([
                        'chat_path' => $chatPath,
                        'context_score' => $result['context_score'] ?? null,
                        'matches' => $result['matches'] ?? null,
                        'tool_results' => $result['tool_results'] ?? null,
                        'mode_label' => $chatPath === 'personalized'
                            ? 'Personalized'
                            : ($chatPath === 'general' ? 'General guidance' : null),
                    ], fn ($value) => $value !== null && $value !== []);
                } catch (\Throwable $e) {
                    $answer = 'AI Coach is temporarily unavailable right now. Please try again shortly, or continue with Dashboard, Meal Tracker, Workouts, Nearby, Messages, and Settings.';
                    $warnings[] = 'Primary coach request failed, so a built-in fallback message was returned.';
                    $model = 'chat-fallback';
                    $chatMetadata = [];
                }
            }
        } else {
            $chatMetadata = [];
        }

        $quality = $this->qualityScorer->score(
            $question,
            $answer,
            $contextBundle['context'],
            $classification,
            $warnings
        );
        $contextSources = $this->contextSources($contextBundle['context']);

        $assistantMessage = AiMessage::query()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $answer,
            'metadata' => [
                'intent' => $classification['intent'],
                'feature' => $classification['feature'],
                'warnings' => array_values(array_unique($warnings)),
                'used_context_keys' => $contextBundle['used_context_keys'] ?? [],
                'provider' => $provider,
                'model' => $model,
                'screen_context' => $runtimeContext['screen_context'] ?? 'coach',
                'chat' => $chatMetadata,
                'context_sources' => $contextSources,
                'tools' => [
                    'planned_calls' => $tooling['calls'] ?? [],
                    'executed' => $tooling['results'] ?? [],
                ],
                'quality' => $quality,
            ],
        ]);
        $this->notifications->chatbotResponded($user);

        $conversation->forceFill([
            'title' => $conversation->title ?: $this->makeTitle($question),
            'last_message_at' => now(),
        ])->save();

        $this->usageLogger->log(
            $user,
            'chat',
            $usage,
            $model,
            $latencyMs,
            $providerRequestId,
            [
                'provider' => $provider,
                'intent' => $classification['intent'],
                'feature' => $classification['feature'],
                'conversation_id' => $conversation->id,
                'tools_called' => array_values(array_map(
                    static fn (array $entry): string => (string) ($entry['name'] ?? ''),
                    array_filter($tooling['results'] ?? [], static fn (array $entry): bool => (bool) ($entry['ok'] ?? false))
                )),
                'quality' => $quality,
            ],
        );

        return [
            'conversation' => $conversation->fresh(['messages' => fn ($query) => $query->latest('id')->limit(1)]),
            'user_message' => $userMessage->fresh(),
            'assistant_message' => $assistantMessage->fresh(),
            'intent' => $classification['intent'],
            'feature' => $classification['feature'],
            'warnings' => array_values(array_unique($warnings)),
            'used_context_keys' => $contextBundle['used_context_keys'] ?? [],
            'provider' => $provider,
            'model' => $model,
            'quality' => $quality,
        ];
    }

    private function makeTitle(string $question): string
    {
        return Str::limit(Str::of($question)->squish()->value(), 60);
    }

    /**
     * Summarize which own-user context groups were loaded for this turn without exposing raw prompt text.
     *
     * @return array<int, array<string, mixed>>
     */
    private function contextSources(array $context): array
    {
        $definitions = [
            'user_profile' => [
                'label' => 'Saved profile',
                'fields' => [
                    'age' => 'age',
                    'sex' => 'sex',
                    'height_cm' => 'height',
                    'weight_kg' => 'weight',
                    'goal' => 'goal',
                    'activity_level' => 'activity level',
                    'workout_location' => 'workout location',
                    'workout_days_per_week' => 'workout days per week',
                    'available_equipment' => 'available equipment',
                ],
            ],
            'restrictions' => [
                'label' => 'Safety restrictions',
                'fields' => [
                    'diet_type' => 'diet type',
                    'allergies' => 'allergies',
                    'medical_conditions' => 'medical conditions',
                    'injuries' => 'injuries',
                ],
            ],
            'today_summary' => [
                'label' => 'Selected day logs',
                'fields' => [
                    'date' => 'date',
                    'calories' => 'calories',
                    'protein_g' => 'protein',
                    'carbs_g' => 'carbs',
                    'fat_g' => 'fat',
                    'water_ml' => 'water',
                    'target_water_ml' => 'water target',
                    'meals' => 'meal entries',
                    'workouts' => 'workout entries',
                ],
            ],
            'last_7_days_summary' => [
                'label' => 'Last 7 days',
                'fields' => [
                    'nutrition' => 'nutrition summary',
                    'workouts_completed' => 'workout count',
                    'workout_day_names' => 'workout days',
                    'latest_measurement' => 'latest measurement',
                ],
            ],
            'plans' => [
                'label' => 'Active plans',
                'fields' => [
                    'nutrition_plan_name' => 'nutrition plan',
                    'nutrition_goal' => 'nutrition goal',
                    'nutrition_targets' => 'nutrition targets',
                    'workout_plan_name' => 'workout plan',
                    'workout_goal' => 'workout goal',
                    'workout_days' => 'workout days',
                ],
            ],
            'conversation_context' => [
                'label' => 'Current thread',
                'fields' => [
                    'recent_turns' => 'recent messages',
                    'summary' => 'conversation summary',
                ],
            ],
            'runtime' => [
                'label' => 'Current request details',
                'fields' => [
                    'available_ingredients' => 'available ingredients',
                ],
            ],
            'tool_results' => [
                'label' => 'Coach tools',
                'fields' => [],
            ],
        ];

        $sources = [];

        foreach ($definitions as $group => $definition) {
            $payload = is_array($context[$group] ?? null) ? $context[$group] : [];
            if ($payload === []) {
                continue;
            }

            $fields = [];
            foreach (($definition['fields'] ?? []) as $key => $label) {
                if (array_key_exists($key, $payload) && $this->hasContextValue($payload[$key])) {
                    $fields[] = $label;
                }
            }

            if ($fields === [] && $group !== 'tool_results') {
                continue;
            }

            $sources[] = [
                'key' => $group,
                'label' => $definition['label'],
                'fields' => $fields,
            ];
        }

        return $sources;
    }

    private function hasContextValue(mixed $value): bool
    {
        if ($value === null || $value === '' || $value === false) {
            return false;
        }

        if (is_array($value)) {
            return $value !== [];
        }

        return true;
    }
}
