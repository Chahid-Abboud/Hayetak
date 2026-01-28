<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Jobs\GeneratePlansForUser;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisterWizardController extends Controller
{
    /**
     * Show the register page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle a new registration request.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Basic profile (required)
            'first_name' => ['required', 'string', 'max:40'],
            'last_name'  => ['required', 'string', 'max:40'],
            'gender'     => ['required', Rule::in(['male', 'female', 'other'])],
            'age'        => ['required', 'integer', 'between:13,100'],
            'height_cm'  => ['required', 'integer', 'between:80,250'],
            'weight_kg'  => ['required', 'numeric', 'between:25,400'],

            // Optional username (unique, limited charset)
            'username' => [
                'nullable', 'string', 'max:24',
                'regex:/^[A-Za-z0-9_.]+$/',
                Rule::unique('users', 'username'),
            ],

            // Medical history (optional)
            'has_medical_history' => ['sometimes', 'boolean'],
            'medical_history'     => ['nullable', 'string', 'max:500'],

            // Goals / diet (optional)
            'dietary_goal' => ['nullable', 'string', 'max:60'],
            'fitness_goal' => ['nullable', 'string', 'max:60'],
            'diet_name'    => ['nullable', 'string', 'max:60'],
            'allergies'    => ['nullable', 'array'],
            'allergies.*'  => ['string', 'max:60'],

            // Activity (optional)
            'activity_level' => ['nullable', Rule::in([
                'Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete'
            ])],
            'workout_days_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'workout_location'      => ['nullable', Rule::in(['home', 'gym', 'both'])],

            // Diet experience (optional; wizard may send "yes"/"no")
            'tried_diet_before'      => ['nullable', Rule::in(['yes', 'no', true, false, 1, 0, '1', '0'])],
            'diet_failure_reasons'   => ['nullable', 'array'],
            'diet_failure_reasons.*' => ['string', 'max:80'],
            'diet_failure_other'     => ['nullable', 'string', 'max:120'],

            // Credentials
            'email'    => ['required', 'string', 'lowercase', 'email', 'max:120', Rule::unique(User::class, 'email')],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Normalize wizard boolean to true/false
        $tried = $request->input('tried_diet_before');
        $triedBool = match ($tried) {
            'yes', 1, '1', true  => true,
            'no',  0, '0', false => false,
            default               => null,
        };

        // Build a safe "full name" for NOT NULL `name`
        $fullName = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
        if ($fullName === '') {
            $fullName = strtok((string) ($validated['email'] ?? ''), '@') ?: 'User';
        }

        $user = User::create([
            'name'       => $fullName,

            // Profile
            'first_name' => $validated['first_name'],
            'last_name'  => $validated['last_name'],
            'username'   => $validated['username'] ?? null,
            'gender'     => $validated['gender'],
            'age'        => $validated['age'],
            'height_cm'  => $validated['height_cm'],
            'weight_kg'  => $validated['weight_kg'],

            // Medical
            'has_medical_history' => (bool) ($validated['has_medical_history'] ?? false),
            'medical_history'     => $validated['medical_history'] ?? null,

            // Goals / diet
            'dietary_goal' => $validated['dietary_goal'] ?? null,
            'fitness_goal' => $validated['fitness_goal'] ?? null,
            'diet_name'    => $validated['diet_name'] ?? null,
            'allergies'    => $validated['allergies'] ?? null,

            // Activity
            'activity_level'        => $validated['activity_level'] ?? null,
            'workout_days_per_week' => $validated['workout_days_per_week'] ?? null,
            'workout_location'      => $validated['workout_location'] ?? null,

            // Diet experience
            'tried_diet_before'    => $triedBool,
            'diet_failure_reasons' => $validated['diet_failure_reasons'] ?? null,
            'diet_failure_other'   => $validated['diet_failure_other'] ?? null,

            // Auth
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        /**
         * Generate initial plans in the background.
         *
         * If QUEUE_CONNECTION=sync -> runs immediately.
         * If QUEUE_CONNECTION=database -> requires queue:work running.
         */
        GeneratePlansForUser::dispatch($user->id, 7);

        return redirect()
            ->route('two-factor.show')
            ->with('must_enable_2fa', true);
    }
}
