<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\DietPlan;
use App\Models\Message;
use App\Models\Notification;
use App\Models\ProfessionalClientAssignment;
use App\Models\TrainerProgressNote;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RbacDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@hayetak.local'],
            [
                'name' => 'Admin User',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('password'),
                'role' => User::ROLE_ADMIN,
                'verified' => true,
                'email_verified_at' => now(),
                'status' => 'HQ',
            ]
        );

        $nutritionist = User::query()->firstOrCreate(
            ['email' => 'nutritionist@hayetak.local'],
            [
                'name' => 'Nora Nutritionist',
                'first_name' => 'Nora',
                'last_name' => 'Nutritionist',
                'password' => Hash::make('password'),
                'role' => User::ROLE_NUTRITIONIST,
                'verified' => true,
                'email_verified_at' => now(),
                'status' => 'Beirut',
            ]
        );

        $trainer = User::query()->firstOrCreate(
            ['email' => 'trainer@hayetak.local'],
            [
                'name' => 'Tariq Trainer',
                'first_name' => 'Tariq',
                'last_name' => 'Trainer',
                'password' => Hash::make('password'),
                'role' => User::ROLE_TRAINER,
                'verified' => true,
                'email_verified_at' => now(),
                'status' => 'Tripoli',
            ]
        );

        $client = User::query()->firstOrCreate(
            ['email' => 'client@hayetak.local'],
            [
                'name' => 'Celine Client',
                'first_name' => 'Celine',
                'last_name' => 'Client',
                'password' => Hash::make('password'),
                'role' => User::ROLE_CLIENT,
                'verified' => true,
                'email_verified_at' => now(),
                'status' => 'Byblos',
            ]
        );

        ProfessionalClientAssignment::query()->firstOrCreate([
            'professional_id' => $nutritionist->id,
            'client_id' => $client->id,
            'professional_role' => User::ROLE_NUTRITIONIST,
        ], [
            'assigned_by' => $admin->id,
        ]);

        ProfessionalClientAssignment::query()->firstOrCreate([
            'professional_id' => $trainer->id,
            'client_id' => $client->id,
            'professional_role' => User::ROLE_TRAINER,
        ], [
            'assigned_by' => $admin->id,
        ]);

        DietPlan::query()->firstOrCreate([
            'client_id' => $client->id,
            'nutritionist_id' => $nutritionist->id,
            'title' => 'Starter Diet Plan',
        ], [
            'plan_json' => ['days' => []],
        ]);

        TrainerWorkoutPlan::query()->firstOrCreate([
            'client_id' => $client->id,
            'trainer_id' => $trainer->id,
            'title' => 'Starter Workout Plan',
        ], [
            'plan_json' => ['days' => []],
        ]);

        TrainerProgressNote::query()->firstOrCreate([
            'client_id' => $client->id,
            'trainer_id' => $trainer->id,
            'recorded_on' => now()->toDateString(),
        ], [
            'metrics' => ['weight_kg' => 72],
            'notes' => 'On track.',
        ]);

        $conversation = Conversation::query()->firstOrCreate([
            'created_by' => $client->id,
        ]);
        $conversation->participants()->syncWithoutDetaching([$client->id, $nutritionist->id]);

        Message::query()->firstOrCreate([
            'conversation_id' => $conversation->id,
            'sender_id' => $client->id,
            'body' => 'Hello, can we review this week meals?',
        ]);

        Appointment::query()->firstOrCreate([
            'client_id' => $client->id,
            'professional_id' => $nutritionist->id,
            'professional_role' => User::ROLE_NUTRITIONIST,
            'scheduled_at' => now()->addDays(2)->startOfHour(),
            'created_by' => $client->id,
        ], [
            'status' => 'requested',
        ]);

        Notification::query()->firstOrCreate([
            'target_user_id' => $client->id,
            'created_by' => $admin->id,
            'title' => 'Welcome',
            'body' => 'Your specialists are now assigned.',
        ]);
    }
}

