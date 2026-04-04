<?php

namespace App\Services\Ai\Chat;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\User;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Runtime\FeatureConfigResolver;
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
        private readonly AiUsageLogger $usageLogger,
        private readonly FeatureConfigResolver $features,
    ) {}

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
        $contextBundle = $this->contextBuilder->build($user, $runtimeContext, $conversation, $classification);
        $override = $this->deterministicResponder->respond($user, $question, $contextBundle['context'], $classification);

        $provider = $this->features->provider(FeatureConfigResolver::FEATURE_CHAT);
        $model = 'safety-short-circuit';
        $answer = (string) ($preflight['answer'] ?? '');
        $warnings = $preflight['warnings'] ?? [];
        $usage = [
            'input_tokens' => 0,
            'output_tokens' => 0,
            'total_tokens' => 0,
        ];
        $providerRequestId = null;

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
                    $chatPath = is_string($result['chat_path'] ?? null)
                        ? (string) $result['chat_path']
                        : null;
                    $chatMetadata = array_filter([
                        'chat_path' => $chatPath,
                        'context_score' => $result['context_score'] ?? null,
                        'matches' => $result['matches'] ?? null,
                        'mode_label' => $chatPath === 'personalized'
                            ? 'Personalized'
                            : ($chatPath === 'general' ? 'General guidance' : null),
                    ], fn ($value) => $value !== null && $value !== []);
                } catch (\Throwable $e) {
                    $answer = 'The AI coach is not fully connected yet, so I could not reach the model right now. You can still ask again later, or use Dashboard, Meal Tracker, Workouts, Nearby, Messages, and Settings directly.';
                    $warnings[] = 'Model request failed, so a built-in fallback message was returned.';
                    $model = 'chat-fallback';
                    $chatMetadata = [];
                }
            }
        } else {
            $chatMetadata = [];
        }

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
            ],
        ]);

        $conversation->forceFill([
            'title' => $conversation->title ?: $this->makeTitle($question),
            'last_message_at' => now(),
        ])->save();

        $this->usageLogger->log(
            $user,
            'chat',
            $usage,
            $model,
            null,
            $providerRequestId,
            [
                'provider' => $provider,
                'intent' => $classification['intent'],
                'feature' => $classification['feature'],
                'conversation_id' => $conversation->id,
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
        ];
    }

    private function makeTitle(string $question): string
    {
        return Str::limit(Str::of($question)->squish()->value(), 60);
    }
}
