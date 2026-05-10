<?php

namespace App\Services\Ai\Training;

<<<<<<< HEAD
use App\Models\AiRequest;
=======
>>>>>>> origin/main
use App\Models\Measurement;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlannerProfileDatasetUserImporter
{
<<<<<<< HEAD
    public function __construct(
        private readonly ImportedPlannerIdentityService $identities,
    ) {}

=======
>>>>>>> origin/main
    /**
     * @return array<string, mixed>
     */
    public function import(
        string $inputDir,
        bool $dryRun = false,
        string $source = 'planner_dataset_import',
        ?string $sharedPassword = null
    ): array {
        $dir = $this->resolvePath($inputDir);

        if (! File::isDirectory($dir)) {
            throw new \InvalidArgumentException("Input directory does not exist: {$dir}");
        }

        $profiles = $this->readCsv($dir.DIRECTORY_SEPARATOR.'planner_profiles_template.csv');
        $planRuns = $this->readCsv($dir.DIRECTORY_SEPARATOR.'planner_plan_runs_template.csv');
        $outcomes = $this->readCsv($dir.DIRECTORY_SEPARATOR.'planner_outcomes_template.csv');

        $planRunsByProfile = [];
        foreach ($planRuns as $row) {
            $profileId = trim((string) ($row['profile_id'] ?? ''));
            if ($profileId === '') {
                continue;
            }

            $planRunsByProfile[$profileId][] = $row;
        }

        foreach ($planRunsByProfile as &$rows) {
            usort($rows, fn (array $left, array $right): int => strcmp(
                (string) ($left['generated_at_utc'] ?? ''),
                (string) ($right['generated_at_utc'] ?? '')
            ));
        }
        unset($rows);

        $outcomesByRun = [];
        foreach ($outcomes as $row) {
            $planRunId = trim((string) ($row['plan_run_id'] ?? ''));
            if ($planRunId === '') {
                continue;
            }

            $outcomesByRun[$planRunId][] = $row;
        }

        foreach ($outcomesByRun as &$rows) {
            usort($rows, fn (array $left, array $right): int => strcmp(
                (string) ($left['checkpoint_date_utc'] ?? ''),
                (string) ($right['checkpoint_date_utc'] ?? '')
            ));
        }
        unset($rows);

        $summary = [
            'input_dir' => $dir,
            'source' => $source,
            'dry_run' => $dryRun,
            'profiles' => count($profiles),
            'plan_runs' => count($planRuns),
            'outcomes' => count($outcomes),
            'created_users' => 0,
            'updated_users' => 0,
            'dietary_rows_written' => 0,
            'medical_rows_written' => 0,
            'measurement_rows_written' => 0,
            'pref_rows_written' => 0,
<<<<<<< HEAD
            'ai_request_rows_written' => 0,
=======
>>>>>>> origin/main
        ];

        foreach ($profiles as $profile) {
            $profileId = trim((string) ($profile['profile_id'] ?? ''));
            if ($profileId === '') {
                continue;
            }

<<<<<<< HEAD
            $profilePlanRuns = $planRunsByProfile[$profileId] ?? [];
            $latestRun = $this->latestRunForProfile($profilePlanRuns);
=======
            $latestRun = $this->latestRunForProfile($planRunsByProfile[$profileId] ?? []);
>>>>>>> origin/main
            $email = $this->emailForProfile($profileId);
            $existing = User::withTrashed()->where('email', $email)->first();

            if ($dryRun) {
                if ($existing) {
                    $summary['updated_users']++;
                } else {
                    $summary['created_users']++;
                }

                continue;
            }

            DB::transaction(function () use (
                $profile,
                $source,
<<<<<<< HEAD
                $profilePlanRuns,
=======
>>>>>>> origin/main
                $latestRun,
                $outcomesByRun,
                $existing,
                $sharedPassword,
                &$summary
            ): void {
                $user = $this->upsertUser($profile, $existing, $sharedPassword);
                if ($existing) {
                    $summary['updated_users']++;
                } else {
                    $summary['created_users']++;
                }

                $summary['dietary_rows_written'] += $this->syncDietaryRestrictions($user, $profile, $source);
                $summary['medical_rows_written'] += $this->syncMedicalHistories($user, $profile, $source);
                $summary['pref_rows_written'] += $this->syncPrefs($user, $profile, $latestRun, $source);
                $summary['measurement_rows_written'] += $this->syncMeasurements(
                    $user,
                    $profile,
                    $source,
<<<<<<< HEAD
                    $this->measurementsForProfile($profile, $profilePlanRuns, $outcomesByRun)
                );
                $summary['ai_request_rows_written'] += $this->syncImportedPlannerRequests(
                    $user,
                    $profile,
                    $source,
                    $profilePlanRuns
=======
                    $this->measurementsForProfile($profile, $latestRun, $outcomesByRun)
>>>>>>> origin/main
                );

                $this->refreshUserCurrentWeight($user);
            });
        }

        return $summary;
    }

    /**
     * @return list<array<string, string>>
     */
    private function readCsv(string $path): array
    {
        if (! File::exists($path)) {
            throw new \InvalidArgumentException("CSV file not found: {$path}");
        }

        $rows = [];
        $handle = fopen($path, 'r');
        if (! is_resource($handle)) {
            throw new \RuntimeException("Unable to read CSV file: {$path}");
        }

        $headers = fgetcsv($handle);
        if (! is_array($headers)) {
            fclose($handle);

            return [];
        }

        $headers = array_map(
            static fn ($value): string => trim((string) $value),
            $headers
        );

        while (($row = fgetcsv($handle)) !== false) {
            $assoc = [];
            foreach ($headers as $index => $header) {
                $assoc[$header] = isset($row[$index]) ? (string) $row[$index] : '';
            }
            $rows[] = $assoc;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, string>|null
     */
    private function latestRunForProfile(array $rows): ?array
    {
        if ($rows === []) {
            return null;
        }

        return $rows[array_key_last($rows)] ?? null;
    }

    private function upsertUser(array $profile, ?User $existing, ?string $sharedPassword): User
    {
        $profileId = trim((string) ($profile['profile_id'] ?? ''));
        $createdAt = $this->parseTimestamp((string) ($profile['created_at_utc'] ?? '')) ?? now();
        $createdAt = $createdAt->greaterThan(now()) ? now() : $createdAt;
        $goal = trim((string) ($profile['goal_primary'] ?? ''));
        $dietFailures = $this->parseSemicolonList((string) ($profile['past_diet_failures_text'] ?? ''));
        $allergies = $this->normalizeValues($this->parseJsonList((string) ($profile['allergies_json'] ?? '')));
        $medical = $this->normalizeValues($this->parseJsonList((string) ($profile['medical_history_json'] ?? '')));
        $injuries = $this->normalizeValues($this->parseJsonList((string) ($profile['injury_history_json'] ?? '')));
        $email = $this->emailForProfile($profileId);
        $username = 'planner_'.Str::lower($profileId);
<<<<<<< HEAD
        $gender = $this->mapGender((string) ($profile['sex'] ?? ''));
        $identity = $this->identities->identityForProfile($profileId, $gender);
        $workoutDays = max(1, (int) round((float) ($profile['workout_days_target_per_week'] ?? 3)));

        $payload = [
            'name' => $identity['name'],
            'first_name' => $identity['first_name'],
            'last_name' => $identity['last_name'],
            'username' => $username,
            'gender' => $gender,
=======
        $firstName = 'Planner';
        $lastName = Str::upper($profileId);
        $workoutDays = max(1, (int) round((float) ($profile['workout_days_target_per_week'] ?? 3)));

        $payload = [
            'name' => trim($firstName.' '.$lastName),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'gender' => $this->mapGender((string) ($profile['sex'] ?? '')),
>>>>>>> origin/main
            'age' => (int) round((float) ($profile['age'] ?? 0)),
            'height_cm' => (int) round((float) ($profile['height_cm'] ?? 0)),
            'weight_kg' => round((float) ($profile['start_weight_kg'] ?? 0), 2),
            'has_medical_history' => $medical !== [] || $injuries !== [],
            'medical_history' => $this->medicalSummary($medical, $injuries),
            'dietary_goal' => $this->mapDietaryGoal($goal),
            'fitness_goal' => $this->mapFitnessGoal($goal),
            'diet_name' => $this->humanizeToken((string) ($profile['diet_type'] ?? 'balanced')),
            'allergies' => $allergies,
            'activity_level' => $this->mapActivityLevel($workoutDays),
            'workout_days_per_week' => $workoutDays,
            'workout_location' => Str::lower(trim((string) ($profile['workout_location'] ?? 'home'))),
            'tried_diet_before' => $dietFailures !== [],
            'diet_failure_reasons' => $dietFailures,
            'diet_failure_other' => trim((string) ($profile['past_diet_failures_text'] ?? '')) ?: null,
            'email' => $email,
            'role' => User::ROLE_CLIENT,
            'verified' => true,
            'status' => 'active',
<<<<<<< HEAD
            'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
=======
>>>>>>> origin/main
            'email_verified_at' => $createdAt,
            'created_at' => $existing?->created_at ?? $createdAt,
            'updated_at' => now(),
        ];

        if ($sharedPassword !== null && $sharedPassword !== '') {
            $payload['password'] = Hash::make($sharedPassword);
        } elseif (! $existing) {
            $payload['password'] = Hash::make((string) Str::uuid());
        }

        $user = $existing ?? new User;
        if ($existing && $existing->trashed()) {
            $payload['deleted_at'] = null;
        }

        $user->forceFill($payload)->save();

        return $user->fresh();
    }

    private function syncDietaryRestrictions(User $user, array $profile, string $source): int
    {
        UserDietaryRestriction::query()
            ->where('user_id', $user->id)
            ->where('source', $source)
            ->delete();

        $rows = [];
        $dietType = $this->humanizeToken((string) ($profile['diet_type'] ?? 'balanced'));
        if ($dietType !== '') {
            $rows[] = [
                'kind' => 'diet_type',
                'value' => $dietType,
            ];
        }

        foreach ($this->normalizeValues($this->parseJsonList((string) ($profile['allergies_json'] ?? ''))) as $allergy) {
            $rows[] = [
                'kind' => 'allergy',
                'value' => $allergy,
            ];
        }

        foreach ($rows as $row) {
            UserDietaryRestriction::query()->create([
                'user_id' => $user->id,
                'kind' => $row['kind'],
                'value' => $row['value'],
                'notes' => 'Imported from planner profile dataset.',
                'source' => $source,
                'is_active' => true,
            ]);
        }

        return count($rows);
    }

    private function syncMedicalHistories(User $user, array $profile, string $source): int
    {
        UserMedicalHistory::query()
            ->where('user_id', $user->id)
            ->where('source', $source)
            ->delete();

        $rows = [];
        foreach ($this->normalizeValues($this->parseJsonList((string) ($profile['medical_history_json'] ?? ''))) as $condition) {
            $rows[] = [
                'kind' => 'medical_condition',
                'value' => $condition,
            ];
        }
        foreach ($this->normalizeValues($this->parseJsonList((string) ($profile['injury_history_json'] ?? ''))) as $injury) {
            $rows[] = [
                'kind' => 'injury',
                'value' => $injury,
            ];
        }

        foreach ($rows as $row) {
            UserMedicalHistory::query()->create([
                'user_id' => $user->id,
                'kind' => $row['kind'],
                'value' => $row['value'],
                'notes' => 'Imported from planner profile dataset.',
                'source' => $source,
                'is_active' => true,
            ]);
        }

        return count($rows);
    }

    private function syncPrefs(User $user, array $profile, ?array $latestRun, string $source): int
    {
        $settings = [
            'import_source' => $source,
            'profile_id' => trim((string) ($profile['profile_id'] ?? '')),
            'user_id_hash' => trim((string) ($profile['user_id_hash'] ?? '')),
            'equipment' => $this->parseJsonList((string) ($profile['equipment_json'] ?? '')),
        ];

        if ($latestRun) {
            $settings['latest_plan_run_id'] = trim((string) ($latestRun['plan_run_id'] ?? ''));
            $settings['latest_plan_provider'] = trim((string) ($latestRun['provider'] ?? ''));
            $settings['latest_plan_model'] = trim((string) ($latestRun['model'] ?? ''));
            $settings['latest_plan_horizon_days'] = (int) round((float) ($latestRun['horizon_days'] ?? 14));
            $settings['latest_workout_split'] = trim((string) ($latestRun['workout_split'] ?? ''));
        }

        UserPref::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'units' => 'metric',
                'home_gym' => Str::lower(trim((string) ($profile['workout_location'] ?? 'home'))) === 'home',
                'daily_goal_calories' => $latestRun ? (int) round((float) ($latestRun['calorie_target'] ?? 0)) : null,
                'daily_goal_protein_g' => $latestRun ? (float) ($latestRun['protein_target_g'] ?? 0) : null,
                'daily_goal_carbs_g' => $latestRun ? (float) ($latestRun['carbs_target_g'] ?? 0) : null,
                'daily_goal_fat_g' => $latestRun ? (float) ($latestRun['fat_target_g'] ?? 0) : null,
                'workout_days_target' => max(1, (int) round((float) ($profile['workout_days_target_per_week'] ?? 3))),
                'settings' => $settings,
            ]
        );

        return 1;
    }

    /**
     * @param  list<array<string, mixed>>  $measurements
     */
    private function syncMeasurements(User $user, array $profile, string $source, array $measurements): int
    {
        $written = 0;

        foreach ($measurements as $measurement) {
            $measuredAt = trim((string) ($measurement['measured_at'] ?? ''));
            if ($measuredAt === '') {
                continue;
            }

            $record = Measurement::query()
                ->where('user_id', $user->id)
                ->whereDate('measured_at', $measuredAt)
                ->first();

            if (! $record) {
                $record = new Measurement([
                    'user_id' => $user->id,
                    'measured_at' => $measuredAt,
                ]);
            }

            $record->forceFill([
                'weight_kg' => $measurement['weight_kg'],
                'height_cm' => (int) round((float) ($profile['height_cm'] ?? 0)),
                'waist_cm' => $measurement['waist_cm'],
                'notes' => $measurement['notes'].' [source='.$source.']',
            ])->save();

            $written++;
        }

        return $written;
    }

    /**
<<<<<<< HEAD
     * @param  list<array<string, string>>  $planRuns
     * @param  array<string, list<array<string, string>>>  $outcomesByRun
     * @return list<array<string, mixed>>
     */
    private function measurementsForProfile(array $profile, array $planRuns, array $outcomesByRun): array
=======
     * @param  array<string, string>|null  $latestRun
     * @param  array<string, list<array<string, string>>>  $outcomesByRun
     * @return list<array<string, mixed>>
     */
    private function measurementsForProfile(array $profile, ?array $latestRun, array $outcomesByRun): array
>>>>>>> origin/main
    {
        $measurements = [];
        $createdAt = $this->parseTimestamp((string) ($profile['created_at_utc'] ?? ''));
        $baselineWeight = $this->toFloat($profile['start_weight_kg'] ?? null);
        if ($createdAt && $baselineWeight !== null) {
            $measurements[] = [
                'measured_at' => $createdAt->toDateString(),
                'weight_kg' => round($baselineWeight, 2),
                'waist_cm' => null,
                'notes' => 'Imported planner profile baseline check-in.',
            ];
        }

<<<<<<< HEAD
        foreach ($planRuns as $planRun) {
            $planRunId = trim((string) ($planRun['plan_run_id'] ?? ''));
            if ($planRunId === '') {
                continue;
            }

            foreach ($outcomesByRun[$planRunId] ?? [] as $outcome) {
=======
        $profileRuns = $latestRun ? [$latestRun] : [];
        if ($profileRuns !== []) {
            $latestPlanRunId = trim((string) ($latestRun['plan_run_id'] ?? ''));
            foreach ($outcomesByRun[$latestPlanRunId] ?? [] as $outcome) {
>>>>>>> origin/main
                $date = $this->parseTimestamp((string) ($outcome['checkpoint_date_utc'] ?? ''));
                $weight = $this->toFloat($outcome['weight_kg'] ?? null);
                if (! $date || $weight === null) {
                    continue;
                }

                $strengthMetric = trim((string) ($outcome['strength_metric_name'] ?? ''));
                $measurements[] = [
                    'measured_at' => $date->toDateString(),
                    'weight_kg' => round($weight, 2),
                    'waist_cm' => $this->toFloat($outcome['waist_cm'] ?? null),
                    'notes' => sprintf(
                        'Imported planner checkpoint day %s%s.',
                        trim((string) ($outcome['checkpoint_day'] ?? '')),
                        $strengthMetric !== '' ? ' strength='.$strengthMetric : ''
                    ),
                ];
            }
        }

        usort($measurements, fn (array $left, array $right): int => strcmp(
            (string) $left['measured_at'],
            (string) $right['measured_at']
        ));

        return $measurements;
    }

    private function refreshUserCurrentWeight(User $user): void
    {
        $latestWeight = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->orderByDesc('measured_at')
            ->value('weight_kg');

        if ($latestWeight !== null) {
            $user->forceFill(['weight_kg' => round((float) $latestWeight, 2)])->save();
        }
    }

<<<<<<< HEAD
    /**
     * @param  list<array<string, string>>  $planRuns
     */
    private function syncImportedPlannerRequests(User $user, array $profile, string $source, array $planRuns): int
    {
        $existingImported = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->get()
            ->filter(function (AiRequest $request) use ($source): bool {
                $usage = is_array($request->usage_json) ? $request->usage_json : [];

                return trim((string) ($usage['import_source'] ?? '')) === $source
                    && trim((string) ($usage['imported_plan_run_id'] ?? '')) !== '';
            })
            ->keyBy(function (AiRequest $request): string {
                $usage = is_array($request->usage_json) ? $request->usage_json : [];

                return trim((string) ($usage['imported_plan_run_id'] ?? ''));
            });

        $written = 0;

        foreach ($planRuns as $planRun) {
            $planRunId = trim((string) ($planRun['plan_run_id'] ?? ''));
            $generatedAt = $this->parseTimestamp((string) ($planRun['generated_at_utc'] ?? ''));
            if ($planRunId === '' || ! $generatedAt) {
                continue;
            }

            $request = $existingImported->get($planRunId) ?? new AiRequest([
                'user_id' => $user->id,
                'type' => 'plan_generator',
            ]);

            $request->forceFill([
                'user_id' => $user->id,
                'type' => 'plan_generator',
                'status' => 'completed',
                'provider' => trim((string) ($planRun['provider'] ?? '')) ?: 'dataset_import',
                'model' => trim((string) ($planRun['model'] ?? '')) ?: null,
                'prompt_version' => trim((string) ($planRun['prompt_version'] ?? '')) ?: 'dataset_import',
                'schema_version' => 'planner_dataset_import_v1',
                'input_context_json' => $this->importedPlanInputContext($profile, $planRun, $source),
                'output_json' => $this->importedPlanOutput($profile, $planRun),
                'usage_json' => [
                    'import_source' => $source,
                    'imported_plan_run_id' => $planRunId,
                    'imported_at_utc' => now('UTC')->toIso8601String(),
                ],
                'created_at' => $generatedAt,
                'updated_at' => $generatedAt,
            ])->save();

            $written++;
        }

        return $written;
    }

=======
>>>>>>> origin/main
    private function emailForProfile(string $profileId): string
    {
        return 'planner+'.Str::lower($profileId).'@hayetak.local';
    }

    /**
<<<<<<< HEAD
     * @param  array<string, string>  $planRun
     * @return array<string, mixed>
     */
    private function importedPlanInputContext(array $profile, array $planRun, string $source): array
    {
        return [
            'schema_version' => 'planner_dataset_import_context_v1',
            'import_source' => $source,
            'profile' => [
                'weight_kg' => $this->toFloat($profile['start_weight_kg'] ?? null),
                'age' => (int) round((float) ($profile['age'] ?? 0)),
                'gender' => $this->mapGender((string) ($profile['sex'] ?? '')),
                'height_cm' => (int) round((float) ($profile['height_cm'] ?? 0)),
                'diet_type' => $this->humanizeToken((string) ($profile['diet_type'] ?? 'balanced')),
                'workout_location' => Str::lower(trim((string) ($profile['workout_location'] ?? 'home'))),
                'workout_days_per_week' => max(1, (int) round((float) ($profile['workout_days_target_per_week'] ?? 3))),
                'dietary_goal' => $this->mapDietaryGoal((string) ($profile['goal_primary'] ?? '')),
                'fitness_goal' => $this->mapFitnessGoal((string) ($profile['goal_primary'] ?? '')),
                'allergies' => $this->normalizeValues($this->parseJsonList((string) ($profile['allergies_json'] ?? ''))),
                'medical_conditions' => $this->normalizeValues($this->parseJsonList((string) ($profile['medical_history_json'] ?? ''))),
                'injury_history' => $this->normalizeValues($this->parseJsonList((string) ($profile['injury_history_json'] ?? ''))),
                'available_equipment' => $this->normalizeValues($this->parseJsonList((string) ($profile['equipment_json'] ?? ''))),
            ],
            'planning_constraints' => [
                'plan_horizon_days' => max(1, (int) round((float) ($planRun['horizon_days'] ?? 14))),
                'target_training_days_per_week' => max(1, (int) round((float) ($profile['workout_days_target_per_week'] ?? 3))),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $planRun
     * @return array<string, mixed>
     */
    private function importedPlanOutput(array $profile, array $planRun): array
    {
        $output = $this->loadJsonFile((string) ($planRun['plan_json_path'] ?? ''));

        $dailyTargets = is_array(data_get($output, 'diet.daily_targets')) ? data_get($output, 'diet.daily_targets') : [];
        data_set($output, 'diet.daily_targets', [
            'calories_kcal' => $this->toInt($planRun['calorie_target'] ?? null),
            'protein_g' => $this->toInt($planRun['protein_target_g'] ?? null),
            'carbs_g' => $this->toInt($planRun['carbs_target_g'] ?? null),
            'fat_g' => $this->toInt($planRun['fat_target_g'] ?? null),
        ] + $dailyTargets);

        if (! is_array(data_get($output, 'diet.days'))) {
            data_set($output, 'diet.days', []);
        }

        if (! is_array(data_get($output, 'workout.weekly_schedule'))) {
            data_set($output, 'workout.weekly_schedule', []);
        }

        if (trim((string) ($planRun['workout_split'] ?? '')) !== '') {
            data_set($output, 'workout.split', trim((string) ($planRun['workout_split'] ?? '')));
        }

        $grocery = $this->loadJsonFile((string) ($planRun['grocery_list_json_path'] ?? ''));
        if ($grocery !== []) {
            data_set($output, 'diet.grocery_list', $grocery);
        }

        $safetyFlags = $this->decodeJsonArray((string) ($planRun['safety_flags_json'] ?? ''));
        if ($safetyFlags !== []) {
            data_set($output, 'safety.imported_flags', $safetyFlags);
        }

        $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : [];
        data_set($output, 'progress_prediction', $prediction + [
            'horizon_days' => max(1, (int) round((float) ($planRun['horizon_days'] ?? 14))),
            'baseline_weight_kg' => $this->toFloat($profile['start_weight_kg'] ?? null),
            'inference_source' => 'planner_dataset_import',
            'model_name' => trim((string) ($planRun['model'] ?? '')) ?: 'dataset_import',
        ]);

        return $output;
    }

    /**
=======
>>>>>>> origin/main
     * @return list<string>
     */
    private function parseJsonList(string $value): array
    {
        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            $decoded
        ))) : [];
    }

    /**
     * @return list<string>
     */
    private function parseSemicolonList(string $value): array
    {
        return array_values(array_filter(array_map(function (string $item): string {
            return $this->humanizeToken($item);
        }, preg_split('/\s*;\s*/', trim($value)) ?: [])));
    }

    /**
     * @param  list<string>  $values
     * @return list<string>
     */
    private function normalizeValues(array $values): array
    {
        $normalized = [];
        foreach ($values as $value) {
            $text = $this->humanizeToken($value);
            if ($text === '') {
                continue;
            }
            $normalized[$text] = $text;
        }

        return array_values($normalized);
    }

    private function mapGender(string $value): string
    {
        return match (Str::upper(trim($value))) {
            'F', 'FEMALE' => 'female',
            default => 'male',
        };
    }

    private function mapActivityLevel(int $workoutDays): string
    {
        return match (true) {
            $workoutDays >= 5 => 'Very Active',
            $workoutDays >= 3 => 'Moderately Active',
            default => 'Lightly Active',
        };
    }

    private function mapDietaryGoal(string $goal): string
    {
        return match (Str::lower(trim($goal))) {
            'fat_loss' => 'Calorie Deficit',
            'muscle_gain' => 'Calorie Surplus',
            'strength_performance' => 'Performance Support',
            default => 'Maintenance',
        };
    }

    private function mapFitnessGoal(string $goal): string
    {
        return match (Str::lower(trim($goal))) {
            'fat_loss' => 'Lose Fat',
            'recomposition' => 'Body Recomposition',
            'muscle_gain' => 'Build Muscle',
            'strength_performance' => 'Build Strength',
            default => 'Maintain',
        };
    }

    private function medicalSummary(array $medical, array $injuries): ?string
    {
        $parts = [];
        if ($medical !== []) {
            $parts[] = 'Medical: '.implode(', ', $medical);
        }
        if ($injuries !== []) {
            $parts[] = 'Injuries: '.implode(', ', $injuries);
        }

        return $parts !== [] ? implode('. ', $parts) : null;
    }

    private function humanizeToken(string $value): string
    {
        $text = trim(str_replace(['_', '-'], ' ', $value));
        if ($text === '') {
            return '';
        }

        return Str::title(Str::lower($text));
    }

    private function resolvePath(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/^[A-Za-z]:\\\\/', $value) === 1 || str_starts_with($value, '\\')) {
            return $value;
        }

        return base_path($value);
    }

    private function parseTimestamp(?string $value): ?CarbonImmutable
    {
        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        return CarbonImmutable::parse($text);
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
<<<<<<< HEAD

    private function toInt(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return is_numeric($value) ? (int) round((float) $value) : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadJsonFile(string $path): array
    {
        $absolutePath = $this->resolvePath(trim($path));
        if ($absolutePath === '' || ! File::exists($absolutePath)) {
            return [];
        }

        $decoded = json_decode((string) File::get($absolutePath), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonArray(string $value): array
    {
        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }
=======
>>>>>>> origin/main
}
