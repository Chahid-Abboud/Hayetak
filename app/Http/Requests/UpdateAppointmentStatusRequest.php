<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['requested', 'accepted', 'declined', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

