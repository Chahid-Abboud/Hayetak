<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\DietPlan;
use App\Models\Message;
use App\Models\Notification;
use App\Models\PlaceLocal;
use App\Models\ProfessionalClientAssignment;
use App\Models\ProfessionalVerification;
use App\Models\TrainerProgressNote;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RbacDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@hayetak.local'],
            [
                'name' => 'Admin User',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('password'),
                'role' => User::ROLE_ADMIN,
                'verified' => true,
                'status' => 'active',
                'city' => 'Beirut',
                'email_verified_at' => now(),
            ]
        );

        $client = User::query()->updateOrCreate(
            ['email' => 'client@hayetak.local'],
            [
                'name' => 'Celine Client',
                'first_name' => 'Celine',
                'last_name' => 'Client',
                'password' => Hash::make('password'),
                'role' => User::ROLE_CLIENT,
                'verified' => true,
                'status' => 'active',
                'city' => 'Byblos',
                'email_verified_at' => now(),
            ]
        );

        $dietitiansData = [
            ['email' => 'dietitian1@hayetak.local', 'first_name' => 'Nora', 'last_name' => 'Haddad', 'city' => 'Beirut', 'lat' => 33.8938, 'lng' => 35.5018, 'specialties' => ['Weight loss', 'PCOS']],
            ['email' => 'dietitian2@hayetak.local', 'first_name' => 'Maya', 'last_name' => 'Nasser', 'city' => 'Tripoli', 'lat' => 34.4335, 'lng' => 35.8441, 'specialties' => ['Sports nutrition', 'Meal prep']],
            ['email' => 'dietitian3@hayetak.local', 'first_name' => 'Rami', 'last_name' => 'Saad', 'city' => 'Saida', 'lat' => 33.5570, 'lng' => 35.3732, 'specialties' => ['Diabetes', 'Heart healthy']],
            ['email' => 'dietitian4@hayetak.local', 'first_name' => 'Lina', 'last_name' => 'Khalil', 'city' => 'Jounieh', 'lat' => 33.9808, 'lng' => 35.6175, 'specialties' => ['Family nutrition', 'Kids']],
            ['email' => 'dietitian5@hayetak.local', 'first_name' => 'Karim', 'last_name' => 'Mansour', 'city' => 'Zahle', 'lat' => 33.8463, 'lng' => 35.9020, 'specialties' => ['Body recomposition', 'GI health']],
        ];

        $trainersData = [
            ['email' => 'trainer1@hayetak.local', 'first_name' => 'Tariq', 'last_name' => 'Amin', 'city' => 'Tripoli', 'lat' => 34.4362, 'lng' => 35.8401, 'specialties' => ['Strength', 'Hypertrophy']],
            ['email' => 'trainer2@hayetak.local', 'first_name' => 'Layla', 'last_name' => 'Hassan', 'city' => 'Beirut', 'lat' => 33.8903, 'lng' => 35.5011, 'specialties' => ['Fat loss', 'Women training']],
            ['email' => 'trainer3@hayetak.local', 'first_name' => 'Hadi', 'last_name' => 'Younes', 'city' => 'Jounieh', 'lat' => 33.9783, 'lng' => 35.6187, 'specialties' => ['Functional', 'Injury-safe']],
            ['email' => 'trainer4@hayetak.local', 'first_name' => 'Sami', 'last_name' => 'Rizk', 'city' => 'Saida', 'lat' => 33.5603, 'lng' => 35.3741, 'specialties' => ['Athletic performance', 'Mobility']],
            ['email' => 'trainer5@hayetak.local', 'first_name' => 'Dina', 'last_name' => 'Fares', 'city' => 'Byblos', 'lat' => 34.1234, 'lng' => 35.6512, 'specialties' => ['Home workouts', 'Posture']],
        ];

        $dietitians = collect($dietitiansData)->map(fn (array $d) => $this->upsertProfessional($d, User::ROLE_NUTRITIONIST, $admin));
        $trainers = collect($trainersData)->map(fn (array $d) => $this->upsertProfessional($d, User::ROLE_TRAINER, $admin));

        foreach ($dietitians as $dietitian) {
            ProfessionalClientAssignment::query()->updateOrCreate(
                [
                    'professional_id' => $dietitian->id,
                    'client_id' => $client->id,
                    'professional_role' => User::ROLE_NUTRITIONIST,
                ],
                ['assigned_by' => $admin->id]
            );

            DietPlan::query()->firstOrCreate(
                [
                    'client_id' => $client->id,
                    'nutritionist_id' => $dietitian->id,
                    'title' => 'Starter Diet Plan - '.$dietitian->first_name,
                ],
                ['plan_json' => ['days' => []]]
            );

            $conversation = $this->ensureOneToOneConversation($client, $dietitian);
            Message::query()->firstOrCreate([
                'conversation_id' => $conversation->id,
                'sender_id' => $client->id,
                'body' => 'Hello '.$dietitian->first_name.', I would like help with my meal plan.',
            ]);

            Appointment::query()->firstOrCreate([
                'client_id' => $client->id,
                'professional_id' => $dietitian->id,
                'professional_role' => User::ROLE_NUTRITIONIST,
                'scheduled_at' => now()->addDays(2)->startOfHour(),
                'created_by' => $client->id,
            ], ['status' => 'requested']);
        }

        foreach ($trainers as $trainer) {
            ProfessionalClientAssignment::query()->updateOrCreate(
                [
                    'professional_id' => $trainer->id,
                    'client_id' => $client->id,
                    'professional_role' => User::ROLE_TRAINER,
                ],
                ['assigned_by' => $admin->id]
            );

            TrainerWorkoutPlan::query()->firstOrCreate(
                [
                    'client_id' => $client->id,
                    'trainer_id' => $trainer->id,
                    'title' => 'Starter Workout Plan - '.$trainer->first_name,
                ],
                ['plan_json' => ['days' => []]]
            );

            TrainerProgressNote::query()->firstOrCreate(
                [
                    'client_id' => $client->id,
                    'trainer_id' => $trainer->id,
                    'recorded_on' => now()->toDateString(),
                ],
                [
                    'metrics' => ['weight_kg' => 72],
                    'notes' => 'Baseline assessment completed.',
                ]
            );

            $conversation = $this->ensureOneToOneConversation($client, $trainer);
            Message::query()->firstOrCreate([
                'conversation_id' => $conversation->id,
                'sender_id' => $client->id,
                'body' => 'Hi '.$trainer->first_name.', can we set my weekly workout split?',
            ]);
        }

        $this->seedPlaces($admin, $dietitians->all());

        Notification::query()->firstOrCreate([
            'target_user_id' => $client->id,
            'created_by' => $admin->id,
            'title' => 'Welcome',
            'body' => 'Demo trainers and dietitians are ready to explore.',
        ]);
    }

    private function upsertProfessional(array $data, string $role, User $admin): User
    {
        $user = User::query()->updateOrCreate(
            ['email' => $data['email']],
            [
                'name' => $data['first_name'].' '.$data['last_name'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'password' => Hash::make('password'),
                'role' => $role,
                'verified' => true,
                'status' => 'active',
                'city' => $data['city'],
                'profile_lat' => $data['lat'],
                'profile_lng' => $data['lng'],
                'specialties' => $data['specialties'],
                'professional_bio' => $role === User::ROLE_TRAINER
                    ? 'Certified personal trainer focused on safe progressive training.'
                    : 'Licensed dietitian focused on practical and sustainable nutrition.',
                'contact_display' => $data['email'],
                'availability_text' => 'Mon-Fri 9:00-17:00',
                'email_verified_at' => now(),
            ]
        );

        ProfessionalVerification::query()->updateOrCreate(
            ['user_id' => $user->id, 'role' => $role],
            [
                'full_legal_name' => $user->name,
                'license_number' => strtoupper(substr($role, 0, 3)).'-'.$user->id.'-2026',
                'authority' => 'Lebanese Health & Fitness Board',
                'country_state' => $data['city'],
                'expiry_date' => now()->addYears(2)->toDateString(),
                'documents' => ['demo/license-'.$user->id.'.pdf'],
                'review_status' => 'approved',
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'notes' => 'Approved via demo seeder.',
            ]
        );

        return $user;
    }

    private function ensureOneToOneConversation(User $a, User $b): Conversation
    {
        $existing = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $a->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $b->id))
            ->withCount('participants')
            ->get()
            ->first(fn ($c) => (int) $c->participants_count === 2);

        if ($existing) {
            return $existing;
        }

        $conversation = Conversation::query()->create([
            'created_by' => $a->id,
        ]);
        $conversation->participants()->attach([$a->id, $b->id]);

        return $conversation;
    }

    private function seedPlaces(User $admin, array $dietitians): void
    {
        $gyms = [
            ['name' => 'Iron Hub Beirut', 'city' => 'Beirut', 'lat' => 33.8923, 'lng' => 35.5031],
            ['name' => 'North Fit Club', 'city' => 'Tripoli', 'lat' => 34.4341, 'lng' => 35.8425],
            ['name' => 'Saida Strength House', 'city' => 'Saida', 'lat' => 33.5581, 'lng' => 35.3727],
            ['name' => 'Byblos Fitness Lab', 'city' => 'Byblos', 'lat' => 34.1218, 'lng' => 35.6476],
            ['name' => 'Jounieh Performance Gym', 'city' => 'Jounieh', 'lat' => 33.9799, 'lng' => 35.6193],
        ];

        foreach ($gyms as $gym) {
            PlaceLocal::query()->updateOrCreate(
                ['name' => $gym['name'], 'city' => $gym['city']],
                [
                    'user_id' => $admin->id,
                    'category' => 'gym',
                    'address' => $gym['city'].' main road',
                    'lat' => $gym['lat'],
                    'lng' => $gym['lng'],
                    'description' => 'Well-equipped gym with cardio and free weights.',
                    'google_maps_link' => 'https://www.google.com/maps',
                    'last_verified_at' => now(),
                    'meta' => [
                        'source' => 'seed',
                        'phone' => '+96170000000',
                        'rating' => 4.5,
                    ],
                ]
            );
        }

        foreach ($dietitians as $dietitian) {
            PlaceLocal::query()->updateOrCreate(
                ['name' => 'Dietitian Clinic - '.$dietitian->first_name, 'city' => $dietitian->city],
                [
                    'user_id' => $dietitian->id,
                    'category' => 'nutritionist',
                    'address' => $dietitian->city.' central district',
                    'lat' => (float) $dietitian->profile_lat,
                    'lng' => (float) $dietitian->profile_lng,
                    'description' => 'Consultation clinic for personalized meal planning and nutrition guidance.',
                    'google_maps_link' => 'https://www.google.com/maps',
                    'last_verified_at' => now(),
                    'meta' => [
                        'source' => 'seed',
                        'phone' => $dietitian->contact_display,
                        'rating' => 4.7,
                    ],
                ]
            );
        }
    }
}
