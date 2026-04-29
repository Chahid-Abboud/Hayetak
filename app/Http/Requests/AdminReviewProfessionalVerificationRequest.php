<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminReviewProfessionalVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'review_status' => ['required', Rule::in(['approved', 'rejected', 'needs_info'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
