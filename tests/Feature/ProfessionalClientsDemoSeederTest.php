<?php

use App\Models\User;
use Database\Seeders\ProfessionalClientsDemoSeeder;
use Database\Seeders\RbacDemoSeeder;
use Illuminate\Support\Facades\Hash;

it('seeds diverse professional client profiles across signup choices', function () {
    $this->seed(RbacDemoSeeder::class);
    $this->seed(ProfessionalClientsDemoSeeder::class);

    $clients = User::query()
        ->where('email', 'like', '%@clients.hayetak.local')
        ->orderBy('email')
        ->get();

    $dietFailureReasons = $clients
        ->flatMap(fn (User $user) => (array) ($user->diet_failure_reasons ?? []))
        ->unique()
        ->values()
        ->all();

    $workoutCombos = $clients
        ->map(fn (User $user) => "{$user->workout_days_per_week}|{$user->workout_location}")
        ->unique();

    $goalCombos = $clients
        ->map(fn (User $user) => "{$user->dietary_goal}|{$user->fitness_goal}")
        ->unique();

    expect($clients->count())->toBe(21)
        ->and($clients->pluck('diet_name')->unique()->values()->all())->toEqualCanonicalizing([
            'Mediterranean',
            'Keto',
            'Paleo',
            'Vegan',
            'Vegetarian',
            'DASH',
            'Low-Carb',
            'High-Protein',
            'Intermittent Fasting',
            'Whole30',
            'Low FODMAP',
        ])
        ->and($clients->pluck('dietary_goal')->unique()->values()->all())->toEqualCanonicalizing([
            'Calorie Deficit',
            'Maintenance',
            'Calorie Surplus',
            'Balanced Nutrition',
        ])
        ->and($clients->pluck('fitness_goal')->unique()->values()->all())->toEqualCanonicalizing([
            'Lose Weight',
            'Maintain',
            'Build Muscle',
            'Improve Endurance',
            'Recomposition',
        ])
        ->and($clients->pluck('activity_level')->unique()->values()->all())->toEqualCanonicalizing([
            'Sedentary',
            'Lightly Active',
            'Moderately Active',
            'Very Active',
            'Athlete',
        ])
        ->and($clients->pluck('workout_location')->unique()->values()->all())->toEqualCanonicalizing([
            'home',
            'gym',
            'both',
        ])
        ->and($clients->pluck('workout_days_per_week')->unique()->sort()->values()->all())->toEqual([1, 2, 3, 4, 5, 6, 7])
        ->and($workoutCombos->count())->toBe(21)
        ->and($dietFailureReasons)->toEqualCanonicalizing([
            'Too restrictive',
            'Hunger/low energy',
            'Social/lifestyle conflicts',
            'Too expensive',
            'Time/meal prep burden',
            'Lack of results',
            'Medical reasons',
            'Travel/routine changes',
            'Cravings',
            'Confusing guidance',
        ])
        ->and($goalCombos->count())->toBeGreaterThanOrEqual(12)
        ->and($clients->contains(fn (User $user) => str_contains(strtolower($user->name), 'demo')))->toBeFalse()
        ->and($clients->contains(fn (User $user) => blank($user->diet_name) || blank($user->activity_level)))->toBeFalse()
        ->and($clients->where('has_medical_history', true)->count())->toBeGreaterThan(10)
        ->and($clients->where('tried_diet_before', false)->count())->toBeGreaterThanOrEqual(5);
});

it('does not overwrite an existing client if the seeded email already exists', function () {
    $this->seed(RbacDemoSeeder::class);

    User::query()->create([
        'name' => 'Existing Member',
        'first_name' => 'Existing',
        'last_name' => 'Member',
        'email' => 'rana.sayegh@clients.hayetak.local',
        'username' => 'existing_member',
        'password' => Hash::make('password'),
        'role' => User::ROLE_CLIENT,
        'verified' => true,
        'status' => 'active',
        'diet_name' => 'Mediterranean',
        'dietary_goal' => 'Maintenance',
        'fitness_goal' => 'Maintain',
        'activity_level' => 'Lightly Active',
        'workout_days_per_week' => 2,
        'workout_location' => 'home',
        'email_verified_at' => now(),
    ]);

    $this->seed(ProfessionalClientsDemoSeeder::class);

    $user = User::query()->where('email', 'rana.sayegh@clients.hayetak.local')->firstOrFail();

    expect($user->name)->toBe('Existing Member')
        ->and($user->first_name)->toBe('Existing')
        ->and($user->username)->toBe('existing_member');
});
