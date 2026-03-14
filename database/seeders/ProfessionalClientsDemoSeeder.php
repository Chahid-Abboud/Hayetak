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
use Illuminate\Support\Str;

class ProfessionalClientsDemoSeeder extends Seeder
{
    public function run(): void
    {
        $professionals = User::query()
            ->whereIn('role', [User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])
            ->where('verified', true)
            ->orderBy('id')
            ->get();

        if ($professionals->isEmpty()) {
            return;
        }

        $admin = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->orderBy('id')
            ->first();

        $foods = $this->ensureDemoFoods();
        $exercise = Exercise::query()->orderBy('id')->first();

        foreach ($professionals as $professional) {
            foreach ([1, 2] as $clientIndex) {
                $client = $this->ensureDemoClient($professional, $clientIndex);

                ProfessionalClientAssignment::query()->firstOrCreate(
                    [
                        'professional_id' => $professional->id,
                        'client_id' => $client->id,
                        'professional_role' => $professional->role,
                    ],
                    [
                        'assigned_by' => $admin?->id ?? $professional->id,
                        'notes' => 'Seeded demo client for feature checks.',
                    ],
                );

                $this->seedMeasurements($client, $clientIndex);
                $this->seedAppointment($professional, $client, $clientIndex);
                $this->seedConversation($professional, $client, $clientIndex);

                if ($professional->role === User::ROLE_NUTRITIONIST) {
                    $this->seedMeals($client, $foods, $clientIndex);
                }

                if ($professional->role === User::ROLE_TRAINER) {
                    $this->seedWorkouts($client, $exercise, $clientIndex);
                }
            }
        }
    }

    private function ensureDemoClient(User $professional, int $clientIndex): User
    {
        $emailLocalPart = Str::of((string) $professional->email)
            ->before('@')
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '-')
            ->trim('-')
            ->value();

        $email = "{$emailLocalPart}-client{$clientIndex}@hayetak.local";

        return User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => "{$professional->first_name} Demo Client {$clientIndex}",
                'first_name' => $clientIndex === 1 ? 'Alya' : 'Omar',
                'last_name' => trim(($professional->first_name ?: 'Demo').' Client '.$clientIndex),
                'username' => Str::limit(str_replace('@hayetak.local', '', $email), 24, ''),
                'password' => Hash::make('password'),
                'role' => User::ROLE_CLIENT,
                'verified' => true,
                'status' => 'active',
                'age' => $clientIndex === 1 ? 28 : 34,
                'height_cm' => $clientIndex === 1 ? 168 : 181,
                'weight_kg' => $clientIndex === 1 ? 71.5 : 84.2,
                'city' => $professional->city,
                'dietary_goal' => $professional->role === User::ROLE_NUTRITIONIST ? 'Balanced Nutrition' : 'Maintenance',
                'fitness_goal' => $professional->role === User::ROLE_TRAINER ? 'Build Muscle' : 'Lose Weight',
                'email_verified_at' => now(),
            ],
        );
    }

    private function seedMeasurements(User $client, int $clientIndex): void
    {
        $series = [
            ['days_ago' => 21, 'weight_kg' => $clientIndex === 1 ? 74.0 : 86.3],
            ['days_ago' => 10, 'weight_kg' => $clientIndex === 1 ? 72.8 : 85.1],
            ['days_ago' => 2, 'weight_kg' => $clientIndex === 1 ? 71.5 : 84.2],
        ];

        foreach ($series as $point) {
            Measurement::query()->firstOrCreate(
                [
                    'user_id' => $client->id,
                    'measured_at' => Carbon::today()->subDays($point['days_ago'])->setTime(9, 0, 0),
                ],
                [
                    'height_cm' => $client->height_cm,
                    'weight_kg' => $point['weight_kg'],
                    'notes' => 'Seeded demo progress entry.',
                ],
            );
        }
    }

    private function seedAppointment(User $professional, User $client, int $clientIndex): void
    {
        $scheduledAt = Carbon::today()->addDays($clientIndex + 1)->setTime($clientIndex === 1 ? 10 : 15, 0, 0);

        Appointment::query()->firstOrCreate(
            [
                'client_id' => $client->id,
                'professional_id' => $professional->id,
                'professional_role' => $professional->role,
                'scheduled_at' => $scheduledAt,
                'created_by' => $client->id,
            ],
            [
                'status' => $clientIndex === 1 ? 'accepted' : 'requested',
                'notes' => $professional->role === User::ROLE_NUTRITIONIST
                    ? 'Demo nutrition follow-up appointment.'
                    : 'Demo training check-in appointment.',
            ],
        );
    }

    private function seedConversation(User $professional, User $client, int $clientIndex): void
    {
        $conversation = $this->ensureOneToOneConversation($professional, $client);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $client->id,
            'body' => $professional->role === User::ROLE_NUTRITIONIST
                ? "Hi {$professional->first_name}, I booked appointment {$clientIndex} and wanted to share my weekly meals."
                : "Hi {$professional->first_name}, I booked appointment {$clientIndex} and want help with my workout progress.",
        ]);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $professional->id,
            'body' => $professional->role === User::ROLE_NUTRITIONIST
                ? "Thanks, I can already see your appointment. We'll review your meal routine and measurements together."
                : "Perfect, I can see your appointment. We'll use your recent logs and measurements in our check-in.",
        ]);
    }

    private function seedMeals(User $client, array $foods, int $clientIndex): void
    {
        $days = collect(range(0, 6));

        foreach ($days as $offset) {
            $date = Carbon::today()->subDays($offset)->toDateString();

            $mealPlan = [
                ['meal_type' => 'breakfast', 'food' => $foods['breakfast'], 'servings' => 1.0],
                ['meal_type' => 'lunch', 'food' => $foods['lunch'], 'servings' => 1.0],
                ['meal_type' => 'dinner', 'food' => $foods['dinner'], 'servings' => $clientIndex === 1 ? 1.0 : 1.25],
            ];

            foreach ($mealPlan as $meal) {
                MealEntry::query()->firstOrCreate(
                    [
                        'user_id' => $client->id,
                        'food_id' => $meal['food']->id,
                        'meal_type' => $meal['meal_type'],
                        'eaten_at' => $date,
                    ],
                    [
                        'servings' => $meal['servings'],
                    ],
                );
            }
        }
    }

    private function seedWorkouts(User $client, ?Exercise $exercise, int $clientIndex): void
    {
        $workouts = [
            ['days_ago' => 6, 'duration_min' => 42, 'notes' => 'Upper body session'],
            ['days_ago' => 3, 'duration_min' => 51, 'notes' => 'Lower body session'],
            ['days_ago' => 1, 'duration_min' => 38, 'notes' => 'Conditioning day'],
        ];

        foreach ($workouts as $index => $workout) {
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

            if ($exercise) {
                WorkoutLogSet::query()->firstOrCreate(
                    [
                        'workout_log_id' => $log->id,
                        'exercise_id' => $exercise->id,
                        'order_index' => 0,
                    ],
                    [
                        'weight_kg' => $clientIndex === 1 ? 20 + ($index * 2) : 35 + ($index * 2),
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
                        'weight_kg' => $clientIndex === 1 ? 22 + ($index * 2) : 37 + ($index * 2),
                        'reps' => 8,
                    ],
                );
            }
        }
    }

    private function ensureDemoFoods(): array
    {
        return [
            'breakfast' => Food::query()->firstOrCreate(
                ['name' => 'Demo Greek Yogurt Bowl'],
                [
                    'category' => 'Breakfast',
                    'serving_size' => 1,
                    'serving_unit' => 'bowl',
                    'calories' => 280,
                    'protein_g' => 18,
                    'carbs_g' => 22,
                    'fat_g' => 11,
                ],
            ),
            'lunch' => Food::query()->firstOrCreate(
                ['name' => 'Demo Chicken Rice Plate'],
                [
                    'category' => 'Lunch',
                    'serving_size' => 1,
                    'serving_unit' => 'plate',
                    'calories' => 520,
                    'protein_g' => 36,
                    'carbs_g' => 48,
                    'fat_g' => 19,
                ],
            ),
            'dinner' => Food::query()->firstOrCreate(
                ['name' => 'Demo Salmon Salad'],
                [
                    'category' => 'Dinner',
                    'serving_size' => 1,
                    'serving_unit' => 'plate',
                    'calories' => 430,
                    'protein_g' => 32,
                    'carbs_g' => 18,
                    'fat_g' => 22,
                ],
            ),
        ];
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
