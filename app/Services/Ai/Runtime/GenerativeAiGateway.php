<?php

namespace App\Services\Ai\Runtime;

use App\Services\Ai\ExternalResponsesClient;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GenerativeAiGateway
{
    public function __construct(
        private readonly FeatureConfigResolver $features,
        private readonly ExternalResponsesClient $openAi,
        private readonly OllamaClient $ollama,
    ) {}

    public function generateStructured(string $feature, array $messages, array $schema): array
    {
        $provider = $this->features->provider($feature);

        return match ($provider) {
            'openai' => $this->generateWithOpenAi($feature, $messages, $schema),
            'ollama' => $this->generateWithOllamaFallback($feature, $messages, $schema),
            default => throw new RuntimeException("Structured generation is not supported for provider [{$provider}] on feature [{$feature}]."),
        };
    }

    private function generateWithOpenAi(string $feature, array $messages, array $schema): array
    {
        $settings = $this->features->openAi($feature);

        $response = $this->openAi->respond([
            'model' => $settings['model'],
            'input' => $messages,
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'hayetak_'.str_replace('-', '_', $feature),
                    'schema' => $schema,
                    'strict' => true,
                ],
            ],
            'max_output_tokens' => $settings['max_output_tokens'],
        ]);

        return [
            'provider' => 'openai',
            'provider_request_id' => $response['id'] ?? null,
            'model' => $response['model'] ?? $settings['model'],
            'json' => $response['json'] ?? null,
            'usage' => $response['usage'] ?? [],
            'latency_ms' => $response['latency_ms'] ?? null,
            'raw' => $response['raw'] ?? [],
        ];
    }

    private function generateWithOllamaFallback(string $feature, array $messages, array $schema): array
    {
        try {
            return $this->generateWithOllama($feature, $messages, $schema);
        } catch (Throwable $primaryError) {
            if (! $this->shouldFallbackToOpenAi($feature)) {
                throw $primaryError;
            }

            Log::warning('AI primary provider failed; attempting OpenAI fallback.', [
                'feature' => $feature,
                'primary_provider' => 'ollama',
                'fallback_provider' => 'openai',
                'error' => $primaryError->getMessage(),
            ]);

            $fallback = $this->generateWithOpenAi($feature, $messages, $schema);
            $fallback['fallback'] = [
                'used' => true,
                'from' => 'ollama',
                'to' => 'openai',
                'error' => $primaryError->getMessage(),
            ];

            return $fallback;
        }
    }

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

    private function shouldFallbackToOpenAi(string $feature): bool
    {
        if (! $this->features->fallbackEnabled($feature)) {
            return false;
        }

        return trim((string) config('services.openai.api_key', '')) !== '';
    }
}
