<?php

use App\Models\AiRequest;
use App\Models\Measurement;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('imports planner profile dataset users idempotently', function () {
    $dir = base_path('tmp/test_planner_profile_import');
    File::ensureDirectoryExists($dir);

    File::put($dir.'/planner_profiles_template.csv', <<<'CSV'
profile_id,user_id_hash,created_at_utc,age,sex,height_cm,start_weight_kg,goal_primary,goal_secondary,diet_type,allergies_json,medical_history_json,injury_history_json,workout_days_target_per_week,workout_location,equipment_json,past_diet_failures_text,sleep_hours_baseline,stress_level_baseline
P9001,UHASH_9001,2026-01-01T00:00:00Z,29,F,167,68.5,fat_loss,recomposition,mediterranean,"[""sesame""]","[""prediabetes""]","[""knee pain history""]",4,gym,"[""dumbbells"", ""bench""]","late-night snacking; overly strict restriction",6.5,5
CSV);

    File::put($dir.'/planner_plan_runs_template.csv', <<<'CSV'
plan_run_id,profile_id,generated_at_utc,horizon_days,provider,model,prompt_version,plan_version,calorie_target,protein_target_g,carbs_target_g,fat_target_g,workout_split,plan_json_path,grocery_list_json_path,safety_flags_json
R9001,P9001,2026-02-01T00:05:00Z,14,ollama,llama3.1:8b,v2,1,1800,130,160,55,upper_lower_plus_cardio,storage/app/ai/plans/R9001.json,storage/app/ai/plans/R9001_grocery.json,"{""allergy_safe"": true}"
CSV);

    File::put($dir.'/planner_outcomes_template.csv', <<<'CSV'
outcome_id,plan_run_id,checkpoint_day,checkpoint_date_utc,weight_kg,waist_cm,adherence_workout_pct,adherence_diet_pct,avg_daily_steps,avg_sleep_hours,injury_flareup_flag,medical_issue_flag,strength_metric_name,strength_metric_value,user_feedback_score_1_to_5,user_feedback_text
O9001,R9001,14,2026-02-14T00:00:00Z,67.2,79.0,78,81,9000,6.8,0,0,goblet_squat_8rm_kg,24,4,Good fit.
CSV);

    $this->artisan('ai:import-planner-profile-users', [
        'input-dir' => $dir,
        '--shared-password' => 'PlannerDemo!2026',
    ])->assertExitCode(0);

    $this->artisan('ai:import-planner-profile-users', [
        'input-dir' => $dir,
        '--shared-password' => 'PlannerDemo!2026',
    ])->assertExitCode(0);

    $user = User::query()->where('email', 'planner+p9001@hayetak.local')->firstOrFail();

    expect($user->gender)->toBe('female')
        ->and($user->display_name)->not->toBe('Planner P9001')
        ->and($user->first_name)->not->toBe('Planner')
        ->and($user->last_name)->not->toBe('P9001')
        ->and((int) $user->age)->toBe(29)
        ->and((int) $user->height_cm)->toBe(167)
        ->and((float) $user->weight_kg)->toBe(67.2)
        ->and($user->diet_name)->toBe('Mediterranean')
        ->and($user->fitness_goal)->toBe('Lose Fat')
        ->and(Hash::check('PlannerDemo!2026', (string) $user->password))->toBeTrue();

    expect(UserDietaryRestriction::query()->where('user_id', $user->id)->count())->toBe(2)
        ->and(UserMedicalHistory::query()->where('user_id', $user->id)->count())->toBe(2)
        ->and(UserPref::query()->where('user_id', $user->id)->count())->toBe(1)
        ->and(Measurement::query()->where('user_id', $user->id)->count())->toBe(2);
});

it('imports planner plan runs as timestamped ai requests and exports real predictor labels', function () {
    $dir = base_path('tmp/test_planner_profile_import_requests');
    File::ensureDirectoryExists($dir);

    File::put($dir.'/planner_profiles_template.csv', <<<'CSV'
profile_id,user_id_hash,created_at_utc,age,sex,height_cm,start_weight_kg,goal_primary,goal_secondary,diet_type,allergies_json,medical_history_json,injury_history_json,workout_days_target_per_week,workout_location,equipment_json,past_diet_failures_text,sleep_hours_baseline,stress_level_baseline
P9002,UHASH_9002,2026-01-01T00:00:00Z,33,M,181,88.0,muscle_gain,strength_performance,high_protein,"[""lactose""]","[""prediabetes""]","[""shoulder impingement history""]",4,home,"[""dumbbells"", ""resistance_band""]","travel schedule",6.8,4
CSV);

    File::put($dir.'/planner_plan_runs_template.csv', <<<'CSV'
plan_run_id,profile_id,generated_at_utc,horizon_days,provider,model,prompt_version,plan_version,calorie_target,protein_target_g,carbs_target_g,fat_target_g,workout_split,plan_json_path,grocery_list_json_path,safety_flags_json
R9101,P9002,2026-02-01T00:05:00Z,14,openai,gpt-4.1-mini,v3,1,2600,180,260,80,upper_lower_core,storage/app/ai/plans/R9101.json,storage/app/ai/plans/R9101_grocery.json,"{""allergy_safe"": true}"
R9102,P9002,2026-02-20T00:05:00Z,21,anthropic,claude-3.5-haiku,v1,2,2550,175,240,78,full_body_3x,storage/app/ai/plans/R9102.json,storage/app/ai/plans/R9102_grocery.json,"{""allergy_safe"": true}"
CSV);

    File::put($dir.'/planner_outcomes_template.csv', <<<'CSV'
outcome_id,plan_run_id,checkpoint_day,checkpoint_date_utc,weight_kg,waist_cm,adherence_workout_pct,adherence_diet_pct,avg_daily_steps,avg_sleep_hours,injury_flareup_flag,medical_issue_flag,strength_metric_name,strength_metric_value,user_feedback_score_1_to_5,user_feedback_text
O9101,R9101,14,2026-02-14T00:00:00Z,88.6,92.0,74,78,9200,6.9,0,0,bench_press_5rm_kg,56,4,Strong first cycle.
O9102,R9102,21,2026-03-12T00:00:00Z,89.4,92.5,77,81,9800,7.1,0,0,bench_press_5rm_kg,60,5,Steady progress.
CSV);

    $this->artisan('ai:import-planner-profile-users', [
        'input-dir' => $dir,
        '--shared-password' => 'PlannerDemo!2026',
    ])->assertExitCode(0);

    $this->artisan('ai:import-planner-profile-users', [
        'input-dir' => $dir,
        '--shared-password' => 'PlannerDemo!2026',
    ])->assertExitCode(0);

    $user = User::query()->where('email', 'planner+p9002@hayetak.local')->firstOrFail();

    $requests = AiRequest::query()
        ->where('user_id', $user->id)
        ->where('type', 'plan_generator')
        ->orderBy('created_at')
        ->get();

    expect($requests)->toHaveCount(2)
        ->and($requests->pluck('created_at')->map(fn ($value) => $value?->setTimezone('UTC')->format('Y-m-d H:i:s'))->all())
            ->toBe(['2026-02-01 00:05:00', '2026-02-20 00:05:00'])
        ->and($requests->pluck('usage_json')->map(fn ($usage) => $usage['imported_plan_run_id'] ?? null)->all())
            ->toBe(['R9101', 'R9102'])
        ->and(Measurement::query()->where('user_id', $user->id)->count())
            ->toBe(3);

    File::ensureDirectoryExists(base_path('tmp'));
    $jsonlPath = 'tmp/test_imported_planner_predictor_export.jsonl';
    $csvPath = 'tmp/test_imported_planner_predictor_export.csv';
    File::delete(base_path($jsonlPath));
    File::delete(base_path($csvPath));

    $this->artisan('ai:export-progress-prediction-data', [
        '--out-jsonl' => $jsonlPath,
        '--out-csv' => $csvPath,
        '--user-id' => $user->id,
        '--include-unlabeled' => 0,
        '--exclude-synthetic' => 1,
    ])->assertExitCode(0);

    $rows = collect(file(base_path($jsonlPath), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
        ->map(static fn (string $line): array => json_decode($line, true, 512, JSON_THROW_ON_ERROR));

    expect($rows)->toHaveCount(2)
        ->and($rows->every(fn (array $row): bool => (int) ($row['has_weight_label'] ?? 0) === 1))
            ->toBeTrue()
        ->and($rows->every(fn (array $row): bool => (int) ($row['is_synthetic_weight_label'] ?? 1) === 0))
            ->toBeTrue();
});
