<?php

namespace App\Services\Ai;

use App\Models\AiPlan;
use App\Models\AiRequest;
use App\Models\User;
use App\Services\Ai\Context\PlannerContextBuilder;
use App\Services\Ai\Evaluation\PlannerRunQualityScorer;
use App\Services\Ai\Models\ProgressPredictionModel;
use App\Services\Ai\Persistence\PlannerPersistenceService;
use App\Services\Ai\Planner\PlannerProfileSyncService;
use App\Services\Ai\Prompts\PlannerPrompt;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use App\Services\Ai\Runtime\GenerativeAiGateway;
use App\Services\Ai\Schemas\PlannerSchema;
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
        private readonly ProgressPredictionModel $progressPrediction,
        private readonly PlannerRunQualityScorer $qualityScorer,
    ) {}

    public function generate(User $user, array $options = []): array
    {
        $regenerate = (bool) ($options['regenerate'] ?? true);
        $createdBy = (int) ($options['created_by'] ?? $user->id);
        $reason = trim((string) ($options['reason'] ?? ($regenerate ? 'manual_generation' : 'reuse_latest')));
        $profileOverrides = is_array($options['profile_overrides'] ?? null) ? $options['profile_overrides'] : [];
        $persistProfileOverrides = (bool) ($options['persist_profile_overrides'] ?? false);
        $planHorizonDays = $this->normalizePlanHorizonDays(
            (int) ($options['plan_horizon_days'] ?? config('ai.planner.default_horizon_days', 14))
        );

        if (! $regenerate && $profileOverrides === []) {
            $existing = $this->latestPair($user);
            if ($existing !== null) {
                return $existing;
            }
        }

        $profile = $this->profiles->prepare($user, $profileOverrides, $persistProfileOverrides);
        $context = $this->contextBuilder->build($user, $profile, $planHorizonDays);
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

                $normalized = $this->normalizeCompactOutput($json, $planHorizonDays, $profile, $context);
                $validated = $this->validator->validate($user, $normalized, $profile, $planHorizonDays);
            } catch (Throwable $modelError) {
                if (! $this->shouldUseLocalFallback($modelError)) {
                    throw $modelError;
                }

                $fallbackPlan = $this->localFallback->build($user, $profile, $planHorizonDays, $context);
                $validated = $this->validator->validate($user, $fallbackPlan, $profile, $planHorizonDays);
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
            $quality = $this->qualityScorer->score($user, $validated, $planHorizonDays, $profile);

            $generationId = (string) Str::uuid();

            $persisted = $this->persistence->persist(
                $user,
                $validated,
                $generationId,
                $aiRequest->id,
                $reason,
                $createdBy
            );

            $this->finishAiRequest($aiRequest, $validated, $response, null);

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
                'plan' => $validated,
                'plans' => $persisted['plans'],
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
        $ollamaOnly = $this->features->ollamaOnly(FeatureConfigResolver::FEATURE_PLANNER);

        if (! $localFallbackEnabled && ! $ollamaOnly) {
            return false;
        }

        if ($this->features->provider(FeatureConfigResolver::FEATURE_PLANNER) !== 'ollama') {
            return false;
        }

        if ($error instanceof PlannerValidationException) {
            return true;
        }

        return true;
    }

    private function normalizeCompactOutput(array $payload, int $planHorizonDays, array $profile, array $context): array
    {
        $normalized = $payload;
        $targetDietDays = $this->normalizePlanHorizonDays($planHorizonDays);
        $targetWorkoutDays = 7;
        $mealCatalog = is_array($context['meal_catalog_hints'] ?? null) ? $context['meal_catalog_hints'] : [];
        $exerciseCatalog = is_array($context['exercise_catalog_hints'] ?? null) ? $context['exercise_catalog_hints'] : [];

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
        $targets = data_get($normalized, 'diet.daily_targets', []);

        if ($dietDays === []) {
            $dietDays = [$this->defaultDietTemplate($targets, $mealCatalog)];
        }

        $dietDays = array_values($dietDays);
        $expandedDiet = [];
        for ($i = 1; $i <= $targetDietDays; $i++) {
            $template = $dietDays[($i - 1) % count($dietDays)];
            if (! is_array($template)) {
                continue;
            }

            $template['day_index'] = $i;
            $template['theme'] = trim((string) ($template['theme'] ?? 'Planned day'));
            $template['meals'] = $this->normalizeMeals(
                is_array($template['meals'] ?? null) ? array_values($template['meals']) : [],
                $targets,
                $mealCatalog,
                $profile
            );
            $template['coaching_notes'] = is_array($template['coaching_notes'] ?? null) ? array_values($template['coaching_notes']) : [];
            $expandedDiet[] = $template;
        }
        $normalizedDietDays = $this->enforceDietDayVariety($expandedDiet, $mealCatalog, $profile);
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
            $template['day_label'] = trim((string) ($template['day_label'] ?? $labels[$i - 1]));
            $template['session_type'] = trim((string) ($template['session_type'] ?? 'train'));
            $template['focus'] = trim((string) ($template['focus'] ?? 'General training'));
            $template['location'] = $this->normalizeWorkoutLocation($template['location'] ?? null, $profile);
            $template['duration_min'] = max(0, (int) ($template['duration_min'] ?? 30));
            $template['warmup'] = is_array($template['warmup'] ?? null) ? array_values($template['warmup']) : [];
            $template['exercises'] = $this->normalizeExercises(
                is_array($template['exercises'] ?? null) ? array_values($template['exercises']) : [],
                $exerciseCatalog,
                $template['location'],
                ($i - 1) * 4,
                [],
                $this->normalizeList($profile['available_equipment'] ?? []),
                $profile
            );
            $template['cooldown'] = is_array($template['cooldown'] ?? null) ? array_values($template['cooldown']) : [];
            $template['safety_notes'] = is_array($template['safety_notes'] ?? null) ? array_values($template['safety_notes']) : [];
            $expandedWeekly[] = $template;
        }
        $normalizedWeekly = $this->applyWorkoutScheduleConstraints($expandedWeekly, $profile, $exerciseCatalog);
        data_set($normalized, 'workout.weekly_schedule', $this->enforceWorkoutVariety($normalizedWeekly, $exerciseCatalog, $profile));

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
            data_set($normalized, 'overview.summary', 'Compact plan generated from local model output.');
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

    private function defaultWorkoutTemplates(array $exerciseCatalog, array $profile): array
    {
        $location = $this->normalizeWorkoutLocation($profile['workout_location'] ?? null, $profile);
        $pool = $this->filterCatalogExercisesByLocation($exerciseCatalog, $location, $this->normalizeList($profile['available_equipment'] ?? []));
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

    private function normalizeMeals(array $meals, array $targets, array $mealCatalog, array $profile): array
    {
        $snackFallback = $this->catalogFoodForMeal('snack', $mealCatalog);
        if (! is_array($snackFallback) || trim((string) ($snackFallback['name'] ?? '')) === '') {
            $snackFallback = ['name' => $this->snackNameLibrary($profile)[0] ?? 'Greek yogurt and berries cup'];
        }

        $fallbackByType = [
            'breakfast' => $this->catalogFoodForMeal('breakfast', $mealCatalog),
            'lunch' => $this->catalogFoodForMeal('lunch', $mealCatalog),
            'dinner' => $this->catalogFoodForMeal('dinner', $mealCatalog),
            'snack' => $snackFallback,
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
            $meals = [
                ['meal_code' => 'breakfast', 'title' => 'Breakfast', 'items' => []],
                ['meal_code' => 'lunch', 'title' => 'Lunch', 'items' => []],
                ['meal_code' => 'dinner', 'title' => 'Dinner', 'items' => []],
                ['meal_code' => 'snack', 'title' => 'Snack', 'items' => []],
            ];
        }

        $requiredMealCodes = ['breakfast', 'lunch', 'dinner', 'snack'];
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

        return array_map(function (array $meal) use ($fallbackByType, $ratios, $calories, $protein, $carbs, $fat): array {
            $mealCode = $this->normalizeMealCode((string) ($meal['meal_code'] ?? 'snack'));
            $ratio = $ratios[$mealCode] ?? 0.25;
            $items = is_array($meal['items'] ?? null) ? array_values($meal['items']) : [];

            if ($items === []) {
                $fallback = $fallbackByType[$mealCode] ?? null;
                $items = [[
                    'name' => $fallback['name'] ?? ucfirst($mealCode).' option',
                    'portion' => '1 serving',
                    'calories_kcal' => (int) round($calories * $ratio),
                    'protein_g' => (int) round($protein * $ratio),
                    'carbs_g' => (int) round($carbs * $ratio),
                    'fat_g' => (int) round($fat * $ratio),
                ]];
            } else {
                $fallback = $fallbackByType[$mealCode] ?? null;
                $items = array_map(function (array $item) use ($fallback, $ratio, $calories, $protein, $carbs, $fat): array {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name === '' || $this->looksGenericMealName($name)) {
                        $name = $fallback['name'] ?? ($name !== '' ? $name : 'Meal option');
                    }

                    return [
                        'name' => $name,
                        'portion' => trim((string) ($item['portion'] ?? '1 serving')) ?: '1 serving',
                        'calories_kcal' => max(50, (int) ($item['calories_kcal'] ?? round($calories * $ratio))),
                        'protein_g' => max(1, (int) ($item['protein_g'] ?? round($protein * $ratio))),
                        'carbs_g' => max(1, (int) ($item['carbs_g'] ?? round($carbs * $ratio))),
                        'fat_g' => max(1, (int) ($item['fat_g'] ?? round($fat * $ratio))),
                        'recipe_note' => isset($item['recipe_note']) ? (string) $item['recipe_note'] : null,
                        'search_terms' => is_array($item['search_terms'] ?? null) ? array_values($item['search_terms']) : [],
                        'alternatives' => is_array($item['alternatives'] ?? null) ? array_values($item['alternatives']) : [],
                    ];
                }, $items);
            }

            $targetKcal = max(80, (int) ($meal['target_kcal'] ?? round($calories * $ratio)));

            return [
                'meal_code' => $mealCode,
                'title' => trim((string) ($meal['title'] ?? ucfirst($mealCode))) ?: ucfirst($mealCode),
                'target_kcal' => $targetKcal,
                'items' => $items,
            ];
        }, $meals);
    }

    private function normalizeExercises(
        array $exercises,
        array $exerciseCatalog,
        string $location,
        int $offset = 0,
        array $preferredCategories = [],
        array $availableEquipment = [],
        array $profile = []
    ): array
    {
        $pool = $this->filterCatalogExercisesByLocation($exerciseCatalog, $location, $availableEquipment);
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

        $normalized = array_map(function (array $exercise, int $index) use ($activePool, $offset, $location, $profile, $defaultRest): array {
            $poolCount = max(count($activePool), 1);
            $fallback = $activePool[($offset + $index) % $poolCount] ?? null;
            $name = trim((string) ($exercise['name'] ?? ''));
            if ($name === '' || $this->looksGenericExerciseName($name)) {
                $name = (string) ($fallback['name'] ?? ('Exercise '.($index + 1)));
            }

            $equipment = trim((string) ($exercise['equipment'] ?? ($fallback['equipment'] ?? 'Bodyweight'))) ?: 'Bodyweight';
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

    private function enforceDietDayVariety(array $dietDays, array $mealCatalog, array $profile): array
    {
        $catalogNames = [
            'breakfast' => $this->catalogMealNames($mealCatalog, 'breakfast'),
            'lunch' => $this->catalogMealNames($mealCatalog, 'lunch'),
            'dinner' => $this->catalogMealNames($mealCatalog, 'dinner'),
            'snack' => $this->catalogMealNames($mealCatalog, 'snack'),
            'drink' => $this->catalogMealNames($mealCatalog, 'drink'),
        ];

        $blockedNeedles = $this->blockedFoodNeedles($profile);
        $snackCandidates = array_values(array_unique(array_filter(array_merge(
            $catalogNames['snack'],
            $this->collectMealNamesByCode($dietDays, 'snack'),
            $this->snackNameLibrary($profile)
        ), fn (string $item): bool => ! $this->containsAny($item, $blockedNeedles))));
        $usedSnackNames = [];
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

                if ($isRepeated || $this->looksGenericMealName($firstName)) {
                    $candidatePool = $mealCode === 'snack'
                        ? $snackCandidates
                        : ($catalogNames[$mealCode] ?? []);
                    $candidate = $this->pickRotatingValue($candidatePool, $currentDayIndex + $mealIndex);
                    if (is_string($candidate) && trim($candidate) !== '') {
                        $dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] = $candidate;
                    }
                }

                $updatedName = strtolower(trim((string) ($dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] ?? '')));
                if ($updatedName !== '') {
                    $previousByMeal[$mealCode] = $updatedName;
                }

                if ($mealCode !== 'snack') {
                    continue;
                }

                $snackName = trim((string) ($dietDays[$dayIndex]['meals'][$mealIndex]['items'][0]['name'] ?? ''));
                $snackKey = strtolower($snackName);

                if ($snackName === '' || in_array($snackKey, $usedSnackNames, true) || $this->looksGenericMealName($snackKey)) {
                    $replacement = $this->pickUnusedRotatingValue($snackCandidates, $usedSnackNames, $currentDayIndex + $mealIndex);
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

    private function enforceWorkoutVariety(array $weekly, array $exerciseCatalog, array $profile): array
    {
        $lastTrainExerciseNames = [];
        $availableEquipment = $this->normalizeList($profile['available_equipment'] ?? []);

        foreach ($weekly as $dayIndex => $day) {
            if (strtolower((string) ($day['session_type'] ?? '')) !== 'train') {
                continue;
            }

            $location = strtolower((string) ($day['location'] ?? 'gym'));
            $pool = $this->filterCatalogExercisesByLocation($exerciseCatalog, $location, $availableEquipment);
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

                    $candidate = $pool[($dayIndex * 4 + $exerciseIndex) % $poolCount] ?? null;
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

                $candidate = $pool[($dayIndex * 5 + $exerciseIndex) % max($poolCount, 1)] ?? null;
                if (! is_array($candidate)) {
                    continue;
                }

                $weekly[$dayIndex]['exercises'][$exerciseIndex]['name'] = (string) ($candidate['name'] ?? $exercise['name']);
                $weekly[$dayIndex]['exercises'][$exerciseIndex]['equipment'] = trim((string) ($candidate['equipment'] ?? $exercise['equipment'] ?? 'Bodyweight')) ?: 'Bodyweight';
            }

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

    private function applyWorkoutScheduleConstraints(array $weekly, array $profile, array $exerciseCatalog): array
    {
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
        foreach ($trainDays as $slot => $dayIndex) {
            $splitByDay[$dayIndex] = $splitTemplates[$slot % max(1, count($splitTemplates))] ?? null;
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
                    ($dayIndex - 1) * 5,
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

    private function catalogFoodForMeal(string $mealCode, array $mealCatalog): ?array
    {
        $items = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];

        return $items[0] ?? null;
    }

    private function catalogMealNames(array $mealCatalog, string $mealCode): array
    {
        $items = is_array($mealCatalog[$mealCode] ?? null) ? $mealCatalog[$mealCode] : [];

        $names = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['name'] ?? '')),
            $items
        )));

        return array_values(array_unique($names));
    }

    private function pickRotatingValue(array $values, int $seed): ?string
    {
        if ($values === []) {
            return null;
        }

        return $values[$seed % count($values)] ?? null;
    }

    private function filterCatalogExercisesByLocation(array $exerciseCatalog, string $location, array $availableEquipment = []): array
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
            return trim((string) ($exercise['name'] ?? '')) !== '';
        }));

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
            ['name' => 'Reverse Lunge', 'primary_muscle' => 'Quadriceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Glute Bridge', 'primary_muscle' => 'Glutes', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Incline Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Pike Push Up', 'primary_muscle' => 'Shoulders', 'equipment' => 'Bodyweight', 'difficulty' => 'Intermediate', 'home_friendly' => true],
            ['name' => 'Chair Triceps Dip', 'primary_muscle' => 'Triceps', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
            ['name' => 'Bodyweight Towel Row', 'primary_muscle' => 'Back', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
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

        foreach (['balanced', 'simple', 'meal', 'plate', 'bowl', 'protein dish', 'healthy option'] as $token) {
            if ($text === $token || str_ends_with($text, $token)) {
                return true;
            }
        }

        return false;
    }

    private function snackNameLibrary(array $profile): array
    {
        $dietType = strtolower(trim((string) ($profile['diet_type'] ?? '')));

        if (str_contains($dietType, 'vegan')) {
            return [
                'Roasted chickpeas and fruit cup',
                'Dark chocolate square with strawberries',
                'Protein oat smoothie',
                'Rice cakes with hummus',
                'Chia pudding with berries',
                'Wholegrain wafer (vegan) and banana',
                'Edamame and cucumber box',
            ];
        }

        return [
            'Greek yogurt and berries cup',
            'Cottage cheese with fruit',
            'Protein wafer bar and apple',
            'Dark chocolate square with strawberries',
            'Milk banana protein shake',
            'Wholegrain crackers with labneh',
            'Air-popped popcorn and yogurt dip',
        ];
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
        }

        return array_values(array_unique(array_filter($needles)));
    }

    private function looksGenericExerciseName(string $name): bool
    {
        $text = strtolower(trim($name));

        return $text === '' || in_array($text, ['exercise', 'strength exercise', 'cardio movement', 'mobility drill'], true);
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

    public function latestPair(User $user): ?array
    {
        $plans = AiPlan::query()
            ->with('aiRequest')
            ->where('user_id', $user->id)
            ->whereIn('type', ['diet', 'workout'])
            ->orderByDesc('version')
            ->get()
            ->groupBy('version');

        foreach ($plans as $version => $rows) {
            $diet = $rows->firstWhere('type', 'diet');
            $workout = $rows->firstWhere('type', 'workout');
            if (! $diet || ! $workout) {
                continue;
            }

            $fullPlan = is_array($diet->aiRequest?->output_json) ? $diet->aiRequest->output_json : [
                'diet' => $diet->plan_json,
                'workout' => $workout->plan_json,
            ];

            return [
                'ok' => true,
                'ai_request_id' => $diet->ai_request_id,
                'generation_id' => (string) $diet->generation_id,
                'version' => (int) $version,
                'plan' => $fullPlan,
                'plans' => [
                    'diet' => $diet->plan_json,
                    'workout' => $workout->plan_json,
                ],
                'provider' => $diet->aiRequest?->provider,
                'model' => $diet->aiRequest?->model,
                'prompt_version' => $diet->aiRequest?->prompt_version,
                'schema_version' => $diet->aiRequest?->schema_version,
                'usage' => $diet->aiRequest?->usage_json ?? [
                    'input_tokens' => 0,
                    'output_tokens' => 0,
                    'total_tokens' => 0,
                ],
            ];
        }

        return null;
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
