<?php

namespace App\Http\Requests\Ai;

use App\Services\Ai\Audit\PlannerAuditGpuLoad;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlannerAuditLoadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'gpu_load' => ['required', Rule::in(PlannerAuditGpuLoad::acceptedValues())],
        ];
    }
}
