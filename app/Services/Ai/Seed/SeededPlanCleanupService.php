<?php

namespace App\Services\Ai\Seed;

use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\WorkoutPlan;

class SeededPlanCleanupService
{
    /**
     * @var list<int>
     */
    public const ALLOWED_DURATIONS = [14, 21, 28];

    /**
     * @param  iterable<int,\App\Models\User|int>  $users
     * @return array{users_processed:int,nutrition_deleted:int,workout_deleted:int}
     */
    public function cleanupForUsers(iterable $users, array $allowedDurations = self::ALLOWED_DURATIONS): array
    {
        $summary = [
            'users_processed' => 0,
            'nutrition_deleted' => 0,
            'workout_deleted' => 0,
        ];

        foreach ($users as $user) {
            $summary['users_processed']++;

            $result = $this->cleanupForUser($user, $allowedDurations);
            $summary['nutrition_deleted'] += $result['nutrition_deleted'];
            $summary['workout_deleted'] += $result['workout_deleted'];
        }

        return $summary;
    }

    /**
     * @return array{nutrition_deleted:int,workout_deleted:int}
     */
    public function cleanupForUser(User|int $user, array $allowedDurations = self::ALLOWED_DURATIONS): array
    {
        $userId = $user instanceof User ? (int) $user->id : (int) $user;
        if ($userId <= 0) {
            return [
                'nutrition_deleted' => 0,
                'workout_deleted' => 0,
            ];
        }

        $allowedDurations = array_values(array_unique(array_map(
            static fn ($value): int => (int) $value,
            $allowedDurations
        )));

        if ($allowedDurations === []) {
            $allowedDurations = self::ALLOWED_DURATIONS;
        }

        $nutritionDeleted = 0;
        if ($this->hasAllowedNutritionPlans($userId, $allowedDurations)) {
            $query = NutritionPlan::query()
                ->where('user_id', $userId)
                ->whereNotIn('duration_days', $allowedDurations);

            $nutritionDeleted = (int) $query->count();
            if ($nutritionDeleted > 0) {
                $query->delete();
            }

            $nutritionDeleted += $this->pruneDuplicateAllowedPlans(
                NutritionPlan::class,
                $userId,
                $allowedDurations
            );
        }

        $workoutDeleted = 0;
        if ($this->hasAllowedWorkoutPlans($userId, $allowedDurations)) {
            $query = WorkoutPlan::query()
                ->where('user_id', $userId)
                ->whereNotIn('duration_days', $allowedDurations);

            $workoutDeleted = (int) $query->count();
            if ($workoutDeleted > 0) {
                $query->delete();
            }

            $workoutDeleted += $this->pruneDuplicateAllowedPlans(
                WorkoutPlan::class,
                $userId,
                $allowedDurations
            );
        }

        return [
            'nutrition_deleted' => $nutritionDeleted,
            'workout_deleted' => $workoutDeleted,
        ];
    }

    private function hasAllowedNutritionPlans(int $userId, array $allowedDurations): bool
    {
        return NutritionPlan::query()
            ->where('user_id', $userId)
            ->whereIn('duration_days', $allowedDurations)
            ->exists();
    }

    private function hasAllowedWorkoutPlans(int $userId, array $allowedDurations): bool
    {
        return WorkoutPlan::query()
            ->where('user_id', $userId)
            ->whereIn('duration_days', $allowedDurations)
            ->exists();
    }

    /**
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $modelClass
     */
    private function pruneDuplicateAllowedPlans(string $modelClass, int $userId, array $allowedDurations): int
    {
        $deleted = 0;

        foreach ($allowedDurations as $durationDays) {
            $keepId = $modelClass::query()
                ->where('user_id', $userId)
                ->where('duration_days', (int) $durationDays)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->value('id');

            if ($keepId === null) {
                continue;
            }

            $query = $modelClass::query()
                ->where('user_id', $userId)
                ->where('duration_days', (int) $durationDays)
                ->where('id', '!=', $keepId);

            $durationDeleted = (int) $query->count();
            if ($durationDeleted <= 0) {
                continue;
            }

            $query->delete();
            $deleted += $durationDeleted;
        }

        return $deleted;
    }
}
