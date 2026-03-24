<?php

namespace App\Services\Ai\Chat;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class SelfHostedOllamaClient
{
    public function embed(string $text): array
    {
        $startedAt = microtime(true);
        $request = Http::baseUrl($this->baseUrl())
            ->acceptJson()
            ->timeout((int) config('ai.chat.self_hosted.ollama.embedding_timeout', 60));

        $response = $request->post('/api/embed', [
            'model' => (string) config('ai.chat.self_hosted.ollama.embedding_model'),
            'input' => $text,
        ]);

        if ($response->status() === 404) {
            $response = $request->post('/api/embeddings', [
                'model' => (string) config('ai.chat.self_hosted.ollama.embedding_model'),
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
            'model' => $response['model'] ?? (string) config('ai.chat.self_hosted.ollama.embedding_model'),
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'raw' => is_array($response) ? $response : [],
        ];
    }

    public function chat(array $messages): array
    {
        $startedAt = microtime(true);
        $response = Http::baseUrl($this->baseUrl())
            ->acceptJson()
            ->timeout((int) config('ai.chat.self_hosted.ollama.chat_timeout', 120))
            ->post('/api/chat', [
                'model' => (string) config('ai.chat.self_hosted.ollama.chat_model'),
                'stream' => false,
                'options' => [
                    'temperature' => (float) config('ai.chat.self_hosted.ollama.temperature', 0.2),
                ],
                'messages' => $messages,
            ])
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
            'model' => $response['model'] ?? (string) config('ai.chat.self_hosted.ollama.chat_model'),
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

    private function baseUrl(): string
    {
        return rtrim((string) config('ai.chat.self_hosted.ollama.base_url', 'http://127.0.0.1:11434'), '/');
    }
}
