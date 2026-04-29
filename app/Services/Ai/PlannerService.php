<?php

namespace App\Services\Ai;

use App\Models\Ai\AiPlan;
use App\Models\Ai\AiRequest;
use App\Models\User;
use App\Services\Ai\Context\PlannerContextBuilder;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\FoodCatalog\PlannerFoodModel;
use App\Services\Ai\Models\ProgressPredictionModel;
use App\Services\Ai\Persistence\PlannerPersistenceService;
use App\Services\Ai\Planner\PlannerProfileSyncService;
use App\Services\Ai\Prompts\PlannerPrompt;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use App\Services\Ai\Runtime\GenerativeAiGateway;
use App\Services\Ai\Schemas\PlannerSchema;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;
use App\Services\Ai\Validation\PlannerOutputValidator;
use App\Services\Ai\Validation\PlannerValidationException;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class PlannerService
{
    public function __construct(
        private readonly GenerativeAiGateway $runtime,
        private readonly FeatureConfigResolver $features,
        private readonly PlannerProfileSyncService $profiles,
        private readonly PlannerContextBuilder $contextBuilder,
        private readonly PlannerPrompt $prompt,
        private readonly PlannerOutputValidator $validator,
        private readonly PlannerPersistenceService $persistence,
        private readonly AiUsageLogger $usageLogger,
        private readonly PlannerLocalFallbackService $localFallback,
        private readonly PlannerFoodModel $plannerFoodModel,
        private readonly SeedUserProfileTargetsService $seedTargets,
        private readonly ProgressPredictionModel $progressPrediction,
        private readonly PlannerRunQualityScorer $qualityScorer,
    ) {}

    public function generate(User $user, array $options = []): array
    {
        $regenerate = (bool) ($options['regenerate'] ?? true);
        $createdBy = (int) ($options['created_by'] ?? $user->id);
        $reason = trim((string) ($options['reason'] ?? ($regenerate ? 'manual_generation' : 'reuse_latest')));
        $generateDiet = (bool) ($options['generate_diet'] ?? true);
        $generateWorkout = (bool) ($options['generate_workout'] ?? true);
        $profileOverrides = is_array($options['profile_overrides'] ?? null) ? $options['profile_overrides'] : [];
        $persistProfileOverrides = (bool) ($options['persist_profile_overrides'] ?? false);
        $planHorizonDays = $this->normalizePlanHorizonDays(
            (int) ($options['plan_horizon_days'] ?? config('ai.planner.default_horizon_days', 14))
        );

        if (! $generateDiet && ! $generateWorkout) {
            throw new PlannerValidationException('Select at least one plan type to generate.');
        }

        $existingComposite = (! $generateDiet || ! $generateWorkout)
            ? $this->latestPair($user)
            : null;

        if (! $regenerate && $profileOverrides === []) {
            $existing = $this->latestPair($user);
            if ($existing !== null) {
                return $existing;
            }
        }

        $profile = $this->profiles->prepare($user, $profileOverrides, $persistProfileOverrides);
        $context = $this->contextBuilder->build($user, $profile, $planHorizonDays);
        $context['generation_scope'] = [
            'diet' => $generateDiet,
            'workout' => $generateWorkout,
        ];
        $aiRequest = $this->startAiRequest($user, $context);

        try {
            $modelMessages = [
                [
                    'role' => 'system',
                    'content' => [
                        ['type' => 'input_text', 'text' => $this->prompt->system()],
                    ],
                ],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'input_text', 'text' => $this->prompt->user($context)],
                    ],
                ],
            ];

            try {
                $response = $this->runtime->generateStructured(
                    FeatureConfigResolver::FEATURE_PLANNER,
                    $modelMessages,
                    PlannerSchema::definition()
                );

                $json = $response['json'] ?? null;
                if (! is_array($json)) {
                    throw new RuntimeException('Planner response did not return valid JSON output.');
                }

                $normalized = $this->normalizeCompactOutput($json, $planHorizonDays, $profile, $context, (int) $user->id);
                $validated = $this->validator->validate($user, $normalized, $profile, $planHorizonDays);
            } catch (Throwable $modelError) {
                if (! $this->shouldUseLocalFallback($modelError)) {
                    throw $modelError;
                }

                $fallbackPlan = $this->localFallback->build($user, $profile, $planHorizonDays, $context);
                $normalizedFallback = $this->normalizeCompactOutput($fallbackPlan, $planHorizonDays, $profile, $context, (int) $user->id);
                $validated = $this->validator->validate($user, $normalizedFallback, $profile, $planHorizonDays);
                $response = [
                    'provider' => 'local_fallback',
                    'provider_request_id' => null,
                    'model' => 'hayetak-local-fallback-v1',
                    'usage' => [],
                    'latency_ms' => null,
                    'raw' => [],
                    'fallback' => [
                        'used' => true,
                        'from' => $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER),
                        'to' => 'local_fallback',
                        'error' => $modelError->getMessage(),
                    ],
                ];
            }

            $validated = $this->attachProgressPrediction(
                $user,
                $validated,
                $profile,
                $context,
                $planHorizonDays
            );
            $validated = $this->enforceAdaptivePlanAdjustment($validated);
            $quality = $this->qualityScorer->score($user, $validated, $planHorizonDays, $profile);

            $generationId = (string) Str::uuid();

            $persisted = $this->persistence->persist(
                $user,
                $validated,
                $generationId,
                $aiRequest->id,
                $reason,
                $createdBy,
                [
                    'diet' => $generateDiet,
                    'workout' => $generateWorkout,
                ]
            );

            $activePlan = $this->applyPersistedGenerationScope(
                $validated,
                is_array($existingComposite['plan'] ?? null) ? $existingComposite['plan'] : null,
                $generateDiet,
                $generateWorkout
            );
            $activePlans = [
                'diet' => $generateDiet
                    ? ($persisted['plans']['diet'] ?? data_get($activePlan, 'diet'))
                    : (is_array($existingComposite['plans']['diet'] ?? null) ? $existingComposite['plans']['diet'] : null),
                'workout' => $generateWorkout
                    ? ($persisted['plans']['workout'] ?? data_get($activePlan, 'workout'))
                    : (is_array($existingComposite['plans']['workout'] ?? null) ? $existingComposite['plans']['workout'] : null),
            ];

            $this->finishAiRequest($aiRequest, $activePlan, $response, null);

            $this->usageLogger->log(
                $user,
                'planner',
                $response['usage'] ?? [],
                $response['model'] ?? null,
                $response['latency_ms'] ?? null,
                $response['provider_request_id'] ?? null,
                [
                    'generation_id' => $generationId,
                    'ai_request_id' => $aiRequest->id,
                    'provider' => $response['provider'] ?? $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER),
                    'quality' => $quality,
                ]
            );

            return [
                'ok' => true,
                'ai_request_id' => $aiRequest->id,
                'generation_id' => $persisted['generation_id'],
                'version' => $persisted['version'],
                'plan' => $activePlan,
                'plans' => $activePlans,
                'persisted' => $persisted['persisted'],
                'provider' => $response['provider'] ?? $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER),
                'model' => $response['model'] ?? null,
                'prompt_version' => $this->features->promptVersion(FeatureConfigResolver::FEATURE_PLANNER),
                'schema_version' => $this->features->schemaVersion(FeatureConfigResolver::FEATURE_PLANNER),
                'fallback' => $response['fallback'] ?? null,
                'usage' => [
                    'input_tokens' => (int) ($response['usage']['input_tokens'] ?? 0),
                    'output_tokens' => (int) ($response['usage']['output_tokens'] ?? 0),
                    'total_tokens' => (int) ($response['usage']['total_tokens'] ?? 0),
                ],
                'quality' => $quality,
            ];
        } catch (Throwable $e) {
            $this->finishAiRequest($aiRequest, null, [
                'provider' => $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER),
                'model' => null,
                'usage' => [],
                'raw' => [],
            ], $e);

            throw $e;
        }
    }

    private function shouldUseLocalFallback(Throwable $error): bool
    {
        $localFallbackEnabled = $this->features->localFallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER);
        if (! $localFallbackEnabled) {
            return false;
        }

        if ($this->features->provider(FeatureConfigResolver::FEATURE_PLANNER) !== 'ollama') {
            return false;
        }

        return true;
    }

    private function normalizeCompactOutput(
        array $payload,
        int $planHorizonDays,
        array $profile,
        array $context,
        int $userId
    ): array {
        $normalized = $payload;
        $targetDietDays = $this->normalizePlanHorizonDays($planHorizonDays);
        $targetWorkoutDays = 7;
        $mealCatalog = is_array($context['meal_catalog_hints'] ?? null) ? $context['meal_catalog_hints'] : [];
        $exerciseCatalog = is_array($context['exercise_catalog_hints'] ?? null) ? $context['exercise_catalog_hints'] : [];
        $profileSeed = $this->plannerSeed($userId, $profile, $context);

        $dietDays = is_array(data_get($normalized, 'diet.days')) ? data_get($normalized, 'diet.days') : [];
        if (! is_array(data_get($normalized, 'diet.daily_targets'))) {
            data_set($normalized, 'diet.daily_targets', [
                'calories_kcal' => 1800,
                'protein_g' => 130,
                'carbs_g' => 175,
                'fat_g' => 60,
                'fiber_g' => 28,
                'water_ml' => 2400,
            ]);
        }
        $targets = $this->normalizeDailyTargets(
            is_array(data_get($normalized, 'diet.daily_targets')) ? data_get($normalized, 'diet.daily_targets') : [],
            $profile,
            $userId
        );
        data_set($normalized, 'diet.daily_targets', $targets);

        $mealOptions = $this->extractMealOptions(data_get($normalized, 'diet.meal_options'));
        $hasExplicitMealOptions = $mealOptions !== [];
        if (! $hasExplicitMealOptions) {
            $mealOptions = $this->deriveMealOptionsFromDietDays($dietDays);
        }
        $normalizedMealOptions = $this->normalizeMealOptions(
            $mealOptions,
            $targets,
            $mealCatalog,
            $profile,
            $profileSeed,
            ! $hasExplicitMealOptions
        );
        $normalizedDietDays = $this->buildDietDaysFromMealOptions($normalizedMealOptions, $targetDietDays, $profileSeed);

        data_set($normalized, 'diet.meal_options', $normalizedMealOptions);
        data_set($normalized, 'diet.days', $normalizedDietDays);
        data_set($normalized, 'diet.grocery_list', $this->buildGroceryListFromDietDays($normalizedDietDays));

        $weekly = is_array(data_get($normalized, 'workout.weekly_schedule')) ? data_get($normalized, 'workout.weekly_schedule') : [];
        if ($weekly === []) {
            $weekly = $this->defaultWorkoutTemplates($exerciseCatalog, $profile);
        }

        $weekly = array_values($weekly);
        $labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $expandedWeekly = [];
        for ($i = 1; $i <= $targetWorkoutDays; $i++) {
            $template = $weekly[($i - 1) % count($weekly)];
            if (! is_array($template)) {
                continue;
            }

            $template['day_index'] = $i;
            $template['day_label'] = $labels[$i - 1];
            $template['session_type'] = trim((string) ($template['session_type'] ?? 'train'));
            $template['focus'] = trim((string) ($template['focus'] ?? 'General training'));
            $template['location'] = $this->normalizeWorkoutLocation($template['location'] ?? null, $profile);
            $template['duration_min'] = max(0, (int) ($template['duration_min'] ?? 30));
            $template['warmup'] = is_array($template['warmup'] ?? null) ? array_values($template['warmup']) : [];
            $template['exercises'] = $this->normalizeExercises(
                is_array($template['exercises'] ?? null) ? array_values($template['exercises']) : [],
                $exerciseCatalog,
                $template['location'],
                (($i - 1) * 4) + $profileSeed,
                [],
                $this->normalizeList($profile['available_equipment'] ?? []),
                $profile
            );
            $template['cooldown'] = is_array($template['cooldown'] ?? null) ? array_values($template['cooldown']) : [];
            $template['safety_notes'] = is_array($template['safety_notes'] ?? null) ? array_values($template['safety_notes']) : [];
            $expandedWeekly[] = $template;
        }
        $normalizedWeekly = $this->applyWorkoutScheduleConstraints($expandedWeekly, $profile, $exerciseCatalog, $profileSeed);
        data_set($normalized, 'workout.weekly_schedule', $this->enforceWorkoutVariety($normalizedWeekly, $exerciseCatalog, $profile, $profileSeed));

        foreach (['diet.grocery_list', 'diet.meal_prep_notes', 'diet.adherence_notes', 'workout.progression_rules', 'workout.recovery_rules', 'workout.coach_notes', 'safety.food_avoidances', 'safety.exercise_cautions', 'overview.key_constraints', 'overview.assumptions', 'adaptive_review.checkpoints', 'adaptive_review.replanning_triggers', 'adaptive_review.next_data_to_collect', 'ml_readiness.candidate_features', 'ml_readiness.candidate_targets'] as $key) {
            if (! is_array(data_get($normalized, $key))) {
                data_set($normalized, $key, []);
            }
        }

        if ((array) data_get($normalized, 'diet.meal_prep_notes', []) === []) {
            data_set($normalized, 'diet.meal_prep_notes', [
                'Cook core proteins and carbs in bulk twice per week and store in labeled portions.',
                'Pre-portion snacks into grab-and-go containers to reduce random eating.',
                'Wash and cut vegetables in advance so meals stay under 20 minutes on busy days.',
            ]);
        }

        if ((array) data_get($normalized, 'diet.adherence_notes', []) === []) {
            data_set($normalized, 'diet.adherence_notes', [
                'Follow the plan with 80-90% consistency and track misses without guilt.',
                'When a planned meal is unavailable, use listed alternatives instead of skipping meals.',
                'Review body weight, energy, and workout completion at the end of the plan window.',
            ]);
        }

        $reviewAfter = (int) data_get($normalized, 'adaptive_review.review_after_days', 0);
        if (! in_array($reviewAfter, [14, 21, 28], true)) {
            data_set($normalized, 'adaptive_review.review_after_days', $targetDietDays);
        }

        if (! is_string(data_get($normalized, 'ml_readiness.notes'))) {
            data_set($normalized, 'ml_readiness.notes', 'Compact planner mode output.');
        }

        if (! is_string(data_get($normalized, 'overview.summary'))) {
            data_set($normalized, 'overview.summary', 'Structured plan generated from your saved profile, goals, and safety constraints.');
        }

        if (! is_array(data_get($normalized, 'safety.hard_rules_observed'))) {
            data_set($normalized, 'safety.hard_rules_observed', ['Allergy and injury constraints were considered.']);
        }
        data_set($normalized, 'overview.key_constraints', $this->mergeConstraintNotes(
            is_array(data_get($normalized, 'overview.key_constraints')) ? data_get($normalized, 'overview.key_constraints') : [],
            $profile
        ));

        return $normalized;
    }

    private function normalizeDailyTargets(array $targets, array $profile, int $userId): array
    {
        $estimated = $this->estimatedTargetsFromProfile($profile, $userId);

        $estimatedCalories = (int) ($estimated['daily_goal_calories'] ?? 1800);
        $estimatedProtein = (int) round((float) ($estimated['daily_goal_protein_g'] ?? 130));
        $estimatedCarbs = (int) round((float) ($estimated['daily_goal_carbs_g'] ?? 175));
        $estimatedFat = (int) round((float) ($estimated['daily_goal_fat_g'] ?? 60));
        $intakeFloor = (int) ($estimated['daily_intake_floor_kcal'] ?? max(1200, $estimatedCalories - 350));
        $intakeCeiling = (int) ($estimated['daily_intake_ceiling_kcal'] ?? ($estimatedCalories + 350));
        $weightKg = max(45.0, min(180.0, (float) ($profile['weight_kg'] ?? 70.0)));

        $calories = (int) ($targets['calories_kcal'] ?? 0);
        if (
            $calories <= 0
            || $calories < ($intakeFloor - 125)
            || $calories > ($intakeCeiling + 125)
            || abs($calories - $estimatedCalories) > 425
        ) {
            $calories = $estimatedCalories;
        } else {
            $calories = max($intakeFloor, min($intakeCeiling, $calories));
        }

        $protein = (int) ($targets['protein_g'] ?? 0);
        if ($protein <= 0 || $protein < (int) floor($estimatedProtein * 0.72) || $protein > (int) ceil($estimatedProtein * 1.4)) {
            $protein = $estimatedProtein;
        }

        $fat = (int) ($targets['fat_g'] ?? 0);
        if ($fat <= 0 || $fat < (int) floor($estimatedFat * 0.68) || $fat > (int) ceil($estimatedFat * 1.4)) {
            $fat = $estimatedFat;
        }

        $carbs = (int) ($targets['carbs_g'] ?? 0);
        $macroCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
        if (
            $carbs <= 0
            || $macroCalories < (int) round($calories * 0.82)
            || $macroCalories > (int) round($calories * 1.18)
        ) {
            $carbs = max(90, (int) round(($calories - ($protein * 4) - ($fat * 9)) / 4));
        }

        $fiber = (int) ($targets['fiber_g'] ?? 0);
        if ($fiber <= 0) {
            $fiber = max(25, min(40, (int) round($calories / 75)));
        }

        $water = (int) ($targets['water_ml'] ?? 0);
        if ($water <= 0) {
            $water = max(2100, min(4200, (int) round($weightKg * 35)));
        }

        return [
            'calories_kcal' => $calories,
            'protein_g' => max(90, $protein),
            'carbs_g' => max(90, $carbs),
            'fat_g' => max(40, $fat),
            'fiber_g' => max(20, $fiber),
            'water_ml' => max(1800, $water),
        ];
    }

    private function estimatedTargetsFromProfile(array $profile, int $userId): array
    {
        $syntheticUser = new User([
            'role' => User::ROLE_CLIENT,
            'gender' => $profile['gender'] ?? null,
            'age' => $profile['age'] ?? null,
            'height_cm' => $profile['height_cm'] ?? null,
            'weight_kg' => $profile['weight_kg'] ?? null,
            'dietary_goal' => $profile['dietary_goal'] ?? null,
            'fitness_goal' => $profile['fitness_goal'] ?? null,
            'activity_level' => $profile['activity_level'] ?? null,
            'workout_days_per_week' => $profile['workout_days_per_week'] ?? null,
            'workout_location' => $profile['workout_location'] ?? null,
        ]);
        $syntheticUser->id = $userId;

        $issues = array_merge(
            array_map(
                static fn (string $value): array => ['kind' => 'medical_condition', 'label' => $value],
                $this->normalizeList($profile['medical_conditions'] ?? [])
            ),
            array_map(
                static fn (string $value): array => ['kind' => 'injury', 'label' => $value],
                $this->normalizeList($profile['injury_history'] ?? [])
            )
        );

        return $this->seedTargets->build($syntheticUser, $issues);
    }

    private function defaultDietTemplate(array $targets, array $mealCatalog): array
    {
        $calories = max(1200, (int) ($targets['calories_kcal'] ?? 1800));
        $protein = max(80, (int) ($targets['protein_g'] ?? 130));
        $carbs = max(90, (int) ($targets['carbs_g'] ?? 175));
        $fat = max(40, (int) ($targets['fat_g'] ?? 60));
        $mealRatios = [
            'breakfast' => 0.30,
            'lunch' => 0.35,
            'dinner' => 0.35,
        ];
        $breakfast = $this->catalogFoodForMeal('breakfast', $mealCatalog);
        $lunch = $this->catalogFoodForMeal('lunch', $mealCatalog);
        $dinner = $this->catalogFoodForMeal('dinner', $mealCatalog);

        return [
            'day_index' => 1,
            'theme' => 'Profile-safe fallback day',
            'meals' => [
                [
                    'meal_code' => 'breakfast',
                    'title' => 'Structured breakfast',
                    'target_kcal' => (int) round($calories * $mealRatios['breakfast']),
                    'items' => [
                        [
                            'name' => $breakfast['name'] ?? 'Protein oatmeal bowl',
                            'portion' => '1 serving',
                            'calories_kcal' => (int) round($calories * $mealRatios['breakfast']),
                            'protein_g' => (int) round($protein * $mealRatios['breakfast']),
                            'carbs_g' => (int) round($carbs * $mealRatios['breakfast']),
                            'fat_g' => (int) round($fat * $mealRatios['breakfast']),
                        ],
                    ],
                ],
                [
                    'meal_code' => 'lunch',
                    'title' => 'Structured lunch',
                    'target_kcal' => (int) round($calories * $mealRatios['lunch']),
                    'items' => [
                        [
                            'name' => $lunch['name'] ?? 'Grilled chicken rice plate',
                            'portion' => '1 serving',
                            'calories_kcal' => (int) round($calories * $mealRatios['lunch']),
                            'protein_g' => (int) round($protein * $mealRatios['lunch']),
                            'carbs_g' => (int) round($carbs * $mealRatios['lunch']),
                            'fat_g' => (int) round($fat * $mealRatios['lunch']),
                        ],
                    ],
                ],
                [
                    'meal_code' => 'dinner',
                    'title' => 'Structured dinner',
                    'target_kcal' => (int) round($calories * $mealRatios['dinner']),
                    'items' => [
                        [
                            'name' => $dinner['name'] ?? 'Oven baked fish with vegetables',
                            'portion' => '1 serving',
                            'calories_kcal' => (int) round($calories * $mealRatios['dinner']),
                            'protein_g' => (int) round($protein * $mealRatios['dinner']),
                            'carbs_g' => (int) round($carbs * $mealRatios['dinner']),
                            'fat_g' => (int) round($fat * $mealRatios['dinner']),
                        ],
                    ],
                ],
            ],
            'coaching_notes' => [],
        ];
    }

    private function extractMealOptions(mixed $value): array
    {
        $groups = [
            'breakfast' => [],
            'lunch' => [],
            'dinner' => [],
            'snack' => [],
        ];

        if (! is_array($value)) {
            return [];
        }

        if (array_is_list($value)) {
            foreach ($value as $group) {
                if (! is_array($group)) {
                    continue;
                }

                $mealCode = $this->normalizeMealCode((string) ($group['meal_code'] ?? ''));
                if (! array_key_exists($mealCode, $groups)) {
                    continue;
                }

                $options = is_array($group['options'] ?? null)
                    ? array_values($group['options'])
                    : (is_array($group['meals'] ?? null) ? array_values($group['meals']) : []);

                foreach ($options as $option) {
                    if (is_array($option)) {
                        $groups[$mealCode][] = $option;
                    }
                }
            }
        } else {
            foreach (array_keys($groups) as $mealCode) {
                $options = $value[$mealCode] ?? null;
                if (! is_array($options)) {
                    continue;
                }

                foreach (array_values($options) as $option) {
                    if (is_array($option)) {
                        $groups[$mealCode][] = $option;
                    }
                }
            }
        }

        return array_filter($groups, static fn (array $options): bool => $options !== []);
    }

    private function deriveMealOptionsFromDietDays(array $dietDays): array
    {
        $grouped = [
            'breakfast' => [],
            'lunch' => [],
            'dinner' => [],
            'snack' => [],
        ];
        $seen = [
            'breakfast' => [],
            'lunch' => [],
            'dinner' => [],
            'snack' => [],
        ];

        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? ''));
                if (! array_key_exists($mealCode, $grouped)) {
                    continue;
                }

                $signature = $this->mealSignature($meal);
                if ($signature === '' || in_array($signature, $seen[$mealCode], true)) {
                    continue;
                }

                $copy = is_array($meal) ? $meal : [];
                unset($copy['meal_code']);

                $grouped[$mealCode][] = $copy;
                $seen[$mealCode][] = $signature;
            }
        }

        return array_filter($grouped, static fn (array $options): bool => $options !== []);
    }

    private function normalizeMealOptions(
        array $rawMealOptions,
        array $targets,
        array $mealCatalog,
        array $profile,
        int $seed = 0,
        bool $enforceExactCalorieAlignment = true
    ): array {
        $mealCodes = ['breakfast', 'lunch', 'dinner', 'snack'];
        $normalized = [];

        foreach ($mealCodes as $mealCode) {
            $rawOptions = is_array($rawMealOptions[$mealCode] ?? null)
                ? array_values($rawMealOptions[$mealCode])
                : [];

            $optionMeals = [];
            foreach ($rawOptions as $option) {
                if (! is_array($option)) {
                    continue;
                }

                $optionMeals[] = [
                    'meal_code' => $mealCode,
                    'title' => trim((string) ($option['title'] ?? ucfirst($mealCode).' option')) ?: ucfirst($mealCode).' option',
                    'target_kcal' => $option['target_kcal'] ?? null,
                    'items' => is_array($option['items'] ?? null) ? array_values($option['items']) : [],
                ];
            }

            $normalizedMeals = $this->normalizeMeals(
                $optionMeals,
                $targets,
                $mealCatalog,
                $profile,
                $seed + $this->mealCodeSeedOffset($mealCode),
                [$mealCode],
                $enforceExactCalorieAlignment
            );
            $normalizedMeals = $this->ensureMealOptionCount(
                $normalizedMeals,
                $mealCode,
                $targets,
                $mealCatalog,
                $profile,
                $seed + $this->mealCodeSeedOffset($mealCode),
                $enforceExactCalorieAlignment
            );

            $normalized[$mealCode] = array_map(function (array $meal): array {
                unset($meal['meal_code']);

                return $meal;
            }, $normalizedMeals);
        }

        return $normalized;
    }

    private function ensureMealOptionCount(
        array $meals,
        string $mealCode,
        array $targets,
        array $mealCatalog,
        array $profile,
        int $seed = 0,
        bool $enforceExactCalorieAlignment = true
    ): array {
        $meals = $this->dedupeMealsBySignature($meals);
        $catalogNames = array_values(array_unique(array_filter(array_merge(
            array_map(fn (array $meal): string => $this->mealPrimaryName($meal), $meals),
            $this->catalogMealNames($mealCatalog, $mealCode, $profile)
        ))));
        $libraryNames = array_values(array_unique(array_filter($this->mealNameLibrary($mealCode, $profile))));
        $usedNames = array_values(array_unique(array_filter(array_map(
            fn (array $meal): string => strtolower($this->mealPrimaryName($meal)),
            $meals
        ))));
        $existingSignatures = array_values(array_map(
            fn (array $meal): string => $this->mealSignature($meal),
            $meals
        ));

        $attempt = 0;
        while (count($meals) < 3 && $attempt < 28) {
            $candidateName = $this->pickUnusedRotatingValue($catalogNames, $usedNames, $seed + $attempt);
            if (! is_string($candidateName) || trim($candidateName) === '') {
                $candidateName = $this->pickUnusedRotatingValue($libraryNames, $usedNames, $seed + $attempt);
            }
            if (! is_string($candidateName) || trim($candidateName) === '') {
                $candidateName = $this->pickRotatingValue($libraryNames, $seed + $attempt)
                    ?? ucfirst($mealCode).' option';
            }

            $extraMeals = $this->normalizeMeals(
                [$this->mealOptionSeedMeal($mealCode, $candidateName, $targets)],
                $targets,
                $mealCatalog,
                $profile,
                $seed + $attempt + 1,
                [$mealCode],
                $enforceExactCalorieAlignment
            );
            $extraMeal = $extraMeals[0] ?? null;
            if (! is_array($extraMeal)) {
                $attempt++;

                continue;
            }

            $signature = $this->mealSignature($extraMeal);
            if ($signature === '' || in_array($signature, $existingSignatures, true)) {
                $usedNames[] = strtolower(trim($candidateName));
                $attempt++;

                continue;
            }

            $meals[] = $extraMeal;
            $existingSignatures[] = $signature;
            $usedNames[] = strtolower($this->mealPrimaryName($extraMeal));
            $attempt++;
        }

        return array_slice($this->dedupeMealsBySignature($meals), 0, 7);
    }

    private function mealOptionSeedMeal(string $mealCode, string $name, array $targets): array
    {
        $ratios = [
            'breakfast' => 0.30,
            'lunch' => 0.35,
            'dinner' => 0.30,
            'snack' => 0.08,
        ];
        $dailyCalories = max(1200, (int) ($targets['calories_kcal'] ?? 1800));

        return [
            'meal_code' => $mealCode,
            'title' => $name,
            'target_kcal' => (int) round($dailyCalories * ($ratios[$mealCode] ?? 0.25)),
            'items' => [[
                'name' => $name,
            ]],
        ];
    }

    private function buildDietDaysFromMealOptions(array $mealOptions, int $targetDietDays, int $seed = 0): array
    {
        $mealCodes = ['breakfast', 'lunch', 'dinner', 'snack'];
        $days = [];

        for ($dayIndex = 1; $dayIndex <= $targetDietDays; $dayIndex++) {
            $meals = [];

            foreach ($mealCodes as $mealCode) {
                $options = is_array($mealOptions[$mealCode] ?? null)
                    ? array_values($mealOptions[$mealCode])
                    : [];
                if ($options === []) {
                    continue;
                }

                $count = count($options);
                $baseOffset = ($seed + $this->mealCodeSeedOffset($mealCode)) % $count;
                $optionIndex = ($baseOffset + $dayIndex - 1) % $count;
                $option = $options[$optionIndex] ?? null;
                if (! is_array($option)) {
                    continue;
                }

                $meals[] = [
                    'meal_code' => $mealCode,
                    'title' => trim((string) ($option['title'] ?? ucfirst($mealCode).' option')) ?: ucfirst($mealCode).' option',
                    'target_kcal' => (int) ($option['target_kcal'] ?? 0),
                    'items' => is_array($option['items'] ?? null) ? array_values($option['items']) : [],
                ];
            }

            $days[] = [
                'day_index' => $dayIndex,
                'theme' => 'Rotating meal options day '.$dayIndex,
                'meals' => $meals,
                'coaching_notes' => [],
            ];
        }

        return $days;
    }

    private function dedupeMealsBySignature(array $meals): array
    {
        $deduped = [];
        $seen = [];

        foreach ($meals as $meal) {
            if (! is_array($meal)) {
                continue;
            }

            $signature = $this->mealSignature($meal);
            if ($signature === '' || in_array($signature, $seen, true)) {
                continue;
            }

            $deduped[] = $meal;
            $seen[] = $signature;
        }

        return $deduped;
    }

    private function mealSignature(array $meal): string
    {
        $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? ''));
        $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
        $parts = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $name = strtolower(trim((string) ($item['name'] ?? '')));
            $portion = strtolower(trim((string) ($item['portion'] ?? '')));
            if ($name === '') {
                continue;
            }

            $parts[] = $name.'|'.$portion;
        }

        if ($parts === []) {
            $title = strtolower(trim((string) ($meal['title'] ?? '')));

            return $title === '' ? '' : $mealCode.'|'.$title;
        }

        return $mealCode.'|'.implode('||', $parts);
    }

    private function mealPrimaryName(array $meal): string
    {
        $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
        $firstName = trim((string) ($items[0]['name'] ?? ''));

        return $firstName !== ''
            ? $firstName
            : (trim((string) ($meal['title'] ?? '')) ?: 'Meal option');
    }

    private function mealCodeSeedOffset(string $mealCode): int
    {
        return match ($this->normalizeMealCode($mealCode)) {
            'breakfast' => 7,
            'lunch' => 19,
            'dinner' => 31,
            'snack' => 43,
            default => 0,
        };
    }

    private function defaultWorkoutTemplates(array $exerciseCatalog, array $profile): array
    {
        $location = $this->normalizeWorkoutLocation($profile['workout_location'] ?? null, $profile);
        $pool = $this->filterCatalogExercisesByLocation(
            $exerciseCatalog,
            $location,
            $this->normalizeList($profile['available_equipment'] ?? []),
            $profile
        );
        $fallbackNames = array_map(
            static fn (array $exercise): string => (string) ($exercise['name'] ?? ''),
            $pool
        );
        $fallbackNames = array_values(array_filter($fallbackNames));

        return [
            [
                'day_index' => 1,
                'day_label' => 'Monday',
                'session_type' => 'train',
                'focus' => 'Low-risk full body',
                'location' => $location,
                'duration_min' => 30,
                'warmup' => [],
                'exercises' => [
                    [
                        'name' => $fallbackNames[0] ?? 'Bodyweight Squat',
                        'sets' => 3,
                        'reps' => '8-12',
                        'rest_sec' => 45,
                        'rpe' => 6.0,
                        'equipment' => $pool[0]['equipment'] ?? 'Bodyweight',
                    ],
                    [
                        'name' => $fallbackNames[1] ?? 'Incline Push Up',
                        'sets' => 3,
                        'reps' => '8-10 per side',
                        'rest_sec' => 45,
                        'rpe' => 6.0,
                        'equipment' => $pool[1]['equipment'] ?? 'Bodyweight',
                    ],
                    [
                        'name' => $fallbackNames[2] ?? 'Resistance Band Row',
                        'sets' => 3,
                        'reps' => '8-10 per side',
                        'rest_sec' => 45,
                        'rpe' => 6.0,
                        'equipment' => $pool[2]['equipment'] ?? 'Bodyweight',
                    ],
                ],
                'cooldown' => [],
                'safety_notes' => [],
            ],
            [
                'day_index' => 2,
                'day_label' => 'Tuesday',
                'session_type' => 'recovery',
                'focus' => 'Mobility',
                'location' => $location,
                'duration_min' => 20,
                'warmup' => [],
                'exercises' => [],
                'cooldown' => [],
                'safety_notes' => [],
            ],
            [
                'day_index' => 3,
                'day_label' => 'Wednesday',
                'session_type' => 'rest',
                'focus' => 'Rest',
                'location' => $location,
                'duration_min' => 0,
                'warmup' => [],
                'exercises' => [],
                'cooldown' => [],
                'safety_notes' => [],
            ],
        ];
    }

    private function normalizeMeals(
        array $meals,
        array $targets,
        array $mealCatalog,
        array $profile,
        int $seed = 0,
        ?array $requiredMealCodes = null,
        bool $enforceExactCalorieAlignment = true
    ): array {
        $blockedNeedles = $this->blockedFoodNeedles($profile);
        $requiredMealCodes = $requiredMealCodes !== null && $requiredMealCodes !== []
            ? array_values(array_unique(array_map(fn ($code): string => $this->normalizeMealCode((string) $code), $requiredMealCodes)))
            : ['breakfast', 'lunch', 'dinner', 'snack'];

        $fallbackNameByType = [];
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $mealCode) {
            $fallback = $this->catalogFoodForMeal($mealCode, $mealCatalog, $seed + (crc32($mealCode) % 37), $profile);
            $fallbackNameByType[$mealCode] = trim((string) ($fallback['name'] ?? ''));

            if ($fallbackNameByType[$mealCode] === '') {
                $fallbackNameByType[$mealCode] = $this->pickRotatingValue($this->mealNameLibrary($mealCode, $profile), $seed + (crc32($mealCode) % 17))
                    ?? ucfirst($mealCode).' option';
            }
        }

        $fallbackByType = [
            'breakfast' => ['name' => $fallbackNameByType['breakfast']],
            'lunch' => ['name' => $fallbackNameByType['lunch']],
            'dinner' => ['name' => $fallbackNameByType['dinner']],
            'snack' => ['name' => $fallbackNameByType['snack']],
        ];

        $ratios = [
            'breakfast' => 0.30,
            'lunch' => 0.35,
            'dinner' => 0.30,
            'snack' => 0.08,
        ];
        $calories = max(1200, (int) ($targets['calories_kcal'] ?? 1800));
        $protein = max(80, (int) ($targets['protein_g'] ?? 130));
        $carbs = max(90, (int) ($targets['carbs_g'] ?? 170));
        $fat = max(40, (int) ($targets['fat_g'] ?? 60));

        if ($meals === []) {
            $meals = array_map(
                static fn (string $mealCode): array => [
                    'meal_code' => $mealCode,
                    'title' => ucfirst($mealCode),
                    'items' => [],
                ],
                $requiredMealCodes
            );
        }

        $presentMealCodes = [];
        foreach ($meals as $meal) {
            $presentMealCodes[] = $this->normalizeMealCode((string) ($meal['meal_code'] ?? 'snack'));
        }
        $presentMealCodes = array_values(array_unique($presentMealCodes));

        foreach ($requiredMealCodes as $requiredCode) {
            if (in_array($requiredCode, $presentMealCodes, true)) {
                continue;
            }

            $meals[] = [
                'meal_code' => $requiredCode,
                'title' => ucfirst($requiredCode),
                'items' => [],
            ];
        }

        usort($meals, function (array $a, array $b): int {
            $order = ['breakfast' => 1, 'lunch' => 2, 'dinner' => 3, 'snack' => 4, 'drink' => 5];
            $left = $order[$this->normalizeMealCode((string) ($a['meal_code'] ?? 'snack'))] ?? 99;
            $right = $order[$this->normalizeMealCode((string) ($b['meal_code'] ?? 'snack'))] ?? 99;

            return $left <=> $right;
        });

        $normalizedMeals = [];
        foreach ($meals as $meal) {
            $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? 'snack'));
            $ratio = $ratios[$mealCode] ?? 0.25;
            $expectedTarget = max(80, (int) round($calories * $ratio));
            [$targetMin, $targetMax] = $this->mealTargetBounds($mealCode, $expectedTarget);

            $targetKcal = (int) ($meal['target_kcal'] ?? $expectedTarget);
            $targetKcal = max($targetMin, min($targetMax, $targetKcal));

            $rawItems = is_array($meal['items'] ?? null) ? array_values($meal['items']) : [];
            if ($rawItems === []) {
                $fallback = $fallbackByType[$mealCode] ?? null;
                $rawItems = [[
                    'name' => $fallback['name'] ?? ucfirst($mealCode).' option',
                    'portion' => $this->portionFromCalories($targetKcal, $mealCode),
                ]];
            }

            $itemCount = max(1, count($rawItems));
            $defaultItemCalories = max(40, (int) round($targetKcal / $itemCount));
            $perItemMin = max(40, (int) floor($targetMin / max(1, $itemCount * 1.7)));
            $perItemMax = max($perItemMin + 30, (int) ceil($targetMax / max(1, $itemCount * 0.75)));
            $fallback = $fallbackByType[$mealCode] ?? null;

            $normalizedItems = [];
            foreach (array_values($rawItems) as $itemIndex => $item) {
                $requestedName = trim((string) ($item['name'] ?? ''));
                $name = $requestedName;
                $shouldForceCatalogItem = $name === ''
                    || $this->looksGenericMealName($name)
                    || ! $this->isAllowedMealNameForCode($name, $mealCode, $blockedNeedles);
                $resolverSeed = $seed + $itemIndex + (int) (crc32($mealCode.'|'.($meal['title'] ?? '').'|'.$name) % 97);

                if ($shouldForceCatalogItem) {
                    $name = $fallback['name'] ?? ($name !== '' ? $name : 'Meal option');
                }

                $itemCalories = max($perItemMin, min($perItemMax, (int) ($item['calories_kcal'] ?? $defaultItemCalories)));
                if (! $enforceExactCalorieAlignment) {
                    $itemCalories = $this->applyMealOptionCalorieVariance(
                        $itemCalories,
                        $mealCode,
                        $resolverSeed,
                        $itemCount
                    );
                    $itemCalories = max($perItemMin, min($perItemMax, $itemCalories));
                }
                $resolvedFoodItem = $this->plannerFoodModel->resolveMealItem(
                    $mealCode,
                    $itemCalories,
                    $profile,
                    $resolverSeed,
                    $name,
                    $mealCatalog
                );

                $foodBackedItem = null;
                if ($resolvedFoodItem !== null && (
                    $shouldForceCatalogItem
                    || $this->mealNamesRoughlyMatch(
                        $requestedName !== '' ? $requestedName : $name,
                        (string) ($resolvedFoodItem['name'] ?? '')
                    )
                )) {
                    $foodBackedItem = $resolvedFoodItem;
                }

                if ($foodBackedItem !== null) {
                    if ($shouldForceCatalogItem) {
                        $name = trim((string) ($foodBackedItem['name'] ?? $name)) ?: $name;
                    }
                    $itemCalories = max($perItemMin, min($perItemMax, (int) ($foodBackedItem['calories_kcal'] ?? $itemCalories)));
                    $portion = $this->normalizeMealPortion((string) ($foodBackedItem['portion'] ?? ''));
                } else {
                    $portion = $this->normalizeMealPortion((string) ($item['portion'] ?? ''));
                }

                if ($portion === '' || $this->isGenericPortion($portion) || ! $this->portionMatchesMealName($name, $portion, $mealCode)) {
                    $portion = $this->portionForMealName($name, $itemCalories, $mealCode);
                }

                [$proteinGrams, $carbsGrams, $fatGrams] = $this->normalizeItemMacros(
                    $itemCalories,
                    (int) ($foodBackedItem['protein_g'] ?? $item['protein_g'] ?? round($protein * $ratio / max(1, $itemCount))),
                    (int) ($foodBackedItem['carbs_g'] ?? $item['carbs_g'] ?? round($carbs * $ratio / max(1, $itemCount))),
                    (int) ($foodBackedItem['fat_g'] ?? $item['fat_g'] ?? round($fat * $ratio / max(1, $itemCount))),
                    $mealCode
                );

                $normalizedItems[] = [
                    'name' => $name,
                    'portion' => $portion,
                    'calories_kcal' => $itemCalories,
                    'protein_g' => $proteinGrams,
                    'carbs_g' => $carbsGrams,
                    'fat_g' => $fatGrams,
                    'recipe_note' => isset($item['recipe_note']) ? (string) $item['recipe_note'] : null,
                    'search_terms' => array_values(array_unique(array_filter(array_merge(
                        is_array($item['search_terms'] ?? null) ? array_values($item['search_terms']) : [],
                        is_array($foodBackedItem['search_terms'] ?? null) ? array_values($foodBackedItem['search_terms']) : []
                    )))),
                    'alternatives' => array_values(array_unique(array_filter(array_merge(
                        is_array($item['alternatives'] ?? null) ? array_values($item['alternatives']) : [],
                        is_array($foodBackedItem['alternatives'] ?? null) ? array_values($foodBackedItem['alternatives']) : []
                    )))),
                ];
            }

            $sumCalories = array_sum(array_map(
                static fn (array $item): int => max(0, (int) ($item['calories_kcal'] ?? 0)),
                $normalizedItems
            ));
            if ($enforceExactCalorieAlignment) {
                $normalizedItems = $this->alignMealItemsCalories($normalizedItems, $targetKcal, $perItemMin, $perItemMax);
                $sumCalories = array_sum(array_map(
                    static fn (array $item): int => max(0, (int) ($item['calories_kcal'] ?? 0)),
                    $normalizedItems
                ));
                $targetKcal = max($targetMin, min($targetMax, (int) round($sumCalories)));
                $normalizedItems = $this->alignMealItemsCalories($normalizedItems, $targetKcal, $perItemMin, $perItemMax);
            } else {
                $lowerBound = (int) floor($targetKcal * 0.60);
                $upperBound = (int) ceil($targetKcal * 1.45);
                if ($sumCalories < $lowerBound || $sumCalories > $upperBound) {
                    $normalizedItems = $this->alignMealItemsCalories($normalizedItems, $targetKcal, $perItemMin, $perItemMax);
                }
            }
            $normalizedItems = array_map(function (array $item) use ($mealCode): array {
                [$proteinGrams, $carbsGrams, $fatGrams] = $this->normalizeItemMacros(
                    (int) ($item['calories_kcal'] ?? 0),
                    (int) ($item['protein_g'] ?? 0),
                    (int) ($item['carbs_g'] ?? 0),
                    (int) ($item['fat_g'] ?? 0),
                    $mealCode
                );

                if (
                    $this->isGenericPortion((string) ($item['portion'] ?? ''))
                    || ! $this->portionMatchesMealName(
                        (string) ($item['name'] ?? ''),
                        (string) ($item['portion'] ?? ''),
                        $mealCode
                    )
                ) {
                    $item['portion'] = $this->portionForMealName(
                        (string) ($item['name'] ?? ''),
                        (int) ($item['calories_kcal'] ?? 0),
                        $mealCode
                    );
                }

                $item['protein_g'] = $proteinGrams;
                $item['carbs_g'] = $carbsGrams;
                $item['fat_g'] = $fatGrams;

                return $item;
            }, $normalizedItems);

            $normalizedMeals[] = [
                'meal_code' => $mealCode,
                'title' => trim((string) ($meal['title'] ?? ucfirst($mealCode))) ?: ucfirst($mealCode),
                'target_kcal' => $targetKcal,
                'items' => $normalizedItems,
            ];
        }

        return $normalizedMeals;
    }

    private function normalizeExercises(
        array $exercises,
        array $exerciseCatalog,
        string $location,
        int $offset = 0,
        array $preferredCategories = [],
        array $availableEquipment = [],
        array $profile = []
    ): array {
        $pool = $this->filterCatalogExercisesByLocation($exerciseCatalog, $location, $availableEquipment, $profile);
        $strictCategories = array_values(array_unique(array_filter(array_map(
            static fn ($item): string => strtolower(trim((string) $item)),
            $preferredCategories
        ))));
        $strictPool = $strictCategories !== [] ? $this->filterPoolByCategories($pool, $strictCategories) : [];
        $activePool = $strictPool !== [] ? $strictPool : $pool;
        $defaultRest = $this->restDefaultForGoal($profile);

        if ($exercises === []) {
            $defaults = [];
            if ($activePool !== [] && $preferredCategories !== []) {
                $defaults = $this->pickExercisesByCategorySequence($activePool, $preferredCategories, $offset);
            } elseif ($activePool !== []) {
                $used = [];
                for ($i = 0; $i < 5; $i++) {
                    $candidate = $this->pickUniqueExerciseFromPool($activePool, $used, $offset + $i);
                    if ($candidate === null) {
                        break;
                    }
                    $defaults[] = $candidate;
                }
            }
            if ($defaults === []) {
                $defaults = $location === 'gym'
                    ? [
                        ['name' => 'Leg Press', 'equipment' => 'Machine'],
                        ['name' => 'Seated Cable Row', 'equipment' => 'Cable machine'],
                        ['name' => 'Machine Chest Press', 'equipment' => 'Machine'],
                        ['name' => 'Lat Pulldown', 'equipment' => 'Cable machine'],
                        ['name' => 'Cable Crunch', 'equipment' => 'Cable machine'],
                    ]
                    : [
                        ['name' => 'Bodyweight Squat', 'equipment' => 'Bodyweight'],
                        ['name' => 'Incline Push Up', 'equipment' => 'Bodyweight'],
                        ['name' => 'Resistance Band Row', 'equipment' => 'Resistance Band'],
                        ['name' => 'Glute Bridge', 'equipment' => 'Bodyweight'],
                        ['name' => 'Dead Bug', 'equipment' => 'Bodyweight'],
                    ];
            }

            $exercises = array_map(static fn (array $exercise) => [
                'name' => (string) ($exercise['name'] ?? 'Exercise'),
                'sets' => 3,
                'reps' => '8-12',
                'rest_sec' => $defaultRest,
                'rpe' => 7.0,
                'equipment' => (string) ($exercise['equipment'] ?? 'Bodyweight'),
            ], $defaults);
        }

        $normalized = array_map(function (array $exercise, int $index) use ($activePool, $offset, $location, $profile, $defaultRest, $availableEquipment): array {
            $poolCount = max(count($activePool), 1);
            $fallback = $activePool[($offset + $index) % $poolCount] ?? null;
            $name = trim((string) ($exercise['name'] ?? ''));
            $equipment = trim((string) ($exercise['equipment'] ?? ($fallback['equipment'] ?? 'Bodyweight'))) ?: 'Bodyweight';
            if (
                $name === ''
                || $this->looksGenericExerciseName($name)
                || $this->looksRecoveryStyleExercise($name)
                || $this->exerciseConflictsWithProfile($name, $profile)
                || $this->exerciseNeedsHomeReplacement($name, $equipment, $location, $availableEquipment)
            ) {
                $name = (string) ($fallback['name'] ?? ('Exercise '.($index + 1)));
                $equipment = trim((string) ($fallback['equipment'] ?? $equipment)) ?: $equipment;
            }
            if (
                $location === 'gym'
                && $fallback !== null
                && str_contains(strtolower($equipment), 'bodyweight')
                && ! str_contains(strtolower((string) ($fallback['equipment'] ?? '')), 'bodyweight')
            ) {
                $name = (string) ($fallback['name'] ?? $name);
                $equipment = trim((string) ($fallback['equipment'] ?? $equipment)) ?: $equipment;
            }

            return [
                'name' => $name,
                'sets' => max(1, (int) ($exercise['sets'] ?? 3)),
                'reps' => trim((string) ($exercise['reps'] ?? '8-12')) ?: '8-12',
                'rest_sec' => $this->normalizeRestByGoal((int) ($exercise['rest_sec'] ?? $defaultRest), $profile),
                'rpe' => max(4, min(9.5, (float) ($exercise['rpe'] ?? 7.0))),
                'equipment' => $equipment,
                'movement_notes' => isset($exercise['movement_notes']) ? (string) $exercise['movement_notes'] : null,
                'safer_alternative' => isset($exercise['safer_alternative']) ? (string) $exercise['safer_alternative'] : null,
            ];
        }, array_values($exercises), array_keys(array_values($exercises)));

        $deduped = [];
        $seenNames = [];
        foreach ($normalized as $exercise) {
            $nameKey = strtolower(trim((string) ($exercise['name'] ?? '')));
            if ($nameKey === '' || in_array($nameKey, $seenNames, true)) {
                continue;
            }

            $seenNames[] = $nameKey;
            $deduped[] = $exercise;
        }

        return $this->ensureMinimumExercises($deduped, $activePool !== [] ? $activePool : $pool, 5, $offset, $profile);
    }

    private function mealTargetBounds(string $mealCode, int $expectedTarget): array
    {
        if ($mealCode === 'snack') {
            $min = max(80, (int) round($expectedTarget * 0.60));
            $max = max($min + 40, (int) round($expectedTarget * 1.90));

            return [$min, $max];
        }

        $min = max(180, (int) round($expectedTarget * 0.65));
        $max = max($min + 60, (int) round($expectedTarget * 1.45));

        return [$min, $max];
    }

    private function normalizeMealPortion(string $portion): string
    {
        $portion = trim($portion);
        if ($portion === '') {
            return '';
        }

        $normalized = strtolower($portion);
        if (str_contains($normalized, 'kcal') && ! str_contains($normalized, 'g') && ! str_contains($normalized, 'ml')) {
            return '';
        }

        if (! preg_match('/(\d+(?:\.\d+)?)/', $normalized, $matches)) {
            return $portion;
        }

        $amount = (float) $matches[1];
        if ($amount <= 0) {
            return '';
        }

        if (str_contains($normalized, 'serving') || str_contains($normalized, 'portion')) {
            return $this->formatServingPortion($amount);
        }

        if (str_contains($normalized, 'g')) {
            $grams = max(40.0, min(600.0, $amount));

            return (string) ((int) round($grams)).' g';
        }

        if (str_contains($normalized, 'ml')) {
            $ml = max(60.0, min(800.0, $amount));

            return (string) ((int) round($ml)).' ml';
        }

        foreach (['bowl', 'plate', 'jar', 'skillet', 'cup', 'wrap', 'sandwich', 'slice', 'slices', 'piece', 'pieces', 'pcs', 'pc', 'toast', 'flatbread', 'combo'] as $unit) {
            if (str_contains($normalized, $unit)) {
                return $this->formatNamedPortion($amount, $unit);
            }
        }

        if ($amount > 4) {
            return $this->formatServingPortion(4.0);
        }

        return $this->formatServingPortion($amount);
    }

    private function formatNamedPortion(float $amount, string $unit): string
    {
        $amount = max(0.25, min(4.0, $amount));
        $formatted = rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.');
        $unit = match ($unit) {
            'pc', 'piece', 'pieces' => abs($amount - 1.0) < 0.001 ? 'piece' : 'pieces',
            'slice', 'slices' => abs($amount - 1.0) < 0.001 ? 'slice' : 'slices',
            default => abs($amount - 1.0) < 0.001 ? rtrim($unit, 's') : (str_ends_with($unit, 's') ? $unit : $unit.'s'),
        };

        return $formatted.' '.$unit;
    }

    private function formatServingPortion(float $amount): string
    {
        $amount = max(0.25, min(4.0, $amount));

        return rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.').' serving';
    }

    private function portionFromCalories(int $calories, string $mealCode): string
    {
        $calories = max(40, $calories);
        $mealCode = strtolower(trim($mealCode));

        if ($mealCode === 'snack') {
            return match (true) {
                $calories <= 130 => '0.75 serving',
                $calories <= 210 => '1 serving',
                $calories <= 300 => '1.25 serving',
                default => '1.5 serving',
            };
        }

        return match (true) {
            $calories <= 260 => '1 serving',
            $calories <= 380 => '1.25 serving',
            $calories <= 520 => '1.5 serving',
            $calories <= 680 => '2 serving',
            default => '2.25 serving',
        };
    }

    private function portionForMealName(string $name, int $calories, string $mealCode): string
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return $this->portionFromCalories($calories, $mealCode);
        }

        if ($this->containsAny($text, ['apple', 'banana', 'pear', 'orange'])) {
            return '1 piece';
        }
        if (str_contains($text, 'egg')) {
            return $calories >= 210 ? '3 pcs' : '2 pcs';
        }
        if ($this->containsAny($text, ['shake', 'smoothie'])) {
            return $calories >= 320 ? '400 ml' : '300 ml';
        }
        if ($this->containsAny($text, ['soup'])) {
            return '1 bowl';
        }
        if ($this->containsAny($text, ['toast'])) {
            return '2 slices';
        }
        if ($this->containsAny($text, ['wrap'])) {
            return '1 wrap';
        }
        if ($this->containsAny($text, ['sandwich'])) {
            return '1 sandwich';
        }
        if ($this->containsAny($text, ['plate', 'platter', 'tray'])) {
            return '1 plate';
        }
        if ($this->containsAny($text, ['salad', 'bowl', 'pasta'])) {
            return '1 bowl';
        }
        if ($this->containsAny($text, ['crackers', 'rice cakes'])) {
            return '2 pcs';
        }
        if ($this->containsAny($text, ['yogurt', 'labneh', 'cottage cheese', 'hummus', 'oat', 'oats'])) {
            return $calories >= 280 ? '220 g' : '180 g';
        }
        if ($this->containsAny($text, ['chicken', 'turkey', 'beef', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'paneer'])) {
            return $calories >= 360 ? '200 g' : '150 g';
        }
        if ($this->containsAny($text, ['rice', 'quinoa', 'bulgur', 'lentil', 'lentils', 'chickpea', 'chickpeas', 'potato', 'sweet potato'])) {
            return $calories >= 320 ? '220 g' : '160 g';
        }

        return $this->portionFromCalories($calories, $mealCode);
    }

    private function portionMatchesMealName(string $name, string $portion, string $mealCode): bool
    {
        $name = strtolower(trim($name));
        $portion = strtolower(trim($portion));

        if ($name === '' || $portion === '' || $this->isGenericPortion($portion)) {
            return true;
        }

        if (str_contains($portion, 'slice')) {
            return $this->containsAny($name, ['toast', 'bread', 'sandwich', 'cheese']);
        }

        if (str_contains($portion, 'wrap')) {
            return str_contains($name, 'wrap');
        }

        if (str_contains($portion, 'sandwich')) {
            return str_contains($name, 'sandwich');
        }

        if (str_contains($portion, 'bowl')) {
            return $this->containsAny($name, [
                'bowl',
                'salad',
                'soup',
                'oat',
                'oats',
                'yogurt',
                'labneh',
                'cottage cheese',
                'hummus',
                'rice',
                'quinoa',
                'bulgur',
                'pasta',
                'lentil',
                'chickpea',
                'potato',
            ]);
        }

        if (str_contains($portion, 'plate')) {
            return $this->containsAny($name, [
                'plate',
                'platter',
                'tray',
                'salad',
                'meal',
                'fattoush',
            ]);
        }

        if ($this->containsAny($portion, ['pcs', 'piece'])) {
            if ($this->containsAny($name, ['egg', 'apple', 'banana', 'pear', 'orange', 'cracker', 'rice cake'])) {
                return true;
            }

            return ! $this->containsAny($name, [
                'chicken',
                'turkey',
                'beef',
                'fish',
                'salmon',
                'tuna',
                'shrimp',
                'tofu',
                'paneer',
                'rice',
                'quinoa',
                'pasta',
                'potato',
                'oat',
                'yogurt',
                'labneh',
            ]);
        }

        return true;
    }

    private function isGenericPortion(string $portion): bool
    {
        $normalized = strtolower(trim($portion));

        return $normalized === '' || in_array($normalized, ['1 serving', '1 portion'], true);
    }

    private function normalizeItemMacros(int $calories, int $protein, int $carbs, int $fat, string $mealCode): array
    {
        $calories = max(40, $calories);
        $protein = max(0, $protein);
        $carbs = max(0, $carbs);
        $fat = max(0, $fat);

        $macroCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
        if (
            $macroCalories <= 0
            || $macroCalories < (int) round($calories * 0.70)
            || $macroCalories > (int) round($calories * 1.40)
        ) {
            [$protein, $carbs, $fat] = $this->macroGramsFromShares(
                $calories,
                $this->macroShareForMeal($mealCode)
            );
        } else {
            $scale = $calories / max(1, $macroCalories);
            $protein = max(0, (int) round($protein * $scale));
            $carbs = max(0, (int) round($carbs * $scale));
            $fat = max(0, (int) round($fat * $scale));
        }

        return $this->adjustMacroCalories($protein, $carbs, $fat, $calories, $mealCode);
    }

    private function macroShareForMeal(string $mealCode): array
    {
        return match (strtolower(trim($mealCode))) {
            'breakfast' => ['protein' => 0.28, 'carbs' => 0.47, 'fat' => 0.25],
            'snack' => ['protein' => 0.24, 'carbs' => 0.43, 'fat' => 0.33],
            default => ['protein' => 0.30, 'carbs' => 0.40, 'fat' => 0.30],
        };
    }

    private function macroGramsFromShares(int $calories, array $shares): array
    {
        $protein = max(1, (int) round(($calories * (float) ($shares['protein'] ?? 0.30)) / 4));
        $carbs = max(1, (int) round(($calories * (float) ($shares['carbs'] ?? 0.40)) / 4));
        $fat = max(1, (int) round(($calories * (float) ($shares['fat'] ?? 0.30)) / 9));

        return [$protein, $carbs, $fat];
    }

    private function adjustMacroCalories(int $protein, int $carbs, int $fat, int $targetCalories, string $mealCode): array
    {
        $protein = max(0, $protein);
        $carbs = max(0, $carbs);
        $fat = max(0, $fat);
        $priority = strtolower(trim($mealCode)) === 'snack'
            ? ['carbs', 'protein', 'fat']
            : ['protein', 'carbs', 'fat'];

        for ($i = 0; $i < 64; $i++) {
            $currentCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);
            $delta = $targetCalories - $currentCalories;
            if (abs($delta) <= 12) {
                break;
            }

            if ($delta > 0) {
                foreach ($priority as $macro) {
                    if ($macro === 'fat' && $delta >= 9) {
                        $fat++;

                        continue 2;
                    }
                    if ($delta >= 4) {
                        if ($macro === 'protein') {
                            $protein++;
                        } elseif ($macro === 'carbs') {
                            $carbs++;
                        }

                        continue 2;
                    }
                }

                break;
            }

            foreach ($priority as $macro) {
                if ($macro === 'fat' && $fat > 0 && abs($delta) >= 9) {
                    $fat--;

                    continue 2;
                }
                if ($macro === 'protein' && $protein > 0 && abs($delta) >= 4) {
                    $protein--;

                    continue 2;
                }
                if ($macro === 'carbs' && $carbs > 0 && abs($delta) >= 4) {
                    $carbs--;

                    continue 2;
                }
            }

            break;
        }

        return [$protein, $carbs, $fat];
    }

    private function alignMealItemsCalories(array $items, int $targetCalories, int $perItemMin, int $perItemMax): array
    {
        if ($items === []) {
            return $items;
        }

        $sum = (int) array_sum(array_map(
            static fn (array $item): int => max(0, (int) ($item['calories_kcal'] ?? 0)),
            $items
        ));

        if ($sum === $targetCalories) {
            return $items;
        }

        $index = 0;
        $maxCalories = -1;
        foreach ($items as $itemIndex => $item) {
            $itemCalories = (int) ($item['calories_kcal'] ?? 0);
            if ($itemCalories > $maxCalories) {
                $maxCalories = $itemCalories;
                $index = $itemIndex;
            }
        }

        $remainingDelta = $targetCalories - $sum;
        $next = (int) ($items[$index]['calories_kcal'] ?? 0);
        $next = max($perItemMin, min($perItemMax, $next + $remainingDelta));
        $items[$index]['calories_kcal'] = $next;

        $safetyCounter = 0;
        while ($safetyCounter < 256) {
            $current = (int) array_sum(array_map(
                static fn (array $item): int => max(0, (int) ($item['calories_kcal'] ?? 0)),
                $items
            ));
            if ($current === $targetCalories) {
                break;
            }

            $delta = $targetCalories - $current;
            $step = $delta > 0 ? 1 : -1;
            $updated = false;
            foreach ($items as $itemIndex => $item) {
                $value = (int) ($item['calories_kcal'] ?? 0);
                $candidate = $value + $step;
                if ($candidate < $perItemMin || $candidate > $perItemMax) {
                    continue;
                }

                $items[$itemIndex]['calories_kcal'] = $candidate;
                $updated = true;
                if ($step > 0 ? $candidate >= $perItemMax : $candidate <= $perItemMin) {
                    continue;
                }
                break;
            }

            if (! $updated) {
                break;
            }

            $safetyCounter++;
        }

        return $items;
    }

    private function applyMealOptionCalorieVariance(
        int $calories,
        string $mealCode,
        int $seed,
        int $itemCount
    ): int {
        $range = $mealCode === 'snack' ? 0.16 : 0.12;
        if ($itemCount > 1) {
            $range = min($range, 0.08);
        }

        $hash = abs(crc32($mealCode.'|'.$seed));
        $bucket = ($hash % 1000) / 1000;
        $multiplier = (1 - $range) + ($bucket * (2 * $range));

        return max(40, (int) round($calories * $multiplier));
    }

    private function enforceDietDayVariety(array $dietDays, array $mealCatalog, array $profile, int $seed = 0): array
    {
        $catalogNames = [
            'breakfast' => $this->catalogMealNames($mealCatalog, 'breakfast', $profile),
            'lunch' => $this->catalogMealNames($mealCatalog, 'lunch', $profile),
            'dinner' => $this->catalogMealNames($mealCatalog, 'dinner', $profile),
            'snack' => $this->catalogMealNames($mealCatalog, 'snack', $profile),
            'drink' => $this->catalogMealNames($mealCatalog, 'drink', $profile),
        ];

        $blockedNeedles = $this->blockedFoodNeedles($profile);
        $snackCandidates = array_values(array_unique(array_filter(array_merge(
            $catalogNames['snack'],
            $this->collectMealNamesByCode($dietDays, 'snack'),
            $this->snackNameLibrary($profile)
        ), fn (string $item): bool => ! $this->containsAny($item, $blockedNeedles))));
        $usedSnackNames = [];
        $usedByMeal = [
            'breakfast' => [],
            'lunch' => [],
            'dinner' => [],
            'snack' => [],
            'drink' => [],
        ];
        $previousByMeal = [];

        foreach ($dietDays as $dayIndex => $day) {
            $currentDayIndex = (int) ($day['day_index'] ?? ($dayIndex + 1));
            $dietDays[$dayIndex]['theme'] = trim((string) ($day['theme'] ?? '')) !== ''
                ? (string) $day['theme']
                : 'Day '.$currentDayIndex.' balanced nutrition';

            if (! is_array($day['meals'] ?? null)) {
                continue;
            }

            foreach ($day['meals'] as $mealIndex => $meal) {
                $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? 'snack'));
                if (! is_array($meal['items'] ?? null) || $meal['items'] === []) {
                    continue;
                }

                $firstName = strtolower(trim((string) ($meal['items'][0]['name'] ?? '')));
                $isRepeated = $firstName !== '' && ($previousByMeal[$mealCode] ?? null) === $firstName;
                $isUsedBefore = $firstName !== '' && in_array($firstName, $usedByMeal[$mealCode] ?? [], true);

                if ($isRepeated || $isUsedBefore || $this->looksGenericMealName($firstName)) {
                    $candidatePool = $mealCode === 'snack'
                        ? $snackCandidates
                        : ($catalogNames[$mealCode] ?? []);

                    $candidate = $this->pickUnusedRotatingValue(
                        $candidatePool,
                        $usedByMeal[$mealCode] ?? [],
                        $seed + $currentDayIndex + $mealIndex
                    );
                    if ($candidate === null) {
                        $candidate = $this->pickRotatingValue($candidatePool, $seed + $currentDayIndex + $mealIndex);
                    }
                    if ((! is_string($candidate) || trim($candidate) === '') && $mealCode !== 'snack') {
                        $candidate = $this->buildMealVariantName(
                            (string) ($meal['items'][0]['name'] ?? ''),
                            $usedByMeal[$mealCode] ?? [],
                            $currentDayIndex
                        );
                    }
                    if (is_string($candidate) && trim($candidate) !== '') {
                        $dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] = $candidate;
                    }
                }

                $updatedName = strtolower(trim((string) ($dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] ?? '')));
                if ($updatedName !== '') {
                    $previousByMeal[$mealCode] = $updatedName;
                    $usedByMeal[$mealCode][] = $updatedName;
                }

                if ($mealCode !== 'snack') {
                    continue;
                }

                $snackName = trim((string) ($dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] ?? ''));
                $snackKey = strtolower($snackName);

                if ($snackName === '' || in_array($snackKey, $usedSnackNames, true) || $this->looksGenericMealName($snackKey)) {
                    $replacement = $this->pickUnusedRotatingValue($snackCandidates, $usedSnackNames, $seed + $currentDayIndex + $mealIndex);
                    if ($replacement !== null) {
                        $dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] = $replacement;
                        $snackName = $replacement;
                        $snackKey = strtolower($replacement);
                    } elseif ($snackName === '') {
                        $snackName = 'Snack option day '.$currentDayIndex;
                        $dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] = $snackName;
                        $snackKey = strtolower($snackName);
                    } else {
                        $snackName .= ' (Day '.$currentDayIndex.')';
                        $dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] = $snackName;
                        $snackKey = strtolower($snackName);
                    }
                }

                $usedSnackNames[] = $snackKey;
            }
        }

        return $dietDays;
    }

    private function enforceWorkoutVariety(array $weekly, array $exerciseCatalog, array $profile, int $seed = 0): array
    {
        $lastTrainExerciseNames = [];
        $availableEquipment = $this->normalizeList($profile['available_equipment'] ?? []);

        foreach ($weekly as $dayIndex => $day) {
            if (strtolower((string) ($day['session_type'] ?? '')) !== 'train') {
                continue;
            }

            $location = strtolower((string) ($day['location'] ?? 'gym'));
            $pool = $this->filterCatalogExercisesByLocation($exerciseCatalog, $location, $availableEquipment, $profile);
            $allowedCategories = $this->allowedWorkoutCategoriesForFocus((string) ($day['focus'] ?? ''));
            if ($allowedCategories !== []) {
                $allowedPool = $this->filterPoolByCategories($pool, $allowedCategories);
                if ($allowedPool !== []) {
                    $pool = $allowedPool;
                }
            }
            if ($pool === [] || ! is_array($day['exercises'] ?? null) || $day['exercises'] === []) {
                continue;
            }

            $currentNames = array_values(array_filter(array_map(
                static fn (array $exercise): string => strtolower(trim((string) ($exercise['name'] ?? ''))),
                $day['exercises']
            )));

            if ($currentNames === []) {
                continue;
            }

            $overlapCount = count(array_intersect($currentNames, $lastTrainExerciseNames));
            $denominator = max(1, min(count($currentNames), count($lastTrainExerciseNames)));
            $overlapRatio = $overlapCount / $denominator;

            if ($overlapRatio >= 0.6) {
                $poolCount = count($pool);
                foreach ($weekly[$dayIndex]['exercises'] as $exerciseIndex => $exercise) {
                    if ($exerciseIndex >= 2) {
                        break;
                    }

                    $candidate = $pool[($seed + ($dayIndex * 4) + $exerciseIndex) % $poolCount] ?? null;
                    if (! is_array($candidate)) {
                        continue;
                    }

                    $weekly[$dayIndex]['exercises'][$exerciseIndex]['name'] = (string) ($candidate['name'] ?? $exercise['name']);
                    $weekly[$dayIndex]['exercises'][$exerciseIndex]['equipment'] = trim((string) ($candidate['equipment'] ?? $exercise['equipment'] ?? 'Bodyweight')) ?: 'Bodyweight';
                }
            }

            $poolCount = count($pool);
            foreach ($weekly[$dayIndex]['exercises'] as $exerciseIndex => $exercise) {
                $rest = (int) ($exercise['rest_sec'] ?? $this->restDefaultForGoal($profile));
                $weekly[$dayIndex]['exercises'][$exerciseIndex]['rest_sec'] = $this->normalizeRestByGoal($rest, $profile);

                if ($allowedCategories === []) {
                    continue;
                }

                $category = $this->exerciseCategoryByName((string) ($exercise['name'] ?? ''));
                if (in_array($category, $allowedCategories, true)) {
                    continue;
                }

                $candidate = $pool[($seed + ($dayIndex * 5) + $exerciseIndex) % max($poolCount, 1)] ?? null;
                if (! is_array($candidate)) {
                    continue;
                }

                $weekly[$dayIndex]['exercises'][$exerciseIndex]['name'] = (string) ($candidate['name'] ?? $exercise['name']);
                $weekly[$dayIndex]['exercises'][$exerciseIndex]['equipment'] = trim((string) ($candidate['equipment'] ?? $exercise['equipment'] ?? 'Bodyweight')) ?: 'Bodyweight';
            }

            $refillPool = $allowedCategories !== [] ? $this->filterPoolByCategories($pool, $allowedCategories) : $pool;
            $deduped = [];
            $seenNames = [];

            foreach ((array) $weekly[$dayIndex]['exercises'] as $exercise) {
                $nameKey = strtolower(trim((string) ($exercise['name'] ?? '')));
                if ($nameKey === '' || in_array($nameKey, $seenNames, true)) {
                    continue;
                }

                $seenNames[] = $nameKey;
                $deduped[] = $exercise;
            }

            $weekly[$dayIndex]['exercises'] = array_slice(
                $this->ensureMinimumExercises(
                    $deduped,
                    $refillPool !== [] ? $refillPool : $pool,
                    4,
                    $seed + ($dayIndex * 9),
                    $profile
                ),
                0,
                6
            );

            $lastTrainExerciseNames = array_values(array_filter(array_map(
                static fn (array $exercise): string => strtolower(trim((string) ($exercise['name'] ?? ''))),
                $weekly[$dayIndex]['exercises']
            )));
        }

        return $weekly;
    }

    private function collectMealNamesByCode(array $dietDays, string $mealCode): array
    {
        $names = [];

        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                if ($this->normalizeMealCode((string) ($meal['meal_code'] ?? '')) !== $mealCode) {
                    continue;
                }

                $firstName = trim((string) ($meal['items'][0]['name'] ?? ''));
                if ($firstName !== '') {
                    $names[] = $firstName;
                }
            }
        }

        return array_values(array_unique($names));
    }

    private function pickUnusedRotatingValue(array $values, array $usedKeys, int $seed): ?string
    {
        if ($values === []) {
            return null;
        }

        $count = count($values);
        for ($i = 0; $i < $count; $i++) {
            $candidate = trim((string) ($values[($seed + $i) % $count] ?? ''));
            if ($candidate === '') {
                continue;
            }

            if (! in_array(strtolower($candidate), $usedKeys, true)) {
                return $candidate;
            }
        }

        return null;
    }

    private function buildMealVariantName(string $baseName, array $usedNames, int $dayIndex): string
    {
        $baseName = trim($baseName);
        if ($baseName === '') {
            $baseName = 'Meal option';
        }

        $used = array_map(
            static fn (string $name): string => strtolower(trim($name)),
            $usedNames
        );
        $suffixes = ['Classic', 'Variation A', 'Variation B', 'Variation C', 'Variation D', 'Variation E'];

        foreach ($suffixes as $suffix) {
            $candidate = $baseName.' ('.$suffix.')';
            if (! in_array(strtolower($candidate), $used, true)) {
                return $candidate;
            }
        }

        return $baseName.' (Day '.$dayIndex.')';
    }

    private function buildGroceryListFromDietDays(array $dietDays): array
    {
        $totals = [];

        foreach ($dietDays as $day) {
            foreach ((array) ($day['meals'] ?? []) as $meal) {
                foreach ((array) ($meal['items'] ?? []) as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }

                    $portion = trim((string) ($item['portion'] ?? '1 serving')) ?: '1 serving';
                    $units = $this->portionUnits($portion);
                    $ingredients = $this->extractIngredientNames($name);
                    foreach ($ingredients as $ingredient) {
                        $key = strtolower(trim($ingredient));
                        if ($key === '') {
                            continue;
                        }

                        $profile = $this->ingredientQuantityProfile($ingredient);
                        $amount = $units * $profile['per_unit'];

                        if (! isset($totals[$key])) {
                            $totals[$key] = [
                                'category' => $this->inferGroceryCategory($ingredient),
                                'name' => $ingredient,
                                'measure' => $profile['measure'],
                                'amount' => 0.0,
                            ];
                        }

                        $totals[$key]['amount'] += $amount;
                    }
                }
            }
        }

        if ($totals === []) {
            return [];
        }

        uasort($totals, static function (array $left, array $right): int {
            $unitComparison = $right['amount'] <=> $left['amount'];
            if ($unitComparison !== 0) {
                return $unitComparison;
            }

            return strcasecmp((string) $left['name'], (string) $right['name']);
        });

        return array_values(array_map(function (array $entry): array {
            return [
                'category' => $entry['category'],
                'name' => $entry['name'],
                'quantity' => $this->formatGroceryQuantity((float) $entry['amount'], (string) ($entry['measure'] ?? 'serving')),
            ];
        }, $totals));
    }

    private function extractIngredientNames(string $mealName): array
    {
        $name = strtolower(trim($mealName));
        if ($name === '') {
            return [];
        }

        $map = [
            'chicken' => 'Chicken Breast',
            'turkey' => 'Turkey Breast',
            'beef' => 'Lean Beef',
            'salmon' => 'Salmon',
            'tuna' => 'Tuna',
            'fish' => 'White Fish',
            'shrimp' => 'Shrimp',
            'egg' => 'Eggs',
            'tofu' => 'Tofu',
            'lentil' => 'Lentils',
            'chickpea' => 'Chickpeas',
            'paneer' => 'Paneer',
            'yogurt' => 'Greek Yogurt',
            'cottage cheese' => 'Cottage Cheese',
            'labneh' => 'Labneh',
            'rice' => 'Rice',
            'quinoa' => 'Quinoa',
            'oat' => 'Oats',
            'bread' => 'Wholegrain Bread',
            'pasta' => 'Wholegrain Pasta',
            'bulgur' => 'Bulgur',
            'sweet potato' => 'Sweet Potatoes',
            'potato' => 'Potatoes',
            'broccoli' => 'Broccoli',
            'spinach' => 'Spinach',
            'cucumber' => 'Cucumber',
            'tomato' => 'Tomatoes',
            'carrot' => 'Carrots',
            'avocado' => 'Avocado',
            'banana' => 'Bananas',
            'apple' => 'Apples',
            'berries' => 'Berries',
            'olive oil' => 'Olive Oil',
            'hummus' => 'Hummus',
            'milk' => 'Milk',
        ];

        $ingredients = [];
        foreach ($map as $needle => $ingredient) {
            if (str_contains($name, $needle)) {
                $ingredients[] = $ingredient;
            }
        }

        if ($ingredients === []) {
            return [trim($mealName)];
        }

        return array_values(array_unique($ingredients));
    }

    private function inferGroceryCategory(string $name): string
    {
        $text = strtolower($name);
        if (str_contains($text, 'oil') || str_contains($text, 'hummus')) {
            return 'Pantry';
        }
        if ($this->containsAny($text, ['chicken', 'turkey', 'beef', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'tofu', 'lentil', 'chickpea', 'paneer'])) {
            return 'Protein';
        }
        if ($this->containsAny($text, ['yogurt', 'labneh', 'milk', 'cottage'])) {
            return 'Dairy';
        }
        if ($this->containsAny($text, ['rice', 'quinoa', 'oat', 'bread', 'pasta', 'bulgur', 'potato'])) {
            return 'Carbs';
        }
        if ($this->containsAny($text, ['broccoli', 'spinach', 'cucumber', 'tomato', 'carrot', 'banana', 'apple', 'berries', 'avocado'])) {
            return 'Produce';
        }

        return 'Pantry';
    }

    private function portionUnits(string $portion): float
    {
        $text = strtolower(trim($portion));
        if ($text === '') {
            return 1.0;
        }

        if (! preg_match('/(\d+(?:\.\d+)?)/', $text, $matches)) {
            return 1.0;
        }

        $amount = max(0.25, (float) $matches[1]);

        if (str_contains($text, 'g')) {
            return max(0.5, $amount / 100);
        }
        if (str_contains($text, 'ml')) {
            return max(0.5, $amount / 250);
        }

        return $amount;
    }

    private function ingredientQuantityProfile(string $ingredient): array
    {
        $name = strtolower(trim($ingredient));

        if ($this->containsAny($name, ['chicken', 'turkey', 'beef', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'paneer'])) {
            return ['measure' => 'g', 'per_unit' => 180.0];
        }
        if ($this->containsAny($name, ['rice', 'quinoa', 'oats', 'bulgur', 'pasta'])) {
            return ['measure' => 'g', 'per_unit' => 90.0];
        }
        if ($this->containsAny($name, ['potato', 'sweet potato'])) {
            return ['measure' => 'g', 'per_unit' => 250.0];
        }
        if ($this->containsAny($name, ['yogurt', 'labneh', 'cottage cheese'])) {
            return ['measure' => 'g', 'per_unit' => 200.0];
        }
        if ($this->containsAny($name, ['milk'])) {
            return ['measure' => 'ml', 'per_unit' => 300.0];
        }
        if ($this->containsAny($name, ['olive oil'])) {
            return ['measure' => 'ml', 'per_unit' => 15.0];
        }
        if ($this->containsAny($name, ['egg'])) {
            return ['measure' => 'piece', 'per_unit' => 2.0];
        }
        if ($this->containsAny($name, ['banana', 'apple', 'avocado', 'tomato', 'cucumber', 'carrot'])) {
            return ['measure' => 'piece', 'per_unit' => 1.0];
        }
        if ($this->containsAny($name, ['berries', 'broccoli', 'spinach', 'lentils', 'chickpeas', 'hummus'])) {
            return ['measure' => 'g', 'per_unit' => 120.0];
        }

        return ['measure' => 'serving', 'per_unit' => 1.0];
    }

    private function formatGroceryQuantity(float $amount, string $measure): string
    {
        $amount = max(0.1, $amount);
        $measure = strtolower(trim($measure));

        if ($measure === 'g') {
            if ($amount >= 1000) {
                return number_format($amount / 1000, 1).' kg';
            }

            return (string) ((int) (round($amount / 50) * 50)).' g';
        }

        if ($measure === 'ml') {
            if ($amount >= 1000) {
                return number_format($amount / 1000, 1).' L';
            }

            return (string) ((int) (round($amount / 50) * 50)).' ml';
        }

        if ($measure === 'piece') {
            return (string) max(1, (int) round($amount)).' pcs';
        }

        return (string) max(1, (int) round($amount)).' servings';
    }

    private function knownWorkoutSplitTemplates(int $trainingDays, string $location): array
    {
        $trainingDays = max(1, min(7, $trainingDays));

        return match ($trainingDays) {
            1 => [
                ['focus' => 'Full Body Strength', 'sequence' => ['lower', 'push', 'pull', 'lower', 'push']],
            ],
            2 => [
                ['focus' => 'Upper Body Strength', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => 'Lower Body Strength', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            3 => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            4 => [
                ['focus' => 'Upper A (Push and Pull)', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => 'Lower A (Quad Emphasis)', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Upper B (Hypertrophy Mix)', 'sequence' => ['pull', 'push', 'pull', 'push', 'pull']],
                ['focus' => 'Lower B (Posterior Chain)', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
            5 => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Upper Hypertrophy', 'sequence' => ['push', 'pull', 'push', 'pull', 'push']],
                ['focus' => $location === 'gym' ? 'Machine Full Body' : 'Full Body Strength', 'sequence' => ['lower', 'push', 'pull', 'lower', 'push']],
            ],
            default => [
                ['focus' => 'Push Day (Chest, Shoulders, Triceps)', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Day (Back, Biceps)', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => 'Leg Day', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
                ['focus' => 'Push Volume', 'sequence' => ['push', 'push', 'push', 'push', 'push']],
                ['focus' => 'Pull Volume', 'sequence' => ['pull', 'pull', 'pull', 'pull', 'pull']],
                ['focus' => $location === 'gym' ? 'Machine Lower' : 'Lower Strength', 'sequence' => ['lower', 'lower', 'lower', 'lower', 'lower']],
            ],
        };
    }

    private function pickExercisesByCategorySequence(array $pool, array $sequence, int $offset): array
    {
        $grouped = [];
        foreach ($pool as $exercise) {
            $category = $this->exerciseCategory((string) ($exercise['primary_muscle'] ?? ''));
            $grouped[$category] ??= [];
            $grouped[$category][] = $exercise;
        }

        $result = [];
        $used = [];
        foreach ($sequence as $index => $category) {
            $candidate = $this->pickExerciseCandidate($grouped[$category] ?? [], $pool, $used, $offset + $index);
            if ($candidate === null) {
                continue;
            }

            $result[] = $candidate;
        }

        return $result;
    }

    private function pickExerciseCandidate(array $preferredPool, array $fallbackPool, array &$usedNames, int $seed): ?array
    {
        $candidate = $this->pickUniqueExerciseFromPool($preferredPool, $usedNames, $seed);
        if ($candidate !== null) {
            return $candidate;
        }

        return $this->pickUniqueExerciseFromPool($fallbackPool, $usedNames, $seed + 5);
    }

    private function pickUniqueExerciseFromPool(array $pool, array &$usedNames, int $seed): ?array
    {
        $count = count($pool);
        if ($count === 0) {
            return null;
        }

        for ($i = 0; $i < $count; $i++) {
            $exercise = $pool[($seed + $i) % $count] ?? null;
            if (! is_array($exercise)) {
                continue;
            }

            $name = strtolower(trim((string) ($exercise['name'] ?? '')));
            if ($name === '' || in_array($name, $usedNames, true)) {
                continue;
            }

            $usedNames[] = $name;

            return $exercise;
        }

        return null;
    }

    private function ensureMinimumExercises(array $exercises, array $pool, int $minimum, int $offset, array $profile = []): array
    {
        $minimum = max(1, $minimum);
        $defaultRest = $this->restDefaultForGoal($profile);
        $result = array_values($exercises);
        $used = array_values(array_filter(array_map(
            static fn (array $exercise): string => strtolower(trim((string) ($exercise['name'] ?? ''))),
            $result
        )));

        $poolCount = count($pool);
        for ($i = 0; count($result) < $minimum && $poolCount > 0 && $i < ($poolCount * 3); $i++) {
            $candidate = $this->pickUniqueExerciseFromPool($pool, $used, $offset + $i);
            if (! is_array($candidate)) {
                continue;
            }

            $result[] = [
                'name' => (string) ($candidate['name'] ?? 'Exercise'),
                'sets' => 3,
                'reps' => '8-12',
                'rest_sec' => $defaultRest,
                'rpe' => 7.0,
                'equipment' => trim((string) ($candidate['equipment'] ?? 'Bodyweight')) ?: 'Bodyweight',
                'movement_notes' => null,
                'safer_alternative' => null,
            ];
        }

        for ($i = 0; count($result) < $minimum; $i++) {
            $result[] = [
                'name' => 'Accessory movement '.($i + 1),
                'sets' => 2,
                'reps' => '12-15',
                'rest_sec' => max(60, $defaultRest - 15),
                'rpe' => 6.0,
                'equipment' => 'Bodyweight',
                'movement_notes' => 'Controlled technique and pain-free range.',
                'safer_alternative' => 'Reduce range of motion',
            ];
        }

        return array_values($result);
    }

    private function exerciseCategory(string $muscle): string
    {
        $muscle = strtolower($muscle);
        if ($this->containsAny($muscle, ['core', 'abs', 'oblique'])) {
            return 'core';
        }
        if ($this->containsAny($muscle, ['quad', 'hamstring', 'glute', 'calf', 'leg', 'adductor', 'abductor'])) {
            return 'lower';
        }
        if ($this->containsAny($muscle, ['chest', 'shoulder', 'tricep'])) {
            return 'push';
        }
        if ($this->containsAny($muscle, ['back', 'lat', 'bicep', 'trap', 'rhomboid'])) {
            return 'pull';
        }

        return 'accessory';
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        $haystack = strtolower($haystack);
        foreach ($needles as $needle) {
            $needle = strtolower(trim((string) $needle));
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function allowedWorkoutCategoriesForFocus(string $focus): array
    {
        $focus = strtolower(trim($focus));
        if ($focus === '' || str_contains($focus, 'full body')) {
            return [];
        }
        if (str_contains($focus, 'upper') || (str_contains($focus, 'push') && str_contains($focus, 'pull'))) {
            return ['push', 'pull'];
        }
        if (str_contains($focus, 'push')) {
            return ['push'];
        }
        if (str_contains($focus, 'pull')) {
            return ['pull'];
        }
        if (str_contains($focus, 'leg') || str_contains($focus, 'lower')) {
            return ['lower'];
        }

        return [];
    }

    private function exerciseCategoryByName(string $name): string
    {
        $name = strtolower(trim($name));
        if ($name === '') {
            return '';
        }
        if ($this->containsAny($name, ['squat', 'lunge', 'leg', 'hamstring', 'calf', 'quad', 'glute', 'hip thrust', 'deadlift', 'abduction', 'adduction', 'hip abduction', 'hip adduction'])) {
            return 'lower';
        }
        if ($this->containsAny($name, ['row', 'pulldown', 'pull', 'lat pulldown', 'bicep', 'curl', 'rear delt', 'face pull'])) {
            return 'pull';
        }
        if ($this->containsAny($name, ['press', 'chest', 'shoulder', 'tricep', 'dip', 'fly', 'push', 'lateral raise'])) {
            return 'push';
        }
        if ($this->containsAny($name, ['plank', 'dead bug', 'crunch', 'core', 'oblique', 'ab'])) {
            return 'core';
        }

        return '';
    }

    private function filterPoolByCategories(array $pool, array $categories): array
    {
        if ($categories === []) {
            return $pool;
        }

        return array_values(array_filter($pool, function (array $exercise) use ($categories): bool {
            $category = $this->exerciseCategory((string) ($exercise['primary_muscle'] ?? ''));

            return in_array($category, $categories, true);
        }));
    }

    private function restDefaultForGoal(array $profile): int
    {
        $goalText = strtolower(trim(
            (string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? '')
        ));

        if ($goalText !== '' && preg_match('/gain|bulk|strength|hypertrophy|muscle/', $goalText)) {
            return 120;
        }
        if ($goalText !== '' && preg_match('/lose|loss|deficit|fat|cut|endurance/', $goalText)) {
            return 75;
        }

        return 90;
    }

    private function normalizeRestByGoal(int $rest, array $profile): int
    {
        $goalText = strtolower(trim(
            (string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? '')
        ));
        $minimum = 60;
        $maximum = 180;

        if ($goalText !== '' && preg_match('/lose|loss|deficit|fat|cut|endurance/', $goalText)) {
            $maximum = 105;
        } elseif ($goalText !== '' && preg_match('/gain|bulk|strength|hypertrophy|muscle/', $goalText)) {
            $minimum = 75;
            $maximum = 180;
        } else {
            $maximum = 150;
        }

        return max($minimum, min($maximum, $rest));
    }

    private function applyWorkoutScheduleConstraints(
        array $weekly,
        array $profile,
        array $exerciseCatalog,
        int $seed = 0
    ): array {
        $targetDays = max(1, min(7, (int) ($profile['workout_days_per_week'] ?? 3)));
        $preferredIndexes = $this->preferredWorkoutDayIndexes($profile['preferred_workout_days'] ?? []);
        $planLocation = $this->normalizeWorkoutLocation($profile['workout_location'] ?? null, $profile);
        $availableEquipment = $this->normalizeList($profile['available_equipment'] ?? []);

        if ($preferredIndexes !== []) {
            $trainDays = array_slice($preferredIndexes, 0, $targetDays);
            if (count($trainDays) < $targetDays) {
                foreach (range(1, 7) as $index) {
                    if (in_array($index, $trainDays, true)) {
                        continue;
                    }
                    $trainDays[] = $index;
                    if (count($trainDays) >= $targetDays) {
                        break;
                    }
                }
            }
        } else {
            $existingTrain = [];
            foreach ($weekly as $day) {
                if (strtolower((string) ($day['session_type'] ?? '')) === 'train') {
                    $existingTrain[] = (int) ($day['day_index'] ?? 0);
                }
            }
            $trainDays = array_slice(array_values(array_unique(array_filter($existingTrain))), 0, $targetDays);
            if (count($trainDays) < $targetDays) {
                foreach (range(1, 7) as $index) {
                    if (in_array($index, $trainDays, true)) {
                        continue;
                    }
                    $trainDays[] = $index;
                    if (count($trainDays) >= $targetDays) {
                        break;
                    }
                }
            }
        }

        sort($trainDays);
        $splitTemplates = $this->knownWorkoutSplitTemplates(count($trainDays), $planLocation);
        $splitByDay = [];
        $splitOffset = $seed % max(1, count($splitTemplates));
        foreach ($trainDays as $slot => $dayIndex) {
            $splitByDay[$dayIndex] = $splitTemplates[($splitOffset + $slot) % max(1, count($splitTemplates))] ?? null;
        }

        foreach ($weekly as $i => $day) {
            $dayIndex = (int) ($day['day_index'] ?? ($i + 1));
            $isTrain = in_array($dayIndex, $trainDays, true);
            $weekly[$i]['location'] = $this->normalizeWorkoutLocation($day['location'] ?? null, $profile);

            if ($isTrain) {
                $split = $splitByDay[$dayIndex] ?? null;
                $weekly[$i]['session_type'] = 'train';
                $weekly[$i]['duration_min'] = max(25, (int) ($day['duration_min'] ?? 40));
                $weekly[$i]['focus'] = trim((string) ($split['focus'] ?? ($day['focus'] ?? 'Training day'))) ?: 'Training day';
                $weekly[$i]['exercises'] = $this->normalizeExercises(
                    $split !== null ? [] : (is_array($day['exercises'] ?? null) ? $day['exercises'] : []),
                    $exerciseCatalog,
                    (string) $weekly[$i]['location'],
                    (($dayIndex - 1) * 5) + $seed,
                    is_array($split['sequence'] ?? null) ? $split['sequence'] : [],
                    $availableEquipment,
                    $profile
                );
            } else {
                $weekly[$i]['session_type'] = $dayIndex % 2 === 0 ? 'recovery' : 'rest';
                $weekly[$i]['focus'] = $weekly[$i]['session_type'] === 'recovery' ? 'Active recovery and mobility' : 'Rest and recharge';
                $weekly[$i]['duration_min'] = $weekly[$i]['session_type'] === 'recovery'
                    ? max(15, (int) ($day['duration_min'] ?? 20))
                    : 0;
                $weekly[$i]['exercises'] = [];
            }
        }

        return $weekly;
    }

    private function normalizeWorkoutLocation(mixed $location, array $profile): string
    {
        $value = strtolower(trim((string) $location));
        $preferred = strtolower(trim((string) ($profile['workout_location'] ?? '')));

        if ($preferred === 'both') {
            return 'gym';
        }

        if (in_array($preferred, ['home', 'gym'], true)) {
            return $preferred;
        }

        if ($value === 'both') {
            return 'gym';
        }

        if (in_array($value, ['home', 'gym'], true)) {
            return $value;
        }

        return 'gym';
    }

    private function catalogFoodForMeal(string $mealCode, array $mealCatalog, int $seed = 0, array $profile = []): ?array
    {
        $items = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];
        $blockedNeedles = $this->blockedFoodNeedles($profile);
        $filtered = array_values(array_filter($items, function (array $item) use ($mealCode, $blockedNeedles): bool {
            return $this->isAllowedMealNameForCode((string) ($item['name'] ?? ''), $mealCode, $blockedNeedles);
        }));
        if ($filtered !== []) {
            $items = $filtered;
        }
        if ($items === []) {
            return null;
        }

        return $items[$seed % count($items)] ?? $items[0] ?? null;
    }

    private function catalogMealNames(array $mealCatalog, string $mealCode, array $profile = []): array
    {
        $items = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];
        $blockedNeedles = $this->blockedFoodNeedles($profile);

        $names = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['name'] ?? '')),
            $items
        ), fn (string $name): bool => $this->isAllowedMealNameForCode($name, $mealCode, $blockedNeedles)));

        return array_values(array_unique($names));
    }

    private function pickRotatingValue(array $values, int $seed): ?string
    {
        if ($values === []) {
            return null;
        }

        return $values[$seed % count($values)] ?? null;
    }

    private function filterCatalogExercisesByLocation(array $exerciseCatalog, string $location, array $availableEquipment = [], array $profile = []): array
    {
        $catalog = array_map(function (array $exercise): array {
            return [
                'name' => trim((string) ($exercise['name'] ?? '')),
                'primary_muscle' => trim((string) ($exercise['primary_muscle'] ?? '')),
                'equipment' => trim((string) ($exercise['equipment'] ?? '')) ?: 'Bodyweight',
                'difficulty' => trim((string) ($exercise['difficulty'] ?? '')),
                'home_friendly' => (bool) ($exercise['home_friendly'] ?? false),
            ];
        }, array_merge($exerciseCatalog, $this->defaultExercisePool($location)));

        $catalog = array_values(array_filter($catalog, static function (array $exercise): bool {
            $name = strtolower(trim((string) ($exercise['name'] ?? '')));

            return $name !== '' && ! str_starts_with($name, 'debug ');
        }));
        $catalog = array_values(array_filter($catalog, fn (array $exercise): bool => ! $this->looksRecoveryStyleExercise((string) ($exercise['name'] ?? ''))));
        $catalog = array_values(array_filter($catalog, fn (array $exercise): bool => ! $this->exerciseConflictsWithProfile((string) ($exercise['name'] ?? ''), $profile)));

        if ($catalog === []) {
            return [];
        }

        $catalog = array_values(array_unique($catalog, SORT_REGULAR));

        if ($location === 'home') {
            $equipment = array_values(array_filter(array_map(
                static fn ($item): string => strtolower(trim((string) $item)),
                $availableEquipment
            )));

            $home = array_values(array_filter($catalog, static function (array $exercise): bool {
                return (bool) ($exercise['home_friendly'] ?? false)
                    || str_contains(strtolower((string) ($exercise['equipment'] ?? '')), 'bodyweight');
            }));

            $home = array_values(array_filter($home, static function (array $exercise) use ($equipment): bool {
                $equipmentText = strtolower(trim((string) ($exercise['equipment'] ?? '')));
                if ($equipmentText === '' || str_contains($equipmentText, 'bodyweight')) {
                    return true;
                }
                if ($equipment === []) {
                    return false;
                }

                foreach ($equipment as $available) {
                    if ($available !== '' && (str_contains($equipmentText, $available) || str_contains($available, $equipmentText))) {
                        return true;
                    }
                }

                return false;
            }));

            if ($home !== []) {
                return $home;
            }

            $bodyweightOnly = array_values(array_filter($catalog, static function (array $exercise): bool {
                return str_contains(strtolower((string) ($exercise['equipment'] ?? '')), 'bodyweight');
            }));

            return $bodyweightOnly !== [] ? $bodyweightOnly : $catalog;
        }

        if ($location === 'gym') {
            $pool = array_values($catalog);
            usort($pool, static function (array $a, array $b): int {
                $score = static function (array $exercise): int {
                    $equipment = strtolower((string) ($exercise['equipment'] ?? ''));

                    return match (true) {
                        str_contains($equipment, 'machine') => 0,
                        str_contains($equipment, 'cable') => 1,
                        str_contains($equipment, 'barbell') => 2,
                        str_contains($equipment, 'dumbbell') => 3,
                        str_contains($equipment, 'kettlebell') => 4,
                        str_contains($equipment, 'bodyweight') => 8,
                        default => 5,
                    };
                };

                return $score($a) <=> $score($b);
            });

            return $pool;
        }

        return array_values($catalog);
    }

    private function defaultExercisePool(string $location): array
    {
        if ($location === 'gym') {
            return [
                ['name' => 'Leg Press', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Hack Squat Machine', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Machine', 'difficulty' => 'Intermediate'],
                ['name' => 'Romanian Deadlift', 'primary_muscle' => 'Hamstrings', 'equipment' => 'Barbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Leg Curl Machine', 'primary_muscle' => 'Hamstrings', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Walking Dumbbell Lunge', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Machine Chest Press', 'primary_muscle' => 'Chest', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Incline Dumbbell Press', 'primary_muscle' => 'Chest', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Seated Dumbbell Shoulder Press', 'primary_muscle' => 'Shoulders', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate'],
                ['name' => 'Cable Triceps Pushdown', 'primary_muscle' => 'Triceps', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Machine Lateral Raise', 'primary_muscle' => 'Shoulders', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Seated Cable Row', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Lat Pulldown', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Cable Face Pull', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Dumbbell Hammer Curl', 'primary_muscle' => 'Biceps', 'equipment' => 'Dumbbell', 'difficulty' => 'Beginner'],
                ['name' => 'Chest Supported Row Machine', 'primary_muscle' => 'Back', 'equipment' => 'Machine', 'difficulty' => 'Beginner'],
                ['name' => 'Cable Crunch', 'primary_muscle' => 'Core', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner'],
                ['name' => 'Plank', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner'],
            ];
        }

        return [
            ['name' => 'Bodyweight Squat', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Chair Step Up', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Wall Sit', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Reverse Lunge', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Glute Bridge', 'primary_muscle' => 'Glutes', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Intermediate', 'home_friendly' => true],
            ['name' => 'Incline Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Pike Push Up', 'primary_muscle' => 'Shoulders', 'equipment' => 'Bodyweight', 'difficulty' => 'Intermediate', 'home_friendly' => true],
            ['name' => 'Chair Triceps Dip', 'primary_muscle' => 'Triceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Bodyweight Towel Row', 'primary_muscle' => 'Back', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Doorframe Row', 'primary_muscle' => 'Back', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Resistance Band Row', 'primary_muscle' => 'Back', 'equipment' => 'Resistance Band', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'One Arm Dumbbell Row', 'primary_muscle' => 'Back', 'equipment' => 'Dumbbell', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Dead Bug', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Plank', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
        ];
    }

    private function preferredWorkoutDayIndexes(mixed $value): array
    {
        $mapping = [
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
            'sunday' => 7,
        ];

        if (! is_array($value)) {
            return [];
        }

        $indexes = [];
        foreach ($value as $day) {
            $key = strtolower(trim((string) $day));
            if (isset($mapping[$key])) {
                $indexes[] = $mapping[$key];
            }
        }

        return array_values(array_unique($indexes));
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
            $text = trim((string) $item);
            if ($text !== '') {
                $items[] = $text;
            }
        }

        return array_values(array_unique($items));
    }

    private function normalizeMealCode(string $value): string
    {
        $value = strtolower(trim($value));

        return match (true) {
            str_contains($value, 'break') => 'breakfast',
            str_contains($value, 'lunch') => 'lunch',
            str_contains($value, 'dinner') => 'dinner',
            str_contains($value, 'drink') => 'drink',
            default => 'snack',
        };
    }

    private function looksGenericMealName(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return true;
        }

        if (in_array($text, ['meal', 'plate', 'bowl', 'protein dish', 'healthy option'], true)) {
            return true;
        }

        if (
            preg_match('/^(breakfast|lunch|dinner|snack|meal)(\s+[a-z]+)?\s+option(\s+\d+)?$/', $text)
            || preg_match('/^(breakfast|lunch|dinner|snack)\s+\d+$/', $text)
        ) {
            return true;
        }

        foreach (['balanced', 'simple', 'structured', 'alternate', 'healthy'] as $token) {
            if ($text === $token || str_starts_with($text, $token.' ')) {
                return true;
            }
        }

        return false;
    }

    private function mealNamesRoughlyMatch(string $left, string $right): bool
    {
        $left = strtolower(trim($left));
        $right = strtolower(trim($right));

        if ($left === '' || $right === '') {
            return false;
        }

        if ($left === $right || str_contains($left, $right) || str_contains($right, $left)) {
            return true;
        }

        $leftTokens = array_values(array_filter(explode(' ', preg_replace('/\s+/', ' ', $left) ?: '')));
        $rightTokens = array_values(array_filter(explode(' ', preg_replace('/\s+/', ' ', $right) ?: '')));
        $overlap = count(array_intersect($leftTokens, $rightTokens));

        return $overlap >= 2;
    }

    private function isAllowedMealNameForCode(string $name, string $mealCode, array $blockedNeedles = []): bool
    {
        $name = trim($name);
        if ($name === '' || $this->looksGenericMealName($name) || $this->looksQuestionableFoodName($name)) {
            return false;
        }

        if ($blockedNeedles !== [] && $this->containsAny($name, $blockedNeedles)) {
            return false;
        }

        return ! (
            strtolower(trim($mealCode)) !== 'snack'
            && ($this->looksLikeSnackOrDrink($name) || $this->looksLikeStandaloneSnack($name))
        );
    }

    private function looksQuestionableFoodName(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return true;
        }

        return $this->containsAny($text, [
            'gandour',
            'rice pops',
            'snickers',
            'mars bar',
            'kitkat',
            'oreo',
            'doritos',
            'cheetos',
            'vodka',
            'beer',
            'wine',
            'tequila',
            'whiskey',
            'candy',
            'chocolate bar',
        ]);
    }

    private function looksLikeSnackOrDrink(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        return $this->containsAny($text, [
            'chips',
            'wafer',
            'cookie',
            'biscuit',
            'ice cream',
            'cola',
            'soda',
            'juice',
            'energy drink',
            'soft drink',
            'candy',
            'chocolate bar',
            'protein wafer',
            'dessert',
        ]);
    }

    private function looksLikeStandaloneSnack(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        return $this->containsAny($text, [
            'protein bar',
            'granola bar',
            'cereal bar',
            'trail mix',
            'mixed nuts',
            'roasted chickpea',
            'roasted chickpeas',
            'coated peanut',
            'coated peanuts',
            'rice cake',
            'rice cakes',
            'cracker',
            'crackers',
            'pretzel',
            'popcorn',
            'pringles',
            'nutella',
            'hot chocolate',
            'chocolate drink',
            'milkshake',
            'brownie',
            'cupcake',
        ]);
    }

    private function snackNameLibrary(array $profile): array
    {
        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));
        $blockedNeedles = $this->blockedFoodNeedles($profile);

        $options = str_contains($dietType, 'vegan')
            ? [
                'Roasted chickpeas and fruit cup',
                'Protein oat smoothie',
                'Rice cakes with hummus',
                'Chia pudding with berries',
                'Edamame and cucumber box',
                'Apple slices with tahini',
                'Pea protein yogurt cup',
            ]
            : [
                'Greek yogurt and berries cup',
                'Cottage cheese with fruit',
                'Milk banana protein shake',
                'Wholegrain crackers with labneh',
                'Apple with peanut-free nut butter',
                'Boiled eggs and cherry tomatoes',
                'Tuna and wholegrain crackers',
            ];

        return array_values(array_filter(
            $options,
            fn (string $name): bool => $this->isAllowedMealNameForCode($name, 'snack', $blockedNeedles)
        ));
    }

    private function mealNameLibrary(string $mealCode, array $profile): array
    {
        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));
        $blockedNeedles = $this->blockedFoodNeedles($profile);

        $options = match ($this->normalizeMealCode($mealCode)) {
            'breakfast' => str_contains($dietType, 'vegan')
                ? [
                    'Overnight oats with berries',
                    'Tofu scramble plate',
                    'Chia pudding with fruit',
                    'Hummus avocado toast',
                    'Protein smoothie bowl',
                    'Banana oat breakfast bowl',
                    'Soy yogurt fruit bowl',
                ]
                : [
                    'Greek yogurt fruit bowl',
                    'Vegetable omelet with toast',
                    'Overnight oats with berries',
                    'Labneh toast plate',
                    'Protein smoothie bowl',
                    'Cottage cheese oats bowl',
                    'Egg and avocado toast',
                ],
            'lunch' => str_contains($dietType, 'vegan')
                ? [
                    'Tofu rice bowl',
                    'Lentil quinoa salad',
                    'Chickpea vegetable wrap',
                    'Tempeh bulgur plate',
                    'Bean and rice bowl',
                    'Falafel salad plate',
                    'Pasta with tomato lentil sauce',
                ]
                : [
                    'Grilled chicken rice bowl',
                    'Turkey quinoa salad',
                    'Tuna potato plate',
                    'Lean beef bulgur bowl',
                    'Chicken pasta salad',
                    'Salmon rice plate',
                    'Lentil chicken soup',
                ],
            'dinner' => str_contains($dietType, 'vegan')
                ? [
                    'Lentil soup with toast',
                    'Tofu vegetable stir-fry',
                    'Chickpea potato tray',
                    'Bean chili bowl',
                    'Quinoa vegetable plate',
                    'Tempeh rice bowl',
                    'Stuffed bell pepper with rice',
                ]
                : [
                    'Baked fish with potatoes',
                    'Chicken vegetable tray',
                    'Turkey rice plate',
                    'Lean beef stir-fry bowl',
                    'Salmon quinoa plate',
                    'Chicken lentil stew',
                    'Shrimp rice bowl',
                ],
            'snack' => array_merge(
                $this->snackNameLibrary($profile),
                [
                    'Dark chocolate and fruit cup',
                    'Frozen yogurt berry cup',
                    'Protein cocoa shake',
                ]
            ),
            default => [],
        };

        return array_values(array_unique(array_filter(
            $options,
            fn (string $name): bool => $this->isAllowedMealNameForCode($name, $mealCode, $blockedNeedles)
        )));
    }

    private function blockedFoodNeedles(array $profile): array
    {
        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));
        $allergies = $this->normalizeList($profile['allergies'] ?? []);
        $needles = [];

        if (str_contains($dietType, 'vegan')) {
            $needles = array_merge($needles, ['chicken', 'beef', 'pork', 'fish', 'tuna', 'egg', 'yogurt', 'milk', 'cheese', 'honey']);
        } elseif (str_contains($dietType, 'vegetarian')) {
            $needles = array_merge($needles, ['chicken', 'beef', 'pork', 'fish', 'tuna', 'lamb', 'turkey']);
        } elseif (str_contains($dietType, 'pescetarian')) {
            $needles = array_merge($needles, ['chicken', 'beef', 'pork', 'lamb', 'turkey']);
        }

        foreach ($allergies as $allergy) {
            $needle = strtolower(trim((string) $allergy));
            if ($needle === '') {
                continue;
            }

            $needles[] = $needle;
            if (str_ends_with($needle, 's') && strlen($needle) > 4) {
                $needles[] = rtrim($needle, 's');
            }

            $needles = array_merge($needles, $this->allergyAssociatedFoodNeedles($needle));
        }

        return array_values(array_unique(array_filter($needles)));
    }

    private function allergyAssociatedFoodNeedles(string $allergy): array
    {
        $allergy = strtolower(trim($allergy));

        return match (true) {
            str_contains($allergy, 'milk'), str_contains($allergy, 'dairy'), str_contains($allergy, 'lactose') => [
                'milk', 'dairy', 'yogurt', 'greek yogurt', 'cheese', 'labneh', 'cottage cheese', 'whey', 'butter', 'cream', 'paneer',
            ],
            str_contains($allergy, 'egg') => ['egg'],
            str_contains($allergy, 'soy') => ['soy', 'tofu', 'edamame', 'tempeh', 'soy milk'],
            str_contains($allergy, 'peanut') => ['peanut', 'groundnut', 'peanut butter'],
            str_contains($allergy, 'tree nut'), str_contains($allergy, 'nut') => ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'nut butter'],
            str_contains($allergy, 'sesame') => ['sesame', 'tahini'],
            str_contains($allergy, 'gluten'), str_contains($allergy, 'wheat') => ['wheat', 'bread', 'pasta', 'bulgur', 'cracker'],
            str_contains($allergy, 'shellfish') => ['shrimp', 'prawn', 'crab', 'lobster'],
            str_contains($allergy, 'fish') => ['fish', 'salmon', 'tuna', 'cod'],
            default => [],
        };
    }

    private function looksGenericExerciseName(string $name): bool
    {
        $text = strtolower(trim($name));

        return $text === ''
            || str_starts_with($text, 'debug ')
            || in_array($text, ['exercise', 'strength exercise', 'cardio movement', 'mobility drill'], true);
    }

    private function looksRecoveryStyleExercise(string $name): bool
    {
        $text = strtolower(trim($name));
        if ($text === '') {
            return false;
        }

        if (str_contains($text, 'walk') && ! $this->containsAny($text, ['lunge', 'farmer', 'sled'])) {
            return true;
        }

        return $this->containsAny($text, [
            'stretch',
            'mobility',
            'foam roll',
            'breathing',
            'activation',
            'recovery',
        ]);
    }

    private function injuryBlockedExerciseNeedles(array $profile): array
    {
        $text = strtolower(implode(' ', $this->normalizeList($profile['injury_history'] ?? [])));
        $blocked = [];

        if (str_contains($text, 'knee')) {
            $blocked = array_merge($blocked, ['jump squat', 'plyometric squat', 'depth jump', 'box jump']);
        }
        if (str_contains($text, 'shoulder')) {
            $blocked = array_merge($blocked, ['upright row', 'behind the neck press', 'arnold press']);
        }
        if (str_contains($text, 'lower back') || str_contains($text, 'back')) {
            $blocked = array_merge($blocked, ['good morning', 'max deadlift', 'heavy barbell row']);
        }
        if (str_contains($text, 'elbow')) {
            $blocked[] = 'skull crusher';
        }
        if (str_contains($text, 'wrist')) {
            $blocked[] = 'handstand push-up';
        }

        return array_values(array_unique($blocked));
    }

    private function exerciseConflictsWithProfile(string $name, array $profile): bool
    {
        $name = strtolower(trim($name));
        if ($name === '') {
            return false;
        }

        return $this->containsAny($name, $this->injuryBlockedExerciseNeedles($profile));
    }

    private function exerciseNeedsHomeReplacement(string $name, string $equipment, string $location, array $availableEquipment): bool
    {
        if (strtolower(trim($location)) !== 'home') {
            return false;
        }

        $equipmentText = strtolower(trim($equipment));
        $nameText = strtolower(trim($name));
        if ($equipmentText === '' || str_contains($equipmentText, 'bodyweight')) {
            return false;
        }

        $equipmentNeedles = [
            'barbell',
            'cable',
            'smith machine',
            'leg press',
            'lat pulldown',
            'machine',
            'treadmill',
        ];
        if (! $this->containsAny($equipmentText.' '.$nameText, $equipmentNeedles)) {
            return false;
        }

        $available = array_map(
            static fn ($item): string => strtolower(trim((string) $item)),
            $availableEquipment
        );
        foreach ($available as $item) {
            if ($item !== '' && (str_contains($equipmentText, $item) || str_contains($item, $equipmentText))) {
                return false;
            }
        }

        return true;
    }

    private function mergeConstraintNotes(array $existing, array $profile): array
    {
        $notes = array_values(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $existing
        )));

        if (! empty($profile['dietary_goal'])) {
            $notes[] = 'Dietary goal: '.$profile['dietary_goal'];
        }
        if (! empty($profile['fitness_goal'])) {
            $notes[] = 'Fitness goal: '.$profile['fitness_goal'];
        }
        if (! empty($profile['diet_type'])) {
            $notes[] = 'Diet type respected: '.$profile['diet_type'];
        }
        if (! empty($profile['allergies'])) {
            $notes[] = 'Allergies avoided: '.implode(', ', (array) $profile['allergies']);
        }
        if (! empty($profile['medical_conditions'])) {
            $notes[] = 'Medical conditions considered: '.implode(', ', (array) $profile['medical_conditions']);
        }
        if (! empty($profile['injury_history'])) {
            $notes[] = 'Injury history considered: '.implode(', ', (array) $profile['injury_history']);
        }
        if (! empty($profile['workout_location'])) {
            $notes[] = 'Preferred workout location: '.$profile['workout_location'];
        }
        if (! empty($profile['workout_days_per_week'])) {
            $notes[] = 'Workout frequency target: '.(int) $profile['workout_days_per_week'].' days/week';
        }
        if (! empty($profile['preferred_workout_days']) && is_array($profile['preferred_workout_days'])) {
            $notes[] = 'Preferred workout days: '.implode(', ', $profile['preferred_workout_days']);
        }

        return array_values(array_unique($notes));
    }

    private function plannerSeed(int $userId, array $profile, array $context = []): int
    {
        $parts = [
            'uid:'.$userId,
            'diet:'.strtolower(trim((string) ($profile['diet_type'] ?? ''))),
            'goal:'.strtolower(trim((string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? ''))),
            'days:'.(int) ($profile['workout_days_per_week'] ?? 0),
            'location:'.strtolower(trim((string) ($profile['workout_location'] ?? ''))),
            'allergies:'.implode(',', array_map('strtolower', $this->normalizeList($profile['allergies'] ?? []))),
            'injuries:'.implode(',', array_map('strtolower', $this->normalizeList($profile['injury_history'] ?? []))),
            'equipment:'.implode(',', array_map('strtolower', $this->normalizeList($profile['available_equipment'] ?? []))),
        ];

        $contextVersions = is_array($context['existing_plan_versions'] ?? null) ? $context['existing_plan_versions'] : [];
        if ($contextVersions !== []) {
            $parts[] = 'versions:'.implode(',', array_map(static fn ($value): string => (string) $value, $contextVersions));
        }

        return (int) sprintf('%u', crc32(implode('|', $parts)));
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

    private function attachProgressPrediction(
        User $user,
        array $plan,
        array $profile,
        array $context,
        int $horizonDays
    ): array {
        $prediction = $this->progressPrediction->predict(
            $user,
            $profile,
            $context,
            $plan,
            $this->normalizePlanHorizonDays($horizonDays)
        );

        if (is_array($prediction)) {
            $plan['progress_prediction'] = $prediction;
        }

        return $plan;
    }

    private function enforceAdaptivePlanAdjustment(array $plan): array
    {
        if (! (bool) config('ai.planner.adaptation.enabled', true)) {
            return $plan;
        }

        $prediction = is_array($plan['progress_prediction'] ?? null) ? $plan['progress_prediction'] : null;
        if (! is_array($prediction)) {
            return $plan;
        }

        $feedback = is_array($prediction['feedback_adjustment'] ?? null) ? $prediction['feedback_adjustment'] : [];
        $lastError = is_numeric($feedback['last_prediction_error_kg_per_week'] ?? null)
            ? (float) $feedback['last_prediction_error_kg_per_week']
            : null;
        $threshold = max(0.01, (float) config('ai.planner.adaptation.enforce_when_abs_error_weekly_gte', 0.12));
        if ($lastError === null || abs($lastError) < $threshold) {
            return $plan;
        }

        $calorieStep = max(40, (int) config('ai.planner.adaptation.calorie_step_kcal', 120));
        $durationStep = max(2, (int) config('ai.planner.adaptation.workout_duration_step_min', 5));
        $expectedChange = is_numeric($prediction['expected_weight_change_kg'] ?? null)
            ? (float) $prediction['expected_weight_change_kg']
            : 0.0;

        $currentCalories = (int) data_get($plan, 'diet.daily_targets.calories_kcal', 0);
        $calorieDelta = $this->adaptiveCalorieDelta($lastError, $expectedChange, $calorieStep);
        if ($currentCalories > 0) {
            $newCalories = max(1100, min(4800, $currentCalories + $calorieDelta));
            data_set($plan, 'diet.daily_targets.calories_kcal', $newCalories);
        }

        $schedule = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];
        foreach ($schedule as $idx => $day) {
            $sessionType = strtolower(trim((string) ($day['session_type'] ?? 'train')));
            $duration = (int) ($day['duration_min'] ?? 0);
            if (in_array($sessionType, ['rest', 'recovery'], true) || $duration <= 0) {
                continue;
            }

            $adjustedDuration = $calorieDelta < 0
                ? min(120, $duration + $durationStep)
                : max(20, $duration - $durationStep);
            $schedule[$idx]['duration_min'] = $adjustedDuration;
            break;
        }
        if ($schedule !== []) {
            data_set($plan, 'workout.weekly_schedule', $schedule);
        }

        $directionLabel = $calorieDelta < 0 ? 'tightened' : 'relaxed';
        $rules = is_array(data_get($plan, 'workout.progression_rules')) ? data_get($plan, 'workout.progression_rules') : [];
        $rules[] = sprintf(
            'Adaptive cycle adjustment applied: %s calories by %d kcal based on %.2f kg/week prediction error.',
            $directionLabel,
            abs($calorieDelta),
            $lastError
        );
        data_set($plan, 'workout.progression_rules', array_values(array_unique(array_filter($rules))));

        $triggers = is_array(data_get($plan, 'adaptive_review.replanning_triggers')) ? data_get($plan, 'adaptive_review.replanning_triggers') : [];
        $triggers[] = sprintf(
            'Auto-adjusted this cycle because absolute prediction error reached %.2f kg/week (threshold %.2f).',
            abs($lastError),
            $threshold
        );
        data_set($plan, 'adaptive_review.replanning_triggers', array_values(array_unique(array_filter($triggers))));

        data_set($plan, 'adaptive_review.last_adaptation', [
            'applied' => true,
            'abs_error_kg_per_week' => round(abs($lastError), 3),
            'threshold_kg_per_week' => round($threshold, 3),
            'calorie_delta_kcal' => $calorieDelta,
            'workout_duration_step_min' => $durationStep,
        ]);

        return $plan;
    }

    private function adaptiveCalorieDelta(float $lastErrorPerWeek, float $expectedWeightChange, int $step): int
    {
        $goalMode = $expectedWeightChange < -0.05
            ? 'lose'
            : ($expectedWeightChange > 0.05 ? 'gain' : 'maintain');

        return match ($goalMode) {
            'lose' => $lastErrorPerWeek > 0 ? -$step : $step,
            'gain' => $lastErrorPerWeek > 0 ? -$step : $step,
            default => $lastErrorPerWeek > 0 ? -max(60, (int) round($step * 0.7)) : max(60, (int) round($step * 0.7)),
        };
    }

    private function applyPersistedGenerationScope(
        array $generatedPlan,
        ?array $existingPlan,
        bool $generateDiet,
        bool $generateWorkout
    ): array {
        $composite = $generatedPlan;

        if (! $generateDiet) {
            if (is_array($existingPlan['diet'] ?? null)) {
                $composite['diet'] = $existingPlan['diet'];
            } else {
                unset($composite['diet']);
            }
        }

        if (! $generateWorkout) {
            if (is_array($existingPlan['workout'] ?? null)) {
                $composite['workout'] = $existingPlan['workout'];
            } else {
                unset($composite['workout']);
            }
        }

        return $composite;
    }

    public function latestPair(User $user): ?array
    {
        $diet = AiPlan::query()
            ->with('aiRequest')
            ->where('user_id', $user->id)
            ->where('type', 'diet')
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->first();
        $workout = AiPlan::query()
            ->with('aiRequest')
            ->where('user_id', $user->id)
            ->where('type', 'workout')
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->first();

        if (! $diet && ! $workout) {
            return null;
        }

        $anchor = collect([$diet, $workout])
            ->filter()
            ->sortByDesc(static fn (AiPlan $plan) => sprintf('%010d-%010d', (int) $plan->version, (int) $plan->id))
            ->first();

        $fullPlan = is_array($anchor?->aiRequest?->output_json) ? $anchor->aiRequest->output_json : [];

        if ($diet) {
            $fullPlan['diet'] = $diet->plan_json;
        } else {
            unset($fullPlan['diet']);
        }

        if ($workout) {
            $fullPlan['workout'] = $workout->plan_json;
        } else {
            unset($fullPlan['workout']);
        }

        return [
            'ok' => true,
            'ai_request_id' => $anchor?->ai_request_id,
            'generation_id' => (string) ($anchor?->generation_id ?? ''),
            'version' => (int) ($anchor?->version ?? 0),
            'plan' => $fullPlan,
            'plans' => [
                'diet' => $diet?->plan_json,
                'workout' => $workout?->plan_json,
            ],
            'provider' => $anchor?->aiRequest?->provider,
            'model' => $anchor?->aiRequest?->model,
            'prompt_version' => $anchor?->aiRequest?->prompt_version,
            'schema_version' => $anchor?->aiRequest?->schema_version,
            'usage' => $anchor?->aiRequest?->usage_json ?? [
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
            ],
        ];
    }

    private function startAiRequest(User $user, array $context): AiRequest
    {
        return AiRequest::query()->create([
            'user_id' => $user->id,
            'type' => 'plan_generator',
            'status' => 'running',
            'provider' => $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER),
            'model' => null,
            'prompt_version' => $this->features->promptVersion(FeatureConfigResolver::FEATURE_PLANNER),
            'schema_version' => $this->features->schemaVersion(FeatureConfigResolver::FEATURE_PLANNER),
            'input_context_json' => $context,
        ]);
    }

    private function finishAiRequest(AiRequest $request, ?array $output, array $response, ?Throwable $error): void
    {
        $request->forceFill([
            'status' => $error ? 'failed' : 'completed',
            'provider' => (string) ($response['provider'] ?? $request->provider),
            'model' => $response['model'] ?? null,
            'output_json' => $output,
            'usage_json' => $response['usage'] ?? [],
            'error_json' => $error ? [
                'message' => $error->getMessage(),
                'type' => $error::class,
            ] : null,
        ])->save();
    }
}
