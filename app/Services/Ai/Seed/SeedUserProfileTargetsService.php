<?php

namespace App\Services\Ai\Seed;

use App\Models\User;
use Illuminate\Support\Str;

class SeedUserProfileTargetsService
{
    public function personaAdjustments(User $user): array
    {
        $role = (string) ($user->role ?? User::ROLE_CLIENT);
        if ($role === User::ROLE_ADMIN) {
            return [];
        }

        $gender = $this->resolveGender($user);
        $age = $this->resolveAge($user);
        $heightCm = $this->resolveHeightCm($user, $gender);
        $weightKg = $this->resolveWeightKg($user, $gender);
        $workoutDays = $this->resolveWorkoutDays($user);
        $activityLevel = $this->normalizeActivityLabel((string) ($user->activity_level ?? ''));
        $goalBucket = $this->goalBucket($user);
        $bmi = $this->bmi($heightCm, $weightKg);

        $updates = [];

        if ($workoutDays >= 4 && $activityLevel === 'Sedentary') {
            $updates['activity_level'] = 'Moderately Active';
        } elseif ($workoutDays >= 3 && $activityLevel === 'Sedentary') {
            $updates['activity_level'] = 'Lightly Active';
        } elseif ($workoutDays >= 5 && $activityLevel === 'Lightly Active') {
            $updates['activity_level'] = 'Moderately Active';
        } elseif ($workoutDays <= 1 && in_array($activityLevel, ['Very Active', 'Athlete'], true)) {
            $updates['activity_level'] = 'Lightly Active';
        }

        if ($role !== User::ROLE_CLIENT) {
            return $updates;
        }

        if ($bmi >= 34.5) {
            $updates['dietary_goal'] = 'Calorie Deficit';
            $updates['fitness_goal'] = 'Lose Weight';
            if ($workoutDays > 4) {
                $updates['workout_days_per_week'] = 4;
            }
            if (in_array($activityLevel, ['Very Active', 'Athlete'], true)) {
                $updates['activity_level'] = 'Moderately Active';
            }
        } elseif ($bmi >= 30.0 && $goalBucket === 'gain') {
            $updates['dietary_goal'] = 'Calorie Deficit';
            $updates['fitness_goal'] = 'Recomposition';
        } elseif ($bmi >= 27.5 && $goalBucket === 'gain') {
            $updates['dietary_goal'] = 'Maintenance';
            $updates['fitness_goal'] = 'Recomposition';
        } elseif ($bmi <= 20.5 && $goalBucket === 'loss') {
            $updates['dietary_goal'] = 'Balanced Nutrition';
            $updates['fitness_goal'] = 'Maintain';
        }

        if ($age >= 50 && $workoutDays > 5) {
            $updates['workout_days_per_week'] = 5;
        }

        return $updates;
    }

    public function build(User $user, array $issues = []): array
    {
        $gender = $this->resolveGender($user);
        $age = $this->resolveAge($user);
        $heightCm = $this->resolveHeightCm($user, $gender);
        $weightKg = $this->resolveWeightKg($user, $gender);
        $workoutDays = $this->resolveWorkoutDays($user);
        $activityFactor = $this->resolveActivityFactor($user, $workoutDays);
        $goalBucket = $this->goalBucket($user);

        $bmr = $gender === 'female'
            ? ((10 * $weightKg) + (6.25 * $heightCm) - (5 * $age) - 161)
            : ((10 * $weightKg) + (6.25 * $heightCm) - (5 * $age) + 5);
        $tdee = max($this->minimumCalories($gender), (int) round($bmr * $activityFactor));

        $calorieAdjustment = $this->goalCalorieAdjustment($goalBucket, $weightKg, $age, $issues);
        $dailyGoalCalories = (int) round($tdee + $calorieAdjustment);
        $dailyGoalCalories = max($this->minimumCalories($gender), min($tdee + 500, max($tdee - 500, $dailyGoalCalories)));

        $proteinPerKg = match ($goalBucket) {
            'loss' => 1.9,
            'gain' => 1.85,
            default => 1.65,
        };

        if ($age >= 45 || $this->containsMedicalNeedles($issues, ['injury', 'anemia', 'diabetes'])) {
            $proteinPerKg = max($proteinPerKg, 1.8);
        }

        $fatPerKg = match ($goalBucket) {
            'loss' => 0.75,
            'gain' => 0.9,
            default => 0.8,
        };

        $proteinG = round(max(90, min(230, $weightKg * $proteinPerKg)), 1);
        $fatG = round(max(45, min(110, $weightKg * $fatPerKg)), 1);
        $carbsG = round(max(90, ($dailyGoalCalories - (($proteinG * 4) + ($fatG * 9))) / 4), 1);
        $waterCups = (int) max(7, min(16, round(($weightKg * 35) / 240)));
        $preferredWorkoutDays = $this->preferredWorkoutDays($workoutDays);
        $availableEquipment = $this->availableEquipment($user, $issues);

        return [
            'gender' => $gender,
            'age' => $age,
            'height_cm' => $heightCm,
            'weight_kg' => round($weightKg, 1),
            'goal_bucket' => $goalBucket,
            'bmr_kcal' => (int) round($bmr),
            'tdee_kcal' => $tdee,
            'activity_factor' => round($activityFactor, 2),
            'daily_goal_calories' => $dailyGoalCalories,
            'daily_goal_protein_g' => $proteinG,
            'daily_goal_carbs_g' => $carbsG,
            'daily_goal_fat_g' => $fatG,
            'water_cups_per_day' => $waterCups,
            'workout_days_target' => $workoutDays,
            'daily_intake_floor_kcal' => max($this->minimumCalories($gender), $tdee - 500),
            'daily_intake_ceiling_kcal' => $tdee + 500,
            'goal_calorie_adjustment' => $dailyGoalCalories - $tdee,
            'preferred_workout_days' => $preferredWorkoutDays,
            'available_equipment' => $availableEquipment,
            'home_gym' => $this->homeGymSummary($user, $availableEquipment),
        ];
    }

    private function resolveGender(User $user): string
    {
        $gender = strtolower(trim((string) ($user->gender ?? '')));
        if (in_array($gender, ['female', 'male'], true)) {
            return $gender;
        }

        $firstName = strtolower(trim((string) ($user->first_name ?? '')));
        if (in_array($firstName, [
            'nadine', 'lina', 'maya', 'sara', 'rima', 'leen', 'rana', 'mira', 'celine', 'nora', 'layla', 'dina',
        ], true)) {
            return 'female';
        }

        if (in_array($firstName, [
            'hassan', 'charbel', 'george', 'ziad', 'jad', 'fadi', 'karim', 'rami', 'tariq', 'hadi', 'sami', 'youssef',
        ], true)) {
            return 'male';
        }

        return $user->id % 2 === 0 ? 'male' : 'female';
    }

    private function resolveAge(User $user): int
    {
        $age = (int) ($user->age ?? 0);
        if ($age > 0) {
            return max(18, min(72, $age));
        }

        return match ((string) $user->role) {
            User::ROLE_ADMIN => 38,
            User::ROLE_TRAINER => 29 + ($user->id % 11),
            User::ROLE_NUTRITIONIST => 30 + ($user->id % 10),
            default => 22 + (($user->id * 3) % 27),
        };
    }

    private function resolveHeightCm(User $user, string $gender): int
    {
        $height = (int) ($user->height_cm ?? 0);
        if ($height > 0) {
            return max(148, min(205, $height));
        }

        $base = $gender === 'female' ? 162 : 176;
        $offset = (($user->id * 3) % 11) - 5;

        return max(150, min(198, $base + $offset));
    }

    private function resolveWeightKg(User $user, string $gender): float
    {
        $weight = (float) ($user->weight_kg ?? 0);
        if ($weight > 0) {
            return max(45.0, min(180.0, $weight));
        }

        $base = $gender === 'female' ? 60.0 : 76.0;
        $roleOffset = match ((string) $user->role) {
            User::ROLE_TRAINER => 6.0,
            User::ROLE_NUTRITIONIST => 2.0,
            default => 0.0,
        };
        $offset = (float) ((($user->id * 5) % 17) - 8);

        return max(48.0, min(155.0, $base + $roleOffset + $offset));
    }

    private function resolveWorkoutDays(User $user): int
    {
        $days = (int) ($user->workout_days_per_week ?? 0);
        if ($days > 0) {
            return max(1, min(7, $days));
        }

        $activityLevel = strtolower(trim((string) ($user->activity_level ?? '')));

        return match (true) {
            str_contains($activityLevel, 'sedentary') => 2,
            str_contains($activityLevel, 'light') => 3,
            str_contains($activityLevel, 'moderate') => 4,
            str_contains($activityLevel, 'very') => 5,
            str_contains($activityLevel, 'athlete') => 6,
            $user->role === User::ROLE_TRAINER => 5,
            $user->role === User::ROLE_NUTRITIONIST => 3,
            default => 3,
        };
    }

    private function resolveActivityFactor(User $user, int $workoutDays): float
    {
        $activityLevel = strtolower(trim((string) ($user->activity_level ?? '')));

        return match ($activityLevel) {
            'sedentary' => 1.20,
            'lightly active' => 1.375,
            'moderately active' => 1.55,
            'very active' => 1.70,
            'athlete' => 1.85,
            default => match (true) {
                $workoutDays >= 6 => 1.75,
                $workoutDays >= 4 => 1.55,
                $workoutDays >= 2 => 1.40,
                default => 1.25,
            },
        };
    }

    private function goalBucket(User $user): string
    {
        $goalText = strtolower(trim(((string) ($user->dietary_goal ?? '')).' '.((string) ($user->fitness_goal ?? ''))));

        return match (true) {
            Str::contains($goalText, ['loss', 'lose', 'deficit', 'fat', 'cut']) => 'loss',
            Str::contains($goalText, ['gain', 'surplus', 'muscle', 'bulk', 'hypertrophy']) => 'gain',
            default => 'maintain',
        };
    }

    private function goalCalorieAdjustment(string $goalBucket, float $weightKg, int $age, array $issues): int
    {
        $ageModifier = $age >= 50 ? 50 : 0;
        $medicalModifier = $this->containsMedicalNeedles($issues, ['diabetes', 'hypertension', 'nafld', 'sleep apnea']) ? 40 : 0;

        return match ($goalBucket) {
            'loss' => 0 - min(450, max(220, (int) round(($weightKg * 3.5) + $ageModifier + $medicalModifier))),
            'gain' => min(350, max(160, (int) round(($weightKg * 2.5) - $ageModifier))),
            default => 0,
        };
    }

    private function minimumCalories(string $gender): int
    {
        return $gender === 'female' ? 1250 : 1450;
    }

    private function bmi(int $heightCm, float $weightKg): float
    {
        $heightM = max(1.45, $heightCm / 100);

        return round($weightKg / ($heightM ** 2), 1);
    }

    private function normalizeActivityLabel(string $activityLevel): string
    {
        $normalized = strtolower(trim($activityLevel));

        return match ($normalized) {
            'sedentary' => 'Sedentary',
            'lightly active' => 'Lightly Active',
            'moderately active' => 'Moderately Active',
            'very active' => 'Very Active',
            'athlete' => 'Athlete',
            default => 'Lightly Active',
        };
    }

    private function containsMedicalNeedles(array $issues, array $needles): bool
    {
        $haystack = strtolower(implode(' ', array_map(function ($issue): string {
            if (is_array($issue)) {
                return (string) ($issue['label'] ?? '');
            }

            return (string) $issue;
        }, $issues)));

        return Str::contains($haystack, $needles);
    }

    private function preferredWorkoutDays(int $workoutDays): array
    {
        $map = [
            1 => ['wednesday'],
            2 => ['monday', 'thursday'],
            3 => ['monday', 'wednesday', 'friday'],
            4 => ['monday', 'tuesday', 'thursday', 'saturday'],
            5 => ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
            6 => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        ];

        return $map[$workoutDays] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    }

    private function availableEquipment(User $user, array $issues): array
    {
        $location = strtolower(trim((string) ($user->workout_location ?? 'home')));
        $needsJointFriendlyOptions = $this->containsMedicalNeedles($issues, ['knee', 'ankle', 'back', 'postpartum', 'wrist', 'shoulder']);

        $equipment = match ($location) {
            'gym' => ['Dumbbells', 'Cable Machine', 'Bench', 'Resistance Band', 'Treadmill', 'Bike'],
            'both' => ['Dumbbells', 'Resistance Band', 'Adjustable Bench', 'Cable Machine', 'Bodyweight'],
            default => ['Bodyweight', 'Resistance Band', 'Dumbbells', 'Yoga Mat'],
        };

        if ($needsJointFriendlyOptions) {
            $equipment[] = 'Stationary Bike';
        }

        if ($user->role === User::ROLE_TRAINER) {
            $equipment[] = 'Barbell';
        }

        return array_values(array_unique($equipment));
    }

    private function homeGymSummary(User $user, array $availableEquipment): ?string
    {
        $location = strtolower(trim((string) ($user->workout_location ?? '')));
        if (! in_array($location, ['home', 'both'], true)) {
            return null;
        }

        return implode(', ', array_slice($availableEquipment, 0, 4));
    }
}
