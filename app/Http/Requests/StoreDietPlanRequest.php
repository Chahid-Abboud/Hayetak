<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDietPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:160'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'plan_json' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function validatedAllergensConflict(): array
    {
        $validated = $this->validated();
        $conflicts = [];

        $client = \App\Models\User::query()
            ->with(['dietaryRestrictions' => fn ($q) => $q->where('kind', 'allergy')->where('is_active', true)])
            ->find($validated['client_id'] ?? null);

        if (! $client) {
            return $conflicts;
        }

        $allergies = $client->allergies ?? [];
        $dietaryAllergens = $client->dietaryRestrictions->pluck('value')->map(fn ($v) => strtolower($v))->toArray();
        $allAllergens = array_unique(array_merge(
            array_map('strtolower', (array) $allergies),
            $dietaryAllergens
        ));

        $planJson = $validated['plan_json'] ?? [];
        $foods = \App\Models\Food::query()
            ->whereIn('id', $this->extractFoodIdsFromPlan($planJson))
            ->get(['id', 'name', 'allergens']);

        foreach ($planJson as $dayIndex => $day) {
            foreach ($day['meals'] ?? [] as $mealIndex => $meal) {
                foreach ($meal['foods'] ?? [] as $foodIndex => $food) {
                    $foodId = $food['id'] ?? null;
                    $foodModel = $foods->first(fn ($f) => $f->id === $foodId);

                    if ($foodModel) {
                        $foodAllergens = array_map('strtolower', (array) ($foodModel->allergens ?? []));
                        $conflict = array_intersect($allAllergens, $foodAllergens);

                        if (! empty($conflict)) {
                            $conflicts[] = [
                                'day' => $day['date'] ?? $dayIndex,
                                'meal' => $meal['meal_type'] ?? $mealIndex,
                                'food' => $foodModel->name,
                                'conflicting_allergens' => array_values($conflict),
                            ];
                        }
                    }
                }
            }
        }

        return $conflicts;
    }

    protected function extractFoodIdsFromPlan(array $plan): array
    {
        $ids = [];
        foreach ($plan as $day) {
            foreach ($day['meals'] ?? [] as $meal) {
                foreach ($meal['foods'] ?? [] as $food) {
                    if (isset($food['id'])) {
                        $ids[] = (int) $food['id'];
                    }
                }
            }
        }

        return $ids;
    }
}
