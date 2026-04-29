<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'regenerate' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:160'],
            'persist_profile_overrides' => ['nullable', 'boolean'],
            'plan_horizon_days' => ['nullable', 'integer', Rule::in([14, 21, 28])],
            'generate_diet' => ['nullable', 'boolean'],
            'generate_workout' => ['nullable', 'boolean'],

            'profile' => ['nullable', 'array'],
            'profile.dietary_goal' => ['nullable', 'string', 'max:120'],
            'profile.fitness_goal' => ['nullable', 'string', 'max:120'],
            'profile.diet_type' => ['nullable', 'string', 'max:80'],
            'profile.allergies' => ['nullable', 'array', 'max:20'],
            'profile.allergies.*' => ['string', 'max:80'],
            'profile.medical_conditions' => ['nullable', 'array', 'max:20'],
            'profile.medical_conditions.*' => ['string', 'max:120'],
            'profile.injury_history' => ['nullable', 'array', 'max:20'],
            'profile.injury_history.*' => ['string', 'max:120'],
            'profile.available_equipment' => ['nullable', 'array', 'max:24'],
            'profile.available_equipment.*' => ['string', 'max:80'],
            'profile.preferred_workout_days' => ['nullable', 'array', 'max:7'],
            'profile.preferred_workout_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'profile.workout_days_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'profile.workout_location' => ['nullable', Rule::in(['home', 'gym', 'both'])],
            'profile.past_diet_failures' => ['nullable', 'array', 'max:12'],
            'profile.past_diet_failures.*' => ['string', 'max:120'],
            'profile.past_diet_failures_other' => ['nullable', 'string', 'max:160'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->generateDiet() && ! $this->generateWorkout()) {
                $validator->errors()->add(
                    'generate_diet',
                    'Select at least one plan type to generate.'
                );
            }
        });
    }

    public function generateDiet(): bool
    {
        return $this->has('generate_diet')
            ? $this->boolean('generate_diet')
            : true;
    }

    public function generateWorkout(): bool
    {
        return $this->has('generate_workout')
            ? $this->boolean('generate_workout')
            : true;
    }
}
