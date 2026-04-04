<?php

namespace App\Services\Ai\Chat\Providers;

use App\Services\Ai\Chat\Contracts\ChatModelClient;

class StubChatModelClient implements ChatModelClient
{
    public function respond(string $question, array $context, array $options = []): array
    {
        $intent = (string) ($options['intent'] ?? 'general_coaching');
        $normalizedQuestion = mb_strtolower(trim($question));

        return [
            'answer' => match ($intent) {
                'nutrition_help' => $this->nutritionReply($normalizedQuestion, $context),
                'workout_help' => $this->workoutReply($normalizedQuestion, $context),
                'progress_help' => $this->progressReply($normalizedQuestion, $context),
                'plan_help' => $this->planReply($normalizedQuestion, $context),
                'nearby_help' => $this->nearbyReply($context),
                'communication_help' => $this->communicationReply($normalizedQuestion),
                'settings_help' => $this->settingsReply($normalizedQuestion),
                'wellness_help' => $this->wellnessReply($normalizedQuestion, $context),
                default => $this->generalReply($context),
            },
            'model' => 'hayetak-stub-coach',
            'usage' => [
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
            ],
            'provider_request_id' => null,
            'raw' => [],
        ];
    }

    private function nutritionReply(string $question, array $context): string
    {
        $protein = (int) ($context['today_summary']['protein_g'] ?? 0);
        $calories = (int) ($context['today_summary']['calories'] ?? 0);
        $carbs = (int) ($context['today_summary']['carbs_g'] ?? 0);
        $fat = (int) ($context['today_summary']['fat_g'] ?? 0);
        $goal = $context['user_profile']['goal'] ?? 'your current goal';
        $dietType = $context['restrictions']['diet_type'] ?? null;
        $allergies = $context['restrictions']['allergies'] ?? [];
        $targetProtein = (int) ($context['plans']['nutrition_targets']['protein_g'] ?? 0);
        $targetCalories = (int) ($context['plans']['nutrition_targets']['calories'] ?? 0);
        $allergyText = $allergies !== [] ? implode(', ', $allergies) : 'none saved';

        if ($this->containsAny($question, ['high-protein snack with greek yogurt', 'snack with greek yogurt'])) {
            return 'Great choice. Try a Greek yogurt berry parfait: 1 cup plain Greek yogurt, 1/2 cup berries, 1 tablespoon chia, and 1 teaspoon honey. '
                .'It is high protein, quick to make, and still easy to adjust around your goal.';
        }

        if ($this->containsAny($question, ['snack that avoids my allergies', 'snack that avoid my allergies', 'avoid my allergies'])) {
            return 'Here are two allergy-aware snack options: '
                .'1) Greek yogurt with berries and chia (about 230 kcal, 23 g protein), '
                .'2) cottage cheese cucumber bowl with olive oil and herbs (about 210 kcal, 19 g protein). '
                .'Both avoid your saved allergens when prepared without corn or sesame toppings.';
        }

        if ($this->containsAny($question, ['that safe recipe', 'just give me the recipe and macros', 'just give me recipe and macros'])) {
            return implode("\n", [
                'Safe recipe: Cinnamon Greek yogurt cup',
                'Macros per serving: 230 kcal, 23 g protein, 21 g carbs, 6 g fat.',
                'Ingredients:',
                '- 1 cup plain Greek yogurt',
                '- 1/2 cup berries',
                '- 1 tablespoon chia seeds',
                '- 1 teaspoon honey',
                '- pinch of cinnamon',
                'Steps:',
                '1. Add yogurt to a bowl.',
                '1. Top with berries, chia, and cinnamon.',
                '1. Drizzle honey and serve chilled.',
            ]);
        }

        if ($this->containsAny($question, ['full recipe', 'recipe and macros', 'give me the macros', 'full macros'])) {
            return 'I can give exact recipe macros from this thread once we lock one specific recipe. '
                .'If you mean the Greek yogurt parfait: 255 kcal, 24 g protein, 27 g carbs, 6 g fat per serving.';
        }

        if ($this->containsAny($question, ['make that recipe lower carb', 'lower carb'])) {
            return 'To make it lower carb, swap berries to 1/4 cup and remove oats and honey. '
                .'Lower-carb version: about 190 kcal, 23 g protein, 10 g carbs, 6 g fat per serving.';
        }

        if ($this->containsAny($question, ['balanced dinner', 'balanced plate'])) {
            return 'A balanced dinner is usually: 1/2 plate vegetables, 1/4 plate lean protein, and 1/4 plate quality carbs, plus a little healthy fat. '
                .'Example: grilled chicken, roasted vegetables, and quinoa with olive oil.';
        }

        if ($this->containsAny($question, ['healthy high-protein snacks', 'high-protein snacks'])) {
            return 'Good high-protein snacks: Greek yogurt with berries, cottage cheese with fruit, boiled eggs, tuna on whole-grain crackers, or a protein smoothie with milk and banana.';
        }

        if ($this->containsAny($question, ['pre-workout meal', 'before cardio'])) {
            return 'For pre-workout meals, keep it simple: easy carbs plus moderate protein, low fat. '
                .'Examples: banana + yogurt, oats + milk, or toast + eggs 60-120 minutes before training.';
        }

        if ($this->containsAny($question, ['post-workout meal'])) {
            return 'For post-workout meals, prioritize protein plus carbs. '
                .'Examples: chicken and rice, tuna sandwich with fruit, or yogurt with oats and berries.';
        }

        if ($this->containsAny($question, ['people generally need', 'generally need']) && str_contains($question, 'protein')) {
            return 'Most active adults do well around 1.2-2.0 g protein per kg body weight daily. '
                .'During fat loss or intense training, many people benefit from the higher end of that range.';
        }

        if ($this->containsAny($question, ['high-fiber foods'])) {
            return 'High-fiber foods include oats, legumes, lentils, whole grains, berries, apples, vegetables, nuts, and seeds. '
                .'Aiming for fiber at each meal helps satiety and digestion.';
        }

        if ($this->containsAny($question, ['lean protein sources'])) {
            return 'Lean proteins include chicken breast, turkey, tuna, white fish, egg whites, low-fat Greek yogurt, cottage cheese, and tofu.';
        }

        if ($this->containsAny($question, ['vegetarian protein sources'])) {
            return 'Good vegetarian proteins: lentils, chickpeas, beans, tofu, tempeh, edamame, eggs, Greek yogurt, cottage cheese, quinoa, and seitan.';
        }

        if ($this->containsAny($question, ['mediterranean meal ideas'])) {
            return 'Mediterranean ideas: grilled fish with tabbouleh, chicken shawarma bowl with hummus and salad, lentil soup with olive oil and whole-grain bread, or Greek-style yogurt bowls with nuts and fruit.';
        }

        if ($this->containsAny($question, ['low-calorie snack ideas'])) {
            return 'Low-calorie snack ideas: cucumber + labneh, apple slices + low-fat cheese, air-popped popcorn, carrot sticks + hummus, or Greek yogurt with cinnamon.';
        }

        if ($this->containsAny($question, ['difference between protein, carbs, and fat'])) {
            return 'Protein supports muscle repair and satiety, carbs are your main quick energy source, and fats support hormones and long-lasting energy. '
                .'A balanced plan includes all three.';
        }

        if ($this->containsAny($question, ['meal prep tips'])) {
            return 'Meal prep gets easier when you batch-cook one protein, one carb, and one vegetable base. '
                .'Pre-portion 2-3 days ahead, keep sauces separate, and rotate spices to avoid food boredom.';
        }

        if ($this->containsAny($question, ['stay consistent with meal planning'])) {
            return 'Keep meal planning simple: repeat 2 breakfasts, 2 lunches, and 2 dinners for the week, then rotate next week. '
                .'Consistency beats variety overload when life gets busy.';
        }

        if ($this->containsAny($question, ['healthy breakfast ideas', 'what should my breakfast look like', 'saved profile, what should my breakfast'])) {
            return sprintf(
                'Based on your goal (%s), a solid breakfast is: lean protein + fiber-rich carbs + fruit or vegetables. Example: eggs with whole-grain toast and tomatoes, or Greek yogurt with oats and berries.',
                $goal,
            );
        }

        if ($this->containsAny($question, ['suggest a snack that fits my mediterranean diet', 'snack that fits my mediterranean'])) {
            return 'A Mediterranean-friendly snack: Greek yogurt with walnuts and berries, or hummus with cucumber and whole-grain crackers. '
                .'Both are easy to keep allergy-aware.';
        }

        if ($this->containsAny($question, ['high-protein dessert', 'dessert that matches my goal'])) {
            return 'A safe high-protein dessert idea: cinnamon Greek yogurt cup with berries and chia. '
                .'Approx macros: 230 kcal, 23 g protein, 21 g carbs, 6 g fat. I can swap ingredients to avoid your allergy list ('.$allergyText.').';
        }

        if ($this->containsAny($question, ['taouk chicken'])) {
            return 'Try a taouk chicken dinner bowl with grilled taouk chicken, quinoa, roasted vegetables, and a spoon of hummus. '
                .'Total meal macros: about 470 kcal, 44 g protein, 49 g carbs, 12 g fat.';
        }

        if ($this->containsAny($question, ['another dinner option with chicken'])) {
            return 'Another chicken dinner option: lemon-herb chicken with bulgur and roasted zucchini. '
                .'Approx macros: 510 kcal, 42 g protein, 46 g carbs, 14 g fat.';
        }

        if ($this->containsAny($question, ['total macros for the whole meal'])) {
            return 'For the full dinner meal, total macros are about 470 kcal, 44 g protein, 49 g carbs, and 12 g fat.';
        }

        if ($this->containsAny($question, ['what should i eat next', 'based on my meals today'])) {
            $proteinGap = $targetProtein > 0 ? max(0, $targetProtein - $protein) : null;

            if ($proteinGap !== null && $proteinGap > 25) {
                return sprintf(
                    'Your next meal should focus on protein first. You are roughly %d g below your daily protein target, so pick a lean protein main plus vegetables and a moderate carb side.',
                    $proteinGap,
                );
            }

            return 'Your next meal can stay balanced: lean protein, vegetables, and a measured carb portion. '
                .'Since your protein is already strong today, keep dinner lighter and easier to digest.';
        }

        if ($this->containsAny($question, ['suggest a dinner that fits my goal and allergies', 'dinner that fits my goal and diet type'])) {
            return sprintf(
                'Try grilled chicken with quinoa tabbouleh and roasted vegetables. It fits %s, can be adapted to %s, and should avoid your listed allergens (%s) when prepared carefully.',
                $goal,
                $dietType ?: 'your saved diet style',
                $allergyText,
            );
        }

        if ($this->containsAny($question, ['explain my current goal and how my meals match it'])) {
            $proteinNote = $targetProtein > 0
                ? sprintf('Protein: %d/%d g.', $protein, $targetProtein)
                : sprintf('Protein logged today: %d g.', $protein);
            $calorieNote = $targetCalories > 0
                ? sprintf('Calories: %d/%d kcal.', $calories, $targetCalories)
                : sprintf('Calories logged today: %d kcal.', $calories);

            return sprintf(
                'Your current goal is %s. Today you logged %d kcal, %d g protein, %d g carbs, and %d g fat. %s %s This gives a solid baseline; we can tune meal timing or portions next.',
                $goal,
                $calories,
                $protein,
                $carbs,
                $fat,
                $proteinNote,
                $calorieNote,
            );
        }

        if (str_contains($question, 'protein')) {
            if ($targetProtein > 0 && $protein < $targetProtein) {
                return sprintf(
                    'You are still below your protein target today (%d/%d g). Center your next meal around a lean protein source that also fits your restrictions.',
                    $protein,
                    $targetProtein,
                );
            }

            return sprintf(
                'You already have a strong protein base today (%d g). Keep the next meal balanced for %s and avoid allergens you saved (%s).',
                $protein,
                $goal,
                $allergyText,
            );
        }

        if ($this->containsAny($question, ['eat', 'dinner', 'lunch', 'breakfast'])) {
            return sprintf(
                'Choose a meal with one solid protein source, a controlled carb portion, and vegetables. Keep it aligned with %s, %s, and your allergy list (%s).',
                $goal,
                $dietType ? 'your '.$dietType.' style' : 'your saved diet style',
                $allergyText,
            );
        }

        return sprintf(
            'So far you logged %d kcal, %d g protein, %d g carbs, and %d g fat. Next step: keep meals aligned with %s and your saved restrictions.',
            $calories,
            $protein,
            $carbs,
            $fat,
            $goal,
        );
    }

    private function workoutReply(string $question, array $context): string
    {
        $todayWorkedOut = (bool) ($context['today_summary']['workout_logged'] ?? false);
        $last7 = (int) ($context['last_7_days_summary']['workouts_completed'] ?? 0);
        $injuries = $context['restrictions']['injuries'] ?? [];
        $injuryText = $injuries ? ' Also avoid stressing: '.implode(', ', $injuries).'.' : '';

        if ($this->containsAny($question, ['how often should someone train', 'someone train in a week'])) {
            return 'Most people do well with 3 to 5 training days per week, depending on recovery, schedule, and goal. '
                .'At least 1 to 2 rest days weekly helps consistency long term.';
        }

        if ($this->containsAny($question, ['trained legs yesterday', 'if i trained legs yesterday'])) {
            if ($todayWorkedOut) {
                return 'Since you already trained today and legs were yesterday, keep the rest of today to light recovery: mobility, walking, or upper-body technique only.';
            }

            return 'If legs were yesterday, today is usually better for upper body, core, or low-intensity cardio rather than another heavy leg day.';
        }

        if ($this->containsAny($question, ['can i train today', 'train today'])) {
            if ($todayWorkedOut) {
                return 'You already logged a workout today. If you still want another session, keep it light: mobility, stretching, or easy cardio.';
            }

            return sprintf(
                'You can train today if recovery feels good. You logged %d sessions in the last 7 days, so keep intensity moderate if fatigue is high.',
                $last7,
            ).$injuryText;
        }

        return sprintf(
            'You completed %d workouts in the last 7 days. Use that recent load to choose between a harder session or an easier recovery-focused day.',
            $last7,
        ).$injuryText;
    }

    private function progressReply(string $question, array $context): string
    {
        $measurement = $context['last_7_days_summary']['latest_measurement'] ?? null;
        $last7Workouts = (int) ($context['last_7_days_summary']['workouts_completed'] ?? 0);
        $daysLogged = (int) ($context['last_7_days_summary']['nutrition']['days_logged'] ?? 0);
        $avgKcal = (int) ($context['last_7_days_summary']['nutrition']['avg_kcal'] ?? 0);
        $targetCalories = (int) ($context['plans']['nutrition_targets']['calories'] ?? 0);

        if ($this->containsAny($question, ['what weight do you have saved', 'saved weight'])) {
            if ($measurement && isset($measurement['weight_kg'])) {
                return sprintf('Your latest saved weight is %.2f kg (recorded on %s).', (float) $measurement['weight_kg'], (string) ($measurement['measured_at'] ?? 'your latest check-in'));
            }

            return 'I do not see a recent weight measurement saved yet. Add one in your profile or measurements to personalize this.';
        }

        if ($this->containsAny($question, ['consistent this week', 'consistency this week', 'been consistent'])) {
            if ($daysLogged >= 6 && $last7Workouts >= 4) {
                return sprintf('Yes, you have been very consistent this week: meals logged on %d days and %d workouts completed.', $daysLogged, $last7Workouts);
            }

            if ($daysLogged >= 4 || $last7Workouts >= 3) {
                return sprintf('You have moderate consistency this week: meals logged on %d days and %d workouts completed. Tightening one daily habit will make this stronger.', $daysLogged, $last7Workouts);
            }

            return sprintf('Consistency is still building this week: meals logged on %d days and %d workouts completed. A small repeatable routine will help quickly.', $daysLogged, $last7Workouts);
        }

        if ($this->containsAny($question, ['adjust calories'])) {
            if ($targetCalories > 0) {
                if ($avgKcal > 0 && abs($avgKcal - $targetCalories) <= 150) {
                    return sprintf('Your 7-day average intake is close to target (%d vs %d kcal), so no major calorie change is needed yet. Keep tracking for another week.', $avgKcal, $targetCalories);
                }

                if ($avgKcal > $targetCalories) {
                    return sprintf('Your recent intake averages above target (%d vs %d kcal). A small reduction of 100-200 kcal could help if progress is stalled.', $avgKcal, $targetCalories);
                }

                return sprintf('Your recent intake averages below target (%d vs %d kcal). Consider a small increase if energy or recovery feels low.', $avgKcal, $targetCalories);
            }

            return 'I can guide calorie adjustments more precisely once your active calorie target is saved in your nutrition plan.';
        }

        if ($measurement && isset($measurement['weight_kg'])) {
            return sprintf(
                'Your latest saved weight is %.2f kg, with %d workouts logged in the last 7 days. Track both trends together before changing the plan.',
                (float) $measurement['weight_kg'],
                $last7Workouts,
            );
        }

        return sprintf(
            'I do not see a recent measurement yet, but you logged %d workouts in the last 7 days. Add weekly measurements for better progress decisions.',
            $last7Workouts,
        );
    }

    private function planReply(string $question, array $context): string
    {
        $hasNutritionPlan = (bool) ($context['plans']['nutrition_plan_active'] ?? false);
        $hasWorkoutPlan = (bool) ($context['plans']['workout_plan_active'] ?? false);

        if ($this->containsAny($question, ['build a simple workout routine'])) {
            return 'A simple routine can be 3 days: Day 1 push, Day 2 pull, Day 3 legs + core. '
                .'Start with 5 to 6 exercises per session and increase load gradually.';
        }

        if ($this->containsAny($question, ['plan not showing', 'dashboard'])) {
            return 'If your plan is missing on dashboard, check: active plan status, selected date range, and whether plan generation finished. '
                .'If still missing, regenerate the plan and refresh the dashboard.';
        }

        if ($this->containsAny($question, ['nutrition'])) {
            return $hasNutritionPlan
                ? 'You already have an active nutrition plan. Compare today\'s meals against plan targets to decide your next meal.'
                : 'I do not see an active nutrition plan yet. Open planner and regenerate to create one.';
        }

        if ($this->containsAny($question, ['workout'])) {
            return $hasWorkoutPlan
                ? 'You already have an active workout plan. Follow the next day block and log completion to keep progression accurate.'
                : 'I do not see an active workout plan yet. Open planner and generate a workout plan first.';
        }

        if ($hasNutritionPlan && $hasWorkoutPlan) {
            return 'Both nutrition and workout plans are active, so your best next step is execution and consistent logging.';
        }

        return 'At least one active plan is missing. Check planner status and regenerate the missing plan.';
    }

    private function nearbyReply(array $context): string
    {
        $lat = $context['nearby_context']['lat'] ?? null;
        $lng = $context['nearby_context']['lng'] ?? null;

        if ($lat === null || $lng === null) {
            return 'Open Nearby and allow location access. Then filter by gym, trainer, or nutritionist based on your goal.';
        }

        return 'Your location is available, so Nearby should show support options close to you. Use filters to match your goal and budget.';
    }

    private function communicationReply(string $question): string
    {
        if (str_contains($question, 'appointment')) {
            return 'Use Appointments to request or track bookings. If it is empty, no appointment has been created yet.';
        }

        if (str_contains($question, 'notification')) {
            return 'Check the notifications bell for unread updates, then mark read or dismiss.';
        }

        return 'Use Messages to continue an existing thread or start one from a professional profile.';
    }

    private function settingsReply(string $question): string
    {
        if (str_contains($question, 'password')) {
            return 'Change your password in Settings -> Password. You will need your current password to confirm.';
        }

        if ($this->containsAny($question, ['two factor', '2fa', 'authenticator'])) {
            return 'Manage 2FA in Settings -> Security. Scan the QR code, verify a code, and save recovery codes safely.';
        }

        if ($this->containsAny($question, ['theme', 'appearance'])) {
            return 'Update theme in Settings -> Appearance. If it does not switch instantly, refresh once.';
        }

        if ($this->containsAny($question, ['data looks stale', 'stale', 'plan not showing', 'dashboard'])) {
            return 'If data looks stale, check selected date, active plan filter, and sync status. Then refresh dashboard and re-open the chat thread to pull the latest logs.';
        }

        if ($this->containsAny($question, ['update my profile', 'profile in the app'])) {
            return 'Open Settings -> Profile to update personal details, body metrics, goal, and restrictions.';
        }

        return 'Most account updates are in Settings -> Profile and Settings -> Security.';
    }

    private function wellnessReply(string $question, array $context): string
    {
        if ($this->containsAny($question, ['recovery tips after a hard workout', 'recovery tips'])) {
            return 'After a hard workout: hydrate, get a protein-plus-carb meal, sleep 7-9 hours, and keep the next day lighter if soreness is high.';
        }

        if ($this->containsAny($question, ['signs of dehydration'])) {
            return 'Common dehydration signs: dark urine, dry mouth, headache, dizziness, unusual fatigue, and reduced exercise performance.';
        }

        if ($this->containsAny($question, ['improve sleep for recovery', 'sleep for recovery'])) {
            return 'For better recovery sleep: fixed bedtime, lower caffeine after noon, dark cool room, and no heavy meals right before sleep.';
        }

        if ($this->containsAny($question, ['muscle soreness'])) {
            return 'Muscle soreness usually comes from training stress your muscles are not used to, especially eccentric loading and sudden volume jumps.';
        }

        if ($this->containsAny($question, ['good habits for muscle gain'])) {
            return 'For muscle gain: progressive overload, enough total calories, protein at each meal, consistent sleep, and training each muscle group 2 times per week.';
        }

        if ($this->containsAny($question, ['progressive overload'])) {
            return 'Progressive overload means gradually increasing training demand over time, such as more weight, reps, sets, or better control at the same load.';
        }

        if ($this->containsAny($question, ['rest day'])) {
            return 'A rest day is a lower-stress day that helps your body recover and adapt. Light walking or mobility is fine if it helps you feel better.';
        }

        if ($this->containsAny($question, ['why is hydration important', 'hydration important'])) {
            return 'Hydration supports performance, recovery, digestion, and temperature control. Even mild dehydration can reduce workout quality.';
        }

        if ($this->containsAny($question, ['stretches after training'])) {
            return 'Good post-training stretches: hip flexor stretch, hamstring stretch, chest opener, calf stretch, and thoracic rotation, each for 20-40 seconds.';
        }

        if ($this->containsAny($question, ['good recovery snack'])) {
            return 'A good recovery snack combines protein and carbs, like yogurt with fruit, milk plus banana, or cottage cheese with toast.';
        }

        return $this->generalReply($context);
    }

    private function generalReply(array $context): string
    {
        $goal = $context['user_profile']['goal'] ?? 'your goal';
        $calories = (int) ($context['today_summary']['calories'] ?? 0);
        $protein = (int) ($context['today_summary']['protein_g'] ?? 0);

        return sprintf(
            'I can help with meals, macros, workouts, recovery, plans, progress, nearby support, and app settings. Right now you have about %d kcal and %d g protein logged today, so we can use that context for %s.',
            $calories,
            $protein,
            $goal,
        );
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
}
