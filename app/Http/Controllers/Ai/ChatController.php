<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ReleasesSessionLock;
use App\Http\Requests\Ai\StoreChatMessageRequest;
use App\Http\Resources\Ai\AiConversationResource;
use App\Http\Resources\Ai\AiMessageResource;
use App\Models\AiConversation;
use App\Services\Ai\Chat\ChatOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ChatController extends Controller
{
    use ReleasesSessionLock;

    public function index(Request $request): AnonymousResourceCollection
    {
        $conversations = AiConversation::query()
            ->where('user_id', $request->user()->id)
            ->with(['messages' => fn ($query) => $query->latest('id')->limit(1)])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->get();

        return AiConversationResource::collection($conversations);
    }

    public function messages(Request $request, AiConversation $conversation): AnonymousResourceCollection
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);

        $messages = $conversation->messages()
            ->oldest('id')
            ->paginate((int) $request->query('per_page', 100));

        return AiMessageResource::collection($messages);
    }

    public function store(StoreChatMessageRequest $request, ChatOrchestrator $orchestrator): JsonResponse
    {
        $user = $request->user();
        $conversation = null;

        if ($request->filled('conversation_id')) {
            $conversation = AiConversation::query()->findOrFail((int) $request->validated('conversation_id'));
            abort_unless($conversation->user_id === $user->id, 403);
        }

        $runtimeContext = array_filter([
            'screen_context' => $request->validated('screen_context'),
            'selected_date' => $request->validated('selected_date'),
            'goal' => $request->validated('goal'),
            'include_last_7_days' => $request->boolean('include_last_7_days'),
            'lat' => $request->validated('lat'),
            'lng' => $request->validated('lng'),
            'available_ingredients' => $request->validated('available_ingredients'),
        ], fn ($value) => $value !== null && $value !== '');

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
            'intent' => $result['intent'],
            'feature' => $result['feature'],
            'warnings' => $result['warnings'],
            'used_context_keys' => $result['used_context_keys'],
            'provider' => $result['provider'],
            'model' => $result['model'],
        ], 201);
    }
}
