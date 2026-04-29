<?php

namespace App\Services\Ai\Runtime;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaClient
{
    public function __construct(private readonly FeatureConfigResolver $features) {}

    /**
     * Create an embedding vector for a text input using the feature's embedding configuration.
     */
    public function embed(string $feature, string $text): array
    {
        $settings = $this->features->ollamaEmbedding($feature);
        $startedAt = microtime(true);

        $request = Http::baseUrl($settings['base_url'])
            ->acceptJson()
            ->connectTimeout((int) ($settings['connect_timeout'] ?? 4))
            ->timeout($settings['timeout']);

        $response = $request->post('/api/embed', [
            'model' => $settings['model'],
            'input' => $text,
        ]);

        if ($response->status() === 404) {
            $response = $request->post('/api/embeddings', [
                'model' => $settings['model'],
                'prompt' => $text,
            ]);
        }

        $response = $response
            ->throw()
            ->json();

        $vector = $response['embeddings'][0] ?? $response['embedding'] ?? null;
        if (! is_array($vector) || $vector === []) {
            throw new RuntimeException('The local embedding model returned an empty vector.');
        }

        return [
            'embedding' => array_map(static fn ($value) => (float) $value, $vector),
            'model' => $response['model'] ?? $settings['model'],
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'raw' => is_array($response) ? $response : [],
        ];
    }

    /**
     * Send a chat-completion style request to Ollama and normalize usage metadata.
     */
    public function chat(string $feature, array $messages, array $options = []): array
    {
        $settings = $this->features->ollamaChat($feature);
        $startedAt = microtime(true);

        $payload = [
            'model' => (string) ($options['model'] ?? $settings['model']),
            'stream' => (bool) ($options['stream'] ?? false),
            'messages' => $this->normalizeMessages($messages),
        ];

        $format = $options['format'] ?? null;
        if ((is_array($format) && $format !== []) || (is_string($format) && trim($format) !== '')) {
            $payload['format'] = $format;
        }

        $temperature = $options['temperature'] ?? $settings['temperature'] ?? null;
        $maxOutputTokens = $options['max_output_tokens'] ?? $settings['max_output_tokens'] ?? null;
        $payload['options'] = array_filter([
            'temperature' => $temperature !== null ? (float) $temperature : null,
            'num_predict' => is_numeric($maxOutputTokens) ? max(1, (int) $maxOutputTokens) : null,
        ], static fn ($value) => $value !== null);

        $response = Http::baseUrl($settings['base_url'])
            ->acceptJson()
            ->connectTimeout((int) ($options['connect_timeout'] ?? $settings['connect_timeout'] ?? 4))
            ->timeout((int) ($options['timeout'] ?? $settings['timeout']))
            ->post('/api/chat', $payload)
            ->throw()
            ->json();

        $answer = trim((string) data_get($response, 'message.content', ''));
        if ($answer === '') {
            throw new RuntimeException('The local chat model returned an empty answer.');
        }

        $inputTokens = (int) ($response['prompt_eval_count'] ?? 0);
        $outputTokens = (int) ($response['eval_count'] ?? 0);

        return [
            'answer' => $answer,
            'model' => $response['model'] ?? $payload['model'],
            'usage' => [
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'total_tokens' => $inputTokens + $outputTokens,
            ],
            'provider_request_id' => null,
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'raw' => is_array($response) ? $response : [],
        ];
    }

    /**
     * Convert mixed message payloads (plain text or typed content parts) into Ollama format.
     */
    private function normalizeMessages(array $messages): array
    {
        return array_map(function (array $message): array {
            $content = $message['content'] ?? '';

            if (is_array($content)) {
                $parts = [];
                foreach ($content as $part) {
                    if (($part['type'] ?? null) === 'input_text') {
                        $parts[] = (string) ($part['text'] ?? '');
                    }
                }

                $content = trim(implode("\n\n", array_filter($parts)));
            }

            return [
                'role' => (string) ($message['role'] ?? 'user'),
                'content' => trim((string) $content),
            ];
        }, $messages);
    }
}
