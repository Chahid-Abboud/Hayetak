<?php

namespace App\Http\Resources;

use App\Services\Messaging\WelcomeConversationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => WelcomeConversationService::isSystemEmail($this->email)
                ? 'Hayetak Team'
                : $this->display_name,
            'email' => $this->email,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'role' => $this->role,
            'verified' => (bool) $this->verified,
            'status' => $this->status,
            'city' => $this->city,
            'contact_display' => $this->contact_display,
            'professional_bio' => $this->professional_bio,
            'specialties' => $this->specialties ?? [],
            'availability_text' => $this->availability_text,
            'profile_lat' => $this->profile_lat,
            'profile_lng' => $this->profile_lng,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
