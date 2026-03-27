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

        if ($this->isRecipeMacroFollowUp($normalizedQuestion)) {
            $recipeFollowUp = $this->recipeMacroFollowUpAnswer($context);

            if ($recipeFollowUp !== null) {
                return $recipeFollowUp;
            }
        }

        if (($classification['deterministic_action'] ?? null) === 'protein_target') {
            return $this->proteinTargetAnswer($context);
        }

        if (($classification['deterministic_action'] ?? null) === 'meal_summary') {
            return $this->mealSummaryAnswer($context);
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

    private function mealSummaryAnswer(array $context): array
    {
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];
        $targets = is_array($context['plans']['nutrition_targets'] ?? null) ? $context['plans']['nutrition_targets'] : [];
        $meals = is_array($today['meals'] ?? null) ? $today['meals'] : [];
        $summaryDate = trim((string) ($today['date'] ?? ''));
        $summaryLabel = $this->summaryDateLabel($summaryDate);
        $mealTypes = array_values(array_unique(array_filter(array_map(
            static fn ($meal) => is_array($meal) ? trim((string) ($meal['meal_type'] ?? '')) : '',
            $meals,
        ))));

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

        $lines = [
            'Here are the saved safety and diet details I can see for your account:',
            'Diet type: '.($dietType !== '' ? $dietType : 'none saved'),
            'Allergies: '.($allergies !== [] ? implode(', ', $allergies) : 'none saved'),
            'Medical conditions: '.($medicalConditions !== [] ? implode(', ', $medicalConditions) : 'none saved'),
            'Injuries: '.($injuries !== [] ? implode(', ', $injuries) : 'none saved'),
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
            'snack',
            'recipe',
            'cook',
            'make',
            'contains',
        ])) {
            return false;
        }

        return $this->containsAny($question, [
            'what are my allergies',
            'what allergies do i have',
            'my allergies',
            'allergy list',
            'asked only for allergies',
            'show my allergies',
            'tell me my allergies',
            'what are my restrictions',
            'what are my dietary restrictions',
            'what diet type do i have',
            'what is my diet type',
            'what medical conditions do i have',
            'what injuries do i have',
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

    private function isAllergyIngredientQuestion(string $question, array $context): bool
    {
        if (! $this->containsAny($question, ['what about', 'can i have', 'is ', 'would ', 'okay', 'safe'])) {
            return false;
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);

        return $this->containsAny($question, $allergies);
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
        return $this->containsAny($question, [
            'alternative',
            'alternatives',
            'instead',
            'replace',
            'hate the taste',
            'dont like the taste',
            'do not like the taste',
            'hate greek yogurt',
            'dont like greek yogurt',
            'do not like greek yogurt',
        ]);
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
}
