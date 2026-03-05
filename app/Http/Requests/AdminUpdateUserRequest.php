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
            'role' => ['sometimes', Rule::in([
                User::ROLE_ADMIN,
                User::ROLE_NUTRITIONIST,
                User::ROLE_TRAINER,
                User::ROLE_CLIENT,
            ])],
        ];
    }
}
