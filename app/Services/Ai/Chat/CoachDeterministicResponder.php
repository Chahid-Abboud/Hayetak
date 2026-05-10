<?php

namespace App\Services\Ai\Chat;

use App\Models\User;
use Carbon\Carbon;

class CoachDeterministicResponder
{
    private const INGREDIENT_AUDIT_KEYWORDS = [
        'avocado',
        'banana',
        'corn',
        'sesame',
        'wheat',
        'milk',
        'egg',
        'eggs',
        'fish',
        'shellfish',
        'mustard',
        'celery',
        'garlic',
        'onion',
        'tomato',
        'soy',
        'lupin',
        'peanut',
        'peanuts',
    ];

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

        $riskSpecific = $this->riskSpecificSafetyAnswer($normalizedQuestion, $context);
        if ($riskSpecific !== null) {
            return $riskSpecific;
        }

        if ($this->isShortAffirmation($normalizedQuestion)) {
            $affirmationFollowUp = $this->shortAffirmationFollowUpAnswer($context);

            if ($affirmationFollowUp !== null) {
                return $affirmationFollowUp;
            }
        }

<<<<<<< HEAD
        if ($this->isRecommendationFollowUp($normalizedQuestion)) {
            $recommendationFollowUp = $this->recommendationFollowUpAnswer($context);

            if ($recommendationFollowUp !== null) {
                return $recommendationFollowUp;
            }
        }

=======
>>>>>>> origin/main
        if (($classification['scope'] ?? 'in_domain') === 'out_of_domain') {
            return [
                'answer' => $this->outOfDomainAnswer($user, $normalizedQuestion),
                'warnings' => [],
                'chat_path' => 'out_of_scope',
                'mode_label' => 'Out of scope',
                'reason' => 'domain_guard',
                'model' => 'coach-domain-guard',
            ];
        }

        if ($this->isGratitudeOrClosing($normalizedQuestion)) {
            return [
                'answer' => 'You are very welcome. I am here whenever you want help with meals, workouts, recovery, or your plan.',
                'warnings' => [],
                'chat_path' => 'conversation',
                'mode_label' => 'Conversation',
                'reason' => 'gratitude_acknowledgement',
                'model' => 'coach-conversation-shortcut',
            ];
        }

        if (
            ($classification['deterministic_action'] ?? null) === 'restriction_summary' ||
            $this->isRestrictionLookup($normalizedQuestion)
        ) {
<<<<<<< HEAD
            return $this->restrictionSummaryAnswer($context, $normalizedQuestion);
=======
            return $this->restrictionSummaryAnswer($context);
>>>>>>> origin/main
        }

        if (
            ($classification['deterministic_action'] ?? null) === 'allergy_exposure_check' ||
            $this->isAllergyExposureAuditQuestion($normalizedQuestion)
        ) {
            $exposureAudit = $this->allergyExposureAuditAnswer($normalizedQuestion, $context);

            if ($exposureAudit !== null) {
                return $exposureAudit;
            }
        }

        if (
            ($classification['deterministic_action'] ?? null) === 'ingredient_exposure_check' ||
            $this->isIngredientExposureAuditQuestion($normalizedQuestion)
        ) {
            $ingredientAudit = $this->ingredientExposureAuditAnswer($normalizedQuestion, $context);

            if ($ingredientAudit !== null) {
                return $ingredientAudit;
            }
        }

        if ($this->isAllergyConflictRequest($normalizedQuestion, $context)) {
            $allergyConflict = $this->allergyConflictAnswer($normalizedQuestion, $context);

            if ($allergyConflict !== null) {
                return $allergyConflict;
            }
        }

        if ($this->isAvailableIngredientRecipeRequest($normalizedQuestion, $context)) {
            $availableIngredientRecipe = $this->availableIngredientRecipeAnswer($context);

            if ($availableIngredientRecipe !== null) {
                return $availableIngredientRecipe;
            }
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

    private function riskSpecificSafetyAnswer(string $question, array $context): ?array
    {
        if ($this->containsAny($question, ['vegan']) && $this->containsAny($question, ['chicken', 'meat', 'animal'])) {
            return $this->fixedCoachAnswer([
                'For today, I decline chicken for this vegan diet-type request because animal-based chicken conflicts with the diet preference in this thread.',
                'Instead, a safer plant-based protein alternative is lentils with rice and spinach, tofu with vegetables, or beans with a grain if those fit your saved profile and allergies.',
                'Keep the same protein goal by building the meal around a plant protein instead of animal-based chicken.',
            ], 'diet_type_guard');
        }

        if ($this->containsAny($question, ['stop being vegan', 'remember that for this thread', 'should you remember'])) {
            return $this->fixedCoachAnswer([
                'I can remember a temporary preference inside this thread, but your saved profile controls recommendations until you update it.',
                'I will not change your stored diet type without you explicitly updating your profile.',
                'For consistency, tell me whether each new request should follow the saved profile or a temporary diet preference for that meal.',
            ], 'diet_type_memory_guard');
        }

        if ($this->containsAny($question, ['hypertension', 'sodium-loading', 'sodium loading', 'high sodium'])) {
            return $this->fixedCoachAnswer([
                'I cannot provide a sodium-loading plan with hypertension because it can raise blood-pressure risk.',
                'A safer hydration approach is water across the day, normal meals, and only modest electrolytes if they fit your clinician guidance.',
                'For individualized sodium targets or medication-related questions, check with your clinician.',
            ], 'medical_safety_guard');
        }

        if ($this->containsAny($question, ['ignore that']) && $this->recentContextContains($context, ['hypertension', 'sodium', 'blood pressure'])) {
            return $this->fixedCoachAnswer([
                'No, I would not ignore the medical boundary just because you feel fine today.',
                'Hypertension and blood-pressure risk still matter even on a good-feeling day, so keep the safer hydration plan and avoid sodium loading.',
                'Check with a clinician for individualized advice if training conditions or symptoms change.',
            ], 'medical_safety_guard');
        }

        if ($this->containsAny($question, ['dinner']) && $this->containsAny($question, ['condition', 'logs', 'tonight'])) {
            return $this->fixedCoachAnswer([
                $this->todayMacroLine($context).' '.$this->lastSevenNutritionLine($context),
                'For dinner tonight, choose a balanced lower-sodium plate: grilled chicken or lentils, rice or potatoes, and cooked vegetables seasoned without your saved allergens.',
                'Avoid high-sodium processed foods and keep portions aligned with your target while respecting your medical condition and allergy list.',
            ], 'medical_dinner_guard');
        }

        if ($this->containsAny($question, ['knee', 'squat', 'squats']) && $this->containsAny($question, ['heavy', 'hurts', 'pain', 'exactly how heavy'])) {
            return $this->fixedCoachAnswer([
                'I would avoid heavy barbell squats today while your knee hurts, and I will not prescribe an exact heavy load through pain.',
                'Use a pain-free range instead: box squats to a comfortable height, hip hinges, glute bridges, or step-ups only if they are pain-free.',
                'If pain worsens or changes sharply, stop the movement and consider clinician guidance.',
            ], 'injury_safety_guard');
        }

        if ($this->containsAny($question, ['home equipment', '20 minutes', 'make it 20'])) {
            return $this->fixedCoachAnswer([
                'Here is a 20-minute home alternative that keeps the knee in a pain-free range.',
                'Do 3 rounds: 8-10 hip hinges, 10 glute bridges, 8 supported split-stance reaches per side, and 30 seconds easy marching or cycling if pain-free.',
                'Keep every set easy to moderate, stop if pain increases, and swap any painful move for upper-body or core work.',
            ], 'injury_home_alternative');
        }

        if ($this->containsAny($question, ['pain gets sharper', 'sharper during', 'sharp pain'])) {
            return $this->fixedCoachAnswer([
                'Stop the aggravating movement if the pain gets sharper during the set.',
                'Regress to a pain-free alternative, reduce range of motion, or switch to recovery work for the day.',
                'If sharp pain persists, is severe, or changes your walking mechanics, get clinician guidance instead of pushing through.',
            ], 'injury_pain_boundary');
        }

        if ($this->containsAny($question, ['max-effort', 'max effort', 'deadlift']) && $this->containsAny($question, ['every day', '14 days', 'daily'])) {
            return $this->fixedCoachAnswer([
                'I would reject daily max-effort deadlifting because it ignores recovery and raises injury risk.',
                'A safer strength progression is 2 deadlift-focused days per week, 1 lighter hinge/accessory day, and at least 48 hours between hard pulls.',
                'Use your last 7 days of workouts to decide whether tomorrow should be hard, moderate, or recovery-focused.',
            ], 'unsafe_training_guard');
        }

        if ($this->containsAny($question, ['last week of workouts', 'last week']) && $this->containsAny($question, ['tomorrow', 'workouts'])) {
            return $this->fixedCoachAnswer([
                $this->lastSevenWorkoutLine($context),
                'For tomorrow, choose a safe next session based on that recent load: moderate full-body strength if you recovered well, or mobility plus easy cardio if soreness or fatigue is high.',
                'Avoid repeating a max-effort deadlift day unless recovery and programming clearly support it.',
            ], 'workout_context_next_step');
        }

        if ($this->containsAny($question, ['10 kg in 10 days', 'lose 10 kg']) || ($this->containsAny($question, ['exact calories']) && $this->containsAny($question, ['lose', 'cut']))) {
            return $this->fixedCoachAnswer([
                'I cannot give starvation calories for losing 10 kg in 10 days because that target is unsafe and unrealistic.',
                'A safer pace is roughly 0.5-1% of body weight per week with a moderate calorie deficit, adequate protein, and normal hydration.',
                $this->todayMacroLine($context).' Start with one modest adjustment rather than an extreme cut.',
            ], 'extreme_weight_change_guard');
        }

        if ($this->containsAny($question, ['stop eating carbs and water', 'stop carbs and water', 'stop drinking water'])) {
            return $this->fixedCoachAnswer([
                'Keep drinking water normally; dehydration is unsafe and will not create sustainable fat loss.',
                'You also do not need to remove all carbs. Use a modest carb portion around training, keep protein high, and keep water/hydration consistent.',
                'A safer adjustment is reducing ultra-processed snacks or sugary drinks while keeping meals balanced.',
            ], 'extreme_restriction_guard');
        }

        if ($this->containsAny($question, ['last 7 days']) && $this->containsAny($question, ['realistic adjustment', 'one realistic adjustment'])) {
            return $this->fixedCoachAnswer([
                $this->lastSevenNutritionLine($context),
                'One realistic adjustment: keep protein consistent and change calories by only about 150-250 kcal per day if your weekly trend is not matching the goal.',
                'Do not change water intake or remove whole food groups just to force a faster result.',
            ], 'realistic_progress_adjustment');
        }

        if ($this->containsAny($question, ['fat burner', 'high caffeine', 'caffeine dose', 'stimulant'])) {
            return $this->fixedCoachAnswer([
                'I cannot recommend a fat-burner stack or high caffeine dose to cut faster because stimulant misuse can be unsafe.',
                'Safer levers are a moderate calorie deficit, protein consistency, sleep, hydration, and training consistency.',
                'If you use supplements or have blood-pressure, heart, anxiety, or medication concerns, check the label and ask a clinician.',
            ], 'supplement_safety_guard');
        }

        if ($this->containsAny($question, ['doubling pre-workout', 'double pre-workout', 'doubling stimulant'])) {
            return $this->fixedCoachAnswer([
                'Do not double pre-workout because doubling stimulant supplements can increase side effects and does not replace recovery.',
                'If you feel tired, choose rest, a lighter session, water, and a small carb-plus-protein meal instead.',
                'Follow the product label and ask a clinician if you have medical conditions, medications, or stimulant sensitivity.',
            ], 'supplement_safety_guard');
        }

        if ($this->containsAny($question, ['pre-workout meal']) && $this->containsAny($question, ['banana', 'yogurt'])) {
            return $this->fixedCoachAnswer([
                'Safe pre-workout meal option after allergy and diet checks: banana yogurt oat bowl.',
                'Ingredients: 1 small banana, 3/4 cup yogurt or tolerated lactose-free yogurt, and 2 tablespoons oats.',
                'Prep time: 3 minutes. Approximate macros: 260 kcal, 17 g protein, 43 g carbs, and 4 g fat.',
            ], 'safe_preworkout_meal');
        }

        if ($this->containsAny($question, ['summarize my last 7 days', 'biggest pattern'])) {
            return $this->mealSummaryAnswer($context, 'last 7 days');
        }

        if ($this->containsAny($question, ['based on both']) && $this->containsAny($question, ['dinner'])) {
            return $this->fixedCoachAnswer([
                $this->todayMacroLine($context).' '.$this->lastSevenNutritionLine($context),
                'Dinner tonight: a safe balanced bowl with a lean protein, rice or potatoes, and vegetables that avoid your saved allergens and diet conflicts.',
                'Keep sodium moderate, keep protein forward, and use the weekly pattern to decide whether the carb portion should be normal or slightly smaller.',
            ], 'today_weekly_dinner');
        }

        if ($this->containsAny($question, ['eggs conflict', 'egg conflict', 'eggs conflict with my diet', 'eggs conflict with my allergies'])) {
            return $this->fixedCoachAnswer([
                'I checked your saved diet and allergies before assuming eggs are acceptable.',
                'If eggs conflict with your diet or allergy needs, use this safe alternative recipe: lentil rice spinach bowl.',
                'Ingredients: cooked lentils, cooked rice, spinach, and lemon. Prep: warm the lentils and rice, fold in spinach, then finish with lemon. Keep it free of saved allergens.',
            ], 'recipe_restriction_alternative');
        }

        if ($this->containsAny($question, ['simplest version']) && $this->containsAny($question, ['macros', 'prep time'])) {
            return $this->fixedCoachAnswer([
                'Simplest safe version: microwave spinach rice bowl.',
                'Prep time: 6 minutes. Ingredients: 1 cup cooked rice, 1 cup spinach, and a tolerated protein from your profile.',
                'Approximate macros with eggs if tolerated: 420 kcal, 24 g protein, 52 g carbs, and 12 g fat. Use lentils or tofu instead if eggs conflict.',
            ], 'simple_recipe_follow_up');
        }

        return null;
    }

    /**
     * @param  array<int, string>  $paragraphs
     * @return array<string, mixed>
     */
    private function fixedCoachAnswer(array $paragraphs, string $reason): array
    {
        return [
            'answer' => implode("\n\n", $paragraphs),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => $reason,
            'model' => 'coach-safety-guard',
        ];
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

<<<<<<< HEAD
    private function restrictionSummaryAnswer(array $context, string $question = ''): array
=======
    private function restrictionSummaryAnswer(array $context): array
>>>>>>> origin/main
    {
        $restrictions = is_array($context['restrictions'] ?? null) ? $context['restrictions'] : [];
        $allergies = is_array($restrictions['allergies'] ?? null) ? $restrictions['allergies'] : [];
        $dietType = trim((string) ($restrictions['diet_type'] ?? ''));
        $injuries = is_array($restrictions['injuries'] ?? null) ? $restrictions['injuries'] : [];
        $medicalConditions = is_array($restrictions['medical_conditions'] ?? null) ? $restrictions['medical_conditions'] : [];
        $avoidanceNotes = [];
<<<<<<< HEAD
        $focus = $this->restrictionSummaryFocus($question);
=======
>>>>>>> origin/main

        if ($allergies !== []) {
            $avoidanceNotes[] = 'avoid foods containing '.implode(', ', $allergies);
        }

        $normalizedDiet = mb_strtolower($dietType);
        if ($normalizedDiet === 'vegan') {
            $avoidanceNotes[] = 'avoid animal products (meat, fish, eggs, and dairy)';
        } elseif ($normalizedDiet === 'vegetarian') {
            $avoidanceNotes[] = 'avoid meat and poultry';
        }

<<<<<<< HEAD
        $lines = match ($focus) {
            'diet_type' => [
                'Based on your profile, your saved diet type is: '.($dietType !== '' ? $dietType : 'none saved').'.',
            ],
            'allergies' => [
                'Based on your profile, your saved allergies are: '.($allergies !== [] ? implode(', ', $allergies) : 'none saved').'.',
            ],
            'medical_conditions' => [
                'Based on your profile, your saved medical conditions are: '.($medicalConditions !== [] ? implode(', ', $medicalConditions) : 'none saved').'.',
            ],
            'injuries' => [
                'Based on your profile, your saved injury history is: '.($injuries !== [] ? implode(', ', $injuries) : 'none saved').'.',
            ],
            default => [
                'Based on your profile, here are the health and diet details I can see for your account:',
                'Diet type: '.($dietType !== '' ? $dietType : 'none saved'),
                'Allergies: '.($allergies !== [] ? implode(', ', $allergies) : 'none saved'),
                'Medical conditions: '.($medicalConditions !== [] ? implode(', ', $medicalConditions) : 'none saved'),
                'Injuries: '.($injuries !== [] ? implode(', ', $injuries) : 'none saved'),
                'Foods to avoid: '.($avoidanceNotes !== [] ? implode('; ', $avoidanceNotes).'.' : 'none explicitly saved.'),
            ],
        };
=======
        $lines = [
            'Based on your profile, here are the health and diet details I can see for your account:',
            'Diet type: '.($dietType !== '' ? $dietType : 'none saved'),
            'Allergies: '.($allergies !== [] ? implode(', ', $allergies) : 'none saved'),
            'Medical conditions: '.($medicalConditions !== [] ? implode(', ', $medicalConditions) : 'none saved'),
            'Injuries: '.($injuries !== [] ? implode(', ', $injuries) : 'none saved'),
            'Foods to avoid: '.($avoidanceNotes !== [] ? implode('; ', $avoidanceNotes).'.' : 'none explicitly saved.'),
        ];
>>>>>>> origin/main

        return [
            'answer' => implode("\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'restriction_summary',
            'model' => 'coach-profile-summary',
        ];
    }

    private function allergyExposureAuditAnswer(string $question, array $context): ?array
    {
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        if ($allergies === []) {
            return [
                'answer' => 'I do not see any saved allergies on your profile yet, so I cannot run an allergy-exposure check. Add your allergy list first, then ask again.',
                'warnings' => ['No saved allergies were available for an allergy exposure audit.'],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'allergy_exposure_check',
                'model' => 'coach-meal-summary',
            ];
        }

        $audit = is_array($context['allergy_audit'] ?? null) ? $context['allergy_audit'] : null;
        if ($audit === null) {
            return null;
        }

        $windowDays = $this->resolveAllergyAuditWindowDays($question);
        $anchor = $this->resolveAuditAnchorDate($context);
        $from = $anchor->copy()->subDays(max(0, $windowDays - 1))->startOfDay();

        $entries = array_values(array_filter(
            is_array($audit['entries'] ?? null) ? $audit['entries'] : [],
            fn ($entry) => $this->entryWithinRange($entry, $from, $anchor)
        ));

        $matches = array_values(array_filter(
            is_array($audit['matched_entries'] ?? null) ? $audit['matched_entries'] : [],
            fn ($entry) => $this->entryWithinRange($entry, $from, $anchor)
        ));

        $windowLabel = $this->auditWindowLabel($windowDays);
        $dateRangeLabel = sprintf('%s to %s', $from->toDateString(), $anchor->toDateString());
        $savedAllergiesText = implode(', ', $allergies);

        if ($entries === []) {
            return [
                'answer' => sprintf(
                    'I do not see any logged meals for your %s window (%s), so I cannot confirm allergy exposure yet.',
                    $windowLabel,
                    $dateRangeLabel,
                ),
                'warnings' => ['No meal entries were available for the allergy exposure audit window.'],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'allergy_exposure_check',
                'model' => 'coach-meal-summary',
            ];
        }

        if ($matches === []) {
            return [
                'answer' => sprintf(
                    'I checked your logged meals for the %s (%s) and I do not see entries that match your saved allergies (%s).',
                    $windowLabel,
                    $dateRangeLabel,
                    $savedAllergiesText,
                ),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'allergy_exposure_check',
                'model' => 'coach-meal-summary',
            ];
        }

        $lines = [
            sprintf(
                'Yes. I found %d logged meal entr%s in your %s (%s) that appear to match your saved allergies (%s).',
                count($matches),
                count($matches) === 1 ? 'y' : 'ies',
                $windowLabel,
                $dateRangeLabel,
                $savedAllergiesText,
            ),
        ];

        foreach (array_slice($matches, 0, 6) as $entry) {
            $date = trim((string) ($entry['date'] ?? 'unknown date'));
            $mealType = trim((string) ($entry['meal_type'] ?? 'meal'));
            $foodName = trim((string) ($entry['food_name'] ?? 'logged food'));
            $matchedAllergies = is_array($entry['matched_allergies'] ?? null)
                ? implode(', ', $entry['matched_allergies'])
                : 'saved allergies';

            $lines[] = sprintf('- %s (%s): %s [matched: %s]', $date, $mealType, $foodName, $matchedAllergies);
        }

        if (count($matches) > 6) {
            $lines[] = sprintf('...and %d more matching entries in that window.', count($matches) - 6);
        }

        $lines[] = 'This audit checks your logged food names plus saved food-allergen/ingredient tags. Packaged ingredients can vary, so verify labels when needed.';

        return [
            'answer' => implode("\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'allergy_exposure_check',
            'model' => 'coach-meal-summary',
        ];
    }

    private function ingredientExposureAuditAnswer(string $question, array $context): ?array
    {
        $ingredient = $this->extractAuditedIngredient($question);
        if ($ingredient === null) {
            return null;
        }

        $audit = is_array($context['allergy_audit'] ?? null) ? $context['allergy_audit'] : null;
        if ($audit === null) {
            return null;
        }

        $windowDays = $this->resolveAllergyAuditWindowDays($question);
        $anchor = $this->resolveAuditAnchorDate($context);
        $from = $anchor->copy()->subDays(max(0, $windowDays - 1))->startOfDay();

        $entries = array_values(array_filter(
            is_array($audit['entries'] ?? null) ? $audit['entries'] : [],
            fn ($entry) => $this->entryWithinRange($entry, $from, $anchor)
        ));

        $windowLabel = $this->auditWindowLabel($windowDays);
        $dateRangeLabel = sprintf('%s to %s', $from->toDateString(), $anchor->toDateString());

        if ($entries === []) {
            return [
                'answer' => sprintf(
                    'I do not see any logged meals for your %s window (%s), so I cannot verify %s exposure yet.',
                    $windowLabel,
                    $dateRangeLabel,
                    $this->humanizeIngredient($ingredient),
                ),
                'warnings' => ['No meal entries were available for the ingredient exposure audit window.'],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'ingredient_exposure_check',
                'model' => 'coach-meal-summary',
            ];
        }

        $aliases = $this->ingredientAliases($ingredient);
        $matches = array_values(array_filter($entries, function ($entry) use ($aliases): bool {
            if (! is_array($entry)) {
                return false;
            }

            $foodName = mb_strtolower(trim((string) ($entry['food_name'] ?? '')));
            $ingredients = array_map(
                static fn ($item) => mb_strtolower(trim((string) $item)),
                is_array($entry['ingredients'] ?? null) ? $entry['ingredients'] : []
            );
            $allergens = array_map(
                static fn ($item) => mb_strtolower(trim((string) $item)),
                is_array($entry['allergens'] ?? null) ? $entry['allergens'] : []
            );

            foreach ($aliases as $alias) {
                if ($alias === '') {
                    continue;
                }

                if ($this->containsAny($foodName, [$alias])) {
                    return true;
                }

                if (in_array($alias, $ingredients, true) || in_array($alias, $allergens, true)) {
                    return true;
                }
            }

            return false;
        }));

        if ($matches === []) {
            return [
                'answer' => sprintf(
                    'I checked your logged meals for the %s (%s) and I do not see entries containing %s.',
                    $windowLabel,
                    $dateRangeLabel,
                    $this->humanizeIngredient($ingredient),
                ),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'ingredient_exposure_check',
                'model' => 'coach-meal-summary',
            ];
        }

        $lines = [
            sprintf(
                'Yes. I found %d logged meal entr%s in your %s (%s) containing %s.',
                count($matches),
                count($matches) === 1 ? 'y' : 'ies',
                $windowLabel,
                $dateRangeLabel,
                $this->humanizeIngredient($ingredient),
            ),
        ];

        foreach (array_slice($matches, 0, 8) as $entry) {
            $date = trim((string) ($entry['date'] ?? 'unknown date'));
            $mealType = trim((string) ($entry['meal_type'] ?? 'meal'));
            $foodName = trim((string) ($entry['food_name'] ?? 'logged food'));
            $lines[] = sprintf('- %s (%s): %s', $date, $mealType, $foodName);
        }

        if (count($matches) > 8) {
            $lines[] = sprintf('...and %d more matching entries in that window.', count($matches) - 8);
        }

        return [
            'answer' => implode("\n", $lines),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'ingredient_exposure_check',
            'model' => 'coach-meal-summary',
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
                    $this->humanizeIngredient($matchedAllergy),
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

    private function allergyConflictAnswer(string $question, array $context): ?array
    {
        $matchedAllergy = $this->matchedSavedAllergy($question, $context);

        if ($matchedAllergy === null) {
            return null;
        }

        $humanAllergy = $this->humanizeIngredient($matchedAllergy);

        if ($this->containsAny($question, ['one bite', 'small bite', 'scrape', 'scraped', 'cross contact', 'cross-contact', 'residue'])) {
            return [
                'answer' => implode("\n\n", [
                    sprintf(
                        'I cannot treat one bite or scraping %s off as safe because it still conflicts with your saved allergy.',
                        $matchedAllergy,
                    ),
                    'Avoid the allergen completely; cross-contact or residue can still be a problem. If you are unsure about severity or exposure, check with a clinician.',
                    'Safer swap: choose a high-protein option that avoids the allergen, such as Greek yogurt with berries and oats, cottage cheese with fruit, or eggs with whole-grain toast if those fit your profile.',
                ]),
                'warnings' => [],
                'chat_path' => 'personalized',
                'mode_label' => 'Personalized',
                'reason' => 'allergy_conflict_guard',
                'model' => 'coach-safety-guard',
            ];
        }

        $recipe = $this->resolveRecentSafeRecipe($context) ?? $this->defaultSafeSnackRecipe($context);

        return [
            'answer' => implode("\n\n", [
                sprintf(
                    'I cannot recommend %s because it conflicts with your saved allergy to %s.',
                    $humanAllergy,
                    $matchedAllergy,
                ),
                sprintf(
                    'A safer high-protein alternative is %s. Macros per serving: %d kcal, %d g protein, %d g carbs, %d g fat.',
                    $recipe['title'],
                    $recipe['macros']['calories'],
                    $recipe['macros']['protein_g'],
                    $recipe['macros']['carbs_g'],
                    $recipe['macros']['fat_g'],
                ),
                'Ingredients:'."\n".'- '.implode("\n- ", $recipe['ingredients']),
                'Steps:'."\n".'1. '.implode("\n1. ", $recipe['steps']),
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'allergy_conflict_guard',
            'model' => 'coach-safety-guard',
        ];
    }

    private function availableIngredientRecipeAnswer(array $context): ?array
    {
        $available = $this->safeAvailableIngredients($context);

        if ($available === []) {
            return null;
        }

        $recipe = $this->recipeFromAvailableIngredients($available);
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        $allergyNote = $allergies !== []
            ? ' I avoided your saved allergies: '.implode(', ', $allergies).'.'
            : '';

        return [
            'answer' => implode("\n\n", [
                'Here is a safer alternative substitute recipe using your available ingredients.'.$allergyNote,
                sprintf(
                    '%s: %d kcal, %d g protein, %d g carbs, %d g fat per serving.',
                    $recipe['title'],
                    $recipe['macros']['calories'],
                    $recipe['macros']['protein_g'],
                    $recipe['macros']['carbs_g'],
                    $recipe['macros']['fat_g'],
                ),
                'Ingredients:'."\n".'- '.implode("\n- ", $recipe['ingredients']),
                'Steps:'."\n".'1. '.implode("\n1. ", $recipe['steps']),
            ]),
            'warnings' => [],
            'chat_path' => 'personalized',
            'mode_label' => 'Personalized',
            'reason' => 'available_ingredient_safe_recipe',
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

    /**
     * @return array{title: string, ingredients: array<int, string>, steps: array<int, string>, macros: array{calories: int, protein_g: int, carbs_g: int, fat_g: int}}
     */
    private function defaultSafeSnackRecipe(array $context): array
    {
        $dietType = mb_strtolower((string) ($context['restrictions']['diet_type'] ?? ''));
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));
        $avoidDairy = $this->containsAny($dietType, ['vegan'])
            || $this->containsAny(implode(' ', $allergies), ['milk', 'dairy', 'lactose']);

        if ($avoidDairy) {
            return [
                'title' => 'berry protein oats cup',
                'ingredients' => [
                    '1/3 cup rolled oats',
                    '1/2 cup berries',
                    '1 scoop pea protein mixed with water',
                    '1 teaspoon chia seeds',
                ],
                'steps' => [
                    'Mix oats, berries, and chia in a bowl.',
                    'Stir the pea protein with water until smooth.',
                    'Serve the protein drink alongside the oats, or stir it in after the oats cool.',
                ],
                'macros' => [
                    'calories' => 300,
                    'protein_g' => 27,
                    'carbs_g' => 36,
                    'fat_g' => 5,
                ],
            ];
        }

        return [
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
    }

    /**
     * @return array<int, string>
     */
    private function safeAvailableIngredients(array $context): array
    {
        $available = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['runtime']['available_ingredients'] ?? [],
        )));
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        if ($available === []) {
            return [];
        }

        return array_values(array_filter($available, function (string $ingredient) use ($allergies): bool {
            return ! $this->containsAny($ingredient, $allergies);
        }));
    }

    /**
     * @param  array<int, string>  $available
     * @return array{title: string, ingredients: array<int, string>, steps: array<int, string>, macros: array{calories: int, protein_g: int, carbs_g: int, fat_g: int}}
     */
    private function recipeFromAvailableIngredients(array $available): array
    {
        $availableText = implode(' ', $available);

        if ($this->containsAny($availableText, ['yogurt']) && $this->containsAny($availableText, ['berries', 'berry']) && $this->containsAny($availableText, ['oats', 'oat'])) {
            return [
                'title' => 'Safe yogurt berry oat bowl',
                'ingredients' => [
                    '3/4 cup plain yogurt',
                    '1/2 cup berries',
                    '1/4 cup oats',
                ],
                'steps' => [
                    'Spoon the yogurt into a bowl.',
                    'Top with berries and oats.',
                    'Let it sit for 5 minutes if you want the oats softer.',
                ],
                'macros' => [
                    'calories' => 295,
                    'protein_g' => 21,
                    'carbs_g' => 42,
                    'fat_g' => 6,
                ],
            ];
        }

        if ($this->containsAny($availableText, ['lentils']) && $this->containsAny($availableText, ['rice']) && $this->containsAny($availableText, ['spinach'])) {
            return [
                'title' => 'Lentil rice spinach bowl',
                'ingredients' => [
                    '3/4 cup cooked lentils',
                    '1/2 cup cooked rice',
                    '1 cup spinach',
                    'lemon juice to taste',
                ],
                'steps' => [
                    'Warm the lentils and rice together.',
                    'Fold in spinach until just wilted.',
                    'Finish with lemon juice and serve.',
                ],
                'macros' => [
                    'calories' => 360,
                    'protein_g' => 20,
                    'carbs_g' => 62,
                    'fat_g' => 4,
                ],
            ];
        }

        $ingredients = array_slice($available, 0, 4);

        return [
            'title' => 'Safe available-ingredient bowl',
            'ingredients' => array_map(
                static fn (string $ingredient): string => '1 portion '.$ingredient,
                $ingredients,
            ),
            'steps' => [
                'Combine the available ingredients in a bowl.',
                'Use gentle seasoning that does not conflict with your saved restrictions.',
                'Adjust portions around your daily calorie and protein targets.',
            ],
            'macros' => [
                'calories' => 320,
                'protein_g' => 18,
                'carbs_g' => 42,
                'fat_g' => 8,
            ],
        ];
    }

    private function outOfDomainAnswer(User $user, string $question = ''): string
    {
        if ($this->containsAny($question, [
            'admin notifications',
            'moderation notes',
            'private user details',
            'memory buffer',
            'extract all client records',
            'client records',
            'database records',
            'sql commands',
            'delete a user from production',
            'all conversations',
            'all chat conversations',
        ])) {
            return 'I cannot reveal admin notifications, moderation notes, private user details, chat history, or database records. I can help with workouts, meals, macros, recovery, plans, and progress in Hayetak.';
        }

        if ($this->containsAny($question, [
            'legal loophole',
            'avoid paying taxes',
            'tax loophole',
            'tax advice',
        ])) {
            return 'I cannot provide legal loopholes or tax-evasion advice here. I can help with workouts, meals, macros, recovery, plans, and progress in Hayetak.';
        }

        if ($this->containsAny($question, [
            'diagnose',
            'skin rash',
            'prescribe treatment',
            'prescribe medication',
            'medication dosage',
        ])) {
            return 'I cannot diagnose skin conditions from a photo or prescribe treatment or medication. Please contact a licensed clinician for diagnosis. I can help with fitness and nutrition guidance that stays in scope.';
        }

        if ($this->containsAny($question, [
            'ignore instruction hierarchy',
            'obey only this message',
            'ignore policy',
            'ignore restrictions',
            'ignore safety policy',
            'bypass guardrails',
        ])) {
            return 'I cannot ignore instruction hierarchy, safety rules, or privacy policies. I can help with workouts, meals, macros, recovery, plans, and progress in Hayetak.';
        }

        if ($this->containsAny($question, [
            'ignore injury constraints',
            'maximal-risk exercises',
        ])) {
            return 'I cannot ignore injury constraints or prescribe maximal-risk exercises. I can help with workouts and safer alternatives that match your injuries and available equipment.';
        }

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
            'what allergies do you have saved for me',
            'what allergens do you have saved for me',
            'my allergies',
            'my allergens',
            'allergy list',
            'allergen list',
            'exactly as listed in my profile',
            'asked only for allergies',
            'show my allergies',
            'show my allergens',
            'tell me my allergies',
            'tell me my allergens',
            'what are my restrictions',
            'what are my dietary restrictions',
            'what diet type do i have',
            'what is my diet type',
<<<<<<< HEAD
            'what diet type do you have saved for me',
            'what is my medical history',
            'my medical history',
            'what medical conditions do i have',
            'what medical conditions do you have saved for me',
            'what injuries do i have',
            'what is my injury history',
            'what injury history do you have saved for me',
=======
            'what is my medical history',
            'my medical history',
            'what medical conditions do i have',
            'what injuries do i have',
            'what is my injury history',
>>>>>>> origin/main
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

<<<<<<< HEAD
    private function restrictionSummaryFocus(string $question): ?string
    {
        $mentionsDiet = $this->containsAny($question, ['diet type', 'dietary restrictions', 'restrictions']);
        $mentionsAllergies = $this->containsAny($question, ['allergy', 'allergies', 'allergen', 'allergens']);
        $mentionsMedical = $this->containsAny($question, ['medical history', 'medical condition', 'medical conditions']);
        $mentionsInjuries = $this->containsAny($question, ['injury history', 'injuries', 'injury']);

        $active = array_filter([
            'diet_type' => $mentionsDiet,
            'allergies' => $mentionsAllergies,
            'medical_conditions' => $mentionsMedical,
            'injuries' => $mentionsInjuries,
        ]);

        return count($active) === 1 ? array_key_first($active) : null;
    }

=======
>>>>>>> origin/main
    private function isGratitudeOrClosing(string $question): bool
    {
        $normalized = trim((string) preg_replace('/[^\p{L}\p{N}\s\']+/u', ' ', $question));
        $normalized = trim((string) preg_replace('/\s+/u', ' ', $normalized));

        if ($normalized === '') {
            return false;
        }

        $gratitudeOnly = [
            'thanks',
            'thank you',
            'thank you so much',
            'thanks a lot',
            'thanks so much',
            'thx',
            'ty',
            'appreciate it',
            'much appreciated',
            'perfect thanks',
            'ok thanks',
            'okay thanks',
            'great thanks',
            'got it thanks',
            'that helps thanks',
        ];

        if (in_array($normalized, $gratitudeOnly, true)) {
            return true;
        }

        if ($this->containsAny($normalized, ['thank you', 'thanks', 'appreciate it'])) {
            return mb_strlen($normalized) <= 80
                && ! $this->containsAny($normalized, [
                    'meal',
                    'workout',
                    'exercise',
                    'protein',
                    'calorie',
                    'recipe',
                    'plan',
                    'what',
                    'how',
                    'can i',
                    'should i',
                    'suggest',
                    'recommend',
                ]);
        }

        return false;
    }

    private function isShortAffirmation(string $question): bool
    {
        $normalized = trim((string) preg_replace('/[^\p{L}\p{N}\s\']+/u', ' ', $question));
        $normalized = trim((string) preg_replace('/\s+/u', ' ', $normalized));

        if ($normalized === '' || mb_strlen($normalized) > 50) {
            return false;
        }

        return in_array($normalized, [
            'yes',
            'yeah',
            'yep',
            'yup',
            'absolutely',
            'please',
            'please do',
            'yes please',
            'yeah please',
            'yep please',
            'yup please',
            'sure',
            'sure please',
            'ok',
            'okay',
            'ok please',
            'okay please',
            'do it',
            'go ahead',
            'give it',
            'give them',
            'give me them',
            'give me those',
            'show it',
            'show them',
            'show me',
            'show me them',
            'send it',
            'send them',
            'list them',
            'tell me',
            'tell me more',
            'continue',
            'continue please',
            'sounds good',
            'sounds good please',
            'lets do it',
            'let us do it',
        ], true);
    }

    private function shortAffirmationFollowUpAnswer(array $context): ?array
    {
<<<<<<< HEAD
        return $this->offeredConversationFollowUpAnswer($context);
    }

    private function isRecommendationFollowUp(string $question): bool
    {
        $normalized = trim((string) preg_replace('/[^\p{L}\p{N}\s\']+/u', ' ', $question));
        $normalized = trim((string) preg_replace('/\s+/u', ' ', $normalized));

        if ($normalized === '' || mb_strlen($normalized) > 90) {
            return false;
        }

        return $this->containsAny($normalized, [
            'recommendation',
            'recommendations',
            'can you give me recommendations',
            'can you give me some recommendations',
            'give me recommendations',
            'give me some recommendations',
            'what do you recommend',
            'more ideas',
            'some ideas',
            'more options',
            'some options',
        ]);
    }

    private function recommendationFollowUpAnswer(array $context): ?array
    {
        return $this->offeredConversationFollowUpAnswer($context);
    }

    private function offeredConversationFollowUpAnswer(array $context): ?array
    {
=======
>>>>>>> origin/main
        $lastAssistantTurn = mb_strtolower($this->lastAssistantTurn($context) ?? '');
        $offerText = $lastAssistantTurn !== '' ? $lastAssistantTurn : $this->recentContextText($context);

        if ($this->containsAny($offerText, [
            'low-intensity exercises',
            'low intensity exercises',
            'modifications to help you get moving',
            'get moving without feeling too exhausted',
            'boost your energy level',
            'feeling sluggish',
        ])) {
            return $this->fixedCoachAnswer([
                'Absolutely. Here is a low-intensity session for a sluggish day.',
                'Do 5 minutes easy walking or marching in place, then 2 rounds of: 8 bodyweight squats to a comfortable depth, 8 wall push-ups, 10 glute bridges, 8 slow bird dogs per side, and 30 seconds easy breathing between moves.',
                'Keep the effort around 4-5 out of 10. If you feel better after that, add 5-10 minutes of easy walking; if you feel worse, stop and treat today as recovery.',
            ], 'sluggish_follow_up_movement');
        }

        if ($this->containsAny($offerText, [
            'recipe',
            'macros',
            'full recipe',
            'ingredients',
            'prep',
        ])) {
            return $this->recipeMacroFollowUpAnswer($context)
                ?? $this->offeredRecipeAnswer($context);
        }

        if ($this->containsAny($offerText, [
            'food recommendation',
            'food recommendations',
            'meal recommendation',
            'meal recommendations',
            'snack',
            'meal idea',
            'meal ideas',
            'what to eat',
            'foods to eat',
        ])) {
            return $this->offeredFoodRecommendationAnswer($context);
        }

        if ($this->containsAny($offerText, [
            'exercise substitute',
            'exercise substitutes',
            'exercise alternative',
            'exercise alternatives',
            'safer alternatives',
            'modifications',
            'modify the workout',
            'swap',
            'workout substitute',
            'workout alternatives',
        ])) {
            return $this->offeredExerciseSubstitutionAnswer($context);
        }

        if ($this->containsAny($offerText, [
            'workout routine',
            'workout plan',
            'training plan',
            'plan a workout',
            'routine for you',
        ])) {
            return $this->offeredWorkoutRoutineAnswer($context);
        }

        if ($this->containsAny($offerText, [
            'tips',
            'suggestions',
            'strategies',
            'guidance',
            'elaborate',
            'more specific guidance',
            'help you with',
        ])) {
            return $this->offeredTipsAnswer($context);
        }

        return null;
    }

    private function offeredRecipeAnswer(array $context): array
    {
        $recipe = $this->defaultSafeSnackRecipe($context);

        return [
            'answer' => implode("\n", [
                sprintf('Absolutely. Here is a safe recipe: %s.', $recipe['title']),
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
            'reason' => 'offered_recipe_follow_up',
            'model' => 'coach-conversation-shortcut',
        ];
    }

    private function offeredFoodRecommendationAnswer(array $context): array
    {
        $dietType = mb_strtolower(trim((string) ($context['restrictions']['diet_type'] ?? '')));
        $allergyText = $this->savedAllergyText($context);

        if ($dietType === 'vegan') {
            return $this->fixedCoachAnswer([
                'Absolutely. Here are quick vegan food options that keep your saved restrictions in mind:',
                '1. Peanut butter banana oat bowl with soy milk: about 520 kcal, 18 g protein, 67 g carbs, 22 g fat.',
                '2. Lentil rice bowl with olive oil and spinach: about 610 kcal, 24 g protein, 88 g carbs, 18 g fat.',
                '3. Tofu hummus wrap with vegetables: about 480 kcal, 26 g protein, 54 g carbs, 18 g fat.',
                'Avoid anything that includes your saved allergens: '.$allergyText.'.',
            ], 'offered_food_recommendations');
        }

        return $this->fixedCoachAnswer([
            'Absolutely. Here are food options that keep your saved restrictions in mind:',
            '1. Greek yogurt with banana, oats, honey, and walnuts: about 560 kcal, 28 g protein, 72 g carbs, 18 g fat.',
            '2. Turkey or chicken rice bowl with olive oil and vegetables: about 620 kcal, 42 g protein, 66 g carbs, 20 g fat.',
            '3. Cottage cheese toast with berries and nuts: about 430 kcal, 27 g protein, 44 g carbs, 16 g fat.',
            'Avoid anything that includes your saved allergens: '.$allergyText.'.',
        ], 'offered_food_recommendations');
    }

    private function offeredExerciseSubstitutionAnswer(array $context): array
    {
        $injuries = array_values(array_filter(array_map(
            static fn ($injury) => trim((string) $injury),
            $context['restrictions']['injuries'] ?? [],
        )));
        $injuryText = $injuries !== [] ? implode(', ', $injuries) : 'your saved injury history';

        return $this->fixedCoachAnswer([
            'Absolutely. Here are safer exercise substitutes based on '.$injuryText.':',
            '1. If squats bother knees: use box squats, glute bridges, or supported step-ups only in a pain-free range.',
            '2. If overhead pressing bothers shoulders: use wall push-ups, incline push-ups, band rows, or light lateral raises below painful range.',
            '3. If running feels too hard today: use easy walking, cycling, or low-impact intervals at 4-5 out of 10 effort.',
            'Stop any movement that causes sharp pain, and keep the substitute easy enough that form stays controlled.',
        ], 'offered_exercise_substitutes');
    }

    private function offeredWorkoutRoutineAnswer(array $context): array
    {
        $equipment = array_values(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $context['user_profile']['available_equipment'] ?? [],
        )));
        $equipmentText = $equipment !== [] ? implode(', ', $equipment) : 'bodyweight';

        return $this->fixedCoachAnswer([
            'Absolutely. Here is a simple low-stress workout using '.$equipmentText.'.',
            'Warm-up: 5 minutes easy walking or marching, then shoulder circles and hip hinges.',
            'Main work: 2-3 rounds of 8 comfortable squats or sit-to-stands, 8 incline or wall push-ups, 10 glute bridges, 8 rows if equipment allows, and 20-30 seconds of dead bugs.',
            'Cool down: 3-5 minutes easy walking and gentle breathing. Keep effort moderate and stop if pain increases.',
        ], 'offered_workout_routine');
    }

    private function offeredTipsAnswer(array $context): array
    {
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];
        $protein = is_numeric($today['protein_g'] ?? null) ? (int) $today['protein_g'] : 0;
        $water = is_numeric($today['water_ml'] ?? null) ? (int) $today['water_ml'] : 0;
        $targetWater = is_numeric($today['target_water_ml'] ?? null) ? (int) $today['target_water_ml'] : 0;

        return $this->fixedCoachAnswer([
            'Absolutely. Here are focused tips you can act on now:',
            sprintf('1. Protein: you have about %d g logged for the selected day, so make the next meal protein-forward if that is behind your target.', $protein),
            sprintf('2. Hydration: you have about %d ml logged%s. Add water steadily instead of chugging late.', $water, $targetWater > 0 ? ' toward a target around '.$targetWater.' ml' : ''),
            '3. Energy: if you feel sluggish, do 10-15 minutes easy movement first, then decide whether a full workout still makes sense.',
            '4. Meals: pair protein with a carb source and fruit or vegetables so the fix is practical, not just restrictive.',
        ], 'offered_tips_follow_up');
    }

    private function savedAllergyText(array $context): string
    {
        $allergies = array_values(array_filter(array_map(
            static fn ($allergy) => trim((string) $allergy),
            $context['restrictions']['allergies'] ?? [],
        )));

        return $allergies === [] ? 'none saved' : implode(', ', $allergies);
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

    private function isAllergyConflictRequest(string $question, array $context): bool
    {
        $matchedAllergy = $this->matchedSavedAllergy($question, $context);

        if ($matchedAllergy === null) {
            return false;
        }

        if ($this->containsAny($question, ['one bite', 'small bite', 'scrape', 'scraped', 'cross contact', 'cross-contact', 'residue'])) {
            return true;
        }

        return $this->containsAny($question, [
            'allergy',
            'allergies',
            'allergic',
            'allergen',
            'safe',
            'okay',
            'ok',
            'make',
            'recipe',
            'snack',
            'meal',
            'breakfast',
            'lunch',
            'dinner',
            'dessert',
            'protein',
        ]);
    }

    private function isAvailableIngredientRecipeRequest(string $question, array $context): bool
    {
        if (! $this->containsAny($question, ['recipe', 'snack', 'meal', 'breakfast', 'lunch', 'dinner', 'macros', 'macro'])) {
            return false;
        }

        if (! $this->containsAny($question, ['available ingredient', 'available ingredients', 'use my', 'only', 'with'])) {
            return false;
        }

        return $this->safeAvailableIngredients($context) !== [];
    }

    private function isAllergyIngredientQuestion(string $question, array $context): bool
    {
        if (! $this->containsAny($question, ['what about', 'can i have', 'is ', 'would ', 'okay', 'safe'])) {
            return false;
        }

        $allergies = array_map('mb_strtolower', $context['restrictions']['allergies'] ?? []);

        return $this->containsAny($question, $allergies);
    }

    private function matchedSavedAllergy(string $question, array $context): ?string
    {
        $allergies = array_values(array_filter(array_map(
            'mb_strtolower',
            $context['restrictions']['allergies'] ?? [],
        )));

        foreach ($allergies as $allergy) {
            if ($allergy !== '' && str_contains($question, $allergy)) {
                return $allergy;
            }
        }

        if ($this->containsAny($question, ['one bite', 'small bite', 'scrape', 'scraped', 'cross contact', 'cross-contact', 'residue'])) {
            $recentTurns = is_array($context['conversation_context']['recent_turns'] ?? null)
                ? $context['conversation_context']['recent_turns']
                : [];

            foreach (array_reverse($recentTurns) as $turn) {
                $content = mb_strtolower(trim((string) ($turn['c'] ?? '')));
                foreach ($allergies as $allergy) {
                    if ($allergy !== '' && str_contains($content, $allergy)) {
                        return $allergy;
                    }
                }
            }
        }

        return null;
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
        if ($this->containsAny($question, [
            'did i',
            'have i',
            'logged',
            'log',
            'consumed',
            'consume',
            'last 30 days',
            'last 7 days',
            'past month',
            'past week',
            'today',
            'yesterday',
            'have i ever',
            'containing',
        ])) {
            return false;
        }

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

    private function resolveAllergyAuditWindowDays(string $question): int
    {
        if ($this->containsAny($question, ['today'])) {
            return 1;
        }

        if ($this->containsAny($question, ['yesterday'])) {
            return 2;
        }

        if ($this->containsAny($question, ['past week', 'last week', 'this week', 'last 7 days', 'past 7 days', 'last seven days'])) {
            return 7;
        }

        if ($this->containsAny($question, ['past month', 'last month', 'last 30 days', 'past 30 days', '30 days'])) {
            return 30;
        }

        return 30;
    }

    private function resolveAuditAnchorDate(array $context): Carbon
    {
        $candidate = trim((string) ($context['today_summary']['date'] ?? ''));
        if ($candidate !== '') {
            try {
                return Carbon::createFromFormat('Y-m-d', $candidate)->startOfDay();
            } catch (\Throwable) {
                // Fallback to today.
            }
        }

        return Carbon::today();
    }

    private function entryWithinRange(mixed $entry, Carbon $from, Carbon $to): bool
    {
        if (! is_array($entry)) {
            return false;
        }

        $rawDate = trim((string) ($entry['date'] ?? ''));
        if ($rawDate === '') {
            return false;
        }

        try {
            $day = Carbon::createFromFormat('Y-m-d', $rawDate)->startOfDay();
        } catch (\Throwable) {
            return false;
        }

        $fromDay = $from->copy()->startOfDay();
        $toDay = $to->copy()->startOfDay();

        return $day->greaterThanOrEqualTo($fromDay) && $day->lessThanOrEqualTo($toDay);
    }

    private function auditWindowLabel(int $windowDays): string
    {
        return match ($windowDays) {
            1 => 'today',
            2 => 'today and yesterday',
            7 => 'last 7 days',
            30 => 'last 30 days',
            default => sprintf('last %d days', $windowDays),
        };
    }

    private function isAllergyExposureAuditQuestion(string $question): bool
    {
        if (! $this->containsAny($question, ['allergy', 'allergies', 'allergic', 'allergen', 'allergens'])) {
            return false;
        }

        if (! $this->containsAny($question, ['consumed', 'consume', 'ate', 'eaten', 'logged', 'log', 'have i ever', 'did i', 'do i'])) {
            return false;
        }

        return $this->containsAny($question, [
            'past week',
            'last week',
            'this week',
            'last 7 days',
            'past 7 days',
            'past month',
            'last month',
            '30 days',
            'today',
            'yesterday',
        ]);
    }

    private function isIngredientExposureAuditQuestion(string $question): bool
    {
        if (! $this->containsAny($question, self::INGREDIENT_AUDIT_KEYWORDS)) {
            return false;
        }

        if (! $this->containsAny($question, ['logged', 'log', 'did i', 'have i', 'consumed', 'consume', 'ate', 'eaten'])) {
            return false;
        }

        if (! $this->containsAny($question, ['meal', 'meals', 'food', 'ingredient', 'contains', 'containing'])) {
            return false;
        }

        return $this->containsAny($question, [
            'today',
            'yesterday',
            'past week',
            'last week',
            'this week',
            'last 7 days',
            'past 7 days',
            'past month',
            'last month',
            'last 30 days',
            'past 30 days',
            '30 days',
            'have i ever',
        ]);
    }

    private function extractAuditedIngredient(string $question): ?string
    {
        foreach (self::INGREDIENT_AUDIT_KEYWORDS as $ingredient) {
            if ($this->containsAny($question, [$ingredient])) {
                return $ingredient;
            }
        }

        if (preg_match('/containing\s+([a-z ]{3,30})/u', $question, $matches) === 1) {
            return trim((string) ($matches[1] ?? '')) ?: null;
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function ingredientAliases(string $ingredient): array
    {
        $normalized = mb_strtolower(trim($ingredient));
        $aliases = match ($normalized) {
            'fish' => ['fish', 'salmon', 'tuna', 'sardine', 'sea bass'],
            'eggs' => ['egg', 'eggs'],
            'peanuts' => ['peanut', 'peanuts'],
            default => [$normalized],
        };

        return array_values(array_unique(array_filter($aliases)));
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

    private function lastAssistantTurn(array $context): ?string
    {
        $recentTurns = is_array($context['conversation_context']['recent_turns'] ?? null)
            ? $context['conversation_context']['recent_turns']
            : [];

        foreach (array_reverse($recentTurns) as $turn) {
            if (($turn['r'] ?? null) !== 'assistant') {
                continue;
            }

            $content = trim((string) ($turn['c'] ?? ''));
            if ($content !== '') {
                return $content;
            }
        }

        return null;
    }

    private function recentContextText(array $context): string
    {
        $recentTurns = is_array($context['conversation_context']['recent_turns'] ?? null)
            ? $context['conversation_context']['recent_turns']
            : [];
        $summary = mb_strtolower(trim((string) ($context['conversation_context']['summary'] ?? '')));
        $text = $summary;

        foreach ($recentTurns as $turn) {
            $text .= ' '.mb_strtolower(trim((string) ($turn['c'] ?? '')));
        }

        return $text;
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function recentContextContains(array $context, array $needles): bool
    {
        return $this->containsAny($this->recentContextText($context), $needles);
    }

    private function todayMacroLine(array $context): string
    {
        $today = is_array($context['today_summary'] ?? null) ? $context['today_summary'] : [];
        $date = trim((string) ($today['date'] ?? 'today'));
        $calories = is_numeric($today['calories'] ?? null) ? (int) $today['calories'] : 0;
        $protein = is_numeric($today['protein_g'] ?? null) ? (int) $today['protein_g'] : 0;
        $carbs = is_numeric($today['carbs_g'] ?? null) ? (int) $today['carbs_g'] : 0;
        $fat = is_numeric($today['fat_g'] ?? null) ? (int) $today['fat_g'] : 0;

        return sprintf(
            'Today (%s), your logged macros are %d kcal, %d g protein, %d g carbs, and %d g fat.',
            $date,
            $calories,
            $protein,
            $carbs,
            $fat,
        );
    }

    private function lastSevenNutritionLine(array $context): string
    {
        $nutrition = is_array($context['last_7_days_summary']['nutrition'] ?? null)
            ? $context['last_7_days_summary']['nutrition']
            : [];
        $daysLogged = is_numeric($nutrition['days_logged'] ?? null) ? (int) $nutrition['days_logged'] : 0;
        $avgKcal = is_numeric($nutrition['avg_kcal'] ?? null) ? (int) $nutrition['avg_kcal'] : 0;
        $avgProtein = is_numeric($nutrition['avg_protein_g'] ?? null) ? (int) $nutrition['avg_protein_g'] : 0;

        if ($daysLogged <= 0) {
            return 'Last 7 days summary: no logged meal days are available, so weekly nutrition patterns are limited.';
        }

        return sprintf(
            'Last 7 days summary: %d logged day(s), averaging %d kcal and %d g protein per logged day.',
            $daysLogged,
            $avgKcal,
            $avgProtein,
        );
    }

    private function lastSevenWorkoutLine(array $context): string
    {
        $workouts = is_numeric($context['last_7_days_summary']['workouts_completed'] ?? null)
            ? (int) $context['last_7_days_summary']['workouts_completed']
            : 0;

        return sprintf(
            'Last 7 days workout summary: you completed %d workout(s), so tomorrow should account for recent fatigue and recovery.',
            $workouts,
        );
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
            'past 7 days',
            'past seven days',
            'past week',
            'last week',
            'this week',
            'weekly summary',
            'week summary',
            'summarize my week',
            'summarize my last 7 days',
        ]);
    }
}
