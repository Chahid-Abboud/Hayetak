<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Concerns\ReleasesSessionLock;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StoreChatMessageRequest;
use App\Http\Resources\Ai\AiConversationResource;
use App\Http\Resources\Ai\AiMessageResource;
use App\Models\AiConversation;
use App\Services\Ai\Chat\ChatOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    use ReleasesSessionLock;

    /** @var array<int, string> */
    private const VISIBLE_MESSAGE_ROLES = ['user', 'assistant'];

    /**
     * List the current user's AI coach conversations with their latest visible turn.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $conversations = AiConversation::query()
            ->where('user_id', $request->user()->id)
            ->with(['messages' => fn ($query) => $query
                ->whereIn('role', self::VISIBLE_MESSAGE_ROLES)
                ->latest('id')
                ->limit(1)])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->get();

        return AiConversationResource::collection($conversations);
    }

    /**
     * Return paginated user/assistant messages for one authorized conversation.
     */
    public function messages(Request $request, AiConversation $conversation): AnonymousResourceCollection
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);

        $messages = $conversation->messages()
            ->whereIn('role', self::VISIBLE_MESSAGE_ROLES)
            ->oldest('id')
            ->paginate((int) $request->query('per_page', 100));

        return AiMessageResource::collection($messages);
    }

    /**
     * Persist a user message, generate the coach reply, and return both saved turns.
     */
    public function store(StoreChatMessageRequest $request, ChatOrchestrator $orchestrator): JsonResponse
    {
        $user = $request->user();
        $conversation = $this->resolveConversation($request);
        $runtimeContext = $this->runtimeContext($request);

        $this->releaseSessionLock($request);

        $result = $orchestrator->handle(
            $user,
            $request->validated('message'),
            $runtimeContext,
            $conversation,
        );

        return response()->json([
            'ok' => true,
            'conversation' => new AiConversationResource($result['conversation']),
            'user_message' => new AiMessageResource($result['user_message']),
            'assistant_message' => new AiMessageResource($result['assistant_message']),
            'intent' => (string) ($result['intent'] ?? ''),
            'feature' => (string) ($result['feature'] ?? ''),
            'warnings' => array_values($result['warnings'] ?? []),
            'used_context_keys' => array_values($result['used_context_keys'] ?? []),
            'provider' => (string) ($result['provider'] ?? ''),
            'model' => (string) ($result['model'] ?? ''),
            'quality' => $result['quality'] ?? [],
        ], 201);
    }

    /**
     * Stream a generated reply as server-sent events after the normal persisted chat flow completes.
     */
    public function stream(StoreChatMessageRequest $request, ChatOrchestrator $orchestrator): StreamedResponse
    {
        $user = $request->user();
        $conversation = $this->resolveConversation($request);
        $runtimeContext = $this->runtimeContext($request);
        $message = $request->validated('message');

        $this->releaseSessionLock($request);

        return response()->stream(function () use ($user, $message, $runtimeContext, $conversation, $orchestrator, $request): void {
            $this->sendEvent('status', [
                'state' => 'started',
                'streaming_mode' => 'persisted_response_chunks',
            ]);

            try {
                $result = $orchestrator->handle($user, $message, $runtimeContext, $conversation);
                $answer = (string) data_get($result, 'assistant_message.content', '');

                foreach ($this->chunkAnswer($answer) as $chunk) {
                    $this->sendEvent('token', ['delta' => $chunk]);
                }

                $this->sendEvent('message', [
                    'ok' => true,
                    'conversation' => (new AiConversationResource($result['conversation']))->resolve($request),
                    'user_message' => (new AiMessageResource($result['user_message']))->resolve($request),
                    'assistant_message' => (new AiMessageResource($result['assistant_message']))->resolve($request),
                    'warnings' => array_values($result['warnings'] ?? []),
                    'used_context_keys' => array_values($result['used_context_keys'] ?? []),
                    'provider' => (string) ($result['provider'] ?? ''),
                    'model' => (string) ($result['model'] ?? ''),
                ]);
                $this->sendEvent('done', ['ok' => true]);
            } catch (\Throwable $throwable) {
                $this->sendEvent('error', [
                    'ok' => false,
                    'message' => 'AI Coach is temporarily unavailable right now.',
                    'error' => $throwable->getMessage(),
                ]);
            }
        }, 201, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function resolveConversation(StoreChatMessageRequest $request): ?AiConversation
    {
        if (! $request->filled('conversation_id')) {
            return null;
        }

        $conversation = AiConversation::query()->findOrFail((int) $request->validated('conversation_id'));
        abort_unless($conversation->user_id === $request->user()->id, 403);

        return $conversation;
    }

    /**
     * @return array<string, mixed>
     */
    private function runtimeContext(StoreChatMessageRequest $request): array
    {
        return array_filter([
            'screen_context' => $request->validated('screen_context'),
            'selected_date' => $request->validated('selected_date'),
            'goal' => $request->validated('goal'),
            'include_last_7_days' => $request->boolean('include_last_7_days'),
            'lat' => $request->validated('lat'),
            'lng' => $request->validated('lng'),
            'available_ingredients' => $request->validated('available_ingredients'),
        ], fn ($value) => $value !== null && $value !== '');
    }

    /**
     * @return array<int, string>
     */
    private function chunkAnswer(string $answer): array
    {
        $chunks = [];
        foreach (preg_split('/(\s+)/u', $answer, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [] as $part) {
            $chunks[] = $part;
        }

        return $chunks;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function sendEvent(string $event, array $payload): void
    {
        echo "event: {$event}\n";
        echo 'data: '.json_encode($payload, JSON_UNESCAPED_SLASHES)."\n\n";
        if (ob_get_level() > 0) {
            @ob_flush();
        }
        flush();
    }
}
