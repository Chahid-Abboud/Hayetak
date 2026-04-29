<?php

namespace App\Http\Requests\Ai;

use App\Services\Ai\Audit\PlannerAuditExecutionMode;
use App\Services\Ai\Audit\PlannerAuditGpuLoad;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlannerAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'gpu_load' => ['nullable', Rule::in(PlannerAuditGpuLoad::acceptedValues())],
            'execution_mode' => ['nullable', Rule::in(PlannerAuditExecutionMode::acceptedValues())],
            'report_base' => ['nullable', 'string', 'max:80'],
            'horizons' => ['nullable', 'array', 'min:1'],
            'horizons.*' => ['integer', Rule::in([14, 21, 28])],
        ];
    }
}
