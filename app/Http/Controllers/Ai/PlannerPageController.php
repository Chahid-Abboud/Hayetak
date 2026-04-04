<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\NutritionPlan;
use App\Models\WorkoutPlan;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlannerPageController extends Controller
{
    public function __construct(
        private readonly PlannerService $planner,
        private readonly FeatureConfigResolver $features,
    ) {}

    public function show(Request $request): Response
    {
        $user = $request->user();
        $user->loadMissing(['prefs', 'medicalHistories']);

        $nutritionPlan = NutritionPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id')
            ->with([
                'aiRequest:id,provider,model,prompt_version,schema_version',
                'days.meals.items.food:id,name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g',
            ])
            ->first();

        $workoutPlan = WorkoutPlan::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id')
            ->with([
                'aiRequest:id,provider,model,prompt_version,schema_version',
                'days.exercises:id,name,primary_muscle,equipment,difficulty',
            ])
            ->first();

        $generation = $this->planner->latestPair($user);
        $provider = $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER);
        $defaultModel = $provider === 'ollama'
            ? $this->features->ollamaChat(FeatureConfigResolver::FEATURE_PLANNER)['model']
            : $this->features->openAi(FeatureConfigResolver::FEATURE_PLANNER)['model'];

        return Inertia::render('ai/planner', [
            'generation' => $generation,
            'nutritionPlan' => $nutritionPlan ? $nutritionPlan->toArray() : null,
            'workoutPlan' => $workoutPlan ? $workoutPlan->toArray() : null,
            'profileConstraints' => $this->profileConstraints($user),
            'defaults' => [
                'provider' => $provider,
                'model' => $defaultModel,
                'plan_horizon_days' => $this->normalizePlanHorizonDays((int) config('ai.planner.default_horizon_days', 14)),
                'prompt_version' => $this->features->promptVersion(FeatureConfigResolver::FEATURE_PLANNER),
                'schema_version' => $this->features->schemaVersion(FeatureConfigResolver::FEATURE_PLANNER),
            ],
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
}
