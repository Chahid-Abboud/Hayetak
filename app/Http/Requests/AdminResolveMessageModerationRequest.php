<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminResolveMessageModerationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'resolution' => ['required', 'string', Rule::in([
                'resolved_safe',
                'resolved_confirmed',
                'dismissed_false_positive',
            ])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
