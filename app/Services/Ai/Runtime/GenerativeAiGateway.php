<?php

namespace App\Services\Ai\Runtime;

use RuntimeException;

class GenerativeAiGateway
{
    public function __construct(
        private readonly FeatureConfigResolver $features,
        private readonly OllamaClient $ollama,
    ) {}

    /**
     * Generate schema-constrained JSON output for a feature using the configured provider.
     */
    public function generateStructured(string $feature, array $messages, array $schema): array
    {
        $provider = $this->features->provider($feature);

        if ($provider !== 'ollama') {
            throw new RuntimeException("Structured generation is not supported for provider [{$provider}] on feature [{$feature}].");
        }

        return $this->generateWithOllama($feature, $messages, $schema);
    }

    /**
     * Run a structured generation request against Ollama and parse JSON safely.
     */
    private function generateWithOllama(string $feature, array $messages, array $schema): array
    {
        $settings = $this->features->ollamaChat($feature);
        $format = $feature === FeatureConfigResolver::FEATURE_PLANNER ? 'json' : $schema;
        $response = $this->ollama->chat($feature, $messages, [
            'format' => $format,
            'max_output_tokens' => max(512, (int) ($settings['max_output_tokens'] ?? 2200)),
        ]);

        $decoded = $this->decodeJsonPayload((string) ($response['answer'] ?? ''));
        if (! is_array($decoded)) {
            $response = $this->retryOllamaForJson($feature, $messages, $schema, $settings, $response);
            $decoded = $this->decodeJsonPayload((string) ($response['answer'] ?? ''));
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('The Ollama generator did not return valid JSON.');
        }

        return [
            'provider' => 'ollama',
            'provider_request_id' => $response['provider_request_id'] ?? null,
            'model' => $response['model'] ?? $settings['model'],
            'json' => $decoded,
            'usage' => $response['usage'] ?? [],
            'latency_ms' => $response['latency_ms'] ?? null,
            'raw' => $response['raw'] ?? [],
        ];
    }

    /**
     * Retry once with stricter JSON-only instructions when the initial payload is malformed.
     */
    private function retryOllamaForJson(string $feature, array $messages, array $schema, array $settings, array $initialResponse): array
    {
        $baseBudget = max(900, (int) ($settings['max_output_tokens'] ?? 1400));
        $retryBudget = min(2600, max(
            $baseBudget + 250,
            ((int) data_get($initialResponse, 'usage.output_tokens', 0)) + 300
        ));

        $retryTimeout = max(
            45,
            min(
                (int) ($settings['timeout'] ?? 120),
                120
            )
        );

        $retryMessages = $messages;
        $retryMessages[] = [
            'role' => 'system',
            'content' => [
                [
                    'type' => 'input_text',
                    'text' => 'Return only one complete JSON object that matches the required schema exactly. Do not use markdown fences, explanations, or extra text.',
                ],
            ],
        ];

        $format = $feature === FeatureConfigResolver::FEATURE_PLANNER ? 'json' : $schema;

        return $this->ollama->chat($feature, $retryMessages, [
            'format' => $format,
            'temperature' => 0.0,
            'max_output_tokens' => $retryBudget,
            'timeout' => $retryTimeout,
        ]);
    }

    /**
     * Best-effort JSON extraction from plain text, fenced blocks, or wrapped responses.
     */
    private function decodeJsonPayload(string $answer): ?array
    {
        $trimmed = trim($answer);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/```(?:json)?\s*(\{.*\}|\[.*\])\s*```/is', $trimmed, $matches) === 1) {
            $decoded = json_decode(trim((string) ($matches[1] ?? '')), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $firstBrace = strpos($trimmed, '{');
        $lastBrace = strrpos($trimmed, '}');

        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $candidate = substr($trimmed, $firstBrace, $lastBrace - $firstBrace + 1);
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
