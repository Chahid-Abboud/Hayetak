<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminUpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $userId = $user instanceof User ? $user->id : $user;

        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'username' => [
                'sometimes',
                'nullable',
                'string',
                'max:24',
                'regex:/^[A-Za-z0-9_.]+$/',
                Rule::unique(User::class, 'username')->ignore($userId),
            ],
            'email' => [
                'sometimes',
                'nullable',
                'string',
                'lowercase',
                'email',
                'max:120',
                Rule::unique(User::class, 'email')->ignore($userId),
            ],
            'password' => ['sometimes', 'nullable', 'confirmed', Password::defaults()],
            'gender' => ['sometimes', 'nullable', Rule::in(['male', 'female', 'other'])],
            'age' => ['sometimes', 'nullable', 'integer', 'between:13,100'],
            'height_cm' => ['sometimes', 'nullable', 'integer', 'between:80,250'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'between:25,400'],
            'has_medical_history' => ['sometimes', 'boolean'],
            'medical_history' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'dietary_goal' => ['sometimes', 'nullable', 'string', 'max:80'],
            'fitness_goal' => ['sometimes', 'nullable', 'string', 'max:80'],
            'diet_name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'allergies' => ['sometimes', 'nullable', 'array'],
            'allergies.*' => ['string', 'max:120'],
            'activity_level' => ['sometimes', 'nullable', Rule::in([
                'Sedentary',
                'Lightly Active',
                'Moderately Active',
                'Very Active',
                'Athlete',
            ])],
            'workout_days_per_week' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:7'],
            'workout_location' => ['sometimes', 'nullable', Rule::in(['home', 'gym', 'both'])],
            'tried_diet_before' => ['sometimes', 'nullable', 'boolean'],
            'diet_failure_reasons' => ['sometimes', 'nullable', 'array'],
            'diet_failure_reasons.*' => ['string', 'max:120'],
            'diet_failure_other' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'verified' => ['sometimes', 'boolean'],
            'email_verified' => ['sometimes', 'boolean'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'contact_display' => ['sometimes', 'nullable', 'string', 'max:160'],
            'professional_bio' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'specialties' => ['sometimes', 'nullable', 'array'],
            'specialties.*' => ['string', 'max:120'],
            'availability_text' => ['sometimes', 'nullable', 'string', 'max:191'],
            'profile_lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'profile_lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'role' => ['sometimes', Rule::in([
                User::ROLE_ADMIN,
                User::ROLE_NUTRITIONIST,
                User::ROLE_TRAINER,
                User::ROLE_CLIENT,
            ])],
            'prefs' => ['sometimes', 'array'],
            'prefs.units' => ['sometimes', 'nullable', Rule::in(['metric', 'imperial'])],
            'prefs.theme' => ['sometimes', 'nullable', Rule::in(['light', 'dark', 'system'])],
            'prefs.home_gym' => ['sometimes', 'nullable', 'string', 'max:191'],
            'prefs.is_public' => ['sometimes', 'boolean'],
            'prefs.bmr_kcal' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'prefs.tdee_kcal' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'prefs.activity_factor' => ['sometimes', 'nullable', 'numeric', 'between:0.5,3'],
            'prefs.daily_goal_calories' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'prefs.daily_goal_protein_g' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'prefs.daily_goal_carbs_g' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'prefs.daily_goal_fat_g' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1000'],
            'prefs.water_cups_per_day' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'prefs.workout_days_target' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:14'],
            'prefs.notifications' => ['sometimes', 'nullable', 'array'],
            'prefs.settings' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
