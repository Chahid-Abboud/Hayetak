<?php

namespace App\Services\Ai\Runtime;

use InvalidArgumentException;

class FeatureConfigResolver
{
    public const FEATURE_CHAT = 'chat';

    public const FEATURE_PLANNER = 'planner';

    /**
     * Resolve the active provider for a feature.
     */
    public function provider(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => $this->resolveChatProvider(),
            self::FEATURE_PLANNER => 'ollama',
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Resolve prompt-template directory name for a feature.
     */
    public function promptDirectory(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => 'coach',
            self::FEATURE_PLANNER => 'planner',
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Resolve current prompt version tag for traceability.
     */
    public function promptVersion(string $feature): string
    {
        return match ($feature) {
            self::FEATURE_CHAT => (string) config('ai.chat.prompt_version', 'hayetak_coach_v1'),
            self::FEATURE_PLANNER => (string) config('ai.planner.prompt_version', 'hayetak_planner_v2'),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Resolve schema version tag (planner only).
     */
    public function schemaVersion(string $feature): ?string
    {
        return match ($feature) {
            self::FEATURE_PLANNER => (string) config('ai.planner.schema_version', 'hayetak_plan_v2'),
            self::FEATURE_CHAT => null,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Resolve request timeout budget for the feature.
     */
    public function requestTimeoutSeconds(string $feature): int
    {
        return match ($feature) {
            self::FEATURE_CHAT => (int) config('ai.timeouts.request_seconds', 60),
            self::FEATURE_PLANNER => (int) config('ai.planner.request_timeout_seconds', 300),
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Return Ollama chat settings for planner/chat features.
     */
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

    /**
     * Return Ollama embedding settings (chat retrieval).
     */
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

    /**
     * Return retrieval settings for self-hosted chat context search.
     */
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

    /**
     * Return Qdrant connection settings.
     */
    public function qdrant(): array
    {
        return [
            'base_url' => rtrim((string) config('ai.chat.self_hosted.qdrant.base_url', 'http://127.0.0.1:6333'), '/'),
            'collection' => (string) config('ai.chat.self_hosted.qdrant.collection', 'hayetak_user_context'),
            'timeout' => (int) config('ai.chat.self_hosted.qdrant.timeout', 20),
            'distance' => (string) config('ai.chat.self_hosted.qdrant.distance', 'Cosine'),
        ];
    }

    /**
     * Legacy fallback toggle (currently disabled for chat/planner).
     */
    public function fallbackEnabled(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => false,
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Local deterministic fallback toggle.
     */
    public function localFallbackEnabled(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => (bool) config('ai.planner.local_fallback.enabled', true),
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Whether a feature is locked to Ollama-only mode.
     */
    public function ollamaOnly(string $feature): bool
    {
        return match ($feature) {
            self::FEATURE_PLANNER => true,
            self::FEATURE_CHAT => false,
            default => throw new InvalidArgumentException("Unsupported AI feature [{$feature}]."),
        };
    }

    /**
     * Toggle context sync behavior in tests.
     */
    public function shouldSyncContextDuringTests(): bool
    {
        return (bool) config('ai.chat.self_hosted.sync_during_tests', false);
    }

    /**
     * Convenience check for self-hosted chat activation.
     */
    public function usesSelfHostedChat(): bool
    {
        return $this->provider(self::FEATURE_CHAT) === 'self_hosted';
    }

    /**
     * Allow local development to answer from the already-built prompt context without the extra vector lookup hop.
     */
    public function shouldUseDirectContextFastPath(): bool
    {
        if (! $this->usesSelfHostedChat()) {
            return false;
        }

        if ((bool) config('ai.chat.self_hosted.direct_context_fast_path.force', false)) {
            return true;
        }

        return app()->environment('local')
            && (bool) config('ai.chat.self_hosted.direct_context_fast_path.enabled_in_local', true);
    }

    /**
     * Resolve chat provider with auto-mode fallback rules.
     */
    private function resolveChatProvider(): string
    {
        $configured = strtolower(trim((string) config('ai.chat.provider', 'auto')));
        if ($configured === '' || $configured === 'auto') {
            if (app()->environment('testing')) {
                return 'stub';
            }

            $selfHostedBase = trim((string) config('ai.chat.self_hosted.ollama.base_url', ''));
            if ($selfHostedBase !== '') {
                return 'self_hosted';
            }

            $httpEndpoint = trim((string) config('ai.chat.http.endpoint', ''));
            if ($httpEndpoint !== '') {
                return 'http';
            }

            return 'stub';
        }

        if (in_array($configured, ['self_hosted', 'http', 'stub'], true)) {
            return $configured;
        }

        return 'stub';
    }
}
