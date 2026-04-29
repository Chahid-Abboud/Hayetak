<?php

use App\Models\Food;
use App\Models\User;
use Database\Seeders\ProfessionalClientsDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('adds planner-safe metadata to professional demo meal foods', function () {
    User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'verified' => true,
        'status' => 'active',
    ]);

    User::factory()->create([
        'role' => User::ROLE_NUTRITIONIST,
        'verified' => true,
        'status' => 'active',
        'city' => 'Beirut',
    ]);

    $this->seed(ProfessionalClientsDemoSeeder::class);

    $food = Food::query()->where('name', 'Apple Cinnamon Oat Bowl')->first();

    expect($food)->not->toBeNull()
        ->and($food->allergens)->toContain('milk')
        ->and($food->diets_allowed)->toContain('dash')
        ->and($food->ingredients)->toContain('oats');

    if (Schema::hasColumn('foods', 'meal_types')) {
        expect($food->meal_types)->toContain('breakfast');
    }
});
