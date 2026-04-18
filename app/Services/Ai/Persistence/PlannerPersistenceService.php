<?php

namespace App\Services\Ai\Persistence;

use App\Models\AiPlan;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\NutritionPlan;
use App\Models\NutritionPlanDay;
use App\Models\NutritionPlanItem;
use App\Models\NutritionPlanMeal;
use App\Models\User;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use App\Models\WorkoutPlanExercise;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlannerPersistenceService
{
    public function persist(
        User $user,
        array $validatedOutput,
        string $generationId,
        int $aiRequestId,
        ?string $notes = null,
        ?int $createdBy = null
    ): array {
        return DB::transaction(function () use ($user, $validatedOutput, $generationId, $aiRequestId, $notes, $createdBy) {
            $version = $this->nextVersion($user->id);

            $dietPlan = AiPlan::query()->create([
                'user_id' => $user->id,
                'ai_request_id' => $aiRequestId,
                'type' => 'diet',
                'plan_json' => $validatedOutput['diet'],
                'version' => $version,
                'notes' => $notes,
                'created_by' => $createdBy ?? $user->id,
                'generation_id' => $generationId,
            ]);

            $workoutPlan = AiPlan::query()->create([
                'user_id' => $user->id,
                'ai_request_id' => $aiRequestId,
                'type' => 'workout',
                'plan_json' => $validatedOutput['workout'],
                'version' => $version,
                'notes' => $notes,
                'created_by' => $createdBy ?? $user->id,
                'generation_id' => $generationId,
            ]);

            $nutritionPlan = $this->syncNutritionPlan($user, $validatedOutput, $dietPlan->id, $aiRequestId, $version, $generationId);
            $normalizedWorkoutPlan = $this->syncWorkoutPlan($user, $validatedOutput, $workoutPlan->id, $aiRequestId, $version, $generationId);

            return [
                'version' => $version,
                'generation_id' => $generationId,
                'plans' => [
                    'diet' => $dietPlan->plan_json,
                    'workout' => $workoutPlan->plan_json,
                ],
                'persisted' => [
                    'ai_plan_ids' => [
                        'diet' => $dietPlan->id,
                        'workout' => $workoutPlan->id,
                    ],
                    'nutrition_plan_id' => $nutritionPlan->id,
                    'workout_plan_id' => $normalizedWorkoutPlan->id,
                ],
            ];
        });
    }

    private function nextVersion(int $userId): int
    {
        $last = (int) AiPlan::query()->where('user_id', $userId)->max('version');

        return max(1, $last + 1);
    }

    private function syncNutritionPlan(
        User $user,
        array $fullPlan,
        int $aiPlanId,
        int $aiRequestId,
        int $version,
        string $generationId
    ): NutritionPlan {
        NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $diet = $fullPlan['diet'];
        $days = is_array($diet['days'] ?? null) ? $diet['days'] : [];
        $start = Carbon::today();
        $foods = Food::query()->select(['id', 'name'])->orderBy('name')->get();
        $foodMap = $foods->mapWithKeys(fn (Food $food) => [$this->normalizeKey($food->name) => $food->id])->all();

        $plan = NutritionPlan::query()->create([
            'user_id' => $user->id,
            'ai_request_id' => $aiRequestId,
            'name' => 'AI Diet Plan v'.$version,
            'goal' => $user->dietary_goal ?: null,
            'start_date' => $start->toDateString(),
            'duration_days' => max(1, count($days)),
            'is_active' => true,
            'targets_json' => $diet['daily_targets'] ?? [],
            'meta' => [
                'source' => 'ai_plans',
                'ai_plan_id' => $aiPlanId,
                'generation_id' => $generationId,
                'version' => $version,
                'overview' => $fullPlan['overview'] ?? [],
                'safety' => $fullPlan['safety'] ?? [],
                'adaptive_review' => $fullPlan['adaptive_review'] ?? [],
                'ml_readiness' => $fullPlan['ml_readiness'] ?? [],
                'meal_prep_notes' => $diet['meal_prep_notes'] ?? [],
                'adherence_notes' => $diet['adherence_notes'] ?? [],
                'grocery_list' => $diet['grocery_list'] ?? [],
            ],
        ]);

        foreach ($days as $dayData) {
            $dayIndex = max(1, (int) ($dayData['day_index'] ?? 1));
            $day = NutritionPlanDay::query()->create([
                'nutrition_plan_id' => $plan->id,
                'day_index' => $dayIndex,
                'date' => $start->copy()->addDays($dayIndex - 1)->toDateString(),
                'notes' => $this->joinNotes(array_merge(
                    [(string) ($dayData['theme'] ?? '')],
                    is_array($dayData['coaching_notes'] ?? null) ? $dayData['coaching_notes'] : []
                )),
            ]);

            foreach ((array) ($dayData['meals'] ?? []) as $order => $mealData) {
                $mealNotes = [];
                $mealNotes[] = trim((string) ($mealData['title'] ?? ''));

                $meal = NutritionPlanMeal::query()->create([
                    'nutrition_plan_day_id' => $day->id,
                    'meal_type' => $this->normalizeMealType((string) ($mealData['meal_code'] ?? 'snack')),
                    'order' => $order + 1,
                    'notes' => null,
                ]);

                $unmatchedItems = [];

                foreach ((array) ($mealData['items'] ?? []) as $index => $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }

                    $foodId = $this->matchFoodId($name, $foods, $foodMap);
                    $portion = (string) ($item['portion'] ?? '');
                    $parsedPortion = $this->parsePortion($portion);
                    $itemNote = $this->joinNotes([
                        (string) ($item['recipe_note'] ?? ''),
                        ! empty($item['alternatives']) ? 'Alternatives: '.implode(', ', (array) $item['alternatives']) : '',
                    ]);

                    if ($foodId === null) {
                        $unmatchedItems[] = trim($name.' '.$portion);
                        continue;
                    }

                    NutritionPlanItem::query()->create([
                        'nutrition_plan_meal_id' => $meal->id,
                        'food_id' => $foodId,
                        'servings' => $parsedPortion['servings'],
                        'grams' => $parsedPortion['grams'],
                        'sort_order' => $index + 1,
                        'notes' => $itemNote,
                    ]);
                }

                if ($unmatchedItems !== []) {
                    $mealNotes[] = 'Planned items: '.implode(' | ', $unmatchedItems);
                }

                if ($meal->notes !== $this->joinNotes($mealNotes)) {
                    $meal->notes = $this->joinNotes($mealNotes);
                    $meal->save();
                }
            }
        }

        return $plan;
    }

    private function syncWorkoutPlan(
        User $user,
        array $fullPlan,
        int $aiPlanId,
        int $aiRequestId,
        int $version,
        string $generationId
    ): WorkoutPlan {
        WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $workout = $fullPlan['workout'];
        $schedule = is_array($workout['weekly_schedule'] ?? null) ? $workout['weekly_schedule'] : [];
        $start = Carbon::today();
        $exercises = Exercise::query()->select(['id', 'name'])->orderBy('name')->get();
        $exerciseMap = $exercises->mapWithKeys(fn (Exercise $exercise) => [$this->normalizeKey($exercise->name) => $exercise->id])->all();

        $plan = WorkoutPlan::query()->create([
            'user_id' => $user->id,
            'ai_request_id' => $aiRequestId,
            'name' => 'AI Workout Plan v'.$version,
            'goal' => $user->fitness_goal ?: null,
            'start_date' => $start->toDateString(),
            'duration_days' => 7,
            'notes' => null,
            'is_active' => true,
            'is_public' => false,
            'meta' => [
                'source' => 'ai_plans',
                'ai_plan_id' => $aiPlanId,
                'generation_id' => $generationId,
                'version' => $version,
                'overview' => $fullPlan['overview'] ?? [],
                'safety' => $fullPlan['safety'] ?? [],
                'adaptive_review' => $fullPlan['adaptive_review'] ?? [],
                'ml_readiness' => $fullPlan['ml_readiness'] ?? [],
                'progression_rules' => $workout['progression_rules'] ?? [],
                'recovery_rules' => $workout['recovery_rules'] ?? [],
                'coach_notes' => $workout['coach_notes'] ?? [],
            ],
        ]);

        foreach ($schedule as $fallbackDayIndex => $dayData) {
            $dayIndex = max(1, min(7, (int) ($dayData['day_index'] ?? ($fallbackDayIndex + 1))));
            $day = WorkoutPlanDay::query()->create([
                'workout_plan_id' => $plan->id,
                'day_index' => $dayIndex,
                'name' => (string) ($dayData['focus'] ?? ('Day '.$dayIndex)),
                'notes' => $this->joinNotes(array_merge(
                    is_array($dayData['warmup'] ?? null) ? $dayData['warmup'] : [],
                    is_array($dayData['cooldown'] ?? null) ? $dayData['cooldown'] : [],
                    is_array($dayData['safety_notes'] ?? null) ? $dayData['safety_notes'] : [],
                )),
                'meta' => [
                    'day_label' => $dayData['day_label'] ?? null,
                    'session_type' => $dayData['session_type'] ?? null,
                    'location' => $dayData['location'] ?? null,
                    'duration_min' => $dayData['duration_min'] ?? null,
                    'warmup' => $dayData['warmup'] ?? [],
                    'cooldown' => $dayData['cooldown'] ?? [],
                    'safety_notes' => $dayData['safety_notes'] ?? [],
                ],
            ]);

            $unmatchedExercises = [];
            $insertedExerciseIds = [];

            foreach ((array) ($dayData['exercises'] ?? []) as $order => $exerciseData) {
                $name = trim((string) ($exerciseData['name'] ?? ''));
                if ($name === '') {
                    continue;
                }

                $exerciseId = $this->matchExerciseId($name, $exercises, $exerciseMap);
                if ($exerciseId === null) {
                    $unmatchedExercises[] = $name;
                    continue;
                }
                if (in_array($exerciseId, $insertedExerciseIds, true)) {
                    $unmatchedExercises[] = $name.' (duplicate skipped)';
                    continue;
                }

                [$repsMin, $repsMax] = $this->parseRepRange((string) ($exerciseData['reps'] ?? '8-12'));

                WorkoutPlanExercise::query()->create([
                    'workout_plan_day_id' => $day->id,
                    'exercise_id' => $exerciseId,
                    'order_index' => $order,
                    'sets' => max(1, (int) ($exerciseData['sets'] ?? 3)),
                    'reps_min' => $repsMin,
                    'reps_max' => $repsMax,
                    'rest_seconds' => max(30, (int) ($exerciseData['rest_sec'] ?? 60)),
                    'rpe_target' => max(5, min(10, (float) ($exerciseData['rpe'] ?? 7))),
                    'rir_target' => null,
                    'notes' => $this->joinNotes([
                        (string) ($exerciseData['movement_notes'] ?? ''),
                        (string) ($exerciseData['safer_alternative'] ?? ''),
                    ]),
                ]);
                $insertedExerciseIds[] = $exerciseId;
            }

            if ($unmatchedExercises !== []) {
                $meta = is_array($day->meta) ? $day->meta : [];
                $meta['unmatched_exercises'] = $unmatchedExercises;
                $day->meta = $meta;
                $day->save();
            }
        }

        return $plan;
    }

    private function normalizeMealType(string $meal): string
    {
        $meal = strtolower(trim($meal));

        return match (true) {
            str_contains($meal, 'break') => 'breakfast',
            str_contains($meal, 'lunch') => 'lunch',
            str_contains($meal, 'dinner') => 'dinner',
            default => 'snack',
        };
    }

    private function parseRepRange(string $value): array
    {
        if (preg_match('/(\d+)\s*-\s*(\d+)/', $value, $matches)) {
            $min = (int) $matches[1];
            $max = (int) $matches[2];

            return [min($min, $max), max($min, $max)];
        }

        $single = (int) preg_replace('/\D+/', '', $value);
        if ($single > 0) {
            return [$single, $single];
        }

        return [8, 12];
    }

    private function parsePortion(string $portion): array
    {
        $portion = trim($portion);

        if (preg_match('/(\d+(?:\.\d+)?)\s*g\b/i', $portion, $matches)) {
            return [
                'grams' => (float) $matches[1],
                'servings' => null,
            ];
        }

        if (preg_match('/(\d+(?:\.\d+)?)/', $portion, $matches)) {
            return [
                'grams' => null,
                'servings' => (float) $matches[1],
            ];
        }

        return [
            'grams' => null,
            'servings' => 1.0,
        ];
    }

    private function matchFoodId(string $name, Collection $foods, array $foodMap): ?int
    {
        $normalized = $this->normalizeKey($name);
        if (isset($foodMap[$normalized])) {
            return (int) $foodMap[$normalized];
        }

        $matched = $foods->first(function (Food $food) use ($normalized): bool {
            $candidate = $this->normalizeKey($food->name);

            return $candidate !== '' &&
                (str_contains($candidate, $normalized) || str_contains($normalized, $candidate)) &&
                min(strlen($candidate), strlen($normalized)) >= 4;
        });

        return $matched?->id !== null ? (int) $matched->id : null;
    }

    private function matchExerciseId(string $name, Collection $exercises, array $exerciseMap): ?int
    {
        $normalized = $this->normalizeKey($name);
        if (isset($exerciseMap[$normalized])) {
            return (int) $exerciseMap[$normalized];
        }

        $matched = $exercises->first(function (Exercise $exercise) use ($normalized): bool {
            $candidate = $this->normalizeKey($exercise->name);

            return $candidate !== '' &&
                (str_contains($candidate, $normalized) || str_contains($normalized, $candidate)) &&
                min(strlen($candidate), strlen($normalized)) >= 4;
        });

        return $matched?->id !== null ? (int) $matched->id : null;
    }

    private function normalizeKey(?string $value): string
    {
        return trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower((string) $value)) ?? '');
    }

    private function joinNotes(array $parts): ?string
    {
        $items = array_values(array_filter(array_map(
            fn ($part) => trim((string) $part),
            $parts
        )));

        return $items !== [] ? implode(' | ', $items) : null;
    }
}
