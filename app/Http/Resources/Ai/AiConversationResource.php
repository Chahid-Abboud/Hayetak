<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class AiConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $lastMessage = $this->relationLoaded('messages')
            ? $this->messages->sortByDesc('id')->first()
            : $this->messages()->latest('id')->first();

        return [
            'id' => $this->id,
            'title' => $this->title ?: 'New chat',
            'last_message_excerpt' => $lastMessage
                ? Str::limit((string) $lastMessage->content, 120)
                : null,
            'last_message_role' => $lastMessage?->role,
            'last_message_at' => optional($this->last_message_at ?? $lastMessage?->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
            'created_at' => optional($this->created_at)?->toISOString(),
        ];
    }
}
