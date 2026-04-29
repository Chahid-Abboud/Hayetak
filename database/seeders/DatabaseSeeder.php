<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Ai\AiProfileDiversitySeeder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Tarek Demo',
                'first_name' => 'Tarek',
                'last_name' => 'Demo',
                'username' => 'tarek_demo',
                'gender' => 'male',
                'age' => 32,
                'height_cm' => 178,
                'weight_kg' => 84.0,
                'dietary_goal' => 'Maintenance',
                'fitness_goal' => 'Recomposition',
                'diet_name' => 'Mediterranean',
                'allergies' => ['Peanuts'],
                'has_medical_history' => true,
                'medical_history' => 'Old right shoulder irritation, prefers controlled pressing volume.',
                'activity_level' => 'Moderately Active',
                'workout_days_per_week' => 4,
                'workout_location' => 'both',
                'tried_diet_before' => true,
                'diet_failure_reasons' => ['Travel/routine changes', 'Confusing guidance'],
                'diet_failure_other' => 'Work dinners made consistency harder on weekdays.',
                'password' => Hash::make('password'),
                'role' => User::ROLE_CLIENT,
                'verified' => true,
                'status' => 'active',
                'city' => 'Beirut',
                'email_verified_at' => now(),
            ]
        );

        // Run import seeders
        $this->call([
            ImportFoodsFromCsvSeeder::class,
            ImportExercisesFromJsonSeeder::class,
            PlacesLocalSeeder::class,
            RbacDemoSeeder::class,
            ProfessionalClientsDemoSeeder::class,
            AiProfileDiversitySeeder::class,
            WelcomeConversationSeeder::class,
            DocxMealCatalogSeeder::class,
            UserHistoryBackfillSeeder::class,
        ]);
    }
}
