<?php

namespace Database\Factories;

use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProfessionalVerification>
 */
class ProfessionalVerificationFactory extends Factory
{
    protected $model = ProfessionalVerification::class;

    public function definition(): array
    {
        $role = fake()->randomElement([User::ROLE_TRAINER, User::ROLE_NUTRITIONIST]);

        return [
            'user_id' => User::factory(),
            'role' => $role,
            'full_legal_name' => fake()->name(),
            'license_number' => strtoupper(substr($role, 0, 3)).'-'.fake()->unique()->numerify('####'),
            'authority' => 'Demo Authority',
            'country_state' => fake()->city(),
            'expiry_date' => now()->addYear()->toDateString(),
            'documents' => ['demo/doc.pdf'],
            'review_status' => 'pending',
            'reviewed_by' => null,
            'reviewed_at' => null,
            'notes' => null,
        ];
    }
}
