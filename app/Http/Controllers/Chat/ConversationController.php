<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\AdminActionLogger;
use App\Services\Messaging\WelcomeConversationService;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function __construct(
        private readonly ProfessionalAccessService $access,
        private readonly AdminActionLogger $logger,
        private readonly WelcomeConversationService $welcomeConversation,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $this->welcomeConversation->ensureForUser($user);

        $conversations = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->with([
                'participants',
                'messages' => fn ($q) => $q->with('sender')->latest('id')->limit(1),
            ])
            ->latest('updated_at')
            ->get();

        return ConversationResource::collection($conversations);
    }

    public function store(CreateConversationRequest $request): JsonResponse
    {
        $actor = $request->user();
        $participant = User::query()->findOrFail((int) $request->validated('participant_id'));

        abort_unless($this->access->canInteract($actor, $participant), 403, 'Users are not allowed to chat.');

        $existing = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $actor->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $participant->id))
            ->withCount('participants')
            ->get()
            ->first(fn ($c) => (int) $c->participants_count === 2);

        if ($existing) {
            return response()->json(['conversation' => new ConversationResource($existing->load('participants', 'messages'))]);
        }

        $conversation = DB::transaction(function () use ($actor, $participant) {
            $conv = Conversation::query()->create(['created_by' => $actor->id]);
            $conv->participants()->attach([$actor->id, $participant->id]);

            return $conv->load('participants', 'messages');
        });

        $this->logger->log($actor->id, 'conversation.create', $conversation, [
            'participant_ids' => [$actor->id, $participant->id],
        ]);

        return response()->json(['conversation' => new ConversationResource($conversation)], 201);
    }

    public function messages(Request $request, Conversation $conversation): AnonymousResourceCollection
    {
        $this->authorize('view', $conversation);

        $user = $request->user();

        DB::transaction(function () use ($conversation, $user): void {
            $conversation->participants()->updateExistingPivot($user->id, [
                'last_read_at' => now(),
            ]);

            Message::query()
                ->where('conversation_id', $conversation->id)
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            $conversation->touch();
        });

        $messages = $conversation->messages()
            ->with('sender')
            ->oldest('id')
            ->paginate((int) $request->query('per_page', 100));

        return MessageResource::collection($messages);
    }
}
