<?php

namespace App\Services\Ai\Chat;

use App\Services\Ai\Prompts\CoachPrompt;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use App\Services\Ai\Runtime\OllamaClient;
use App\Models\User;
use RuntimeException;

class SelfHostedContextAwareChatService
{
    public function __construct(
        private readonly OllamaClient $ollama,
        private readonly QdrantVectorStore $vectorStore,
        private readonly UserContextSnapshotBuilder $snapshotBuilder,
        private readonly CoachPrompt $prompt,
        private readonly FeatureConfigResolver $features,
    ) {}

    // Rebuild the durable vector snapshots we want to search for this user.
    public function syncUserContext(User $user): void
    {
        foreach ($this->snapshotBuilder->buildForUser($user) as $document) {
            $this->storeUserData($user->id, $document['text'], [
                'doc_key' => $document['doc_key'],
                'doc_type' => $document['doc_type'],
            ]);
        }
    }

    public function ensureCollectionIsReady(string $sampleText = 'hayetak self hosted context setup'): void
    {
        $embedding = $this->ollama->embed(FeatureConfigResolver::FEATURE_CHAT, $sampleText);
        $this->vectorStore->ensureCollection(count($embedding['embedding']));
    }

    public function deleteUserData(int $userId): void
    {
        $this->vectorStore->deleteUser($userId);
    }

    public function storeUserData(int $userId, string $text, array $metadata = []): array
    {
        $content = trim($text);
        if ($content === '') {
            throw new RuntimeException('storeUserData requires non-empty text.');
        }

        // Each stored document is embedded locally, then upserted with the user_id as a hard filter.
        $embedding = $this->ollama->embed(FeatureConfigResolver::FEATURE_CHAT, $content);
        $this->vectorStore->ensureCollection(count($embedding['embedding']));

        return $this->vectorStore->upsert($userId, $content, $metadata, $embedding['embedding']);
    }

    public function getUserContext(int $userId, string $question): array
    {
        $retrievalSettings = $this->features->retrieval(FeatureConfigResolver::FEATURE_CHAT);
        $threshold = (float) $retrievalSettings['threshold'];
        $limit = (int) $retrievalSettings['limit'];
        $maxCharacters = (int) $retrievalSettings['max_context_characters'];

        try {
            // Embed the incoming question, then search only within the requesting user's payloads.
            $embedding = $this->ollama->embed(FeatureConfigResolver::FEATURE_CHAT, trim($question));
            $matches = $this->vectorStore->query($userId, $embedding['embedding'], $threshold, $limit);
        } catch (\Throwable $e) {
            return [
                'path' => 'general',
                'threshold' => $threshold,
                'top_score' => null,
                'context_text' => '',
                'matches' => [],
                'warning' => 'Personal context lookup failed, so the coach will answer with general in-domain guidance.',
            ];
        }

        $contextText = '';
        $serializedMatches = [];

        foreach ($matches as $match) {
            $payload = is_array($match['payload'] ?? null) ? $match['payload'] : [];
            $text = trim((string) ($payload['text'] ?? ''));

            if ($text === '') {
                continue;
            }

            $block = sprintf(
                "[%s | score %.3f]\n%s",
                (string) ($payload['doc_type'] ?? 'context'),
                (float) ($match['score'] ?? 0.0),
                $text,
            );

            if ($contextText !== '' && mb_strlen($contextText."\n\n".$block) > $maxCharacters) {
                break;
            }

            $contextText .= ($contextText === '' ? '' : "\n\n").$block;
            $serializedMatches[] = [
                'doc_key' => $payload['doc_key'] ?? null,
                'doc_type' => $payload['doc_type'] ?? null,
                'score' => (float) ($match['score'] ?? 0.0),
                'text' => $text,
            ];
        }

        return [
            'path' => $serializedMatches === [] ? 'general' : 'personalized',
            'threshold' => $threshold,
            'top_score' => $serializedMatches[0]['score'] ?? null,
            'context_text' => $contextText,
            'matches' => $serializedMatches,
            'warning' => null,
        ];
    }

    public function chat(int $userId, string $question, array $promptContext = []): string
    {
        return $this->chatResponse($userId, $question, $promptContext)['answer'];
    }

    public function chatResponse(int $userId, string $question, array $promptContext = []): array
    {
        $retrieval = $this->getUserContext($userId, $question);
        // The prompt explicitly tells the model whether it is in personalized or fallback mode.
        $response = $this->ollama->chat(FeatureConfigResolver::FEATURE_CHAT, $this->buildMessages($question, $promptContext, $retrieval));

        return [
            'answer' => (string) $response['answer'],
            'model' => (string) $response['model'],
            'usage' => $response['usage'] ?? [
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
            ],
            'provider_request_id' => $response['provider_request_id'] ?? null,
            'latency_ms' => $response['latency_ms'] ?? null,
            'chat_path' => $retrieval['path'],
            'context_score' => $retrieval['top_score'],
            'matches' => $retrieval['matches'],
            'warnings' => array_values(array_filter([
                $retrieval['warning'] ?? null,
            ])),
            'raw' => [
                'retrieval' => $retrieval,
                'model' => $response['raw'] ?? [],
            ],
        ];
    }

    private function buildMessages(string $question, array $promptContext, array $retrieval): array
    {
        return [
            [
                'role' => 'system',
                'content' => $this->prompt->system($promptContext, $retrieval),
            ],
            [
                'role' => 'user',
                'content' => 'QUESTION:'."\n".trim($question),
            ],
        ];
    }
}
