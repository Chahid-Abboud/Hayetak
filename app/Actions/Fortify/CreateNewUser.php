<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): User
    {
        // Merge defaults so missing optional keys don't error
        $data = array_merge([
            'first_name' => null,
            'last_name'  => null,
            'username'   => null,
            'gender'     => null,
            'age'        => null,
            'height_cm'  => null,
            'weight_kg'  => null,

            'has_medical_history' => false,
            'medical_history'     => null,

            'dietary_goal' => null,
            'fitness_goal' => null,
            'diet_name'    => null,
            'allergies'    => [],

            'activity_level'        => null,
            'workout_days_per_week' => null,
            'workout_location'      => null,

            'tried_diet_before'     => null,
            'diet_failure_reasons'  => [],
            'diet_failure_other'    => null,

            'email'    => null,
            'password' => null,
        ], $input);

        Validator::make($data, [
            'first_name' => ['required','string','min:2','max:40'],
            'last_name'  => ['required','string','min:2','max:40'],
            'username'   => ['nullable','string','max:24','regex:/^[A-Za-z0-9_.]+$/', Rule::unique(User::class,'username')],

            'gender'     => ['required', Rule::in(['male','female','other'])],
            'age'        => ['required','integer','min:13','max:100'],
            'height_cm'  => ['required','integer','min:80','max:250'],
            'weight_kg'  => ['required','numeric','min:25','max:400'],

            'has_medical_history' => ['boolean'],
            'medical_history'     => ['nullable','string','max:500'],

            'dietary_goal' => ['required','string','max:80'],
            'fitness_goal' => ['required','string','max:80'],
            'diet_name'    => ['required','string','max:80'],
            'allergies'    => ['array'],
            'allergies.*'  => ['string','max:80'],

            'activity_level'        => ['required', Rule::in(['Sedentary','Lightly Active','Moderately Active','Very Active','Athlete'])],
            'workout_days_per_week' => ['required','integer','min:1','max:7'],
            'workout_location'      => ['required', Rule::in(['home','gym','both'])],

            'tried_diet_before'      => ['required', Rule::in(['yes','no'])],
            'diet_failure_reasons'   => ['array'],
            'diet_failure_reasons.*' => ['string','max:80'],
            'diet_failure_other'     => ['nullable','string','max:120'],

            'email'    => ['required','string','email','max:120', Rule::unique(User::class,'email')],
            'password' => ['required', Password::defaults()],
        ])->validate();

        // Satisfy NOT NULL users.name by computing it from first/last (fallback to email local-part)
        $fullName = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        if ($fullName === '') {
            $fullName = explode('@', (string) $data['email'])[0] ?? 'User';
        }

        return User::create([
            'name'       => $fullName, // <-- important for your NOT NULL column
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'username'   => $data['username'],

            'gender'     => $data['gender'],
            'age'        => $data['age'],
            'height_cm'  => $data['height_cm'],
            'weight_kg'  => $data['weight_kg'],

            'has_medical_history' => (bool) $data['has_medical_history'],
            'medical_history'     => $data['medical_history'],

            'dietary_goal' => $data['dietary_goal'],
            'fitness_goal' => $data['fitness_goal'],
            'diet_name'    => $data['diet_name'],
            'allergies'    => $data['allergies'] ?? [],

            'activity_level'        => $data['activity_level'],
            'workout_days_per_week' => $data['workout_days_per_week'],
            'workout_location'      => $data['workout_location'],

            'tried_diet_before'    => $data['tried_diet_before'] === 'yes',
            'diet_failure_reasons' => $data['diet_failure_reasons'] ?? [],
            'diet_failure_other'   => $data['diet_failure_other'],

            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
    }
}
