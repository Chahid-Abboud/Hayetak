<?php

use App\Models\Measurement;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\UserPref;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('imports planner profile dataset users idempotently', function () {
    $dir = base_path('tmp/test_planner_profile_import');
    File::ensureDirectoryExists($dir);

    File::put($dir.'/planner_profiles_template.csv', <<<CSV
profile_id,user_id_hash,created_at_utc,age,sex,height_cm,start_weight_kg,goal_primary,goal_secondary,diet_type,allergies_json,medical_history_json,injury_history_json,workout_days_target_per_week,workout_location,equipment_json,past_diet_failures_text,sleep_hours_baseline,stress_level_baseline
P9001,UHASH_9001,2026-01-01T00:00:00Z,29,F,167,68.5,fat_loss,recomposition,mediterranean,"[""sesame""]","[""prediabetes""]","[""knee pain history""]",4,gym,"[""dumbbells"", ""bench""]","late-night snacking; overly strict restriction",6.5,5
CSV);

    File::put($dir.'/planner_plan_runs_template.csv', <<<CSV
plan_run_id,profile_id,generated_at_utc,horizon_days,provider,model,prompt_version,plan_version,calorie_target,protein_target_g,carbs_target_g,fat_target_g,workout_split,plan_json_path,grocery_list_json_path,safety_flags_json
R9001,P9001,2026-02-01T00:05:00Z,14,ollama,llama3.1:8b,v2,1,1800,130,160,55,upper_lower_plus_cardio,storage/app/ai/plans/R9001.json,storage/app/ai/plans/R9001_grocery.json,"{""allergy_safe"": true}"
CSV);

    File::put($dir.'/planner_outcomes_template.csv', <<<CSV
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
