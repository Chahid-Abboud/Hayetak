<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProfessionalAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'professional_id' => ['required', 'integer', 'exists:users,id'],
            'client_id' => ['required', 'integer', 'exists:users,id'],
            'professional_role' => ['required', Rule::in([User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
