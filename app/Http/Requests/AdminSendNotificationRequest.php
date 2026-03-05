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
            'target_user_ids' => ['required', 'array', 'min:1'],
            'target_user_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
