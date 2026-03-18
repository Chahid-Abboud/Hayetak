<?php

namespace App\Services\Ai\Chat;

use App\Models\User;
use RuntimeException;

class SelfHostedContextAwareChatService
{
    public function __construct(
        private readonly SelfHostedOllamaClient $ollama,
        private readonly QdrantVectorStore $vectorStore,
        private readonly UserContextSnapshotBuilder $snapshotBuilder,
    ) {}

    // Rebuild the durable vector snapshots we want to search for this user.
    public function syncUserContext(User $user): void
    {
        foreach ($this->snapshotBuilder->buildForUser($user) as $document) {
            $this->store_user_data($user->id, $document['text'], [
                'doc_key' => $document['doc_key'],
                'doc_type' => $document['doc_type'],
            ]);
        }
    }

    public function ensureCollectionIsReady(string $sampleText = 'hayetak self hosted context setup'): void
    {
        $embedding = $this->ollama->embed($sampleText);
        $this->vectorStore->ensureCollection(count($embedding['embedding']));
    }

    public function delete_user_data(int $userId): void
    {
        $this->vectorStore->deleteUser($userId);
    }

    public function store_user_data(int $userId, string $text, array $metadata = []): array
    {
        $content = trim($text);
        if ($content === '') {
            throw new RuntimeException('store_user_data requires non-empty text.');
        }

        // Each stored document is embedded locally, then upserted with the user_id as a hard filter.
        $embedding = $this->ollama->embed($content);
        $this->vectorStore->ensureCollection(count($embedding['embedding']));

        return $this->vectorStore->upsert($userId, $content, $metadata, $embedding['embedding']);
    }

    public function get_user_context(int $userId, string $question): array
    {
        $threshold = (float) config('ai.chat.self_hosted.retrieval.threshold', 0.65);
        $limit = (int) config('ai.chat.self_hosted.retrieval.limit', 4);
        $maxCharacters = (int) config('ai.chat.self_hosted.retrieval.max_context_characters', 2200);

        try {
            // Embed the incoming question, then search only within the requesting user's payloads.
            $embedding = $this->ollama->embed(trim($question));
            $matches = $this->vectorStore->query($userId, $embedding['embedding'], $threshold, $limit);
        } catch (\Throwable $e) {
            return [
                'path' => 'fallback',
                'threshold' => $threshold,
                'top_score' => null,
                'context_text' => '',
                'matches' => [],
                'warning' => 'Personal context lookup failed, so the chat model will answer from general knowledge.',
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
            'path' => $serializedMatches === [] ? 'fallback' : 'personalized',
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
        $retrieval = $this->get_user_context($userId, $question);
        // The prompt explicitly tells the model whether it is in personalized or fallback mode.
        $response = $this->ollama->chat($this->buildMessages($question, $promptContext, $retrieval));

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
            'raw' => [
                'retrieval' => $retrieval,
                'model' => $response['raw'] ?? [],
            ],
        ];
    }

    private function buildMessages(string $question, array $promptContext, array $retrieval): array
    {
        $path = (string) ($retrieval['path'] ?? 'fallback');
        $threshold = number_format((float) ($retrieval['threshold'] ?? 0.65), 2, '.', '');
        $topScore = $retrieval['top_score'] !== null
            ? number_format((float) $retrieval['top_score'], 3, '.', '')
            : 'none';

        $systemPrompt = implode("\n", [
            'You are Hayetak\'s self-hosted fitness and nutrition coach.',
            'You must follow one of two paths exactly, based on ACTIVE_PATH.',
            'If ACTIVE_PATH is personalized:',
            '- Use PERSONAL_CONTEXT as the source of truth for user-specific numbers and constraints.',
            '- Mention that you are using the user\'s saved app data.',
            '- When the question needs math, show the calculation briefly using the retrieved numbers.',
            'If ACTIVE_PATH is fallback:',
            '- No relevant private user context cleared the retrieval threshold.',
            '- Answer from general nutrition and fitness knowledge only.',
            '- Clearly say that the answer is general because no relevant saved data was retrieved for this question.',
            '- Do not invent personal numbers, goals, or restrictions.',
            'Always obey these safety rules:',
            '- Never suggest foods that conflict with allergies or diet type in SAFETY_RULES.',
            '- Respect injuries and medical conditions in SAFETY_RULES and offer safer alternatives.',
            '- If important data is missing, say what is missing instead of pretending it exists.',
            '- Keep the answer concise, practical, and supportive.',
        ]);

        $userPrompt = implode("\n\n", array_filter([
            'ACTIVE_PATH: '.$path,
            'SIMILARITY_THRESHOLD: '.$threshold,
            'TOP_MATCH_SCORE: '.$topScore,
            $this->renderSafetyRules($promptContext),
            $this->renderConversationContext($promptContext),
            $this->renderRuntimeHints($promptContext),
            'PERSONAL_CONTEXT:'."\n".($retrieval['context_text'] !== '' ? $retrieval['context_text'] : 'No stored user context matched this question above the threshold.'),
            'QUESTION:'."\n".trim($question),
        ]));

        return [
            [
                'role' => 'system',
                'content' => $systemPrompt,
            ],
            [
                'role' => 'user',
                'content' => $userPrompt,
            ],
        ];
    }

    private function renderSafetyRules(array $promptContext): string
    {
        $restrictions = is_array($promptContext['restrictions'] ?? null) ? $promptContext['restrictions'] : [];

        return implode("\n", [
            'SAFETY_RULES:',
            '- Diet type: '.$this->displayValue($restrictions['diet_type'] ?? null),
            '- Allergies: '.$this->displayList($restrictions['allergies'] ?? []),
            '- Medical conditions: '.$this->displayList($restrictions['medical_conditions'] ?? []),
            '- Injuries: '.$this->displayList($restrictions['injuries'] ?? []),
        ]);
    }

    private function renderConversationContext(array $promptContext): string
    {
        $conversation = is_array($promptContext['conversation_context'] ?? null)
            ? $promptContext['conversation_context']
            : [];

        $recentTurns = is_array($conversation['recent_turns'] ?? null)
            ? $conversation['recent_turns']
            : [];

        if ($recentTurns === []) {
            return '';
        }

        $lines = ['RECENT_CONVERSATION:'];

        foreach ($recentTurns as $turn) {
            $role = (string) ($turn['r'] ?? $turn['role'] ?? 'user');
            $content = trim((string) ($turn['c'] ?? $turn['content'] ?? ''));

            if ($content === '') {
                continue;
            }

            $lines[] = sprintf('- %s: %s', $role, $content);
        }

        return implode("\n", $lines);
    }

    private function renderRuntimeHints(array $promptContext): string
    {
        $runtime = is_array($promptContext['runtime'] ?? null) ? $promptContext['runtime'] : [];

        return implode("\n", [
            'RUNTIME_HINTS:',
            '- Available ingredients: '.$this->displayList($runtime['available_ingredients'] ?? []),
        ]);
    }

    private function displayValue(mixed $value): string
    {
        if ($value === null) {
            return 'not provided';
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed === '' ? 'not provided' : $trimmed;
        }

        return (string) $value;
    }

    private function displayList(mixed $value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [$value];
        }

        if (! is_array($value)) {
            return 'none saved';
        }

        $items = array_values(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        )));

        return $items === [] ? 'none saved' : implode('; ', $items);
    }
}
