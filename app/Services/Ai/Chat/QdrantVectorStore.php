<?php

namespace App\Services\Ai\Chat;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class QdrantVectorStore
{
    public function ensureCollection(int $vectorSize): void
    {
        $collection = $this->collection();
        $response = $this->request()->get("/collections/{$collection}");

        if ($response->successful()) {
            return;
        }

        if ($response->status() !== 404) {
            $response->throw();
        }

        $this->request()
            ->put("/collections/{$collection}", [
                'vectors' => [
                    'size' => $vectorSize,
                    'distance' => (string) config('ai.chat.self_hosted.qdrant.distance', 'Cosine'),
                ],
            ])
            ->throw();
    }

    public function upsert(int $userId, string $text, array $metadata, array $vector): array
    {
        $payload = array_merge($metadata, [
            'user_id' => $userId,
            'text' => $text,
            'indexed_at' => now()->toIso8601String(),
        ]);

        if (isset($payload['doc_key']) && is_string($payload['doc_key']) && $payload['doc_key'] !== '') {
            $this->deleteDocument($userId, $payload['doc_key']);
        }

        $id = (string) Str::uuid();

        $this->request()
            ->put("/collections/{$this->collection()}/points?wait=true", [
                'points' => [[
                    'id' => $id,
                    'vector' => $vector,
                    'payload' => $payload,
                ]],
            ])
            ->throw();

        return [
            'id' => $id,
            'payload' => $payload,
        ];
    }

    public function query(int $userId, array $vector, ?float $scoreThreshold = null, ?int $limit = null): array
    {
        $payload = array_filter([
            'query' => $vector,
            'limit' => $limit ?? (int) config('ai.chat.self_hosted.retrieval.limit', 4),
            'with_payload' => true,
            'score_threshold' => $scoreThreshold,
            'filter' => [
                'must' => [[
                    'key' => 'user_id',
                    'match' => ['value' => $userId],
                ]],
            ],
        ], static fn ($value) => $value !== null);

        $response = $this->request()->post("/collections/{$this->collection()}/points/query", $payload);

        if ($response->status() === 404) {
            $response = $this->request()->post("/collections/{$this->collection()}/points/search", [
                'vector' => $vector,
                'limit' => $payload['limit'],
                'with_payload' => true,
                'score_threshold' => $scoreThreshold,
                'filter' => $payload['filter'],
            ]);
        }

        $response = $response->throw()->json();

        $points = data_get($response, 'result.points', data_get($response, 'result', []));

        if (! is_array($points)) {
            return [];
        }

        return array_map(static function ($point): array {
            return [
                'id' => $point['id'] ?? null,
                'score' => (float) ($point['score'] ?? 0.0),
                'payload' => is_array($point['payload'] ?? null) ? $point['payload'] : [],
            ];
        }, $points);
    }

    public function deleteDocument(int $userId, string $docKey): void
    {
        $this->request()
            ->post("/collections/{$this->collection()}/points/delete?wait=true", [
                'filter' => [
                    'must' => [
                        [
                            'key' => 'user_id',
                            'match' => ['value' => $userId],
                        ],
                        [
                            'key' => 'doc_key',
                            'match' => ['value' => $docKey],
                        ],
                    ],
                ],
            ])
            ->throw();
    }

    public function deleteUser(int $userId): void
    {
        $this->request()
            ->post("/collections/{$this->collection()}/points/delete?wait=true", [
                'filter' => [
                    'must' => [[
                        'key' => 'user_id',
                        'match' => ['value' => $userId],
                    ]],
                ],
            ])
            ->throw();
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('ai.chat.self_hosted.qdrant.base_url', 'http://127.0.0.1:6333'), '/'))
            ->acceptJson()
            ->timeout((int) config('ai.chat.self_hosted.qdrant.timeout', 20));
    }

    private function collection(): string
    {
        return (string) config('ai.chat.self_hosted.qdrant.collection', 'hayetak_user_context');
    }
}
