<?php

use App\Models\Food;
use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Models\WorkoutLog;
use Inertia\Testing\AssertableInertia as Assert;

test('trainer clients page only shows the trainers assigned clients', function () {
    $trainer = User::factory()->create([
        'role' => User::ROLE_TRAINER,
        'verified' => true,
    ]);
    $otherTrainer = User::factory()->create([
        'role' => User::ROLE_TRAINER,
        'verified' => true,
    ]);
    $client = User::factory()->create();
    $otherClient = User::factory()->create();

    ProfessionalClientAssignment::query()->create([
        'professional_id' => $trainer->id,
        'client_id' => $client->id,
        'professional_role' => User::ROLE_TRAINER,
        'assigned_by' => $trainer->id,
    ]);
    ProfessionalClientAssignment::query()->create([
        'professional_id' => $otherTrainer->id,
        'client_id' => $otherClient->id,
        'professional_role' => User::ROLE_TRAINER,
        'assigned_by' => $otherTrainer->id,
    ]);

    Measurement::query()->create([
        'user_id' => $client->id,
        'measured_at' => now()->subDay(),
        'weight_kg' => 82.5,
        'height_cm' => 181,
    ]);

    WorkoutLog::query()->create([
        'user_id' => $client->id,
        'performed_at' => now()->subHours(4),
        'duration_min' => 48,
        'notes' => 'Leg day',
    ]);

    $this->actingAs($trainer)
        ->get(route('trainer.clients.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('professionals/clients')
            ->where('roleMode', User::ROLE_TRAINER)
            ->has('clients', 1)
            ->where('clients.0.client.id', $client->id)
            ->where('clients.0.training.summary.logged_sessions', 1)
            ->where('clients.0.progress.latest_height_cm', 181));
});

test('nutritionist clients page shows meal history for assigned clients only', function () {
    $nutritionist = User::factory()->create([
        'role' => User::ROLE_NUTRITIONIST,
        'verified' => true,
    ]);
    $trainer = User::factory()->create([
        'role' => User::ROLE_TRAINER,
        'verified' => true,
    ]);
    $client = User::factory()->create();

    ProfessionalClientAssignment::query()->create([
        'professional_id' => $nutritionist->id,
        'client_id' => $client->id,
        'professional_role' => User::ROLE_NUTRITIONIST,
        'assigned_by' => $nutritionist->id,
    ]);

    $food = Food::query()->create([
        'name' => 'Greek Yogurt',
        'calories' => 120,
    ]);

    MealEntry::query()->create([
        'user_id' => $client->id,
        'food_id' => $food->id,
        'meal_type' => 'breakfast',
        'servings' => 1,
        'eaten_at' => now()->toDateString(),
    ]);

    Measurement::query()->create([
        'user_id' => $client->id,
        'measured_at' => now(),
        'weight_kg' => 69.4,
        'height_cm' => 168,
    ]);

    $this->actingAs($nutritionist)
        ->get(route('dietitian.clients.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('professionals/clients')
            ->where('roleMode', User::ROLE_NUTRITIONIST)
            ->has('clients', 1)
            ->where('clients.0.client.id', $client->id)
            ->where('clients.0.progress.latest_weight_kg', 69.4)
            ->where('clients.0.nutrition.weekly_days.0.meals.0.items.0.food_name', 'Greek Yogurt'));

    $this->actingAs($trainer)
        ->get(route('dietitian.clients.index'))
        ->assertForbidden();
});
