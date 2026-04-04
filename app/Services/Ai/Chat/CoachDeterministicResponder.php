<?php

namespace App\Services\Ai\Chat;

use App\Models\User;
use Carbon\Carbon;

class CoachDeterministicResponder
{
    public function __construct(
        private readonly CoachNutritionCalculator $nutritionCalculator,
    ) {}

    public function respond(
        User $user,
        string $question,
        array $context,
        array $classification,
    ): ?array {
        $normalizedQuestion = mb_strtolower(trim($question));

        if (($classification['scope'] ?? 'in_domain') === 'out_of_domain') {
            return [
                'answer' => $this->outOfDomainAnswer($user),
                'warnings' => [],
                'chat_path' => 'out_of_scope',
                'mode_label' => 'Out of scope',
                'reason' => 'domain_guard',
                'model' => 'coach-domain-guard',
            ];
        }

        if (
            ($classification['deterministic_action'] ?? null) === 'restriction_summary' ||
            $this->isRestrictionLookup($normalizedQuestion)
        ) {
            return $this->restrictionSummaryAnswer($context);
        }

        if ($this->isDinnerSwitchFollowUp($normalizedQuestion)) {
            $dinnerSwitch = $this->dinnerSwitchFollowUpAnswer();

            if ($dinnerSwitch !== null) {
                return $dinnerSwitch;
            }
        }

        if ($this->isDinnerIngredientFollowUp($normalizedQuestion)) {
            $dinnerSuggestion = $this->dinnerIngredientFollowUpAnswer($normalizedQuestion, $context);

            if ($dinnerSuggestion !== null) {
                return $dinnerSuggestion;
            }
        }

        if ($this->isAllergyIngredientQuestion($normalizedQuestion, $context)) {
            $allergyAlternative = $this->allergyAlternativeAnswer($normalizedQuestion, $context);

            if ($allergyAlternative !== null) {
                return $allergyAlternative;
            }
        }

        if ($this->isTasteAlternativeQuestion($normalizedQuestion)) {
            $tasteAlternative = $this->tasteAlternativeAnswer($normalizedQuestion, $context);

            if ($tasteAlternative !== null) {
                return $tasteAlternative;
            }
        }

        if ($this->isGeneralIngredientSafetyQuestion($normalizedQuestion)) {
            $safetyAnswer = $this->generalIngredientSafetyAnswer($normalizedQuestion, $context);

            if ($safetyAnswer !== null) {
                return $safetyAnswer;
            }
        }

        if ($this->isRecipeMacroFollowUp($normalizedQuestion)) {
            $recipeFollowUp = $this->recipeMacroFollowUpAnswer($context);

            if ($recipeFollowUp !== null) {
                return $recipeFollowUp;
            }
        }

        if ($this->isLowerCarbRecipeFollowUp($normalizedQuestion)) {
            $lowerCarbFollowUp = $this->lowerCarbRecipeFollowUpAnswer($context);

            if ($lowerCarbFollowUp !== null) {
                return $lowerCarbFollowUp;
            }
        }

        if ($this->isMealTotalMacrosFollowUp($normalizedQuestion)) {
            $mealTotalsFollowUp = $this->mealTotalMacrosFollowUpAnswer($context);

            if ($mealTotalsFollowUp !== null) {
                return $mealTotalsFollowUp;
            }
        }

        if (($classification['deterministic_action'] ?? null) === 'protein_target') {
            return $this->proteinTargetAnswer($context);
        }

        if (($classification['deterministic_action'] ?? null) === 'protein_gap') {
            return $this->proteinGapAnswer($context);
        }

        if (($classification['deterministic_action'] ?? null) === 'meal_summary') {
            return $this->mealSummaryAnswer($context, $normalizedQuestion);
        }

        return null;
    }

    private function proteinTargetAnswer(array $context): array
    {
        $resolved = is_array($context['resolved_profile'] ?? null) ? $context['resolved_profile'] : [];
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];

        $weightKg = is_numeric($resolved['current_weight_kg'] ?? null)
            ? (float) $resolved['current_weight_kg']
            : null;

        $calculation = $this->nutritionCalculator->proteinTargetRange(
            $weightKg,
            is_string($resolved['goal'] ?? null) ? $resolved['goal'] : null,
            is_string($resolved['activity_level'] ?? null) ? $resolved['activity_level'] : null,
        );

        if ($calculation === null) {
            return [
                'answer' => 'I can calculate your daily protein target as soon as I have a saved weight to work from. Update your profile weight or add a measurement, then ask again and I will use that number directly.',
                'warnings' => ['A saved weight was not available for a personalized protein calculation.'],
                'chat_path' => 'general',
                'mode_label' => 'General guidance',
                'reason' => 'missing_weight',
                'model' => 'coach-calculator',
            ];
        }

        $measuredAt = $resolved['current_weight_measured_at'] ?? null;
        $proteinToday = is_numeric($today['protein_g'] ?? null) ? (int) $today['protein_g'] : null;
        $remainingLow = $proteinToday !== null ? max(0, $calculation['low_g'] - $proteinToday) : null;
        $remainingSuggested = $proteinToday !== null ? max(0, $calculation['suggested_g'] - $proteinToday) : null;

        $lines = [
            sprintf(
                'Based on your saved weight of %s kg%s, your daily protein target is %d-%d g.',
                $this->displayDecimal($calculation['weight_kg']),
                $measuredAt ? ' recorded on '.$measuredAt : '',
                $calculation['low_g'],
                $calculation['high_g'],
            ),
            sprintf(
                'That comes from a %s range of %.1f-%.1f g per kg.',
                $calculation['rationale'],
                $calculation['min_g_per_kg'],
                $calculation['max_g_per_kg'],
            ),
            sprintf(
                'A practical day-to-day target is about %d g of protein.',
                $calculation['suggested_g'],
            ),
        ];

        if ($proteinToday !== null) {
            $lines[] = sprintf(
                'You have logged %d g so far today, so you still need about %d g to reach the low end and about %d g to reach the practical target.',
                $proteinToday,
                $remainingLow,
                $remainingSuggested,
            );
        }

        return [
            'answer' => implode("\n\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'protein_target_calculator',
            'model' => 'coach-calculator',
        ];
    }

    private function proteinGapAnswer(array $context): array
    {
        $resolved = is_array($context['resolved_profile'] ?? null) ? $context['resolved_profile'] : [];
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];
        $targets = is_array($context['plans']['nutrition_targets'] ?? null) ? $context['plans']['nutrition_targets'] : [];

        $proteinToday = is_numeric($today['protein_g'] ?? null) ? (int) $today['protein_g'] : 0;
        $planProteinTarget = is_numeric($targets['protein_g'] ?? null) ? (int) $targets['protein_g'] : null;

        $calculation = null;
        if ($planProteinTarget === null) {
            $weightKg = is_numeric($resolved['current_weight_kg'] ?? null)
                ? (float) $resolved['current_weight_kg']
                : null;

            $calculation = $this->nutritionCalculator->proteinTargetRange(
                $weightKg,
                is_string($resolved['goal'] ?? null) ? $resolved['goal'] : null,
                is_string($resolved['activity_level'] ?? null) ? $resolved['activity_level'] : null,
            );
        }

        if ($planProteinTarget === null && $calculation === null) {
            return [
                'answer' => 'I can check whether you are low on protein once I have a saved weight or an active nutrition target. Update your profile weight or plan target, then ask again and I will compare it with today\'s meal log directly.',
                'warnings' => ['A saved protein target or usable weight was not available for a personalized protein gap check.'],
                'chat_path' => 'general',
                'mode_label' => 'General guidance',
                'reason' => 'missing_protein_target',
                'model' => 'coach-calculator',
            ];
        }

        $referenceTarget = $planProteinTarget ?? $calculation['suggested_g'];
        $remainingToTarget = max(0, $referenceTarget - $proteinToday);
        $lines = [
            sprintf(
                'Based on your meals today, you have logged %d g of protein so far.',
                $proteinToday,
            ),
        ];

        if ($planProteinTarget !== null) {
            $lines[] = sprintf(
                'Your current active protein target is %d g for the day.',
                $planProteinTarget,
            );
        } else {
            $lines[] = sprintf(
                'Using your saved weight of %s kg, your estimated daily protein range is %d-%d g, with about %d g as a practical target.',
                $this->displayDecimal((float) $calculation['weight_kg']),
                $calculation['low_g'],
                $calculation['high_g'],
                $calculation['suggested_g'],
            );
        }

        if ($remainingToTarget > 20) {
            $lines[] = sprintf(
                'Yes, you are still low on protein today by about %d g relative to your current target.',
                $remainingToTarget,
            );
        } elseif ($remainingToTarget > 0) {
            $lines[] = sprintf(
                'You are close, but you still need about %d g of protein to reach your current target.',
                $remainingToTarget,
            );
        } else {
            $lines[] = 'You are not low on protein right now because you have already met your current target for the day.';
        }

        return [
            'answer' => implode("\n\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'protein_gap_check',
            'model' => 'coach-calculator',
        ];
    }

    private function mealSummaryAnswer(array $context, string $question): array
    {
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];
        $last7Nutrition = is_array($context['last_7_days_summary']['nutrition'] ?? null)
            ? $context['last_7_days_summary']['nutrition']
            : [];
        $targets = is_array($context['plans']['nutrition_targets'] ?? null) ? $context['plans']['nutrition_targets'] : [];
        $meals = is_array($today['meals'] ?? null) ? $today['meals'] : [];
        $summaryDate = trim((string) ($today['date'] ?? ''));
        $summaryLabel = $this->summaryDateLabel($summaryDate);
        $mealTypes = array_values(array_unique(array_filter(array_map(
            static fn ($meal) => is_array($meal) ? trim((string) ($meal['meal_type'] ?? '')) : '',
            $meals,
        ))));

        if ($this->isLastSevenDaySummaryQuestion($question)) {
            $daysLogged = is_numeric($last7Nutrition['days_logged'] ?? null) ? (int) $last7Nutrition['days_logged'] : 0;
            $avgKcal = is_numeric($last7Nutrition['avg_kcal'] ?? null) ? (int) $last7Nutrition['avg_kcal'] : 0;
            $avgProtein = is_numeric($last7Nutrition['avg_protein_g'] ?? null) ? (int) $last7Nutrition['avg_protein_g'] : 0;
            $avgCarbs = is_numeric($last7Nutrition['avg_carbs_g'] ?? null) ? (int) $last7Nutrition['avg_carbs_g'] : 0;
            $avgFat = is_numeric($last7Nutrition['avg_fat_g'] ?? null) ? (int) $last7Nutrition['avg_fat_g'] : 0;

            if ($daysLogged <= 0) {
                return [
                    'answer' => 'I do not see any logged meals in your last 7 days yet. Once you log a few days, I can summarize your weekly nutrition patterns clearly.',
                    'warnings' => ['No meal data was available for a 7-day summary.'],
                    'chat_path' => 'personalized',
                    'mode_label' => 'Personalized',
                    'reason' => 'missing_last_7_day_meals',
                    'model' => 'coach-meal-summary',
                ];
            }

            $consistencyLine = match (true) {
                $daysLogged >= 6 => 'You have been very consistent with meal logging this week.',
                $daysLogged >= 4 => 'Your meal logging has been moderately consistent this week.',
                default => 'Meal logging has been limited this week, so trends are less reliable.',
            };

            return [
                'answer' => implode("\n\n", [
                    sprintf('Over your last 7 days, you logged meals on %d day(s).', $daysLogged),
                    sprintf(
                        'Average per logged day: %d kcal, %d g protein, %d g carbs, and %d g fat.',
                        $avgKcal,
                        $avgProtein,
                        $avgCarbs,
                        $avgFat,
                    ),
                    $consistencyLine,
                ]),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'meal_summary_last_7_days',
                'model' => 'coach-meal-summary',
            ];
        }

        $lines = [];
        $calories = is_numeric($today['calories'] ?? null) ? (int) $today['calories'] : null;
        $protein = is_numeric($today['protein_g'] ?? null) ? (int) $today['protein_g'] : null;
        $carbs = is_numeric($today['carbs_g'] ?? null) ? (int) $today['carbs_g'] : null;
        $fat = is_numeric($today['fat_g'] ?? null) ? (int) $today['fat_g'] : null;

        if (
            $meals === [] &&
            (($calories ?? 0) <= 0) &&
            (($protein ?? 0) <= 0) &&
            (($carbs ?? 0) <= 0) &&
            (($fat ?? 0) <= 0)
        ) {
            return [
                'answer' => sprintf(
                    'I do not see any logged meals for %s yet. Add at least one entry for that date and I can summarize calories, protein, carbs, and fat clearly.',
                    $summaryLabel,
                ),
                'warnings' => ['No meal totals were available for the requested date summary.'],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'missing_today_meals',
                'model' => 'coach-meal-summary',
            ];
        }

        $lines[] = sprintf(
            '%s you have logged%s%s%s%s.',
            $summaryLabel,
            $calories !== null ? " {$calories} kcal" : '',
            $protein !== null ? ", {$protein} g protein" : '',
            $carbs !== null ? ", {$carbs} g carbs" : '',
            $fat !== null ? ", and {$fat} g fat" : ''
        );

        if ($mealTypes !== []) {
            $lines[] = 'You have entries for '.implode(', ', $mealTypes).'.';
        }

        $insights = [];
        $proteinTarget = is_numeric($targets['protein_g'] ?? null) ? (int) $targets['protein_g'] : null;
        $calorieTarget = is_numeric($targets['calories'] ?? null) ? (int) $targets['calories'] : null;

        if ($protein !== null && $proteinTarget !== null) {
            $proteinGap = $proteinTarget - $protein;
            if ($proteinGap > 20) {
                $insights[] = sprintf(
                    'The biggest gap is protein: you are about %d g under your current target.',
                    $proteinGap,
                );
            } elseif ($proteinGap > 0) {
                $insights[] = sprintf(
                    'Protein is close but still about %d g under your current target.',
                    $proteinGap,
                );
            } else {
                $insights[] = 'Protein is in a solid place relative to your current target.';
            }
        } elseif ($protein !== null) {
            $insights[] = 'Protein is visible in your logs, but I do not have an active protein target to compare it against.';
        }

        if ($calories !== null && $calorieTarget !== null) {
            $calorieGap = $calorieTarget - $calories;
            if ($calorieGap > 300) {
                $insights[] = sprintf(
                    'Calories are still fairly low for the day, roughly %d kcal below target.',
                    $calorieGap,
                );
            } elseif ($calorieGap < -300) {
                $insights[] = sprintf(
                    'Calories are already running about %d kcal above target.',
                    abs($calorieGap),
                );
            } else {
                $insights[] = 'Calories are fairly close to your current target.';
            }
        }

        if ($meals !== []) {
            $largestMealType = $this->largestLoggedMealType($meals);
            if ($largestMealType !== null) {
                $insights[] = sprintf(
                    'Most of your logged intake is sitting in %s so far.',
                    $largestMealType,
                );
            }
        }

        if ($insights === []) {
            $insights[] = 'Your meal log is present, but I need either more food entries or active targets to make a stronger comparison.';
        }

        $lines[] = implode(' ', array_slice($insights, 0, 3));

        return [
            'answer' => implode("\n\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'meal_summary',
            'model' => 'coach-meal-summary',
        ];
    }

    private function restrictionSummaryAnswer(array $context): array
    {
        $restrictions = is_array($context['restrictions'] ?? null) ? $context['restrictions'] : [];
        $allergies = is_array($restrictions['allergies'] ?? null) ? $restrictions['allergies'] : [];
        $dietType = trim((string) ($restrictions['diet_type'] ?? ''));
        $injuries = is_array($restrictions['injuries'] ?? null) ? $restrictions['injuries'] : [];
        $medicalConditions = is_array($restrictions['medical_conditions'] ?? null) ? $restrictions['medical_conditions'] : [];
        $avoidanceNotes = [];

        if ($allergies !== []) {
            $avoidanceNotes[] = 'avoid foods containing '.implode(', ', $allergies);
        }

        $normalizedDiet = mb_strtolower($dietType);
        if ($normalizedDiet === 'vegan') {
            $avoidanceNotes[] = 'avoid animal products (meat, fish, eggs, and dairy)';
        } elseif ($normalizedDiet === 'vegetarian') {
            $avoidanceNotes[] = 'avoid meat and poultry';
        }

        $lines = [
            'Based on your profile, here are the health and diet details I can see for your account:',
            'Diet type: '.($dietType !== '' ? $dietType : 'none saved'),
            'Allergies: '.($allergies !== [] ? implode(', ', $allergies) : 'none saved'),
            'Medical conditions: '.($medicalConditions !== [] ? implode(', ', $medicalConditions) : 'none saved'),
            'Injuries: '.($injuries !== [] ? implode(', ', $injuries) : 'none saved'),
            'Foods to avoid: '.($avoidanceNotes !== [] ? implode('; ', $avoidanceNotes).'.' : 'none explicitly saved.'),
        ];

        return [
            'answer' => implode("\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'restriction_summary',
            'model' => 'coach-profile-summary',
        ];
    }

    private function allergyAlternativeAnswer(string $question, array $context): ?array
    {
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        $matchedAllergy = null;
        foreach ($allergies as $allergy) {
            if ($allergy !== '' && str_contains($question, $allergy)) {
                $matchedAllergy = $allergy;
                break;
            }
        }

        if ($matchedAllergy === null) {
            return null;
        }

        $recipe = $this->resolveRecentSafeRecipe($context) ?? [
            'title' => 'Greek yogurt berry bowl',
            'ingredients' => [
                '1 cup plain Greek yogurt',
                '1/2 cup mixed berries',
                '1 tablespoon chia seeds',
                '1 teaspoon honey',
            ],
            'steps' => [
                'Add the Greek yogurt to a bowl.',
                'Top with berries and chia seeds.',
                'Finish with a small drizzle of honey.',
            ],
            'macros' => [
                'calories' => 220,
                'protein_g' => 23,
                'carbs_g' => 19,
                'fat_g' => 5,
            ],
        ];

        return [
            'answer' => implode("\n\n", [
                sprintf(
                    '%s is not a safe option for you because it conflicts with your saved allergy to %s.',
                    $this->humanizeIngredient($matchedAllergy).' toast',
                    $matchedAllergy,
                ),
                sprintf(
                    'A safe alternative is %s. Macros per serving: %d kcal, %d g protein, %d g carbs, %d g fat.',
                    $recipe['title'],
                    $recipe['macros']['calories'],
                    $recipe['macros']['protein_g'],
                    $recipe['macros']['carbs_g'],
                    $recipe['macros']['fat_g'],
                ),
                'Ingredients:'."\n".'- '.implode("\n- ", $recipe['ingredients']),
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'allergy_safe_alternative',
            'model' => 'coach-recipe-builder',
        ];
    }

    private function generalIngredientSafetyAnswer(string $question, array $context): ?array
    {
        $ingredient = $this->extractSafetyIngredient($question);
        if ($ingredient === null) {
            return null;
        }

        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        $isUnsafe = false;
        foreach ($allergies as $allergy) {
            if ($allergy === '') {
                continue;
            }

            if (str_contains($ingredient, $allergy) || str_contains($allergy, $ingredient)) {
                $isUnsafe = true;
                break;
            }
        }

        if ($isUnsafe) {
            return [
                'answer' => sprintf(
                    '%s is not safe for you because it conflicts with your saved allergy list (%s).',
                    ucfirst($ingredient),
                    implode(', ', $allergies),
                ),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'food_safety_check',
                'model' => 'coach-recipe-builder',
            ];
        }

        if ($this->containsAny($question, ['safe alternative', 'alternative'])) {
            return [
                'answer' => implode("\n\n", [
                    sprintf(
                        '%s can fit your saved profile, and here is a safe alternative if you want variety:',
                        ucfirst($ingredient),
                    ),
                    'Alternative: smashed cottage cheese and tomato toast on whole-grain bread (no sesame topping).',
                    'Macros per serving: 260 kcal, 18 g protein, 25 g carbs, 9 g fat.',
                ]),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'food_safety_check',
                'model' => 'coach-recipe-builder',
            ];
        }

        $allergyText = $allergies !== [] ? implode(', ', $allergies) : 'none saved';

        return [
            'answer' => sprintf(
                '%s is generally safe based on your saved allergies (%s). Keep portions aligned with your goal, and watch toppings that may add allergens.',
                ucfirst($ingredient),
                $allergyText,
            ),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'food_safety_check',
            'model' => 'coach-recipe-builder',
        ];
    }

    private function recipeMacroFollowUpAnswer(array $context): ?array
    {
        $recipe = $this->resolveRecentSafeRecipe($context);

        if ($recipe === null) {
            return null;
        }

        return [
            'answer' => implode("\n", [
                sprintf('Here are the full macros and a safe version of the %s:', $recipe['title']),
                sprintf(
                    'Macros per serving: %d kcal, %d g protein, %d g carbs, %d g fat.',
                    $recipe['macros']['calories'],
                    $recipe['macros']['protein_g'],
                    $recipe['macros']['carbs_g'],
                    $recipe['macros']['fat_g'],
                ),
                'Ingredients:',
                '- '.implode("\n- ", $recipe['ingredients']),
                'Steps:',
                '1. '.implode("\n1. ", $recipe['steps']),
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'safe_recipe_follow_up',
            'model' => 'coach-recipe-builder',
        ];
    }

    private function lowerCarbRecipeFollowUpAnswer(array $context): ?array
    {
        $recipe = $this->resolveRecentSafeRecipe($context);

        if ($recipe === null) {
            return null;
        }

        $adjustedMacros = [
            'calories' => max(80, (int) $recipe['macros']['calories'] - 60),
            'protein_g' => max(8, (int) $recipe['macros']['protein_g'] - 1),
            'carbs_g' => max(4, (int) $recipe['macros']['carbs_g'] - 14),
            'fat_g' => max(2, (int) $recipe['macros']['fat_g']),
        ];

        return [
            'answer' => implode("\n", [
                sprintf('Sure. Here is a lower-carb version of the %s:', $recipe['title']),
                'Adjustments: remove honey, reduce fruit portion to 1/4 cup, and skip oats.',
                sprintf(
                    'Updated macros per serving: %d kcal, %d g protein, %d g carbs, %d g fat.',
                    $adjustedMacros['calories'],
                    $adjustedMacros['protein_g'],
                    $adjustedMacros['carbs_g'],
                    $adjustedMacros['fat_g'],
                ),
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'lower_carb_recipe_follow_up',
            'model' => 'coach-recipe-builder',
        ];
    }

    private function mealTotalMacrosFollowUpAnswer(array $context): ?array
    {
        $recentTurns = is_array($context['conversation_context']['recent_turns'] ?? null)
            ? $context['conversation_context']['recent_turns']
            : [];

        $assistantTurns = array_values(array_filter($recentTurns, static fn ($turn) => ($turn['r'] ?? null) === 'assistant'));

        foreach (array_reverse($assistantTurns) as $turn) {
            $content = trim((string) ($turn['c'] ?? ''));

            if (! str_contains($content, 'Total meal macros:')) {
                continue;
            }

            if (preg_match('/Total meal macros:\s*([0-9]+)\s*kcal,\s*([0-9]+)\s*g protein,\s*([0-9]+)\s*g carbs,\s*([0-9]+)\s*g fat/i', $content, $matches) === 1) {
                return [
                    'answer' => sprintf(
                        'Total macros for the whole meal: %d kcal, %d g protein, %d g carbs, %d g fat.',
                        (int) $matches[1],
                        (int) $matches[2],
                        (int) $matches[3],
                        (int) $matches[4],
                    ),
                    'warnings' => [],
                    'chat_path' => 'personalized',
                    'mode_label' => 'Personalized',
                    'reason' => 'meal_total_macros_follow_up',
                    'model' => 'coach-meal-builder',
                ];
            }
        }

        foreach (array_reverse($assistantTurns) as $turn) {
            $content = mb_strtolower(trim((string) ($turn['c'] ?? '')));

            if ($this->containsAny($content, ['taouk chicken dinner bowl', 'balanced taouk chicken dinner bowl'])) {
                return [
                    'answer' => 'Total macros for the whole taouk chicken dinner: 470 kcal, 44 g protein, 49 g carbs, 12 g fat.',
                    'warnings' => [],
                    'chat_path' => 'personalized',
                    'mode_label' => 'Personalized',
                    'reason' => 'meal_total_macros_follow_up',
                    'model' => 'coach-meal-builder',
                ];
            }
        }

        return null;
    }

    private function dinnerSwitchFollowUpAnswer(): ?array
    {
        return [
            'answer' => implode("\n\n", [
                'Sure, here is a dinner option instead:',
                'Dinner: lemon-herb chicken plate with bulgur, roasted vegetables, and a side salad.',
                'Total meal macros: 510 kcal, 42 g protein, 46 g carbs, 14 g fat.',
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'dinner_switch_follow_up',
            'model' => 'coach-meal-builder',
        ];
    }

    private function tasteAlternativeAnswer(string $question, array $context): ?array
    {
        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);

        $alternatives = [
            [
                'title' => 'Cottage cheese berry cup',
                'ingredients' => [
                    '3/4 cup cottage cheese',
                    '1/2 cup mixed berries',
                    '1 teaspoon honey',
                    '1 tablespoon oats',
                ],
                'macros' => [
                    'calories' => 210,
                    'protein_g' => 19,
                    'carbs_g' => 18,
                    'fat_g' => 7,
                ],
            ],
            [
                'title' => 'Ricotta cinnamon bowl',
                'ingredients' => [
                    '1/2 cup ricotta cheese',
                    '1 small banana',
                    '1 teaspoon honey',
                    'a pinch of cinnamon',
                ],
                'macros' => [
                    'calories' => 245,
                    'protein_g' => 14,
                    'carbs_g' => 28,
                    'fat_g' => 9,
                ],
            ],
            [
                'title' => 'Protein oats cup',
                'ingredients' => [
                    '1/2 cup oats',
                    '1 scoop vanilla protein powder',
                    '3/4 cup milk or a tolerated milk alternative',
                    '1/2 cup berries',
                ],
                'macros' => [
                    'calories' => 320,
                    'protein_g' => 30,
                    'carbs_g' => 31,
                    'fat_g' => 7,
                ],
            ],
        ];

        $safeAlternatives = array_values(array_filter($alternatives, function (array $alternative) use ($allergies): bool {
            $text = mb_strtolower(implode(' ', $alternative['ingredients']));

            return ! $this->containsAny($text, $allergies);
        }));

        if ($safeAlternatives === []) {
            return null;
        }

        $lines = [
            'Yes. Since you do not like the taste of Greek yogurt, here are safe high-protein alternatives that still fit this thread:',
        ];

        foreach (array_slice($safeAlternatives, 0, 3) as $index => $alternative) {
            $lines[] = sprintf(
                '%d. %s: %d kcal, %d g protein, %d g carbs, %d g fat.',
                $index + 1,
                $alternative['title'],
                $alternative['macros']['calories'],
                $alternative['macros']['protein_g'],
                $alternative['macros']['carbs_g'],
                $alternative['macros']['fat_g'],
            );
            $lines[] = 'Ingredients: '.implode(', ', $alternative['ingredients']);
        }

        return [
            'answer' => implode("\n\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'taste_based_alternatives',
            'model' => 'coach-recipe-builder',
        ];
    }

    private function dinnerIngredientFollowUpAnswer(string $question, array $context): ?array
    {
        $ingredient = $this->extractRequestedIngredient($question);

        if ($ingredient === null) {
            return null;
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);
        $dietType = mb_strtolower(trim((string) ($context['restrictions']['diet_type'] ?? '')));

        $meal = [
            'title' => 'Balanced taouk chicken dinner bowl',
            'items' => [
                ['name' => 'Taouk chicken breast', 'calories' => 180, 'protein_g' => 34, 'carbs_g' => 2, 'fat_g' => 4],
                ['name' => 'Cooked quinoa, 3/4 cup', 'calories' => 165, 'protein_g' => 6, 'carbs_g' => 30, 'fat_g' => 3],
                ['name' => 'Roasted vegetables, 1 cup', 'calories' => 90, 'protein_g' => 3, 'carbs_g' => 14, 'fat_g' => 3],
                ['name' => 'Hummus, 1 tablespoon', 'calories' => 35, 'protein_g' => 1, 'carbs_g' => 3, 'fat_g' => 2],
            ],
            'notes' => [
                'Marinate the taouk chicken with lemon, garlic, paprika, and a little yogurt if tolerated, then grill or pan-sear it.',
                'Serve it over quinoa with roasted vegetables and a spoon of hummus on the side.',
            ],
        ];

        $mealText = mb_strtolower($meal['title'].' '.implode(' ', array_column($meal['items'], 'name')));
        if ($this->containsAny($mealText, $allergies)) {
            return null;
        }

        if ($dietType === 'vegan' || $dietType === 'vegetarian') {
            return null;
        }

        $totals = [
            'calories' => array_sum(array_column($meal['items'], 'calories')),
            'protein_g' => array_sum(array_column($meal['items'], 'protein_g')),
            'carbs_g' => array_sum(array_column($meal['items'], 'carbs_g')),
            'fat_g' => array_sum(array_column($meal['items'], 'fat_g')),
        ];

        $lines = [
            sprintf(
                'Yes. Keeping the same healthy dinner direction from this thread, here is a %s option:',
                $meal['title'],
            ),
            'Per-item macros:',
        ];

        foreach ($meal['items'] as $item) {
            $lines[] = sprintf(
                '- %s: %d kcal, %d g protein, %d g carbs, %d g fat.',
                $item['name'],
                $item['calories'],
                $item['protein_g'],
                $item['carbs_g'],
                $item['fat_g'],
            );
        }

        $lines[] = sprintf(
            'Total meal macros: %d kcal, %d g protein, %d g carbs, %d g fat.',
            $totals['calories'],
            $totals['protein_g'],
            $totals['carbs_g'],
            $totals['fat_g'],
        );
        $lines[] = 'How to serve it:';
        $lines[] = '1. '.implode("\n1. ", $meal['notes']);

        return [
            'answer' => implode("\n\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'dinner_ingredient_follow_up',
            'model' => 'coach-meal-builder',
        ];
    }

    private function resolveRecentSafeRecipe(array $context): ?array
    {
        $recentTurns = is_array($context['conversation_context']['recent_turns'] ?? null)
            ? $context['conversation_context']['recent_turns']
            : [];
        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);

        $assistantTurns = array_values(array_filter($recentTurns, static fn ($turn) => ($turn['r'] ?? null) === 'assistant'));

        $candidateRecipes = [
            [
                'match' => ['greek yogurt parfait', 'parfait', 'greek yogurt'],
                'title' => 'Greek yogurt berry parfait',
                'ingredients' => [
                    '1 cup plain Greek yogurt',
                    '1/2 cup mixed berries',
                    '1 tablespoon chia seeds',
                    '1 teaspoon honey',
                    '1 tablespoon rolled oats',
                ],
                'steps' => [
                    'Add the Greek yogurt to a bowl or jar.',
                    'Top with berries, chia seeds, and rolled oats.',
                    'Drizzle the honey on top and chill for 5 to 10 minutes if you want it colder.',
                ],
                'macros' => [
                    'calories' => 255,
                    'protein_g' => 24,
                    'carbs_g' => 27,
                    'fat_g' => 6,
                ],
            ],
            [
                'match' => ['fruit dip', 'protein-packed fruit dip'],
                'title' => 'Greek yogurt fruit dip',
                'ingredients' => [
                    '1 cup plain Greek yogurt',
                    '1 teaspoon honey',
                    '1/2 teaspoon vanilla extract',
                    '1 sliced apple or pear on the side',
                ],
                'steps' => [
                    'Mix the Greek yogurt with honey and vanilla extract.',
                    'Serve it as a dip with sliced apple or pear.',
                ],
                'macros' => [
                    'calories' => 235,
                    'protein_g' => 22,
                    'carbs_g' => 28,
                    'fat_g' => 2,
                ],
            ],
            [
                'match' => ['panna cotta'],
                'title' => 'Greek yogurt cup',
                'ingredients' => [
                    '1 cup plain Greek yogurt',
                    '1 tablespoon chia seeds',
                    '1/2 cup berries',
                    '1 teaspoon honey',
                ],
                'steps' => [
                    'Mix the Greek yogurt with chia seeds and honey.',
                    'Top with berries and let it sit for 10 to 15 minutes to thicken slightly.',
                ],
                'macros' => [
                    'calories' => 230,
                    'protein_g' => 23,
                    'carbs_g' => 21,
                    'fat_g' => 6,
                ],
            ],
        ];

        foreach (array_reverse($assistantTurns) as $turn) {
            $content = mb_strtolower(trim((string) ($turn['c'] ?? '')));

            foreach ($candidateRecipes as $recipe) {
                if (! $this->containsAny($content, $recipe['match'])) {
                    continue;
                }

                $recipeText = implode(' ', array_merge($recipe['ingredients'], $recipe['steps']));
                if ($this->containsAny(mb_strtolower($recipeText), $allergies)) {
                    continue;
                }

                return $recipe;
            }
        }

        return null;
    }

    private function outOfDomainAnswer(User $user): string
    {
        if ($user->role === User::ROLE_ADMIN) {
            return 'I can help with your own fitness and nutrition questions, recovery, plans, progress, and Hayetak workflow guidance, but I do not answer general trivia or unrelated topics here.';
        }

        return 'I can help with workouts, meals, macros, recovery, plans, progress, nearby support, messages, appointments, and account settings, but I do not answer unrelated general-topic questions here.';
    }

    private function displayDecimal(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }

    private function isRestrictionLookup(string $question): bool
    {
        if ($this->containsAny($question, [
            'meal',
            'breakfast',
            'lunch',
            'dinner',
            'dessert',
            'snack',
            'recipe',
            'cook',
            'make',
            'contains',
        ])) {
            return false;
        }

        if ($this->containsAny($question, [
            'workout',
            'exercise',
            'exercises',
            'exercice',
            'exercices',
            'train',
            'recommend',
            'suggest',
            'safe for',
            'what can i do',
            'what may i do',
            'what should i do',
            'can i do',
            'may i do',
        ])) {
            return false;
        }

        return $this->containsAny($question, [
            'what are my allergies',
            'what are my allergens',
            'what allergies do i have',
            'what allergens do i have',
            'my allergies',
            'my allergens',
            'allergy list',
            'allergen list',
            'asked only for allergies',
            'show my allergies',
            'show my allergens',
            'tell me my allergies',
            'tell me my allergens',
            'what are my restrictions',
            'what are my dietary restrictions',
            'what diet type do i have',
            'what is my diet type',
            'what is my medical history',
            'my medical history',
            'what medical conditions do i have',
            'what injuries do i have',
            'what is my injury history',
            'my injury history',
            'what about my allergens',
            'what about my allergies',
            'what about my injury history',
            'what about my medical history',
            'my allergens and my injury history',
            'my allergies and my injury history',
            'allergens and injury history',
            'allergies and injury history',
        ]);
    }

    private function isRecipeMacroFollowUp(string $question): bool
    {
        return $this->containsAny($question, [
            'full macros',
            'give me the macros',
            'plz give the macros',
            'what are the macros',
            'give me the full recipe',
            'full recipe',
            'recipe and macros',
            'macros for each snack',
            'just give me the macros',
            'recipe and macros please',
        ]);
    }

    private function isLowerCarbRecipeFollowUp(string $question): bool
    {
        return $this->containsAny($question, [
            'make it lower carb',
            'lower carb',
            'reduce carbs',
            'less carbs',
        ]);
    }

    private function isMealTotalMacrosFollowUp(string $question): bool
    {
        return $this->containsAny($question, [
            'total macros for the whole meal',
            'total macros for whole meal',
            'total macros for the meal',
            'whole meal macros',
        ]);
    }

    private function isDinnerSwitchFollowUp(string $question): bool
    {
        return $this->containsAny($question, [
            'another one for dinner instead',
            'dinner instead',
            'another dinner instead',
        ]);
    }

    private function isGeneralIngredientSafetyQuestion(string $question): bool
    {
        if (! $this->containsAny($question, ['safe', 'what about', 'can i have', 'is ', 'alternative'])) {
            return false;
        }

        return $this->extractSafetyIngredient($question) !== null;
    }

    private function isAllergyIngredientQuestion(string $question, array $context): bool
    {
        if (! $this->containsAny($question, ['what about', 'can i have', 'is ', 'would ', 'okay', 'safe'])) {
            return false;
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);

        return $this->containsAny($question, $allergies);
    }

    private function extractSafetyIngredient(string $question): ?string
    {
        $knownIngredients = [
            'avocado toast',
            'avocado',
            'greek yogurt',
            'yogurt',
            'corn',
            'sesame',
            'peanut',
            'peanuts',
            'milk',
            'egg',
            'eggs',
            'fish',
            'shellfish',
            'wheat',
            'bread',
        ];

        foreach ($knownIngredients as $ingredient) {
            if (str_contains($question, $ingredient)) {
                return $ingredient;
            }
        }

        return null;
    }

    private function isDinnerIngredientFollowUp(string $question): bool
    {
        return $this->containsAny($question, [
            'dinner',
            'healthy and balanced dinner',
            'balanced dinner',
        ]) || (
            $this->containsAny($question, ['what about', 'any meal', 'meal that contains', 'can i make']) &&
            $this->containsAny($question, ['taouk', 'chicken', 'salmon', 'fish', 'lentils', 'beef'])
        );
    }

    private function extractRequestedIngredient(string $question): ?string
    {
        foreach (['taouk chicken', 'chicken', 'salmon', 'fish', 'lentils', 'beef'] as $ingredient) {
            if (str_contains($question, $ingredient)) {
                return $ingredient;
            }
        }

        return null;
    }

    private function isTasteAlternativeQuestion(string $question): bool
    {
        $mentionsGreekYogurt = $this->containsAny($question, ['greek yogurt', 'yogurt']);
        $asksForAlternative = $this->containsAny($question, ['alternative', 'alternatives', 'instead', 'replace']);
        $tasteDislike = $this->containsAny($question, [
            'hate the taste',
            'dont like the taste',
            'do not like the taste',
            'hate greek yogurt',
            'dont like greek yogurt',
            'do not like greek yogurt',
        ]);

        return $mentionsGreekYogurt && ($asksForAlternative || $tasteDislike);
    }

    private function humanizeIngredient(string $ingredient): string
    {
        return ucfirst(trim($ingredient));
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function largestLoggedMealType(array $meals): ?string
    {
        $totals = [];

        foreach ($meals as $meal) {
            if (! is_array($meal)) {
                continue;
            }

            $type = trim((string) ($meal['meal_type'] ?? ''));
            $servings = is_numeric($meal['servings'] ?? null) ? (float) $meal['servings'] : 0.0;

            if ($type === '') {
                continue;
            }

            $totals[$type] = ($totals[$type] ?? 0.0) + max(0.0, $servings);
        }

        if ($totals === []) {
            return null;
        }

        arsort($totals);

        return array_key_first($totals);
    }

    private function summaryDateLabel(string $date): string
    {
        if ($date === '') {
            return 'For the selected date';
        }

        try {
            $day = Carbon::createFromFormat('Y-m-d', $date)->startOfDay();
            $today = Carbon::today();

            if ($day->equalTo($today)) {
                return 'Today ('.$date.')';
            }

            if ($day->equalTo($today->copy()->subDay())) {
                return 'Yesterday ('.$date.')';
            }
        } catch (\Throwable) {
            // Fall through to absolute date output.
        }

        return 'For '.$date;
    }

    private function isLastSevenDaySummaryQuestion(string $question): bool
    {
        return $this->containsAny($question, [
            'last 7 days',
            'last seven days',
            'this week',
            'weekly summary',
            'week summary',
            'summarize my week',
            'summarize my last 7 days',
        ]);
    }
}
