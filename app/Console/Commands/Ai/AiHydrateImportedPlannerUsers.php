<?php

namespace App\Console\Commands\Ai;

use App\Models\Exercise;
use App\Models\Food;
use App\Models\User;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\Seed\SeededPlanCleanupService;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;
use Carbon\CarbonImmutable;
use Database\Seeders\UserHistoryBackfillSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class AiHydrateImportedPlannerUsers extends Command
{
    protected $signature = 'ai:hydrate-imported-planner-users
        {--email-like=planner+%@hayetak.local : SQL LIKE filter for imported planner users}
        {--without-meals-only=0 : Only hydrate matched users that do not yet have meal entries}
        {--shared-password= : Shared password to set on hydrated users}
        {--history-start=2025-12-18 : Start date for generated meal/workout/water history}
        {--history-end=2026-05-18 : End date for generated meal/workout/water history}
        {--measurement-start=2025-12-18 : Start date for generated measurements}
        {--measurement-end=2026-05-18 : End date for generated measurements}
        {--history-window-days=70 : Meal/workout history window size in days}
        {--export-credentials= : Optional CSV path to export email/password pairs}
        {--dry-run=0 : Preview only}
    ';

    protected $description = 'Hydrate imported planner dataset users with seeded histories, weekly measurements, and optional shared credentials.';

    private UserHistoryBackfillSeeder $seeder;

    private \ReflectionClass $seederReflection;

    public function handle(): int
    {
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $emailLike = trim((string) $this->option('email-like'));
        $sharedPassword = trim((string) $this->option('shared-password'));
        $historyWindowDays = max(42, min(180, (int) $this->option('history-window-days')));
        $today = CarbonImmutable::today(config('app.timezone', 'UTC'))->startOfDay();
        $historyStart = CarbonImmutable::parse((string) $this->option('history-start'), config('app.timezone', 'UTC'))->startOfDay();
        $historyEndOption = trim((string) $this->option('history-end'));
        $historyEnd = $historyEndOption === '' || strtolower($historyEndOption) === 'today'
            ? $today
            : CarbonImmutable::parse($historyEndOption, config('app.timezone', 'UTC'))->startOfDay();
        $measurementStart = CarbonImmutable::parse((string) $this->option('measurement-start'), config('app.timezone', 'UTC'))->startOfDay();
        $measurementEndOption = trim((string) $this->option('measurement-end'));
        $measurementEnd = $measurementEndOption === '' || strtolower($measurementEndOption) === 'today'
            ? $today
            : CarbonImmutable::parse($measurementEndOption, config('app.timezone', 'UTC'))->startOfDay();

        if ($historyEnd->lessThan($historyStart)) {
            $this->error('History end date must be on or after the start date.');

            return self::FAILURE;
        }

        if ($measurementEnd->lessThan($measurementStart)) {
            $this->error('Measurement end date must be on or after the start date.');

            return self::FAILURE;
        }

        $userQuery = User::query()
            ->where('email', 'like', $emailLike)
            ->where('role', '!=', User::ROLE_ADMIN)
            ->with(['dietaryRestrictions', 'medicalHistories', 'prefs']);

        if (((int) $this->option('without-meals-only')) === 1) {
            $userQuery->whereDoesntHave('mealEntries');
        }

        $users = $userQuery
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            $this->warn('No imported planner users matched the provided filter.');

            return self::SUCCESS;
        }

        $this->bootSeeder($today, $historyWindowDays, $historyStart, $historyEnd, $measurementStart, $measurementEnd);

        $summary = [
            'users' => $users->count(),
            'updated_passwords' => 0,
            'reset_histories' => 0,
            'export_credentials' => null,
        ];

        foreach ($users as $user) {
            if ($dryRun) {
                continue;
            }

            DB::transaction(function () use ($user, $today, $measurementStart, $measurementEnd, $sharedPassword, &$summary): void {
                $createdAt = $user->created_at ? CarbonImmutable::parse($user->created_at) : $today;
                if ($createdAt->greaterThan($today)) {
                    $createdAt = $today;
                }
                $verifiedAt = $user->email_verified_at ? CarbonImmutable::parse($user->email_verified_at) : null;
                if ($verifiedAt && $verifiedAt->greaterThan($today)) {
                    $verifiedAt = $today;
                }

                $updates = [
                    'created_at' => $createdAt,
                    'email_verified_at' => $verifiedAt ?? $createdAt,
                    'verified' => true,
                    'status' => 'active',
                ];

                if ($sharedPassword !== '') {
                    $updates['password'] = Hash::make($sharedPassword);
                    $summary['updated_passwords']++;
                }

                $user->forceFill($updates)->save();
                $user->refresh();
                $user->loadMissing(['dietaryRestrictions', 'medicalHistories', 'prefs']);

                $profile = $this->invokeSeederMethod('buildUserProfile', $user);
                $profile['measurement_start'] = $createdAt->greaterThan($measurementStart) ? $createdAt->startOfDay() : $measurementStart;
                $profile['measurement_end'] = $measurementEnd;

                $this->invokeSeederMethod('resetSeededHistory', $user, $profile);
                $this->invokeSeederMethod('syncRestrictionTables', $user, $profile);
                $this->invokeSeederMethod('seedMealHistory', $user, $profile);
                $this->invokeSeederMethod('seedWorkoutHistory', $user, $profile);
                $this->invokeSeederMethod('seedMeasurementHistory', $user, $profile);

                $summary['reset_histories']++;
            });
        }

        if (! $dryRun && $sharedPassword !== '' && trim((string) $this->option('export-credentials')) !== '') {
            $summary['export_credentials'] = $this->exportCredentials(
                $users->fresh(),
                $sharedPassword,
                (string) $this->option('export-credentials')
            );
        }

        $this->table(
            ['Users', 'Passwords updated', 'Histories hydrated', 'Credentials CSV'],
            [[
                $summary['users'],
                $summary['updated_passwords'],
                $summary['reset_histories'],
                $summary['export_credentials'] ?? 'n/a',
            ]]
        );

        $this->info($dryRun ? 'Preview complete.' : 'Imported planner users were hydrated successfully.');

        return self::SUCCESS;
    }

    private function bootSeeder(
        CarbonImmutable $today,
        int $historyWindowDays,
        CarbonImmutable $historyStart,
        CarbonImmutable $historyEnd,
        CarbonImmutable $measurementStart,
        CarbonImmutable $measurementEnd
    ): void {
        $this->seeder = new UserHistoryBackfillSeeder();
        $this->seederReflection = new \ReflectionClass($this->seeder);

        $this->setSeederProperty('today', $today);
        $this->setSeederProperty(
            'activityStartFloor',
            $historyStart ?: $today->subDays($historyWindowDays)->startOfDay()
        );
        $this->setSeederProperty(
            'activityEndCeiling',
            $historyEnd ?: $today
        );
        $this->setSeederProperty('measurementStartFloor', $measurementStart);
        $this->setSeederProperty('measurementEndCeiling', $measurementEnd);
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
        $this->setSeederProperty('planCleanup', app(SeededPlanCleanupService::class));
    }

    private function setSeederProperty(string $property, mixed $value): void
    {
        $reflectionProperty = $this->seederReflection->getProperty($property);
        $reflectionProperty->setAccessible(true);
        $reflectionProperty->setValue($this->seeder, $value);
    }

    private function invokeSeederMethod(string $method, mixed ...$args): mixed
    {
        $reflectionMethod = $this->seederReflection->getMethod($method);
        $reflectionMethod->setAccessible(true);

        return $reflectionMethod->invoke($this->seeder, ...$args);
    }

    private function normalizeKey(string $value): string
    {
        $normalized = mb_strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/u', ' ', $normalized) ?? '';

        return trim($normalized);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, User>  $users
     */
    private function exportCredentials(Collection $users, string $sharedPassword, string $path): string
    {
        $absolutePath = $this->resolvePath($path);
        File::ensureDirectoryExists(dirname($absolutePath));

        $handle = fopen($absolutePath, 'w');
        if (! is_resource($handle)) {
            throw new \RuntimeException('Unable to open credentials export file.');
        }

        fputcsv($handle, ['email', 'password']);
        foreach ($users->sortBy('email') as $user) {
            fputcsv($handle, [(string) $user->email, $sharedPassword]);
        }
        fclose($handle);

        return $absolutePath;
    }

    private function resolvePath(string $path): string
    {
        if ($path === '') {
            return '';
        }

        if (preg_match('/^[A-Za-z]:\\\\/', $path) === 1 || str_starts_with($path, '\\')) {
            return $path;
        }

        return base_path($path);
    }
}
