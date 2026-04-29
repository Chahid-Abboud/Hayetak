<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\Ai\Audit\PlannerAuditRun;
use App\Models\NutritionPlan;
use App\Models\WorkoutPlan;
use App\Services\Ai\Audit\PlannerAuditExecutionMode;
use App\Services\Ai\Audit\PlannerAuditGpuLoad;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlannerPageController extends Controller
{
    public function __construct(
        private readonly PlannerService $planner,
        private readonly UserFacingAiPayloadSanitizer $sanitizer,
    ) {}

    public function show(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = (string) ($user->role ?? '') === 'admin';
        $user->loadMissing(['prefs', 'medicalHistories']);

        $nutritionPlanQuery = NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id');

        if ($isAdmin) {
            $nutritionPlanQuery->with([
                'aiRequest:id,provider,model,prompt_version,schema_version',
                'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
            ]);
        } else {
            $nutritionPlanQuery->with([
                'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
            ]);
        }
        $nutritionPlan = $nutritionPlanQuery->first();

        $workoutPlanQuery = WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id');

        if ($isAdmin) {
            $workoutPlanQuery->with([
                'aiRequest:id,provider,model,prompt_version,schema_version',
                'days.exercises:id,name,primary_muscle,equipment,difficulty',
            ]);
        } else {
            $workoutPlanQuery->with([
                'days.exercises:id,name,primary_muscle,equipment,difficulty',
            ]);
        }
        $workoutPlan = $workoutPlanQuery->first();

        $generation = $this->planner->latestPair($user);
        if (is_array($generation)) {
            $generation = $this->sanitizer->sanitizePlannerResponse($generation, false);
        }

        if (! $isAdmin && is_array($generation)) {
            $generation = [
                'ok' => (bool) ($generation['ok'] ?? true),
                'generation_id' => $generation['generation_id'] ?? null,
                'version' => $generation['version'] ?? null,
                'plan' => is_array($generation['plan'] ?? null) ? $generation['plan'] : null,
            ];
        }

        $defaults = [
            'plan_horizon_days' => $this->normalizePlanHorizonDays((int) config('ai.planner.default_horizon_days', 14)),
        ];

        $latestAuditRun = null;
        if ($isAdmin) {
            $latestAuditRun = PlannerAuditRun::query()
                ->where('requested_by', $user->id)
                ->latest('id')
                ->first();
        }

        return Inertia::render('ai/planner', [
            'generation' => $generation,
            'nutritionPlan' => $nutritionPlan
                ? $this->sanitizer->sanitizePlanResource($nutritionPlan->toArray(), $isAdmin)
                : null,
            'workoutPlan' => $workoutPlan
                ? $this->sanitizer->sanitizePlanResource($workoutPlan->toArray(), $isAdmin)
                : null,
            'profileConstraints' => $this->profileConstraints($user),
            'defaults' => $defaults,
            'isAdmin' => $isAdmin,
            'latestAuditRun' => $latestAuditRun ? $this->presentAuditRun($latestAuditRun) : null,
        ]);
    }

    private function normalizePlanHorizonDays(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    private function profileConstraints($user): array
    {
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];
        $tableMedical = $user->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'medical_condition')
            ->pluck('value')
            ->filter()
            ->values()
            ->all();
        $tableInjuries = $user->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'injury')
            ->pluck('value')
            ->filter()
            ->values()
            ->all();

        $medicalFromText = trim((string) ($user->medical_history ?? ''));
        $medicalHistoryParts = $medicalFromText !== ''
            ? preg_split('/[\r\n,;]+/', $medicalFromText) ?: []
            : [];

        return [
            'dietary_goal' => $this->cleanString($user->dietary_goal),
            'fitness_goal' => $this->cleanString($user->fitness_goal),
            'diet_type' => $this->cleanString($user->diet_name),
            'allergies' => $this->normalizeList($user->allergies),
            'medical_conditions' => $this->uniqueStrings(array_merge(
                $this->normalizeList($medicalHistoryParts),
                $this->normalizeList($tableMedical),
            )),
            'injury_history' => $this->uniqueStrings(array_merge(
                $this->normalizeList($settings['injury_history'] ?? []),
                $this->normalizeList($tableInjuries),
            )),
            'available_equipment' => $this->normalizeList($settings['available_equipment'] ?? []),
            'preferred_workout_days' => $this->normalizeWorkoutDays($settings['preferred_workout_days'] ?? []),
            'workout_days_per_week' => $user->workout_days_per_week !== null ? (int) $user->workout_days_per_week : null,
            'workout_location' => $this->cleanString($user->workout_location),
        ];
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $clean = $this->cleanString($item);
            if ($clean !== null) {
                $items[] = $clean;
            }
        }

        return $this->uniqueStrings($items);
    }

    private function normalizeWorkoutDays(mixed $value): array
    {
        $allowed = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $normalized = [];

        foreach ($this->normalizeList($value) as $day) {
            $key = Str::lower($day);
            if (in_array($key, $allowed, true)) {
                $normalized[] = $key;
            }
        }

        return $this->uniqueStrings($normalized);
    }

    private function cleanString(mixed $value): ?string
    {
        $clean = trim((string) $value);

        return $clean !== '' ? $clean : null;
    }

    private function uniqueStrings(array $values): array
    {
        return array_values(array_unique(array_filter($values, static fn ($value): bool => trim((string) $value) !== '')));
    }

    private function presentAuditRun(PlannerAuditRun $run): array
    {
        $completedRuns = (int) $run->completed_runs;
        $totalRuns = max(1, (int) $run->total_runs);

        return [
            'id' => (int) $run->id,
            'status' => (string) $run->status,
            'gpu_load' => PlannerAuditGpuLoad::normalize((string) $run->gpu_load),
            'execution_mode' => PlannerAuditExecutionMode::normalize((string) data_get($run->summary_json ?? [], 'execution_mode')),
            'horizon_days' => array_values($run->horizon_days ?? []),
            'total_users' => (int) $run->total_users,
            'total_runs' => (int) $run->total_runs,
            'completed_runs' => $completedRuns,
            'success_runs' => (int) $run->success_runs,
            'failed_runs' => (int) $run->failed_runs,
            'percent_complete' => round(($completedRuns / $totalRuns) * 100, 2),
            'current_user_id' => $run->current_user_id !== null ? (int) $run->current_user_id : null,
            'current_user_email' => $run->current_user_email,
            'current_horizon_days' => $run->current_horizon_days !== null ? (int) $run->current_horizon_days : null,
            'average_run_ms' => $run->average_run_ms !== null ? (int) $run->average_run_ms : null,
            'eta_seconds' => $run->eta_seconds !== null ? (int) $run->eta_seconds : null,
            'eta_updated_at' => $run->eta_updated_at?->toIso8601String(),
            'next_eta_update_at' => $run->eta_updated_at?->copy()->addMinutes(5)->toIso8601String(),
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'report_paths' => $run->report_paths ?? [],
            'summary' => $run->summary_json ?? [],
            'last_error' => $run->last_error,
        ];
    }
}
