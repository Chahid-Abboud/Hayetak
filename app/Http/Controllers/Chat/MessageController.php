<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;

class MessageController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function store(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('message', $conversation);

        $message = Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        $this->logger->log($request->user()->id, 'message.send', $message, [
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
        ]);

        return response()->json([
            'ok' => true,
            'message' => new MessageResource($message->load('sender')),
        ], 201);
    }
}
