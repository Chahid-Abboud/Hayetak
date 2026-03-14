<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportedUsersFromPublicDumpSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'arif al anif',
                'email' => 'chahiidi8@gmail.com',
                'email_verified_at' => '2026-02-22 07:44:53',
                'password' => '$2y$12$kSK/HGP2W0cp1fANrbq2k.mqk7zm2SUeLrmFSaRGLZhrtCe8Z8zp2',
                'remember_token' => null,
                'created_at' => '2026-01-14 10:44:56',
                'updated_at' => '2026-02-22 07:48:33',
                'two_factor_secret' => 'eyJpdiI6Ik9TSFhQaGlqNFY4ZjZObmgxYVp2QWc9PSIsInZhbHVlIjoiaGxTeDc4VWNOSFdMNnEzVVFpZGpzRDd1clBFU3VpdlVWbHV0WHNIOTlLUT0iLCJtYWMiOiJiMDg5MTc2N2E4Mjc3MTg1ZmIxZTk3MTI3ZjFjNWFlODAyODYxZmJjMDBhZWNmYzljMjBhM2RlMTViYTBmMGU0IiwidGFnIjoiIn0=',
                'two_factor_recovery_codes' => 'eyJpdiI6IklFMnQ5cWVqS1U2QWpZN3pBbTVYZUE9PSIsInZhbHVlIjoiK2Ewc2pQbEZjMi9QUjRQTGE3VWpIenVuNWNjTHlkbURrRWJNNGZ3SENkaUg2eXlQMFlqRDFkSnQzVDdmZjg1UUxjSXEwWlBHOE5zNHRwYy8wNk93VDBjWXhWRy90VmZMQmxIaVFmVlZGWTNicUVRSDh1bitlUW9YNEE0N1F3NWRpWGZ1aklwS21USkVnbkVXRndscVo2amxYclQxQUdtKysrZ0ErWCtnZVZGakg0ZjRENGRnZVpZL1RFa2lYRWFKM2RlUG9qUUJxdjF1R1NQTityREd5Y0w1Y2FlZEx1R0pMQ0IxczRGcGhyTkVnMXVzd20xYk0zaFphNjlJQ2RpUGRPR3I1TmpiK0hGb0VrVlNlTmJ4clE9PSIsIm1hYyI6IjhhNDk3ZDYyZDk4YTAxZTlhZDAzMzk0NTdlZjVjOTEwZDU1NzYyYjMxMWFlMDJiNmM3MGQ3NTNlZTQ5YTI0ZDYiLCJ0YWciOiIifQ==',
                'two_factor_confirmed_at' => '2026-01-14 10:45:25',
                'first_name' => 'Admin',
                'last_name' => 'Nimda',
                'username' => 'ana_ad_min',
                'gender' => 'male',
                'age' => 21,
                'height_cm' => 189,
                'weight_kg' => 143.00,
                'has_medical_history' => false,
                'medical_history' => null,
                'dietary_goal' => 'Calorie Deficit',
                'fitness_goal' => 'Build Muscle',
                'diet_name' => 'Mediterranean',
                'allergies' => json_encode(['Banana', 'Mustard'], JSON_THROW_ON_ERROR),
                'activity_level' => 'Lightly Active',
                'workout_days_per_week' => 4,
                'workout_location' => 'home',
                'tried_diet_before' => true,
                'diet_failure_reasons' => json_encode(['Too restrictive', 'Too expensive', 'Confusing guidance'], JSON_THROW_ON_ERROR),
                'diet_failure_other' => null,
            ],
            [
                'name' => 'Chahid Abboud',
                'email' => 'shahidabboud2015@gmail.com',
                'email_verified_at' => null,
                'password' => '$2y$12$yWEgXe2Z6PxXiYhUp8NtO.DEuhBwLushpo0pR5yuCk69K7odL6pz.',
                'remember_token' => null,
                'created_at' => '2026-01-26 10:07:09',
                'updated_at' => '2026-01-26 10:08:48',
                'two_factor_secret' => 'eyJpdiI6IlZwcktBaExJYVZpQjhBaktMbFdPc2c9PSIsInZhbHVlIjoiNXdLQXlyRUVQeFVFeGZ0YmhxU2xaTHl3M3NHeTNxWE5NK1hIYmdnQjA2QT0iLCJtYWMiOiJlNDZjMWRkMTQ0Y2ZiMjg2YjI1MWVhYjBhMjAwNWY2ZmY4NzQ0ZDE1Nzk4NDc2M2U3YzlmZTE0NGU1NTEzODA0IiwidGFnIjoiIn0=',
                'two_factor_recovery_codes' => 'eyJpdiI6IlJSMldBc2g4a01Sd1BNaC9VbFpNU1E9PSIsInZhbHVlIjoiMmxlVzJIQnJ5Y003R253dE5mVkQ5K2RWWlUrcFdlOS9GMkoyYmdKY0ZTUWF0Q012NmdtZGt1cURRWjJlL2tQQXM2SWs2V2dkalFQNnRzN1dPRmRMUmcyMVdhY3VYVytGazFRdU1kZDByWkNqUVRFeUVjdFI2V3R2eTREOXBlSSt1SjBsUmFKaWtlQzd2b3U4ZFB5aUM0N0ZpNzlkZThLMTRHamRBcjIrM0pHTHc5S0ZvTG5PUmNKdXVrU0tzdksyU1BiRXF0blYwZkdPcS9zTnVCOHMydWN4ZHVZRVVtSnpkQnpVRS9CVFlTWm1kUytNeGhxY05NRjc3SHIrMTlVeTl3ZkVWaSt4ZFA2M1J3T0ZRdVZiZUE9PSIsIm1hYyI6ImNmMDExNzU4ZjJlNmFkMGYzZDZiMTAxYWE5N2Y5MDRjYTI3YjQzNmRmODk3ZTM5ZWI3MmJkYTJiYjYzMmE1ZDciLCJ0YWciOiIifQ==',
                'two_factor_confirmed_at' => '2026-01-26 10:08:48',
                'first_name' => 'Chahid',
                'last_name' => 'Abboud',
                'username' => null,
                'gender' => 'male',
                'age' => 21,
                'height_cm' => 190,
                'weight_kg' => 137.00,
                'has_medical_history' => true,
                'medical_history' => 'diabetes',
                'dietary_goal' => 'Calorie Deficit',
                'fitness_goal' => 'Build Muscle',
                'diet_name' => 'Mediterranean',
                'allergies' => json_encode(['Corn', 'Celery'], JSON_THROW_ON_ERROR),
                'activity_level' => 'Moderately Active',
                'workout_days_per_week' => 4,
                'workout_location' => 'gym',
                'tried_diet_before' => true,
                'diet_failure_reasons' => json_encode(['Too expensive', 'Social/lifestyle conflicts', 'Time/meal prep burden', 'Cravings'], JSON_THROW_ON_ERROR),
                'diet_failure_other' => null,
            ],
            [
                'name' => 'Owen Gol',
                'email' => 'i8chahid8i@gmail.com',
                'email_verified_at' => null,
                'password' => '$2y$12$63qEyxkxtdvV6ND7/uDixOD.wIkBtDPPL3raNrPSgIO3q/RJj6yWG',
                'remember_token' => null,
                'created_at' => '2026-01-26 10:15:51',
                'updated_at' => '2026-02-19 15:34:55',
                'two_factor_secret' => 'eyJpdiI6IjkvV1hkQU9hWXRqQWFwZHM0OVdMYUE9PSIsInZhbHVlIjoiYTJ6dEdIWWNHV2xLcTY0UmRaSExKTU53OHF5NVM2cmt0aDdoLzRvdjhxYz0iLCJtYWMiOiIzMGRjNjBiOWMyZGRkNGRhNjc3NWIwOGFhODEwYjE3OWMxYTZjNDdmYjhhMmE4NTliOGZjNWM4ZDJmNzk5ZGQ2IiwidGFnIjoiIn0=',
                'two_factor_recovery_codes' => 'eyJpdiI6InRXZUJyUWk0QWk2WjBld00zTWNSZFE9PSIsInZhbHVlIjoiUzdmUXJROUxGNmhXL3lGME1vMXhNSEdhOXNab0FKU2krNDZqcit2MWFJdm9hWENOVU51YWNSVzZhT0V0dkltNkI5bGpvR1d5c3ZrUFJlV1pTT09uUktISmIxUFFqUmdlcmRXcnd3ZUNReHd2SlhQQmxZMjJjVUVQNW00TUd5MGJDMHp5RVg1N1YzeFZRVDJqeFZTUTNzZGpNdmNtblFQTk9hTWtNWE1oQy8yVWNiU0c3d1ArWStoZG0yQ1dubmRZRWhWbTd1VWpqTXcrMTZNNytlT3J2VHZGWnIwbFpUQTN4aUFIR0JOOE1pUndsMVJWT0dXa1RseGhuWkdsYTZHdUpPRVoxZ0RYTDFaK01uUFhhMktoSXc9PSIsIm1hYyI6IjI2MDg0Njg0YmQ4ZDY2MmY3ZTMwNTk3ZjJlZDY2ZTc5OGRmZTllZjczYzVkNTFjMDRlMDVlZjAwNzg3YjI4OTAiLCJ0YWciOiIifQ==',
                'two_factor_confirmed_at' => '2026-02-19 15:34:55',
                'first_name' => 'Owen',
                'last_name' => 'Gol',
                'username' => null,
                'gender' => 'male',
                'age' => 25,
                'height_cm' => 167,
                'weight_kg' => 91.00,
                'has_medical_history' => true,
                'medical_history' => 'asthma, shoulder injury',
                'dietary_goal' => 'Calorie Deficit',
                'fitness_goal' => 'Improve Endurance',
                'diet_name' => 'Mediterranean',
                'allergies' => json_encode(['Lupin', 'Shellfish', 'Avocado'], JSON_THROW_ON_ERROR),
                'activity_level' => 'Moderately Active',
                'workout_days_per_week' => 4,
                'workout_location' => 'gym',
                'tried_diet_before' => true,
                'diet_failure_reasons' => json_encode(['Too expensive', 'Medical reasons'], JSON_THROW_ON_ERROR),
                'diet_failure_other' => null,
            ],
            [
                'name' => 'enta admin',
                'email' => 'chahid.abboud.cs@gmail.com',
                'email_verified_at' => '2026-02-24 09:14:49',
                'password' => '$2y$12$rAHFOXyykGD884Qgst4Ol.aArZhDZk5T6BSKD4YowgRC8whBmun/K',
                'remember_token' => null,
                'created_at' => '2026-02-24 09:14:25',
                'updated_at' => '2026-02-24 09:15:25',
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'first_name' => 'enta',
                'last_name' => 'admin',
                'username' => 'subject0',
                'gender' => 'other',
                'age' => 21,
                'height_cm' => 190,
                'weight_kg' => 136.00,
                'has_medical_history' => false,
                'medical_history' => null,
                'dietary_goal' => 'Calorie Deficit',
                'fitness_goal' => 'Lose Weight',
                'diet_name' => 'Mediterranean',
                'allergies' => json_encode(['Avocado'], JSON_THROW_ON_ERROR),
                'activity_level' => 'Lightly Active',
                'workout_days_per_week' => 3,
                'workout_location' => 'both',
                'tried_diet_before' => true,
                'diet_failure_reasons' => json_encode(['Too restrictive', 'Too expensive', 'Time/meal prep burden', 'Cravings', 'Hunger/low energy'], JSON_THROW_ON_ERROR),
                'diet_failure_other' => null,
            ],
        ];

        foreach ($users as $user) {
            $exists = DB::table('users')
                ->where('email', $user['email'])
                ->when(
                    $user['username'] !== null,
                    fn ($query) => $query->orWhere('username', $user['username'])
                )
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('users')->insert(array_merge([
                'role' => 'client',
                'verified' => $user['email_verified_at'] !== null,
                'status' => 'active',
                'deleted_at' => null,
            ], $user));
        }
    }
}
