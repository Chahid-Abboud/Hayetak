<?php

namespace Database\Seeders;

use App\Models\Exercise;
use App\Models\User;
use App\Models\WorkoutPlan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PremadeWorkoutPrototypeSeeder extends Seeder
{
    /** @var \Illuminate\Support\Collection<string,\App\Models\Exercise> */
    private Collection $exercisesByName;

    public function run(): void
    {
        $owner = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();

        if (! $owner) {
            return;
        }

        $this->exercisesByName = Exercise::query()
            ->orderBy('id')
            ->get()
            ->keyBy(fn (Exercise $exercise) => $this->normalizeKey($exercise->name));

        foreach ($this->prototypes() as $prototype) {
            $plan = WorkoutPlan::query()->firstOrCreate(
                [
                    'user_id' => $owner->id,
                    'name' => $prototype['name'],
                ],
                [
                    'goal' => $prototype['goal'],
                    'notes' => $prototype['notes'],
                    'is_active' => false,
                    'is_public' => true,
                    'start_date' => now()->toDateString(),
                    'duration_days' => count($prototype['days']),
                    'meta' => [
                        'seeded' => true,
                        'prototype_key' => $prototype['key'],
                        'source' => 'premade_workout_prototype',
                    ],
                ]
            );

            if (! $plan->is_public || $plan->is_active) {
                $meta = is_array($plan->meta) ? $plan->meta : [];
                $plan->forceFill([
                    'is_public' => true,
                    'is_active' => false,
                    'meta' => array_merge($meta, [
                        'seeded' => true,
                        'prototype_key' => $prototype['key'],
                    ]),
                ])->save();
            }

            foreach ($prototype['days'] as $dayData) {
                $day = $plan->days()->firstOrCreate(
                    ['day_index' => $dayData['day_index']],
                    [
                        'name' => $dayData['name'],
                        'notes' => $dayData['notes'] ?? null,
                        'meta' => [
                            'seeded' => true,
                            'session_type' => $dayData['session_type'],
                            'duration_min' => $dayData['duration_min'],
                        ],
                    ]
                );

                $attach = [];
                foreach ($dayData['exercises'] as $order => $exerciseData) {
                    $exerciseId = $this->resolveExerciseId($exerciseData['name'], $exerciseData['fallback_muscle'] ?? null);
                    if (! $exerciseId) {
                        continue;
                    }

                    $attach[$exerciseId] = [
                        'order_index' => $order,
                        'sets' => $exerciseData['sets'],
                        'reps_min' => $exerciseData['reps_min'],
                        'reps_max' => $exerciseData['reps_max'],
                        'rest_seconds' => $exerciseData['rest_seconds'],
                        'rpe_target' => $exerciseData['rpe_target'],
                        'rir_target' => max(0, 10 - (int) $exerciseData['rpe_target']),
                        'notes' => $exerciseData['notes'] ?? null,
                    ];
                }

                if ($attach !== []) {
                    $day->exercises()->syncWithoutDetaching($attach);
                }
            }
        }
    }

    private function resolveExerciseId(string $name, ?string $fallbackMuscle = null): ?int
    {
        $match = $this->exercisesByName->get($this->normalizeKey($name));
        if ($match instanceof Exercise) {
            return $match->id;
        }

        if ($fallbackMuscle !== null) {
            $candidate = Exercise::query()
                ->where('primary_muscle', $fallbackMuscle)
                ->orderBy('id')
                ->first();

            if ($candidate) {
                return $candidate->id;
            }
        }

        return Exercise::query()->orderBy('id')->value('id');
    }

    private function normalizeKey(string $value): string
    {
        return trim(Str::of($value)->lower()->replace(['_', '/', ','], ' ')->squish()->toString());
    }

    private function prototypes(): array
    {
        return [
            [
                'key' => 'foundation_full_body_3',
                'name' => 'Prototype - Foundation Full Body (3 Days)',
                'goal' => 'General Strength',
                'notes' => 'Balanced full-body structure for beginners.',
                'days' => [
                    $this->session(1, 'Full Body A', 'full_body', 45, [
                        $this->exercise('Dumbbell Floor Press', 'chest', 3, 8, 12, 75, 7),
                        $this->exercise('Chair Squat', 'quadriceps', 3, 10, 14, 60, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                        $this->exercise('Dumbbell Curl', 'biceps', 2, 10, 12, 45, 6),
                    ]),
                    $this->session(3, 'Full Body B', 'full_body', 47, [
                        $this->exercise('Cable Chest Press', 'chest', 3, 8, 12, 75, 7),
                        $this->exercise('Belt Squat', 'quadriceps', 3, 8, 12, 75, 7),
                        $this->exercise('Cable Curl With Rope', 'biceps', 3, 10, 14, 60, 6),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 2, 10, 14, 50, 6),
                    ]),
                    $this->session(5, 'Full Body C', 'full_body', 42, [
                        $this->exercise('Incline Push-Up', 'chest', 3, 10, 15, 60, 7),
                        $this->exercise('Air Squat', 'quadriceps', 3, 12, 18, 45, 6),
                        $this->exercise('Concentration Curl', 'biceps', 2, 10, 12, 45, 6),
                        $this->exercise('Shadow Boxing', 'core', 3, 20, 30, 45, 7),
                    ]),
                ],
            ],
            [
                'key' => 'fat_loss_home_4',
                'name' => 'Prototype - Fat Loss Home Circuit (4 Days)',
                'goal' => 'Fat Loss',
                'notes' => 'Low-equipment sessions with mixed cardio and resistance.',
                'days' => [
                    $this->session(1, 'Metabolic Circuit', 'conditioning', 38, [
                        $this->exercise('Jumping Jack', 'core', 3, 20, 30, 30, 7),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 12, 18, 45, 7),
                        $this->exercise('Incline Push-Up', 'chest', 3, 10, 14, 45, 7),
                    ]),
                    $this->session(2, 'Lower + Core', 'lower', 40, [
                        $this->exercise('Chair Squat', 'quadriceps', 3, 12, 16, 45, 7),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 10, 14, 45, 7),
                        $this->exercise('Knee-to-Chest Stretch', 'core', 2, 1, 1, 30, 5),
                    ]),
                    $this->session(4, 'Upper Tone', 'upper', 42, [
                        $this->exercise('Dumbbell Floor Press', 'chest', 3, 8, 12, 60, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 2, 12, 15, 40, 6),
                    ]),
                    $this->session(6, 'Conditioning + Mobility', 'conditioning', 36, [
                        $this->exercise('High Knees (Running in Place)', 'core', 3, 20, 30, 35, 7),
                        $this->exercise('Shadow Boxing', 'core', 3, 20, 30, 35, 7),
                        $this->exercise('Child\'s Pose', 'core', 2, 1, 1, 30, 4),
                    ]),
                ],
            ],
            [
                'key' => 'push_pull_legs_6',
                'name' => 'Prototype - Push Pull Legs (6 Days)',
                'goal' => 'Muscle Gain',
                'notes' => 'High-frequency split for experienced gym users.',
                'days' => [
                    $this->session(1, 'Push A', 'push', 55, [
                        $this->exercise('Smith Machine Bench Press', 'chest', 4, 6, 10, 90, 8),
                        $this->exercise('Cable Chest Press', 'chest', 3, 8, 12, 75, 8),
                        $this->exercise('Cable Pushdown With Rope', 'triceps', 3, 10, 14, 60, 7),
                    ]),
                    $this->session(2, 'Pull A', 'pull', 53, [
                        $this->exercise('Cable Curl With Rope', 'biceps', 4, 8, 12, 75, 8),
                        $this->exercise('Cable Hammer Curl With Rope', 'biceps', 3, 10, 14, 60, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                    ]),
                    $this->session(3, 'Legs A', 'legs', 58, [
                        $this->exercise('Belt Squat', 'quadriceps', 4, 6, 10, 90, 8),
                        $this->exercise('Lying Leg Curl', 'hamstrings', 3, 8, 12, 75, 8),
                        $this->exercise('Leg Press Calf Raise', 'calves', 3, 10, 14, 60, 7),
                    ]),
                    $this->session(4, 'Push B', 'push', 52, [
                        $this->exercise('Cable Chest Press', 'chest', 4, 8, 12, 75, 8),
                        $this->exercise('Standing Resistance Band Chest Fly', 'chest', 3, 10, 14, 60, 7),
                        $this->exercise('Cable Pushdown With Rope', 'triceps', 3, 10, 14, 60, 7),
                    ]),
                    $this->session(5, 'Pull B', 'pull', 52, [
                        $this->exercise('Machine Bicep Curl', 'biceps', 4, 8, 12, 75, 8),
                        $this->exercise('Concentration Curl', 'biceps', 3, 10, 12, 60, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                    ]),
                    $this->session(6, 'Legs B', 'legs', 55, [
                        $this->exercise('Belt Squat', 'quadriceps', 4, 8, 12, 90, 8),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 12, 15, 60, 7),
                        $this->exercise('Leg Press Calf Raise', 'calves', 3, 12, 16, 60, 7),
                    ]),
                ],
            ],
            [
                'key' => 'joint_friendly_3',
                'name' => 'Prototype - Joint-Friendly Strength (3 Days)',
                'goal' => 'Pain-Aware Progress',
                'notes' => 'Lower-impact structure for users with mild injury history.',
                'days' => [
                    $this->session(1, 'Upper Stability', 'upper', 40, [
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 3, 12, 16, 45, 6),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                        $this->exercise('Dumbbell Hammer Curl', 'biceps', 2, 10, 12, 50, 6),
                    ]),
                    $this->session(3, 'Lower Control', 'lower', 42, [
                        $this->exercise('Chair Squat', 'quadriceps', 3, 10, 14, 60, 6),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 10, 14, 55, 6),
                        $this->exercise('Towel Calf Stretch', 'calves', 2, 1, 1, 30, 4),
                    ]),
                    $this->session(5, 'Full Body Light', 'full_body', 38, [
                        $this->exercise('Dumbbell Floor Press', 'chest', 3, 8, 12, 60, 6),
                        $this->exercise('Shadow Boxing', 'core', 3, 20, 25, 40, 6),
                        $this->exercise('Child\'s Pose', 'core', 2, 1, 1, 30, 4),
                    ]),
                ],
            ],
            [
                'key' => 'upper_lower_4',
                'name' => 'Prototype - Upper Lower Hypertrophy (4 Days)',
                'goal' => 'Hypertrophy',
                'notes' => 'Classic 4-day split for intermediate users.',
                'days' => [
                    $this->session(1, 'Upper A', 'upper', 50, [
                        $this->exercise('Cable Chest Press', 'chest', 4, 8, 12, 75, 8),
                        $this->exercise('Machine Bicep Curl', 'biceps', 3, 10, 14, 60, 7),
                        $this->exercise('Cable Pushdown With Rope', 'triceps', 3, 10, 14, 60, 7),
                    ]),
                    $this->session(2, 'Lower A', 'lower', 52, [
                        $this->exercise('Belt Squat', 'quadriceps', 4, 8, 12, 90, 8),
                        $this->exercise('Lying Leg Curl', 'hamstrings', 3, 8, 12, 75, 7),
                        $this->exercise('Leg Press Calf Raise', 'calves', 3, 10, 14, 60, 7),
                    ]),
                    $this->session(4, 'Upper B', 'upper', 48, [
                        $this->exercise('Smith Machine Bench Press', 'chest', 3, 6, 10, 90, 8),
                        $this->exercise('Cable Hammer Curl With Rope', 'biceps', 3, 10, 14, 60, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 45, 6),
                    ]),
                    $this->session(6, 'Lower B', 'lower', 50, [
                        $this->exercise('Belt Squat', 'quadriceps', 3, 8, 12, 90, 8),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 12, 15, 60, 7),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 10, 14, 55, 7),
                    ]),
                ],
            ],
            [
                'key' => 'endurance_mix_5',
                'name' => 'Prototype - Endurance Mix (5 Days)',
                'goal' => 'Endurance',
                'notes' => 'Alternates aerobic conditioning and light resistance sessions.',
                'days' => [
                    $this->session(1, 'Cardio Intervals', 'conditioning', 35, [
                        $this->exercise('High Knees (Running in Place)', 'core', 4, 20, 30, 35, 7),
                        $this->exercise('Jumping Jack', 'core', 4, 20, 30, 35, 7),
                    ]),
                    $this->session(2, 'Strength Endurance', 'full_body', 42, [
                        $this->exercise('Chair Squat', 'quadriceps', 3, 12, 18, 45, 7),
                        $this->exercise('Incline Push-Up', 'chest', 3, 12, 16, 45, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 14, 18, 40, 6),
                    ]),
                    $this->session(3, 'Conditioning Flow', 'conditioning', 34, [
                        $this->exercise('Shadow Boxing', 'core', 4, 20, 30, 35, 7),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 12, 18, 40, 7),
                    ]),
                    $this->session(5, 'Upper Endurance', 'upper', 40, [
                        $this->exercise('Dumbbell Floor Press', 'chest', 3, 12, 15, 50, 7),
                        $this->exercise('Dumbbell Curl', 'biceps', 3, 12, 15, 45, 6),
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 2, 12, 16, 40, 6),
                    ]),
                    $this->session(6, 'Recovery Mobility', 'conditioning', 30, [
                        $this->exercise('Knee-to-Chest Stretch', 'core', 2, 1, 1, 30, 4),
                        $this->exercise('Towel Calf Stretch', 'calves', 2, 1, 1, 30, 4),
                        $this->exercise('Child\'s Pose', 'core', 2, 1, 1, 30, 4),
                    ]),
                ],
            ],
            [
                'key' => 'recomp_dumbbell_home_4',
                'name' => 'Prototype - Home Dumbbell Recomp (4 Days)',
                'goal' => 'Body Recomposition',
                'notes' => 'Balanced home split for users chasing muscle retention with steady fat loss.',
                'days' => [
                    $this->session(1, 'Upper Push + Core', 'upper', 46, [
                        $this->exercise('Dumbbell Floor Press', 'chest', 4, 8, 12, 75, 7),
                        $this->exercise('Seated Dumbbell Lateral Raise', 'shoulders', 3, 10, 14, 50, 7),
                        $this->exercise('Cable Pushdown With Rope', 'triceps', 3, 10, 14, 55, 7),
                    ]),
                    $this->session(2, 'Lower Strength', 'lower', 48, [
                        $this->exercise('Goblet Squat', 'quadriceps', 4, 8, 12, 75, 7),
                        $this->exercise('Dumbbell Romanian Deadlift', 'hamstrings', 3, 8, 12, 70, 7),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 10, 14, 50, 7),
                    ]),
                    $this->session(4, 'Upper Pull + Arms', 'upper', 44, [
                        $this->exercise('Resistance Band Row', 'back', 4, 10, 14, 60, 7),
                        $this->exercise('Dumbbell Hammer Curl', 'biceps', 3, 10, 12, 45, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 40, 6),
                    ]),
                    $this->session(6, 'Full Body Density', 'full_body', 42, [
                        $this->exercise('Incline Push-Up', 'chest', 3, 10, 15, 45, 7),
                        $this->exercise('Chair Squat', 'quadriceps', 3, 12, 16, 45, 7),
                        $this->exercise('Shadow Boxing', 'core', 3, 20, 30, 35, 7),
                    ]),
                ],
            ],
            [
                'key' => 'glute_core_sculpt_3',
                'name' => 'Prototype - Glute and Core Sculpt (3 Days)',
                'goal' => 'Glute Strength',
                'notes' => 'Lower-body emphasis with core stability and posture support.',
                'days' => [
                    $this->session(1, 'Glute Builder A', 'lower', 45, [
                        $this->exercise('Belt Squat', 'quadriceps', 4, 8, 12, 80, 8),
                        $this->exercise('Dumbbell Romanian Deadlift', 'hamstrings', 4, 8, 12, 75, 8),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 10, 14, 50, 7),
                    ]),
                    $this->session(3, 'Core + Single-Leg Control', 'full_body', 40, [
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 10, 14, 50, 7),
                        $this->exercise('Plank', 'core', 3, 1, 1, 35, 6),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 40, 6),
                    ]),
                    $this->session(5, 'Glute Builder B', 'lower', 46, [
                        $this->exercise('Goblet Squat', 'quadriceps', 4, 10, 14, 70, 7),
                        $this->exercise('Dumbbell Romanian Deadlift', 'hamstrings', 3, 10, 12, 70, 7),
                        $this->exercise('Leg Press Calf Raise', 'calves', 3, 12, 16, 55, 7),
                    ]),
                ],
            ],
            [
                'key' => 'desk_reset_posture_5',
                'name' => 'Prototype - Desk Reset Posture Flow (5 Days)',
                'goal' => 'Posture and Mobility',
                'notes' => 'Short sessions for desk workers who need upper-back activation and gentle mobility.',
                'days' => [
                    $this->session(1, 'Upper Back Reset', 'upper', 28, [
                        $this->exercise('Band Pull-Apart', 'back', 3, 14, 18, 35, 6),
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 3, 12, 16, 35, 6),
                        $this->exercise('Child\'s Pose', 'core', 2, 1, 1, 25, 4),
                    ]),
                    $this->session(2, 'Lower Mobility', 'lower', 30, [
                        $this->exercise('Chair Squat', 'quadriceps', 3, 12, 15, 40, 6),
                        $this->exercise('Knee-to-Chest Stretch', 'core', 2, 1, 1, 25, 4),
                        $this->exercise('Towel Calf Stretch', 'calves', 2, 1, 1, 25, 4),
                    ]),
                    $this->session(3, 'Push and Brace', 'upper', 30, [
                        $this->exercise('Incline Push-Up', 'chest', 3, 10, 14, 40, 6),
                        $this->exercise('Plank', 'core', 3, 1, 1, 30, 6),
                        $this->exercise('Band Pull-Apart', 'back', 2, 14, 18, 35, 6),
                    ]),
                    $this->session(5, 'Shoulder Hygiene', 'upper', 26, [
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 3, 12, 16, 35, 6),
                        $this->exercise('Seated Dumbbell Lateral Raise', 'shoulders', 2, 10, 12, 40, 6),
                        $this->exercise('Child\'s Pose', 'core', 2, 1, 1, 25, 4),
                    ]),
                    $this->session(6, 'Walk + Flow Circuit', 'conditioning', 27, [
                        $this->exercise('Shadow Boxing', 'core', 3, 20, 25, 30, 6),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 2, 10, 14, 35, 6),
                        $this->exercise('Knee-to-Chest Stretch', 'core', 2, 1, 1, 25, 4),
                    ]),
                ],
            ],
            [
                'key' => 'athletic_hybrid_4',
                'name' => 'Prototype - Athletic Hybrid Performance (4 Days)',
                'goal' => 'Athletic Performance',
                'notes' => 'Blends strength, power, and conditioning for field-sport style fitness.',
                'days' => [
                    $this->session(1, 'Power Push', 'push', 52, [
                        $this->exercise('Smith Machine Bench Press', 'chest', 4, 5, 8, 90, 8),
                        $this->exercise('Cable Chest Press', 'chest', 3, 8, 10, 70, 8),
                        $this->exercise('Jumping Jack', 'core', 3, 20, 30, 30, 7),
                    ]),
                    $this->session(2, 'Sprint Legs', 'legs', 54, [
                        $this->exercise('Belt Squat', 'quadriceps', 4, 6, 10, 90, 8),
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 10, 14, 50, 7),
                        $this->exercise('Leg Press Calf Raise', 'calves', 3, 10, 14, 55, 7),
                    ]),
                    $this->session(4, 'Pull Power', 'pull', 50, [
                        $this->exercise('Resistance Band Row', 'back', 4, 8, 12, 60, 7),
                        $this->exercise('Cable Hammer Curl With Rope', 'biceps', 3, 10, 12, 50, 7),
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 40, 6),
                    ]),
                    $this->session(6, 'Conditioning Finisher', 'conditioning', 36, [
                        $this->exercise('High Knees (Running in Place)', 'core', 4, 20, 30, 30, 7),
                        $this->exercise('Shadow Boxing', 'core', 4, 20, 30, 30, 7),
                        $this->exercise('Plank', 'core', 3, 1, 1, 30, 6),
                    ]),
                ],
            ],
            [
                'key' => 'fifty_plus_vitality_3',
                'name' => 'Prototype - 50+ Vitality Strength (3 Days)',
                'goal' => 'Healthy Aging',
                'notes' => 'Joint-aware strength training for older adults who want function and confidence.',
                'days' => [
                    $this->session(1, 'Full Body Stability', 'full_body', 38, [
                        $this->exercise('Chair Squat', 'quadriceps', 3, 10, 14, 50, 6),
                        $this->exercise('Dumbbell Floor Press', 'chest', 3, 8, 12, 55, 6),
                        $this->exercise('Resistance Band Row', 'back', 3, 10, 14, 50, 6),
                    ]),
                    $this->session(3, 'Balance and Lower Body', 'lower', 36, [
                        $this->exercise('Chair Step-Ups', 'quadriceps', 3, 8, 12, 45, 6),
                        $this->exercise('Bodyweight Leg Curl', 'hamstrings', 3, 10, 14, 45, 6),
                        $this->exercise('Towel Calf Stretch', 'calves', 2, 1, 1, 25, 4),
                    ]),
                    $this->session(5, 'Upper Mobility and Strength', 'upper', 35, [
                        $this->exercise('Band Pull-Apart', 'back', 3, 12, 16, 35, 6),
                        $this->exercise('Band External Shoulder Rotation', 'shoulders', 3, 12, 15, 35, 6),
                        $this->exercise('Dumbbell Hammer Curl', 'biceps', 2, 10, 12, 40, 6),
                    ]),
                ],
            ],
            [
                'key' => 'gym_reentry_confidence_2',
                'name' => 'Prototype - Gym Re-Entry Confidence (2 Days)',
                'goal' => 'Return to Training',
                'notes' => 'Simple two-day structure for someone getting back into the gym after time off.',
                'days' => [
                    $this->session(2, 'Machine Full Body A', 'full_body', 42, [
                        $this->exercise('Machine Chest Press', 'chest', 3, 8, 12, 70, 7),
                        $this->exercise('Leg Press', 'quadriceps', 3, 10, 14, 75, 7),
                        $this->exercise('Machine Bicep Curl', 'biceps', 2, 10, 12, 45, 6),
                    ]),
                    $this->session(5, 'Machine Full Body B', 'full_body', 42, [
                        $this->exercise('Seated Cable Row', 'back', 3, 8, 12, 70, 7),
                        $this->exercise('Lying Leg Curl', 'hamstrings', 3, 10, 14, 60, 7),
                        $this->exercise('Cable Pushdown With Rope', 'triceps', 2, 10, 12, 45, 6),
                    ]),
                ],
            ],
        ];
    }

    private function session(
        int $dayIndex,
        string $name,
        string $sessionType,
        int $durationMin,
        array $exercises,
    ): array {
        return [
            'day_index' => $dayIndex,
            'name' => $name,
            'session_type' => $sessionType,
            'duration_min' => $durationMin,
            'exercises' => $exercises,
        ];
    }

    private function exercise(
        string $name,
        string $fallbackMuscle,
        int $sets,
        int $repsMin,
        int $repsMax,
        int $restSeconds,
        int $rpe,
    ): array {
        return [
            'name' => $name,
            'fallback_muscle' => $fallbackMuscle,
            'sets' => $sets,
            'reps_min' => $repsMin,
            'reps_max' => $repsMax,
            'rest_seconds' => $restSeconds,
            'rpe_target' => $rpe,
        ];
    }
}
