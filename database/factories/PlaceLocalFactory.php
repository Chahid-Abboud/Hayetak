<?php

namespace Database\Factories;

use App\Models\PlaceLocal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlaceLocal>
 */
class PlaceLocalFactory extends Factory
{
    protected $model = PlaceLocal::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->company(),
            'category' => fake()->randomElement(['gym', 'nutritionist']),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
            'meta' => ['source' => 'factory'],
        ];
    }
}

