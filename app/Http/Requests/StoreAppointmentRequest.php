<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'professional_id' => ['required', 'integer', 'exists:users,id'],
            'client_id' => ['nullable', 'integer', 'exists:users,id'],
            'professional_role' => ['required', Rule::in([User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])],
            'scheduled_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

