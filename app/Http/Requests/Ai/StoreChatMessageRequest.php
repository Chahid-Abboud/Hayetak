<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class StoreChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:2', 'max:1200'],
            'conversation_id' => ['nullable', 'integer', 'exists:ai_conversations,id'],
            'screen_context' => ['nullable', 'string', 'max:80'],
            'selected_date' => ['nullable', 'date_format:Y-m-d'],
            'goal' => ['nullable', 'string', 'max:80'],
            'include_last_7_days' => ['nullable', 'boolean'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'available_ingredients' => ['nullable', 'array', 'max:16'],
            'available_ingredients.*' => ['string', 'max:60'],
        ];
    }
}
