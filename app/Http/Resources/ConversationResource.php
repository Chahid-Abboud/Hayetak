<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $last = $this->messages->sortByDesc('id')->first();

        return [
            'id' => $this->id,
            'participants' => UserResource::collection($this->whenLoaded('participants')),
            'last_message' => $last ? [
                'id' => $last->id,
                'sender_id' => $last->sender_id,
                'body' => $last->body,
                'created_at' => $last->created_at,
            ] : null,
            'created_at' => $this->created_at,
        ];
    }
}

