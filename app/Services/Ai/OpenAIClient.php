<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAIClient
{
    /**
     * @throws RuntimeException
     */
    public function respond(array $payload): array
    {
        $apiKey = (string) config('services.openai.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $timeout = (int) config('services.openai.timeout', 60);
        $project = trim((string) config('services.openai.project', ''));

        $headers = [
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ];
        if ($project !== '') {
            $headers['OpenAI-Project'] = $project;
        }

        $startedAt = microtime(true);

        try {
            $response = Http::withHeaders($headers)
                ->timeout($timeout)
                ->post($baseUrl.'/responses', $payload)
                ->throw();
        } catch (ConnectionException $e) {
            throw new RuntimeException('OpenAI request timed out.');
        } catch (\Throwable $e) {
            throw new RuntimeException('OpenAI request failed: '.$e->getMessage());
        }

        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);
        $data = $response->json() ?? [];

        $outputText = $this->extractOutputText($data);
        $decoded = null;
        if (is_string($outputText) && $outputText !== '') {
            $decodedCandidate = json_decode($outputText, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $decoded = $decodedCandidate;
            }
        }

        return [
            'id' => $data['id'] ?? null,
            'model' => $data['model'] ?? ($payload['model'] ?? null),
            'status' => $data['status'] ?? null,
            'output_text' => $outputText,
            'json' => is_array($decoded) ? $decoded : null,
            'tool_calls' => $this->extractToolCalls($data),
            'usage' => [
                'input_tokens' => (int) ($data['usage']['input_tokens'] ?? 0),
                'output_tokens' => (int) ($data['usage']['output_tokens'] ?? 0),
                'total_tokens' => (int) ($data['usage']['total_tokens'] ?? 0),
            ],
            'latency_ms' => $latencyMs,
            'raw' => $data,
        ];
    }

    private function extractOutputText(array $data): string
    {
        $direct = $data['output_text'] ?? null;
        if (is_string($direct) && trim($direct) !== '') {
            return trim($direct);
        }

        $chunks = [];
        $output = $data['output'] ?? [];
        if (! is_array($output)) {
            return '';
        }

        foreach ($output as $item) {
            if (! is_array($item)) {
                continue;
            }

            $content = $item['content'] ?? null;
            if (! is_array($content)) {
                continue;
            }

            foreach ($content as $part) {
                if (! is_array($part)) {
                    continue;
                }

                $text = $part['text'] ?? null;
                if (is_string($text) && trim($text) !== '') {
                    $chunks[] = trim($text);
                }
            }
        }

        return trim(implode("\n", $chunks));
    }

    private function extractToolCalls(array $data): array
    {
        $calls = [];
        $output = $data['output'] ?? [];

        if (! is_array($output)) {
            return [];
        }

        foreach ($output as $item) {
            if (! is_array($item)) {
                continue;
            }

            if (($item['type'] ?? null) !== 'function_call') {
                continue;
            }

            $argumentsRaw = $item['arguments'] ?? '{}';
            $arguments = json_decode((string) $argumentsRaw, true);
            if (! is_array($arguments)) {
                $arguments = [];
            }

            $calls[] = [
                'id' => $item['id'] ?? null,
                'call_id' => $item['call_id'] ?? null,
                'name' => $item['name'] ?? null,
                'arguments' => $arguments,
            ];
        }

        return $calls;
    }
}
