<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $last = $this->messages->sortByDesc('id')->first();
        $actor = $request->user();
        $participants = $this->whenLoaded('participants');
        $peer = $participants
            ? $participants->firstWhere('id', '!=', $actor?->id)
            : null;
        $lastReadAt = $participants
            ? optional($participants->firstWhere('id', $actor?->id)?->pivot)->last_read_at
            : null;
        $unreadCount = $actor
            ? $this->messages()
                ->where('sender_id', '!=', $actor->id)
                ->whereNull('read_at')
                ->count()
            : 0;

        return [
            'id' => $this->id,
            'participants' => UserResource::collection($participants),
            'peer' => $peer ? new UserResource($peer) : null,
            'last_message' => $last ? [
                'id' => $last->id,
                'sender_id' => $last->sender_id,
                'sender' => $last->relationLoaded('sender') ? new UserResource($last->sender) : null,
                'body' => $last->body,
                'read_at' => $last->read_at,
                'created_at' => $last->created_at,
            ] : null,
            'unread_count' => $unreadCount,
            'last_read_at' => $lastReadAt,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
