<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use App\Models\Exercise;

class WorkoutPlanSeeder extends Seeder
{
    public function run(): void
    {
        $userId = 1;

        /* -----------------------------------------
         | A) Ensure a small exercise library exists
         |------------------------------------------ */
        $exerciseData = [
            ['Barbell Bench Press','chest','barbell','intermediate'],
            ['Overhead Press','shoulders','barbell','intermediate'],
            ['Incline Dumbbell Press','chest','dumbbells','beginner'],
            ['Triceps Pushdown','triceps','cable','beginner'],
            ['Lateral Raise','shoulders','dumbbells','beginner'],

            ['Conventional Deadlift','back','barbell','advanced'],
            ['Barbell Row','back','barbell','intermediate'],
            ['Lat Pulldown','back','machine','beginner'],
            ['Face Pull','rear_delts','cable','beginner'],
            ['EZ-Bar Curl','biceps','barbell','beginner'],

            ['Back Squat','legs','barbell','intermediate'],
            ['Leg Press','legs','machine','beginner'],
            ['Romanian Deadlift','hamstrings','barbell','intermediate'],
            ['Leg Curl','hamstrings','machine','beginner'],
            ['Standing Calf Raise','calves','machine','beginner'],
        ];

        foreach ($exerciseData as [$name,$muscle,$equipment,$difficulty]) {
            Exercise::firstOrCreate(
                ['name' => $name],
                [
                    'primary_muscle' => $muscle,
                    'equipment'      => $equipment,
                    'difficulty'     => $difficulty,
                    'demo_video'     => null,
                    'tags'           => [],
                    'conditions'     => [],
                ]
            );
        }

        /* -----------------------------------------
         | B) Create/update user's ONLY workout plan
         |------------------------------------------ */
        $plan = WorkoutPlan::updateOrCreate(
            ['user_id' => $userId],
            ['name' => 'Push–Pull–Legs']
        );

        /* -----------------------------------------
         | C) Create Days: Push / Pull / Legs
         |------------------------------------------ */
        $dayLabels = [
            1 => 'Push',
            2 => 'Pull',
            3 => 'Legs',
        ];

        $days = [];
        foreach ($dayLabels as $index => $label) {
            $days[$index] = WorkoutPlanDay::updateOrCreate(
                [
                    'workout_plan_id' => $plan->id,
                    'day_index'       => $index,
                ],
                ['name' => $label]
            );
        }

        /* -----------------------------------------
         | D) Exercises per day (sets/reps/rest)
         |------------------------------------------ */
        $push = [
            ['Barbell Bench Press', 4, 8, 120],
            ['Overhead Press', 3, 8, 90],
            ['Incline Dumbbell Press', 3, 10, 90],
            ['Triceps Pushdown', 3, 12, 60],
            ['Lateral Raise', 3, 15, 45],
        ];

        $pull = [
            ['Conventional Deadlift', 3, 5, 180],
            ['Barbell Row', 4, 8, 120],
            ['Lat Pulldown', 3, 10, 90],
            ['Face Pull', 3, 12, 60],
            ['EZ-Bar Curl', 3, 12, 60],
        ];

        $legs = [
            ['Back Squat', 4, 6, 150],
            ['Leg Press', 3, 12, 90],
            ['Romanian Deadlift', 3, 8, 120],
            ['Leg Curl', 3, 12, 60],
            ['Standing Calf Raise', 4, 12, 45],
        ];

        $mapping = [
            1 => $push,
            2 => $pull,
            3 => $legs,
        ];

        /* -----------------------------------------
         | E) Insert into workout_plan_day_exercises
         |------------------------------------------ */
        foreach ($mapping as $dayIndex => $rows) {
            $day = $days[$dayIndex];

            foreach ($rows as $order => [$exerciseName, $sets, $reps, $rest]) {
                $exercise = Exercise::where('name', $exerciseName)->first();

                DB::table('workout_plan_day_exercises')->updateOrInsert(
                    [
                        'workout_plan_day_id' => $day->id,
                        'exercise_id'          => $exercise->id,
                    ],
                    [
                        'order_index'  => $order,
                        'sets'         => $sets,
                        'reps_min'     => $reps,
                        'reps_max'     => $reps,
                        'rest_seconds' => $rest,
                        'rpe_target'   => 0,
                        'rir_target'   => 0,
                        'notes'        => null,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]
                );
            }
        }
    }
}
