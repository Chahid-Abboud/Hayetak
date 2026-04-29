<?php

namespace App\Services\Ai\Chat\Providers;

use App\Services\Ai\Chat\Contracts\ChatModelClient;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HttpChatModelClient implements ChatModelClient
{
    /**
     * Forward chat calls to an external HTTP endpoint and normalize the provider payload.
     */
    public function respond(string $question, array $context, array $options = []): array
    {
        $endpoint = trim((string) config('ai.chat.http.endpoint'));
        if ($endpoint === '') {
            throw new RuntimeException('AI_CHAT_ENDPOINT is not configured.');
        }

        $token = trim((string) config('ai.chat.http.token'));
        $timeout = (int) config('ai.chat.http.timeout', 30);

        $request = Http::timeout($timeout)->acceptJson();

        if ($token !== '') {
            $request = $request->withToken($token);
        }

        $response = $request->post($endpoint, [
            'question' => $question,
            'context' => $context,
            'options' => $options,
        ])->throw()->json();

        $answer = trim((string) ($response['answer'] ?? ''));
        if ($answer === '') {
            throw new RuntimeException('The external chat provider returned an empty answer.');
        }

        return [
            'answer' => $answer,
            'model' => $response['model_name'] ?? 'external-chat-model',
            'usage' => [
                'input_tokens' => (int) data_get($response, 'usage.input_tokens', 0),
                'output_tokens' => (int) data_get($response, 'usage.output_tokens', 0),
                'total_tokens' => (int) data_get($response, 'usage.total_tokens', 0),
            ],
            'provider_request_id' => $response['request_id'] ?? null,
            'raw' => is_array($response) ? $response : [],
        ];
    }
}
