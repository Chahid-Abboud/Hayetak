<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminSendNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:4000'],
            'type' => ['sometimes', 'string', 'in:announcement,intervention,safety,planner,support'],
            'audience' => ['sometimes', 'string', 'in:selected,all_clients,all_professionals,trainers,nutritionists,admins,unverified'],
            'target_user_ids' => ['sometimes', 'array'],
            'target_user_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
