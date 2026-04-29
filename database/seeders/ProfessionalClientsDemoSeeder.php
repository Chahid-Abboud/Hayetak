<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\Message;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ProfessionalClientsDemoSeeder extends Seeder
{
    private ?bool $foodsHasMealTypesColumn = null;

    public function run(): void
    {
        $professionals = User::query()
            ->whereIn('role', [User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])
            ->where('verified', true)
            ->orderBy('id')
            ->get()
            ->values();

        if ($professionals->isEmpty()) {
            return;
        }

        $admin = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->orderBy('id')
            ->first();

        $exercise = Exercise::query()->orderBy('id')->first();
        $profiles = $this->clientProfiles();

        foreach ($profiles as $index => $profile) {
            /** @var User $professional */
            $professional = $professionals[$index % $professionals->count()];
            $client = $this->ensureSeededClient($professional, $profile);

            ProfessionalClientAssignment::query()->firstOrCreate(
                [
                    'professional_id' => $professional->id,
                    'client_id' => $client->id,
                    'professional_role' => $professional->role,
                ],
                [
                    'assigned_by' => $admin?->id ?? $professional->id,
                    'notes' => 'Seeded client profile for workflow checks.',
                ],
            );

            $this->seedMeasurements($client, $profile);
            $this->seedAppointment($professional, $client, $profile, $index);
            $this->seedConversation($professional, $client, $profile);

            if ($professional->role === User::ROLE_NUTRITIONIST) {
                $this->seedMeals($client, $profile);
            }

            if ($professional->role === User::ROLE_TRAINER) {
                $this->seedWorkouts($client, $exercise, $profile);
            }
        }
    }

    private function ensureSeededClient(User $professional, array $profile): User
    {
        return User::query()->firstOrCreate(
            ['email' => $profile['email']],
            [
                'name' => $profile['first_name'].' '.$profile['last_name'],
                'first_name' => $profile['first_name'],
                'last_name' => $profile['last_name'],
                'username' => $profile['username'],
                'password' => Hash::make('password'),
                'role' => User::ROLE_CLIENT,
                'verified' => true,
                'status' => 'active',
                'gender' => $profile['gender'],
                'age' => $profile['age'],
                'height_cm' => $profile['height_cm'],
                'weight_kg' => $profile['weight_kg'],
                'city' => $professional->city,
                'has_medical_history' => $profile['has_medical_history'],
                'medical_history' => $profile['medical_history'],
                'dietary_goal' => $profile['dietary_goal'],
                'fitness_goal' => $profile['fitness_goal'],
                'diet_name' => $profile['diet_name'],
                'allergies' => $profile['allergies'],
                'activity_level' => $profile['activity_level'],
                'workout_days_per_week' => $profile['workout_days_per_week'],
                'workout_location' => $profile['workout_location'],
                'tried_diet_before' => $profile['tried_diet_before'],
                'diet_failure_reasons' => $profile['diet_failure_reasons'],
                'diet_failure_other' => $profile['diet_failure_other'],
                'email_verified_at' => now(),
            ],
        );
    }

    private function seedMeasurements(User $client, array $profile): void
    {
        $currentWeight = (float) $profile['weight_kg'];
        $goalKey = strtolower($profile['dietary_goal'].' '.$profile['fitness_goal']);

        if (str_contains($goalKey, 'deficit') || str_contains($goalKey, 'lose weight')) {
            $series = [$currentWeight + 2.4, $currentWeight + 1.1, $currentWeight];
        } elseif (str_contains($goalKey, 'surplus') || str_contains($goalKey, 'build muscle')) {
            $series = [$currentWeight - 1.8, $currentWeight - 0.7, $currentWeight];
        } elseif (str_contains($goalKey, 'recomposition')) {
            $series = [$currentWeight + 1.0, $currentWeight + 0.4, $currentWeight];
        } else {
            $series = [$currentWeight + 0.4, $currentWeight - 0.2, $currentWeight];
        }

        $points = [
            ['days_ago' => 21, 'weight_kg' => round($series[0], 1)],
            ['days_ago' => 10, 'weight_kg' => round($series[1], 1)],
            ['days_ago' => 2, 'weight_kg' => round($series[2], 1)],
        ];

        foreach ($points as $point) {
            Measurement::query()->firstOrCreate(
                [
                    'user_id' => $client->id,
                    'measured_at' => Carbon::today()->subDays($point['days_ago'])->setTime(9, 0, 0),
                ],
                [
                    'height_cm' => $client->height_cm,
                    'weight_kg' => $point['weight_kg'],
                    'notes' => 'Seeded progress trend aligned with the client goal.',
                ],
            );
        }
    }

    private function seedAppointment(User $professional, User $client, array $profile, int $profileIndex): void
    {
        $scheduledAt = Carbon::today()
            ->addDays(($profileIndex % 4) + 1)
            ->setTime(($profileIndex % 2) === 0 ? 10 : 16, 0, 0);

        Appointment::query()->firstOrCreate(
            [
                'client_id' => $client->id,
                'professional_id' => $professional->id,
                'professional_role' => $professional->role,
                'scheduled_at' => $scheduledAt,
                'created_by' => $client->id,
            ],
            [
                'status' => ($profileIndex % 3) === 0 ? 'accepted' : 'requested',
                'notes' => $professional->role === User::ROLE_NUTRITIONIST
                    ? 'Seeded nutrition follow-up around diet adherence and meal logs.'
                    : 'Seeded training follow-up around progress, recovery, and exercise selection.',
            ],
        );
    }

    private function seedConversation(User $professional, User $client, array $profile): void
    {
        $conversation = $this->ensureOneToOneConversation($professional, $client);
        $allergies = $profile['allergies'] === [] ? 'no listed allergies' : implode(', ', $profile['allergies']);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $client->id,
            'body' => $professional->role === User::ROLE_NUTRITIONIST
                ? "Hi {$professional->first_name}, I'm following {$profile['diet_name']} and working on {$profile['dietary_goal']}. My main blockers were {$this->reasonSummary($profile)}."
                : "Hi {$professional->first_name}, my goal is {$profile['fitness_goal']} with {$profile['workout_days_per_week']} training days at {$profile['workout_location']}. I also noted {$this->medicalSummary($profile)}.",
        ]);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $professional->id,
            'body' => $professional->role === User::ROLE_NUTRITIONIST
                ? "Perfect, I can see your profile. I'll keep {$profile['diet_name']} and {$allergies} in mind when we review your meal routine."
                : "Thanks, I can see your profile and recent logs. We'll match the plan to your {$profile['activity_level']} schedule and any recovery limits you listed.",
        ]);
    }

    private function seedMeals(User $client, array $profile): void
    {
        foreach (range(0, 6) as $offset) {
            $date = Carbon::today()->subDays($offset)->toDateString();

            foreach ($profile['meal_plan'] as $mealIndex => $meal) {
                $metadata = $this->mealCatalogMetadata($meal, $profile);
                $food = Food::query()->firstOrNew(['name' => $meal['name']]);

                $attributes = [
                    'category' => $meal['category'],
                    'serving_size' => $meal['serving_size'] ?? 1,
                    'serving_unit' => $meal['serving_unit'],
                    'calories' => $meal['calories'],
                    'protein_g' => $meal['protein_g'],
                    'carbs_g' => $meal['carbs_g'],
                    'fat_g' => $meal['fat_g'],
                    'tags' => $this->mergeFoodLists($food->tags, $metadata['tags'] ?? []),
                    'allergens' => $this->mergeFoodLists($food->allergens, $metadata['allergens'] ?? []),
                    'diets_allowed' => $this->mergeFoodLists($food->diets_allowed, $metadata['diets_allowed'] ?? []),
                    'ingredients' => $this->mergeFoodLists($food->ingredients, $metadata['ingredients'] ?? []),
                ];

                if ($this->foodsHasMealTypesColumn()) {
                    $attributes['meal_types'] = $this->mergeFoodLists(
                        $food->meal_types,
                        $metadata['meal_types'] ?? [$meal['meal_type']]
                    );
                }

                $food->fill($attributes);
                $food->save();

                MealEntry::query()->firstOrCreate(
                    [
                        'user_id' => $client->id,
                        'food_id' => $food->id,
                        'meal_type' => $meal['meal_type'],
                        'eaten_at' => $date,
                    ],
                    [
                        'servings' => $this->servingsForMeal($profile, $mealIndex, $offset),
                    ],
                );
            }
        }
    }

    private function seedWorkouts(User $client, ?Exercise $exercise, array $profile): void
    {
        $notes = $this->workoutTemplatesFor($profile);
        $skipSets = $profile['workout_location'] === 'home' || $this->hasMovementLimitations($profile);

        foreach ($notes as $index => $workout) {
            $log = WorkoutLog::query()->firstOrCreate(
                [
                    'user_id' => $client->id,
                    'performed_at' => Carbon::today()->subDays($workout['days_ago'])->setTime(18, 0, 0),
                ],
                [
                    'duration_min' => $workout['duration_min'],
                    'notes' => $workout['notes'],
                ],
            );

            if ($exercise && ! $skipSets) {
                $baseWeight = max(12.0, round(((float) $profile['weight_kg']) * 0.22, 1));

                WorkoutLogSet::query()->firstOrCreate(
                    [
                        'workout_log_id' => $log->id,
                        'exercise_id' => $exercise->id,
                        'order_index' => 0,
                    ],
                    [
                        'weight_kg' => $baseWeight + ($index * 2),
                        'reps' => 10,
                    ],
                );

                WorkoutLogSet::query()->firstOrCreate(
                    [
                        'workout_log_id' => $log->id,
                        'exercise_id' => $exercise->id,
                        'order_index' => 1,
                    ],
                    [
                        'weight_kg' => $baseWeight + 2 + ($index * 2),
                        'reps' => 8,
                    ],
                );
            }
        }
    }

    private function servingsForMeal(array $profile, int $mealIndex, int $offset): float
    {
        $goalKey = strtolower($profile['dietary_goal'].' '.$profile['fitness_goal']);
        $base = 1.0;

        if (str_contains($goalKey, 'deficit') || str_contains($goalKey, 'lose weight')) {
            $base = $mealIndex === 2 ? 0.9 : 1.0;
        } elseif (str_contains($goalKey, 'surplus') || str_contains($goalKey, 'build muscle')) {
            $base = $mealIndex === 1 ? 1.25 : 1.1;
        }

        if ($offset === 0 && $mealIndex === 1) {
            $base += 0.1;
        }

        return round($base, 2);
    }

    private function reasonSummary(array $profile): string
    {
        if (! $profile['tried_diet_before']) {
            return 'I have not tried a structured diet before';
        }

        $reasons = $profile['diet_failure_reasons'];

        if ($profile['diet_failure_other']) {
            $reasons[] = $profile['diet_failure_other'];
        }

        return implode(', ', $reasons);
    }

    private function medicalSummary(array $profile): string
    {
        if (! $profile['has_medical_history']) {
            return 'no medical limitations right now';
        }

        return Str::of((string) $profile['medical_history'])->limit(90)->value();
    }

    private function hasMovementLimitations(array $profile): bool
    {
        if (! $profile['has_medical_history']) {
            return false;
        }

        $history = strtolower((string) $profile['medical_history']);

        foreach (['shoulder', 'ankle', 'knee', 'back', 'wrist', 'asthma'] as $keyword) {
            if (str_contains($history, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function workoutTemplatesFor(array $profile): array
    {
        if ($profile['workout_location'] === 'home') {
            return [
                ['days_ago' => 6, 'duration_min' => 34, 'notes' => 'Home full-body circuit with bodyweight and band work'],
                ['days_ago' => 3, 'duration_min' => 29, 'notes' => 'Core stability and low-impact conditioning at home'],
                ['days_ago' => 1, 'duration_min' => 31, 'notes' => 'Mobility flow, glute activation, and brisk walk'],
            ];
        }

        if ($this->hasMovementLimitations($profile)) {
            return [
                ['days_ago' => 6, 'duration_min' => 32, 'notes' => 'Recovery-focused mobility and machine warm-up session'],
                ['days_ago' => 3, 'duration_min' => 36, 'notes' => 'Low-impact cardio with controlled core stability work'],
                ['days_ago' => 1, 'duration_min' => 30, 'notes' => 'Technique practice with pain-free ranges only'],
            ];
        }

        $goal = strtolower((string) $profile['fitness_goal']);

        if (str_contains($goal, 'endurance')) {
            return [
                ['days_ago' => 6, 'duration_min' => 44, 'notes' => 'Steady-state cardio and light posterior-chain work'],
                ['days_ago' => 3, 'duration_min' => 48, 'notes' => 'Tempo intervals followed by lower-body accessories'],
                ['days_ago' => 1, 'duration_min' => 41, 'notes' => 'Full-body circuit with short rest periods'],
            ];
        }

        if (str_contains($goal, 'build muscle')) {
            return [
                ['days_ago' => 6, 'duration_min' => 52, 'notes' => 'Upper-body hypertrophy session'],
                ['days_ago' => 3, 'duration_min' => 57, 'notes' => 'Lower-body strength and accessory work'],
                ['days_ago' => 1, 'duration_min' => 46, 'notes' => 'Push-pull session with moderate conditioning finish'],
            ];
        }

        return [
            ['days_ago' => 6, 'duration_min' => 42, 'notes' => 'Full-body resistance training'],
            ['days_ago' => 3, 'duration_min' => 45, 'notes' => 'Intervals plus core and posture work'],
            ['days_ago' => 1, 'duration_min' => 38, 'notes' => 'Lower-body focus with a conditioning finisher'],
        ];
    }

    private function clientProfiles(): array
    {
        $identities = [
            ['first_name' => 'Rana', 'last_name' => 'Sayegh', 'username' => 'rana_sayegh', 'gender' => 'female', 'age' => 29, 'height_cm' => 165, 'weight_kg' => 68.2],
            ['first_name' => 'Youssef', 'last_name' => 'Khoury', 'username' => 'youssef_khoury', 'gender' => 'male', 'age' => 37, 'height_cm' => 182, 'weight_kg' => 97.0],
            ['first_name' => 'Mira', 'last_name' => 'Nader', 'username' => 'mira_nader', 'gender' => 'female', 'age' => 24, 'height_cm' => 170, 'weight_kg' => 59.4],
            ['first_name' => 'Fadi', 'last_name' => 'Halabi', 'username' => 'fadi_halabi', 'gender' => 'male', 'age' => 42, 'height_cm' => 176, 'weight_kg' => 88.6],
            ['first_name' => 'Nour', 'last_name' => 'Saab', 'username' => 'nour_saab', 'gender' => 'female', 'age' => 31, 'height_cm' => 162, 'weight_kg' => 74.1],
            ['first_name' => 'Karim', 'last_name' => 'Daher', 'username' => 'karim_daher', 'gender' => 'male', 'age' => 27, 'height_cm' => 178, 'weight_kg' => 81.3],
            ['first_name' => 'Salma', 'last_name' => 'Tabet', 'username' => 'salma_tabet', 'gender' => 'female', 'age' => 35, 'height_cm' => 167, 'weight_kg' => 66.8],
            ['first_name' => 'Jad', 'last_name' => 'Makki', 'username' => 'jad_makki', 'gender' => 'male', 'age' => 33, 'height_cm' => 184, 'weight_kg' => 90.5],
            ['first_name' => 'Leen', 'last_name' => 'Farah', 'username' => 'leen_farah', 'gender' => 'female', 'age' => 26, 'height_cm' => 160, 'weight_kg' => 54.7],
            ['first_name' => 'Omar', 'last_name' => 'Chami', 'username' => 'omar_chami', 'gender' => 'male', 'age' => 39, 'height_cm' => 173, 'weight_kg' => 78.4],
            ['first_name' => 'Tala', 'last_name' => 'Azar', 'username' => 'tala_azar', 'gender' => 'female', 'age' => 28, 'height_cm' => 169, 'weight_kg' => 72.9],
            ['first_name' => 'Ziad', 'last_name' => 'Barakat', 'username' => 'ziad_barakat', 'gender' => 'male', 'age' => 45, 'height_cm' => 175, 'weight_kg' => 103.2],
            ['first_name' => 'Dalia', 'last_name' => 'Ghanem', 'username' => 'dalia_ghanem', 'gender' => 'female', 'age' => 34, 'height_cm' => 164, 'weight_kg' => 63.5],
            ['first_name' => 'Sami', 'last_name' => 'Moukarzel', 'username' => 'sami_moukarzel', 'gender' => 'male', 'age' => 30, 'height_cm' => 181, 'weight_kg' => 85.1],
            ['first_name' => 'Hiba', 'last_name' => 'Antoun', 'username' => 'hiba_antoun', 'gender' => 'female', 'age' => 41, 'height_cm' => 158, 'weight_kg' => 69.6],
            ['first_name' => 'Rami', 'last_name' => 'Karam', 'username' => 'rami_karam', 'gender' => 'male', 'age' => 25, 'height_cm' => 187, 'weight_kg' => 76.8],
            ['first_name' => 'Farah', 'last_name' => 'Issa', 'username' => 'farah_issa', 'gender' => 'female', 'age' => 38, 'height_cm' => 171, 'weight_kg' => 82.2],
            ['first_name' => 'Elias', 'last_name' => 'Kfoury', 'username' => 'elias_kfoury', 'gender' => 'male', 'age' => 29, 'height_cm' => 177, 'weight_kg' => 70.4],
            ['first_name' => 'Jana', 'last_name' => 'Safi', 'username' => 'jana_safi', 'gender' => 'female', 'age' => 32, 'height_cm' => 166, 'weight_kg' => 60.8],
            ['first_name' => 'Nabil', 'last_name' => 'Haddad', 'username' => 'nabil_haddad', 'gender' => 'male', 'age' => 36, 'height_cm' => 179, 'weight_kg' => 95.7],
            ['first_name' => 'Reem', 'last_name' => 'Atallah', 'username' => 'reem_atallah', 'gender' => 'female', 'age' => 27, 'height_cm' => 163, 'weight_kg' => 57.6],
        ];

        $goalCombos = [
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Lose Weight'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Maintain'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Improve Endurance'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Build Muscle'],
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Recomposition'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Maintain'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Improve Endurance'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Recomposition'],
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Improve Endurance'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Lose Weight'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Build Muscle'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Build Muscle'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Recomposition'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Improve Endurance'],
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Lose Weight'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Improve Endurance'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Maintain'],
            ['dietary_goal' => 'Maintenance', 'fitness_goal' => 'Recomposition'],
            ['dietary_goal' => 'Balanced Nutrition', 'fitness_goal' => 'Build Muscle'],
            ['dietary_goal' => 'Calorie Deficit', 'fitness_goal' => 'Recomposition'],
            ['dietary_goal' => 'Calorie Surplus', 'fitness_goal' => 'Build Muscle'],
        ];

        $dietNames = [
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
        ];

        $allergies = [
            ['Corn', 'Celery'],
            ['Wheat'],
            ['Milk', 'Soy'],
            ['Fish', 'Shellfish'],
            ['Fish'],
            ['Sesame'],
            ['Banana'],
            ['Mustard'],
            ['Corn', 'Strawberry'],
            ['Sulphites'],
            ['Garlic', 'Onion', 'Avocado'],
            [],
            ['Corn'],
            ['Wheat'],
            ['Milk', 'Eggs'],
            ['Shellfish'],
            [],
            ['Tomato'],
            ['Celery'],
            ['Banana'],
            ['Mustard'],
        ];

        $medicalHistory = [
            null,
            'Type 2 diabetes managed with metformin; prefers steady meal timing.',
            'Mild iron-deficiency anemia and low vitamin D; energy dips in the afternoon.',
            'Old right shoulder impingement; avoids overhead loading during flare-ups.',
            'PCOS with insulin resistance and irregular appetite cues.',
            'Lactose intolerance and occasional acid reflux after late dinners.',
            'Recovered ankle sprain from football; still limits high-impact jumping.',
            'Borderline high blood pressure controlled with lifestyle changes.',
            null,
            'History of IBS symptoms triggered by garlic and onion.',
            'Postpartum core weakness and mild lower-back tightness.',
            'Obstructive sleep apnea and high triglycerides.',
            null,
            'Patellofemoral knee pain on deep flexion days.',
            'Hypothyroidism managed with levothyroxine.',
            null,
            'Migraine history; dehydration can trigger headaches.',
            'Previous wrist strain from boxing; avoids long push-up volumes.',
            null,
            'Nonalcoholic fatty liver disease and elevated LDL.',
            'Seasonal asthma; needs gradual cardio warm-ups.',
        ];

        $experience = $this->dietExperienceProfiles();
        $workoutCombos = $this->workoutCombos();
        $profiles = [];

        foreach ($identities as $index => $identity) {
            $combo = $workoutCombos[$index];
            $dietName = $dietNames[$index];
            $emailLocal = Str::of($identity['first_name'].' '.$identity['last_name'])
                ->lower()
                ->replaceMatches('/[^a-z0-9]+/', '.')
                ->trim('.')
                ->value();

            $profiles[] = [
                'email' => $emailLocal.'@clients.hayetak.local',
                'first_name' => $identity['first_name'],
                'last_name' => $identity['last_name'],
                'username' => $identity['username'],
                'gender' => $identity['gender'],
                'age' => $identity['age'],
                'height_cm' => $identity['height_cm'],
                'weight_kg' => $identity['weight_kg'],
                'has_medical_history' => $medicalHistory[$index] !== null,
                'medical_history' => $medicalHistory[$index],
                'dietary_goal' => $goalCombos[$index]['dietary_goal'],
                'fitness_goal' => $goalCombos[$index]['fitness_goal'],
                'diet_name' => $dietName,
                'allergies' => $allergies[$index],
                'activity_level' => $this->activityLevelForDays($combo['workout_days_per_week']),
                'workout_days_per_week' => $combo['workout_days_per_week'],
                'workout_location' => $combo['workout_location'],
                'tried_diet_before' => $experience[$index]['tried_diet_before'],
                'diet_failure_reasons' => $experience[$index]['diet_failure_reasons'],
                'diet_failure_other' => $experience[$index]['diet_failure_other'],
                'meal_plan' => $this->mealPlanForDiet($dietName),
            ];
        }

        return $profiles;
    }

    private function dietExperienceProfiles(): array
    {
        $allReasons = [
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
        ];

        $profiles = [];

        foreach (range(0, 20) as $index) {
            $triedBefore = $index < 16;

            if (! $triedBefore) {
                $profiles[] = [
                    'tried_diet_before' => false,
                    'diet_failure_reasons' => [],
                    'diet_failure_other' => null,
                ];

                continue;
            }

            $count = 2 + ($index % 3);
            $start = ($index * 2) % count($allReasons);
            $reasons = [];

            foreach (range(0, $count - 1) as $offset) {
                $reasons[] = $allReasons[($start + $offset) % count($allReasons)];
            }

            $profiles[] = [
                'tried_diet_before' => true,
                'diet_failure_reasons' => array_values(array_unique($reasons)),
                'diet_failure_other' => match ($index) {
                    4 => 'Weekend family gatherings made consistency hard.',
                    11 => 'My hospital shift schedule changed meal timing every week.',
                    default => null,
                },
            ];
        }

        return $profiles;
    }

    private function workoutCombos(): array
    {
        $combos = [];

        foreach (range(1, 7) as $days) {
            foreach (['home', 'gym', 'both'] as $location) {
                $combos[] = [
                    'workout_days_per_week' => $days,
                    'workout_location' => $location,
                ];
            }
        }

        return $combos;
    }

    private function mealCatalogMetadata(array $meal, array $profile): array
    {
        $dietTag = $this->normalizeDietTag((string) ($profile['diet_name'] ?? ''));
        $lookup = $this->professionalMealCatalog()[$meal['name']] ?? [];

        return [
            'meal_types' => [$meal['meal_type']],
            'tags' => array_values(array_filter([
                'professional-demo',
                'seeded',
                strtolower((string) $meal['meal_type']),
                $dietTag !== '' ? $dietTag : null,
            ])),
            'allergens' => $lookup['allergens'] ?? [],
            'diets_allowed' => $lookup['diets_allowed'] ?? ($dietTag !== '' ? [$dietTag] : []),
            'ingredients' => $lookup['ingredients'] ?? [],
        ];
    }

    /**
     * @return array<string, array<string, array<int, string>>>
     */
    private function professionalMealCatalog(): array
    {
        return [
            'Apple Cinnamon Oat Bowl' => [
                'allergens' => ['milk'],
                'diets_allowed' => ['vegetarian', 'dash', 'mediterranean'],
                'ingredients' => ['oats', 'apple', 'milk', 'cinnamon', 'chia seeds'],
            ],
            'Turkey Brown Rice Plate' => [
                'allergens' => [],
                'diets_allowed' => ['dash', 'mediterranean', 'high-protein', 'gluten-free'],
                'ingredients' => ['turkey breast', 'brown rice', 'green beans', 'olive oil', 'herbs'],
            ],
            'Herb Cod Greens Plate' => [
                'allergens' => ['fish'],
                'diets_allowed' => ['dash', 'mediterranean', 'high-protein', 'gluten-free'],
                'ingredients' => ['cod', 'leafy greens', 'potato', 'olive oil', 'herbs'],
            ],
            'Cottage Cheese Cucumber Plate' => [
                'allergens' => ['milk'],
                'diets_allowed' => ['vegetarian', 'low-carb', 'high-protein', 'gluten-free'],
                'ingredients' => ['cottage cheese', 'cucumber', 'olive oil', 'mint'],
            ],
            'Chicken Cauliflower Rice Bowl' => [
                'allergens' => [],
                'diets_allowed' => ['low-carb', 'whole30', 'paleo', 'high-protein', 'gluten-free'],
                'ingredients' => ['chicken breast', 'cauliflower rice', 'zucchini', 'olive oil', 'herbs'],
            ],
            'Beef Lettuce Cup Plate' => [
                'allergens' => [],
                'diets_allowed' => ['keto', 'low-carb', 'whole30', 'paleo', 'high-protein', 'gluten-free'],
                'ingredients' => ['lean beef', 'lettuce', 'bell pepper', 'olive oil', 'garlic'],
            ],
            'Egg White Veg Scramble' => [
                'allergens' => ['eggs'],
                'diets_allowed' => ['vegetarian', 'high-protein', 'low-carb', 'gluten-free'],
                'ingredients' => ['egg whites', 'spinach', 'mushrooms', 'bell pepper', 'olive oil'],
            ],
            'Chicken Rice Protein Bowl' => [
                'allergens' => [],
                'diets_allowed' => ['high-protein', 'mediterranean', 'gluten-free'],
                'ingredients' => ['chicken breast', 'rice', 'broccoli', 'olive oil', 'herbs'],
            ],
            'Tuna Potato Salad Plate' => [
                'allergens' => ['fish'],
                'diets_allowed' => ['high-protein', 'mediterranean', 'gluten-free'],
                'ingredients' => ['tuna', 'potato', 'green beans', 'olive oil', 'parsley'],
            ],
            'Late Break Fast Protein Oats' => [
                'allergens' => ['milk'],
                'diets_allowed' => ['vegetarian', 'high-protein'],
                'ingredients' => ['oats', 'protein powder', 'berries', 'milk', 'chia seeds'],
            ],
            'Chicken Shawarma Rice Bowl' => [
                'allergens' => [],
                'diets_allowed' => ['high-protein', 'mediterranean'],
                'ingredients' => ['chicken shawarma', 'rice', 'cucumber', 'tomato', 'garlic'],
            ],
            'Yogurt Berry Walnut Cup' => [
                'allergens' => ['milk', 'tree nuts'],
                'diets_allowed' => ['vegetarian', 'high-protein', 'dash', 'gluten-free'],
                'ingredients' => ['greek yogurt', 'berries', 'walnuts', 'honey'],
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function mergeFoodLists(mixed $existing, array $incoming): array
    {
        $items = [];

        foreach ([$existing, $incoming] as $value) {
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                $value = is_array($decoded) ? $decoded : preg_split('/[\r\n,;]+/', $value);
            }

            if (! is_array($value)) {
                continue;
            }

            foreach ($value as $item) {
                $text = strtolower(trim((string) $item));
                if ($text !== '') {
                    $items[] = $text;
                }
            }
        }

        return array_values(array_unique($items));
    }

    private function normalizeDietTag(string $dietName): string
    {
        return Str::of($dietName)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '-')
            ->trim('-')
            ->value();
    }

    private function foodsHasMealTypesColumn(): bool
    {
        return $this->foodsHasMealTypesColumn ??= Schema::hasColumn('foods', 'meal_types');
    }

    private function activityLevelForDays(int $days): string
    {
        return match (true) {
            $days <= 1 => 'Sedentary',
            $days === 2 => 'Lightly Active',
            $days <= 4 => 'Moderately Active',
            $days <= 6 => 'Very Active',
            default => 'Athlete',
        };
    }

    private function mealPlanForDiet(string $dietName): array
    {
        return match ($dietName) {
            'Mediterranean' => [
                ['meal_type' => 'breakfast', 'name' => 'Chickpea Tomato Breakfast Bowl', 'category' => 'Breakfast', 'serving_unit' => 'bowl', 'calories' => 360, 'protein_g' => 16, 'carbs_g' => 41, 'fat_g' => 14],
                ['meal_type' => 'lunch', 'name' => 'Herb Chicken Quinoa Plate', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 520, 'protein_g' => 38, 'carbs_g' => 46, 'fat_g' => 18],
                ['meal_type' => 'dinner', 'name' => 'Baked Salmon Potato Tray', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 470, 'protein_g' => 34, 'carbs_g' => 27, 'fat_g' => 22],
            ],
            'Keto' => [
                ['meal_type' => 'breakfast', 'name' => 'Avocado Egg Plate', 'category' => 'Breakfast', 'serving_unit' => 'plate', 'calories' => 410, 'protein_g' => 23, 'carbs_g' => 8, 'fat_g' => 31],
                ['meal_type' => 'lunch', 'name' => 'Beef Zucchini Skillet', 'category' => 'Lunch', 'serving_unit' => 'bowl', 'calories' => 540, 'protein_g' => 39, 'carbs_g' => 11, 'fat_g' => 36],
                ['meal_type' => 'dinner', 'name' => 'Salmon Broccoli Butter Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 500, 'protein_g' => 35, 'carbs_g' => 9, 'fat_g' => 35],
            ],
            'Paleo' => [
                ['meal_type' => 'breakfast', 'name' => 'Turkey Sweet Potato Hash', 'category' => 'Breakfast', 'serving_unit' => 'skillet', 'calories' => 390, 'protein_g' => 28, 'carbs_g' => 24, 'fat_g' => 18],
                ['meal_type' => 'lunch', 'name' => 'Lemon Chicken Root Veg Plate', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 510, 'protein_g' => 40, 'carbs_g' => 29, 'fat_g' => 21],
                ['meal_type' => 'dinner', 'name' => 'Beef Vegetable Stew Bowl', 'category' => 'Dinner', 'serving_unit' => 'bowl', 'calories' => 450, 'protein_g' => 33, 'carbs_g' => 18, 'fat_g' => 24],
            ],
            'Vegan' => [
                ['meal_type' => 'breakfast', 'name' => 'Chia Berry Breakfast Jar', 'category' => 'Breakfast', 'serving_unit' => 'jar', 'calories' => 320, 'protein_g' => 12, 'carbs_g' => 32, 'fat_g' => 15],
                ['meal_type' => 'lunch', 'name' => 'Lentil Quinoa Power Bowl', 'category' => 'Lunch', 'serving_unit' => 'bowl', 'calories' => 500, 'protein_g' => 23, 'carbs_g' => 58, 'fat_g' => 17],
                ['meal_type' => 'dinner', 'name' => 'Tofu Vegetable Stir Fry', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 430, 'protein_g' => 26, 'carbs_g' => 34, 'fat_g' => 19],
            ],
            'Vegetarian' => [
                ['meal_type' => 'breakfast', 'name' => 'Greek Yogurt Fruit Bowl', 'category' => 'Breakfast', 'serving_unit' => 'bowl', 'calories' => 290, 'protein_g' => 20, 'carbs_g' => 26, 'fat_g' => 10],
                ['meal_type' => 'lunch', 'name' => 'Halloumi Bulgur Salad', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 480, 'protein_g' => 24, 'carbs_g' => 39, 'fat_g' => 24],
                ['meal_type' => 'dinner', 'name' => 'Lentil Stuffed Pepper Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 420, 'protein_g' => 22, 'carbs_g' => 41, 'fat_g' => 16],
            ],
            'DASH' => [
                ['meal_type' => 'breakfast', 'name' => 'Apple Cinnamon Oat Bowl', 'category' => 'Breakfast', 'serving_unit' => 'bowl', 'calories' => 310, 'protein_g' => 12, 'carbs_g' => 48, 'fat_g' => 8],
                ['meal_type' => 'lunch', 'name' => 'Turkey Brown Rice Plate', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 500, 'protein_g' => 36, 'carbs_g' => 49, 'fat_g' => 15],
                ['meal_type' => 'dinner', 'name' => 'Herb Cod Greens Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 410, 'protein_g' => 33, 'carbs_g' => 24, 'fat_g' => 14],
            ],
            'Low-Carb' => [
                ['meal_type' => 'breakfast', 'name' => 'Cottage Cheese Cucumber Plate', 'category' => 'Breakfast', 'serving_unit' => 'plate', 'calories' => 250, 'protein_g' => 23, 'carbs_g' => 11, 'fat_g' => 12],
                ['meal_type' => 'lunch', 'name' => 'Chicken Cauliflower Rice Bowl', 'category' => 'Lunch', 'serving_unit' => 'bowl', 'calories' => 470, 'protein_g' => 38, 'carbs_g' => 17, 'fat_g' => 24],
                ['meal_type' => 'dinner', 'name' => 'Beef Lettuce Cup Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 430, 'protein_g' => 34, 'carbs_g' => 13, 'fat_g' => 27],
            ],
            'High-Protein' => [
                ['meal_type' => 'breakfast', 'name' => 'Egg White Veg Scramble', 'category' => 'Breakfast', 'serving_unit' => 'plate', 'calories' => 280, 'protein_g' => 27, 'carbs_g' => 10, 'fat_g' => 13],
                ['meal_type' => 'lunch', 'name' => 'Chicken Rice Protein Bowl', 'category' => 'Lunch', 'serving_unit' => 'bowl', 'calories' => 540, 'protein_g' => 44, 'carbs_g' => 45, 'fat_g' => 16],
                ['meal_type' => 'dinner', 'name' => 'Tuna Potato Salad Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 460, 'protein_g' => 39, 'carbs_g' => 28, 'fat_g' => 18],
            ],
            'Intermittent Fasting' => [
                ['meal_type' => 'breakfast', 'name' => 'Late Break Fast Protein Oats', 'category' => 'Breakfast', 'serving_unit' => 'bowl', 'calories' => 350, 'protein_g' => 24, 'carbs_g' => 34, 'fat_g' => 11],
                ['meal_type' => 'lunch', 'name' => 'Chicken Shawarma Rice Bowl', 'category' => 'Lunch', 'serving_unit' => 'bowl', 'calories' => 560, 'protein_g' => 41, 'carbs_g' => 47, 'fat_g' => 19],
                ['meal_type' => 'dinner', 'name' => 'Yogurt Berry Walnut Cup', 'category' => 'Dinner', 'serving_unit' => 'cup', 'calories' => 320, 'protein_g' => 18, 'carbs_g' => 19, 'fat_g' => 17],
            ],
            'Whole30' => [
                ['meal_type' => 'breakfast', 'name' => 'Sweet Potato Turkey Hash', 'category' => 'Breakfast', 'serving_unit' => 'skillet', 'calories' => 360, 'protein_g' => 29, 'carbs_g' => 24, 'fat_g' => 15],
                ['meal_type' => 'lunch', 'name' => 'Lemon Chicken Veg Plate', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 490, 'protein_g' => 39, 'carbs_g' => 22, 'fat_g' => 23],
                ['meal_type' => 'dinner', 'name' => 'Beef Meatballs Zucchini Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 450, 'protein_g' => 34, 'carbs_g' => 14, 'fat_g' => 27],
            ],
            default => [
                ['meal_type' => 'breakfast', 'name' => 'Rice Flakes Berry Bowl', 'category' => 'Breakfast', 'serving_unit' => 'bowl', 'calories' => 290, 'protein_g' => 11, 'carbs_g' => 44, 'fat_g' => 7],
                ['meal_type' => 'lunch', 'name' => 'Chicken Rice Spinach Plate', 'category' => 'Lunch', 'serving_unit' => 'plate', 'calories' => 500, 'protein_g' => 37, 'carbs_g' => 43, 'fat_g' => 16],
                ['meal_type' => 'dinner', 'name' => 'Herb Salmon Carrot Plate', 'category' => 'Dinner', 'serving_unit' => 'plate', 'calories' => 420, 'protein_g' => 33, 'carbs_g' => 18, 'fat_g' => 19],
            ],
        };
    }

    private function ensureOneToOneConversation(User $a, User $b): Conversation
    {
        $existing = Conversation::query()
            ->whereHas('participants', fn ($query) => $query->where('users.id', $a->id))
            ->whereHas('participants', fn ($query) => $query->where('users.id', $b->id))
            ->withCount('participants')
            ->get()
            ->first(fn ($conversation) => (int) $conversation->participants_count === 2);

        if ($existing) {
            return $existing;
        }

        $conversation = Conversation::query()->create([
            'created_by' => $a->id,
        ]);

        $conversation->participants()->attach([$a->id, $b->id]);

        return $conversation;
    }
}
