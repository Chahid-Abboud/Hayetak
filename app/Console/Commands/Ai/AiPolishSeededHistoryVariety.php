<?php

namespace App\Console\Commands\Ai;

use App\Models\Exercise;
use App\Models\Food;
use App\Models\User;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;
use Carbon\CarbonImmutable;
use Database\Seeders\UserHistoryBackfillSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AiPolishSeededHistoryVariety extends Command
{
    protected $signature = 'ai:polish-seeded-history-variety
        {--start=2025-12-18 : Start date for the history window}
        {--end=2026-05-18 : End date for the history window}
        {--user-ids= : Optional comma-separated user IDs}
        {--email-like= : Optional email LIKE filter}
        {--dry-run=0 : Preview only}
    ';

    protected $description = 'Reduce repeated cloned meal and workout day patterns in seeded history while keeping data realistic.';

    private UserHistoryBackfillSeeder $seeder;

    private \ReflectionClass $seederReflection;

    public function handle(): int
    {
        $start = CarbonImmutable::parse((string) $this->option('start'), config('app.timezone', 'UTC'))->startOfDay();
        $end = CarbonImmutable::parse((string) $this->option('end'), config('app.timezone', 'UTC'))->startOfDay();
        $dryRun = ((int) $this->option('dry-run')) === 1;

        if ($end->lessThan($start)) {
            $this->error('End date must be on or after the start date.');

            return self::FAILURE;
        }

        $users = $this->resolveUsers();
        if ($users->isEmpty()) {
            $this->warn('No non-admin users matched the supplied filters.');

            return self::SUCCESS;
        }

        $this->bootSeederHelpers($start, $end);

        $stats = [
            'users' => $users->count(),
            'meal_entry_updates' => 0,
            'meal_food_swaps' => 0,
            'meal_day_caps' => 0,
            'workout_log_updates' => 0,
            'workout_set_updates' => 0,
        ];

        foreach ($users as $user) {
            DB::transaction(function () use ($user, $start, $end, $dryRun, &$stats): void {
                $stats['meal_entry_updates'] += $this->polishMealsForUser($user, $start, $end, $dryRun, $stats);
                $stats['workout_log_updates'] += $this->polishWorkoutsForUser($user, $start, $end, $dryRun, $stats);

                if (! $dryRun) {
                    $stats['meal_day_caps'] += $this->capMealDaysForUser($user, $start, $end);
                    $this->syncLegacyMealLogs($user, $start, $end);
                }
            });
        }

        $this->table(
            ['Users', 'Meal entry updates', 'Meal food swaps', 'Meal day caps', 'Workout log updates', 'Workout set updates'],
            [[
                $stats['users'],
                $stats['meal_entry_updates'],
                $stats['meal_food_swaps'],
                $stats['meal_day_caps'],
                $stats['workout_log_updates'],
                $stats['workout_set_updates'],
            ]]
        );

        $this->info($dryRun ? 'Variety polish preview complete.' : 'Seeded history variety polish complete.');

        return self::SUCCESS;
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function resolveUsers(): Collection
    {
        $query = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->orderBy('id')
            ->with(['dietaryRestrictions', 'medicalHistories', 'prefs']);

        $userIds = collect(preg_split('/[\s,;]+/', trim((string) $this->option('user-ids'))) ?: [])
            ->map(static fn ($value): int => (int) $value)
            ->filter(static fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($userIds->isNotEmpty()) {
            $query->whereIn('id', $userIds);
        }

        $emailLike = trim((string) $this->option('email-like'));
        if ($emailLike !== '') {
            $query->where('email', 'like', $emailLike);
        }

        return $query->get();
    }

    private function bootSeederHelpers(CarbonImmutable $start, CarbonImmutable $end): void
    {
        $this->seeder = new UserHistoryBackfillSeeder;
        $this->seederReflection = new \ReflectionClass($this->seeder);

        $this->setSeederProperty('today', CarbonImmutable::today(config('app.timezone', 'UTC'))->startOfDay());
        $this->setSeederProperty('activityStartFloor', $start);
        $this->setSeederProperty('activityEndCeiling', $end);
        $this->setSeederProperty('measurementStartFloor', $start);
        $this->setSeederProperty('measurementEndCeiling', $end);
        $this->setSeederProperty('measurementMinGapDays', 4);
        $this->setSeederProperty('measurementMaxGapDays', 7);
        $this->setSeederProperty(
            'foodsByName',
            Food::query()->get()->keyBy(fn (Food $food) => $this->normalizeKey((string) $food->name))
        );
        $this->setSeederProperty(
            'exercisesByName',
            Exercise::query()->get()->keyBy(fn (Exercise $exercise) => $this->normalizeKey((string) $exercise->name))
        );
        $this->setSeederProperty('foodCatalogAnomalies', app(FoodCatalogAnomalyService::class));
        $this->setSeederProperty('targets', app(SeedUserProfileTargetsService::class));
        $this->setSeederProperty('planCleanup', app(\App\Services\Ai\Seed\SeededPlanCleanupService::class));
    }

    private function setSeederProperty(string $property, mixed $value): void
    {
        $reflectionProperty = $this->seederReflection->getProperty($property);
        $reflectionProperty->setAccessible(true);
        $reflectionProperty->setValue($this->seeder, $value);
    }

    private function callSeeder(string $method, mixed ...$args): mixed
    {
        $reflectionMethod = $this->seederReflection->getMethod($method);
        $reflectionMethod->setAccessible(true);

        return $reflectionMethod->invoke($this->seeder, ...$args);
    }

    private function polishMealsForUser(
        User $user,
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $dryRun,
        array &$stats
    ): int {
        $entries = DB::table('meal_entries')
            ->where('user_id', $user->id)
            ->whereBetween('eaten_at', [$start->toDateString(), $end->toDateString()])
            ->orderBy('eaten_at')
            ->orderBy('meal_type')
            ->orderBy('id')
            ->get(['id', 'food_id', 'meal_type', 'servings', 'eaten_at'])
            ->groupBy(fn ($row) => CarbonImmutable::parse((string) $row->eaten_at)->toDateString());

        if ($entries->isEmpty()) {
            return 0;
        }

        $mealOptions = [];
        foreach ($entries as $dayKey => $dayEntries) {
            $weekday = CarbonImmutable::parse($dayKey)->dayOfWeekIso;
            foreach ($dayEntries as $entry) {
                $mealType = (string) $entry->meal_type;
                $mealOptions[$weekday][$mealType] ??= [];
                if (! in_array((int) $entry->food_id, $mealOptions[$weekday][$mealType], true)) {
                    $mealOptions[$weekday][$mealType][] = (int) $entry->food_id;
                }
            }
        }

        $signatureOccurrences = [];
        $updates = 0;

        foreach ($entries as $dayKey => $dayEntries) {
            $signature = $this->mealSignature($dayEntries);
            $occurrence = $signatureOccurrences[$signature] ?? 0;
            $signatureOccurrences[$signature] = $occurrence + 1;

            if ($occurrence === 0) {
                continue;
            }

            $weekday = CarbonImmutable::parse($dayKey)->dayOfWeekIso;
            foreach ($dayEntries as $index => $entry) {
                $foodId = (int) $entry->food_id;
                $mealType = (string) $entry->meal_type;
                $newFoodId = $foodId;

                $alternatives = array_values(array_filter(
                    $mealOptions[$weekday][$mealType] ?? [],
                    static fn (int $candidate): bool => $candidate !== $foodId
                ));

                if ($alternatives !== [] && $this->hashPercent($user->id.'|'.$dayKey.'|'.$mealType.'|food') < 42) {
                    $newFoodId = $alternatives[$this->hashIndex($user->id.'|'.$dayKey.'|'.$mealType.'|alt', count($alternatives))];
                    if ($newFoodId !== $foodId) {
                        $stats['meal_food_swaps']++;
                    }
                }

                $factor = $this->floatFromHash(
                    $user->id.'|'.$dayKey.'|'.$mealType.'|'.$index.'|serving',
                    0.90,
                    1.08
                );
                $newServings = $this->roundServing(max(0.60, min(3.20, ((float) $entry->servings) * $factor)));

                if ($dryRun) {
                    if ($newFoodId !== $foodId || abs($newServings - (float) $entry->servings) >= 0.01) {
                        $updates++;
                    }

                    continue;
                }

                if ($newFoodId === $foodId && abs($newServings - (float) $entry->servings) < 0.01) {
                    continue;
                }

                DB::table('meal_entries')
                    ->where('id', $entry->id)
                    ->update([
                        'food_id' => $newFoodId,
                        'servings' => $newServings,
                        'nutrition_plan_item_id' => null,
                        'updated_at' => now(),
                    ]);

                $updates++;
            }
        }

        return $updates;
    }

    private function polishWorkoutsForUser(
        User $user,
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $dryRun,
        array &$stats
    ): int {
        $logs = DB::table('workout_logs')
            ->where('user_id', $user->id)
            ->whereBetween('performed_at', [$start->startOfDay(), $end->endOfDay()])
            ->orderBy('performed_at')
            ->get(['id', 'performed_at', 'duration_min', 'mood', 'energy'])
            ->groupBy(fn ($row) => CarbonImmutable::parse((string) $row->performed_at)->toDateString());

        if ($logs->isEmpty()) {
            return 0;
        }

        $logIds = $logs->flatten(1)->pluck('id')->values();
        $setsByLog = DB::table('workout_log_sets as s')
            ->leftJoin('exercises as e', 'e.id', '=', 's.exercise_id')
            ->whereIn('s.workout_log_id', $logIds)
            ->orderBy('s.workout_log_id')
            ->orderBy('s.order_index')
            ->get([
                's.id',
                's.workout_log_id',
                's.exercise_id',
                's.order_index',
                's.weight_kg',
                's.reps',
                's.duration_sec',
                'e.name as exercise_name',
            ])
            ->groupBy('workout_log_id');

        $signatureOccurrences = [];
        $updates = 0;

        foreach ($logs as $dayKey => $dayLogs) {
            $signature = $this->workoutSignature($dayLogs, $setsByLog);
            $occurrence = $signatureOccurrences[$signature] ?? 0;
            $signatureOccurrences[$signature] = $occurrence + 1;

            if ($occurrence === 0) {
                continue;
            }

            foreach ($dayLogs as $logIndex => $log) {
                $performedAt = CarbonImmutable::parse((string) $log->performed_at);
                $minuteOffset = $this->intFromHash($user->id.'|'.$dayKey.'|'.$log->id.'|time', -55, 70);
                $newPerformedAt = $performedAt->addMinutes($minuteOffset);
                $newDuration = max(
                    20,
                    min(75, (int) round(((int) ($log->duration_min ?? 45)) + $this->intFromHash($user->id.'|'.$dayKey.'|'.$log->id.'|duration', -4, 5)))
                );
                $newMood = $this->pickFromList(
                    ['focused', 'steady', 'motivated', 'tired', 'confident'],
                    $user->id.'|'.$dayKey.'|'.$log->id.'|mood'
                );
                $newEnergy = $this->pickFromList(
                    ['low', 'moderate', 'moderate-high', 'high'],
                    $user->id.'|'.$dayKey.'|'.$log->id.'|energy'
                );

                if (! $dryRun) {
                    DB::table('workout_logs')
                        ->where('id', $log->id)
                        ->update([
                            'performed_at' => $newPerformedAt->toDateTimeString(),
                            'duration_min' => $newDuration,
                            'mood' => $newMood,
                            'energy' => $newEnergy,
                            'updated_at' => now(),
                        ]);
                }
                $updates++;

                foreach ($setsByLog->get($log->id, collect()) as $setIndex => $set) {
                    $exerciseName = (string) ($set->exercise_name ?? '');
                    $newWeight = $set->weight_kg;
                    $newReps = $set->reps;
                    $newDurationSec = $set->duration_sec;
                    $repOffset = $this->intFromHash($user->id.'|'.$dayKey.'|'.$set->id.'|reps', -2, 2);
                    $occurrenceWave = ($occurrence % 5) - 2;

                    if ($set->weight_kg !== null && ! $this->isBodyweightStyleExercise($exerciseName)) {
                        $weightFactor = $this->floatFromHash(
                            $user->id.'|'.$dayKey.'|'.$set->id.'|weight',
                            0.92,
                            1.08
                        ) + ($occurrenceWave * 0.01);
                        $newWeight = round(max(2.0, ((float) $set->weight_kg) * max(0.88, min(1.10, $weightFactor))), 1);
                    }

                    if ($set->reps !== null) {
                        $newReps = max(4, min(22, ((int) $set->reps) + $repOffset + $occurrenceWave));
                    }

                    if ($set->duration_sec !== null) {
                        $newDurationSec = max(20, min(180, ((int) $set->duration_sec) + $this->intFromHash($user->id.'|'.$dayKey.'|'.$set->id.'|duration', -6, 8)));
                    }

                    if ($dryRun) {
                        $stats['workout_set_updates']++;

                        continue;
                    }

                    DB::table('workout_log_sets')
                        ->where('id', $set->id)
                        ->update([
                            'weight_kg' => $newWeight,
                            'reps' => $newReps,
                            'duration_sec' => $newDurationSec,
                            'updated_at' => now(),
                        ]);

                    $stats['workout_set_updates']++;
                }
            }
        }

        return $updates;
    }

    private function capMealDaysForUser(User $user, CarbonImmutable $start, CarbonImmutable $end): int
    {
        $tdee = (int) ($user->prefs?->tdee_kcal ?? 0);
        if ($tdee <= 0) {
            return 0;
        }

        $dayRows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $user->id)
            ->whereBetween('me.eaten_at', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('date(me.eaten_at) as day_key, sum(coalesce(f.calories, 0) * me.servings) as kcal')
            ->groupByRaw('date(me.eaten_at)')
            ->get();

        $maxAllowed = $tdee + 450;
        $cappedDays = 0;

        foreach ($dayRows as $day) {
            $didCap = false;

            foreach (range(1, 3) as $attempt) {
                $kcal = (float) (
                    DB::table('meal_entries as me')
                        ->join('foods as f', 'f.id', '=', 'me.food_id')
                        ->where('me.user_id', $user->id)
                        ->whereDate('me.eaten_at', $day->day_key)
                        ->selectRaw('sum(coalesce(f.calories, 0) * me.servings) as kcal')
                        ->value('kcal') ?? 0
                );

                if ($kcal <= $maxAllowed || $kcal <= 0) {
                    break;
                }

                $scale = $maxAllowed / $kcal;
                $entries = DB::table('meal_entries')
                    ->where('user_id', $user->id)
                    ->whereDate('eaten_at', $day->day_key)
                    ->get(['id', 'servings']);

                foreach ($entries as $entry) {
                    DB::table('meal_entries')
                        ->where('id', $entry->id)
                        ->update([
                            'servings' => $this->roundServing(max(0.35, ((float) $entry->servings) * $scale)),
                            'updated_at' => now(),
                        ]);
                }

                $didCap = true;
            }

            if ($didCap) {
                $cappedDays++;
            }
        }

        return $cappedDays;
    }

    private function syncLegacyMealLogs(User $user, CarbonImmutable $start, CarbonImmutable $end): void
    {
        $profile = $this->callSeeder('buildUserProfile', $user->fresh()->loadMissing(['dietaryRestrictions', 'medicalHistories', 'prefs']));
        $profile['meal_start'] = $start;
        $profile['meal_end'] = $end;
        $this->callSeeder('syncLegacyMealLogs', $user->fresh(), $profile, $end);
    }

    private function mealSignature(Collection $dayEntries): string
    {
        return $dayEntries
            ->map(fn ($entry): string => implode(':', [
                (string) $entry->meal_type,
                (int) $entry->food_id,
                number_format((float) $entry->servings, 2, '.', ''),
            ]))
            ->implode('|');
    }

    private function workoutSignature(Collection $dayLogs, Collection $setsByLog): string
    {
        return $dayLogs
            ->map(function ($log) use ($setsByLog): string {
                return $setsByLog->get($log->id, collect())
                    ->map(fn ($set): string => implode(':', [
                        (int) $set->exercise_id,
                        $set->weight_kg !== null ? number_format((float) $set->weight_kg, 2, '.', '') : 'na',
                        $set->reps !== null ? (int) $set->reps : 'na',
                    ]))
                    ->implode('|');
            })
            ->implode('||');
    }

    private function isBodyweightStyleExercise(string $name): bool
    {
        $normalized = $this->normalizeKey($name);

        foreach (['bodyweight', 'push up', 'air squat', 'chair squat', 'child s pose', 'plank', 'stretch'] as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function roundServing(float $value): float
    {
        return round($value * 20) / 20;
    }

    private function normalizeKey(string $value): string
    {
        $normalized = mb_strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/u', ' ', $normalized) ?? '';

        return trim($normalized);
    }

    private function hashPercent(string $seed): int
    {
        return abs(crc32($seed)) % 100;
    }

    private function hashIndex(string $seed, int $count): int
    {
        return max(0, abs(crc32($seed)) % max(1, $count));
    }

    private function floatFromHash(string $seed, float $min, float $max): float
    {
        $ratio = (abs(crc32($seed)) % 1000) / 1000;

        return $min + (($max - $min) * $ratio);
    }

    private function intFromHash(string $seed, int $min, int $max): int
    {
        if ($max <= $min) {
            return $min;
        }

        return $min + (abs(crc32($seed)) % (($max - $min) + 1));
    }

    /**
     * @param  list<string>  $values
     */
    private function pickFromList(array $values, string $seed): string
    {
        return $values[$this->hashIndex($seed, count($values))] ?? $values[0];
    }
}
