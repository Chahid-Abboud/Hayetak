<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get(route('dashboard'))->assertOk();
});

test('dashboard returns the full weight history for progress and predictor views', function () {
    $user = User::factory()->create();

    $rows = [];
    foreach (range(0, 90) as $offset) {
        $rows[] = [
            'user_id' => $user->id,
            'measured_at' => CarbonImmutable::parse('2026-01-01')
                ->addDays($offset)
                ->toDateString(),
            'weight_kg' => 82 - ($offset * 0.05),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    DB::table('measurements')->insert($rows);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('weightHistory', 91)
            ->where('weightHistory.0.date', '2026-01-01')
            ->where('weightHistory.90.date', '2026-04-01'));
});
