<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function store(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('message', $conversation);

        $actor = $request->user();

        $message = DB::transaction(function () use ($conversation, $actor, $request) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $actor->id,
                'body' => $request->validated('body'),
            ]);

            $conversation->participants()->updateExistingPivot($actor->id, [
                'last_read_at' => now(),
            ]);

            $conversation->touch();

            return $message;
        });

        $this->logger->log($actor->id, 'message.send', $message, [
            'conversation_id' => $conversation->id,
            'sender_id' => $actor->id,
        ]);

        return response()->json([
            'ok' => true,
            'message' => new MessageResource($message->load('sender')),
        ], 201);
    }
}
