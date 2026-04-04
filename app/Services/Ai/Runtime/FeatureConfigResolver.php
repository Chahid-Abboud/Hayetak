<?php

namespace App\Services\Ai\Runtime;

use InvalidArgumentException;

class FeatureConfigResolver
{
    public const FEATURE_CHAT = 'chat';

    public const FEATURE_PLANNER = 'planner';

    public function provider(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => (string) config('ai.chat.provider', 'stub'),
            self::FEATURE_PLANNER => $this->ollamaOnly(self::FEATURE_PLANNER)
                ? 'ollama'
                : (string) config('ai.planner.provider', 'ollama'),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function promptDirectory(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => 'coach',
            self::FEATURE_PLANNER => 'planner',
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function promptVersion(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => (string) config('ai.chat.prompt_version', 'hayetak_coach_v1'),
            self::FEATURE_PLANNER => (string) config('ai.planner.prompt_version', 'hayetak_planner_v2'),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function schemaVersion(string $feature): ?string
    {
        return match ($feature) {
            self::FEATURE_PLANNER => (string) config('ai.planner.schema_version', 'hayetak_plan_v2'),
            self::FEATURE_CHAT => null,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function requestTimeoutSeconds(string $feature): int
    {
        return match ($feature) {
            self::FEATURE_CHAT => (int) config('ai.timeouts.request_seconds', 60),
            self::FEATURE_PLANNER => (int) config('ai.planner.request_timeout_seconds', 300),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function openAi(string $feature): array
    {
        $model = match ($feature) {
            self::FEATURE_CHAT => (string) config('ai.models.coach', 'gpt-4.1-mini'),
            self::FEATURE_PLANNER => (string) config('ai.planner.openai.model', config('ai.models.planner', 'gpt-4.1-mini')),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };

        $maxOutputTokens = match ($feature) {
            self::FEATURE_CHAT => (int) config('ai.tokens.coach_max_output', 900),
            self::FEATURE_PLANNER => (int) config('ai.planner.openai.max_output_tokens', config('ai.tokens.planner_max_output', 3200)),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };

        return [
            'model' => $model,
            'max_output_tokens' => $maxOutputTokens,
        ];
    }

    public function ollamaChat(string $feature): array
    {
        return match ($feature) {
            self::FEATURE_CHAT => [
                'base_url' => rtrim((string) config('ai.chat.self_hosted.ollama.base_url', 'http://127.0.0.1:11434'), '/'),
                'model' => (string) config('ai.chat.self_hosted.ollama.chat_model', 'llama3.1:8b'),
                'connect_timeout' => (int) config('ai.chat.self_hosted.ollama.connect_timeout', 4),
                'timeout' => (int) config('ai.chat.self_hosted.ollama.chat_timeout', 120),
                'temperature' => (float) config('ai.chat.self_hosted.ollama.temperature', 0.2),
                'max_output_tokens' => (int) config('ai.tokens.coach_max_output', 900),
            ],
            self::FEATURE_PLANNER => [
                'base_url' => rtrim((string) config('ai.planner.ollama.base_url', 'http://127.0.0.1:11434'), '/'),
                'model' => (string) config('ai.planner.ollama.model', 'llama3.1:8b'),
                'connect_timeout' => (int) config('ai.planner.ollama.connect_timeout', 4),
                'timeout' => max(
                    20,
                    min(
                        (int) config('ai.planner.ollama.timeout', 240),
                        (int) config('ai.planner.request_timeout_seconds', 300),
                        150
                    )
                ),
                'temperature' => (float) config('ai.planner.ollama.temperature', 0.1),
                'max_output_tokens' => max(
                    500,
                    min(
                        (int) config('ai.planner.ollama.max_output_tokens', config('ai.tokens.planner_max_output', 3200)),
                        1400
                    )
                ),
            ],
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function ollamaEmbedding(string $feature): array
    {
        $settings = $this->ollamaChat($feature);

        return [
            'base_url' => $settings['base_url'],
            'model' => (string) config('ai.chat.self_hosted.ollama.embedding_model', 'nomic-embed-text'),
            'connect_timeout' => (int) config('ai.chat.self_hosted.ollama.connect_timeout', 4),
            'timeout' => (int) config('ai.chat.self_hosted.ollama.embedding_timeout', 60),
        ];
    }

    public function retrieval(string $feature): array
    {
        if ($feature !== self::FEATURE_CHAT) {
            throw new InvalidArgumentException("Retrieval settings are not supported for AI feature [{$feature}].");
        }

        return [
            'threshold' => (float) config('ai.chat.self_hosted.retrieval.threshold', 0.65),
            'limit' => (int) config('ai.chat.self_hosted.retrieval.limit', 4),
            'max_context_characters' => (int) config('ai.chat.self_hosted.retrieval.max_context_characters', 2200),
        ];
    }

    public function qdrant(): array
    {
        return [
            'base_url' => rtrim((string) config('ai.chat.self_hosted.qdrant.base_url', 'http://127.0.0.1:6333'), '/'),
            'collection' => (string) config('ai.chat.self_hosted.qdrant.collection', 'hayetak_user_context'),
            'timeout' => (int) config('ai.chat.self_hosted.qdrant.timeout', 20),
            'distance' => (string) config('ai.chat.self_hosted.qdrant.distance', 'Cosine'),
        ];
    }

    public function fallbackEnabled(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => $this->ollamaOnly(self::FEATURE_PLANNER)
                ? false
                : (bool) config('ai.planner.fallback.enabled', false),
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function localFallbackEnabled(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => (bool) config('ai.planner.local_fallback.enabled', true),
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function ollamaOnly(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => (bool) config('ai.planner.ollama_only', true),
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    public function shouldSyncContextDuringTests(): bool
    {
        return (bool) config('ai.chat.self_hosted.sync_during_tests', false);
    }

    public function usesSelfHostedChat(): bool
    {
        return $this->provider(self::FEATURE_CHAT) === 'self_hosted';
    }
}
