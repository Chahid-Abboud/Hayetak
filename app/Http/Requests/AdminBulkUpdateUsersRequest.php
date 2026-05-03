<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminBulkUpdateUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'user_ids' => ['required', 'array', 'min:1', 'max:200'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'action' => ['required', Rule::in(['verify', 'unverify', 'suspend', 'reactivate', 'delete', 'set_status'])],
            'status' => [
                Rule::requiredIf(fn () => $this->input('action') === 'set_status'),
                'nullable',
                Rule::in(['active', 'pending', 'needs_review', 'needs_info', 'rejected', 'suspended']),
            ],
        ];
    }
}
