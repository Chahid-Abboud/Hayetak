<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AdminActionLogger;
use App\Services\Messaging\MessageModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function __construct(
        private readonly AdminActionLogger $logger,
        private readonly MessageModerationService $moderation,
    ) {}

    public function store(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('message', $conversation);

        $actor = $request->user();
        $body = $request->validated('body');
        $moderation = $this->moderation->moderate($conversation, $actor, $body);

        if (($moderation['decision'] ?? 'allow') === 'hard_block') {
            $record = $this->moderation->recordAttempt($conversation, $actor, $body, $moderation);

            $this->logger->log($actor->id, 'message.blocked', $record, [
                'conversation_id' => $conversation->id,
                'sender_id' => $actor->id,
                'categories' => $moderation['categories'] ?? [],
                'signals' => $moderation['signals'] ?? [],
            ]);

            return response()->json([
                'ok' => false,
                'message' => $moderation['reason'] ?? 'This message was blocked.',
                'moderation' => [
                    'decision' => $moderation['decision'],
                    'severity' => $moderation['severity'] ?? 'high',
                    'categories' => $moderation['categories'] ?? [],
                ],
            ], 422);
        }

        $message = DB::transaction(function () use ($conversation, $actor, $body, $moderation) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $actor->id,
                'body' => $body,
            ]);

            $this->moderation->recordAttempt($conversation, $actor, $body, $moderation, $message);

            $conversation->participants()->updateExistingPivot($actor->id, [
                'last_read_at' => now(),
            ]);

            $conversation->touch();

            return $message;
        });

        $this->logger->log($actor->id, 'message.send', $message, [
            'conversation_id' => $conversation->id,
            'sender_id' => $actor->id,
            'moderation_decision' => $moderation['decision'] ?? 'allow',
            'signals' => $moderation['signals'] ?? [],
        ]);

        return response()->json([
            'ok' => true,
            'message' => new MessageResource($message->load('sender')),
            'moderation' => [
                'decision' => $moderation['decision'] ?? 'allow',
                'severity' => $moderation['severity'] ?? 'low',
                'categories' => $moderation['categories'] ?? [],
            ],
        ], 201);
    }
}
