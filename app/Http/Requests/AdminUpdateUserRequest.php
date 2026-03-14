<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'verified' => ['sometimes', 'boolean'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'contact_display' => ['sometimes', 'nullable', 'string', 'max:160'],
            'professional_bio' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'specialties' => ['sometimes', 'nullable', 'array'],
            'specialties.*' => ['string', 'max:120'],
            'availability_text' => ['sometimes', 'nullable', 'string', 'max:191'],
            'profile_lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'profile_lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'role' => ['sometimes', Rule::in([
                User::ROLE_ADMIN,
                User::ROLE_NUTRITIONIST,
                User::ROLE_TRAINER,
                User::ROLE_CLIENT,
            ])],
        ];
    }
}
