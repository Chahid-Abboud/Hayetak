<?php

namespace App\Services\Ai\Chat\Providers;

use App\Services\Ai\Chat\Contracts\ChatModelClient;

class StubChatModelClient implements ChatModelClient
{
    public function respond(string $question, array $context, array $options = []): array
    {
        $intent = (string) ($options['intent'] ?? 'general_coaching');

        return [
            'answer' => match ($intent) {
                'nutrition_help' => $this->nutritionReply($question, $context),
                'workout_help' => $this->workoutReply($question, $context),
                'progress_help' => $this->progressReply($context),
                'plan_help' => $this->planReply($question, $context),
                'nearby_help' => $this->nearbyReply($context),
                'communication_help' => $this->communicationReply($question),
                'settings_help' => $this->settingsReply($question),
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
        $goal = $context['user_profile']['goal'] ?? 'your current goal';
        $dietType = $context['restrictions']['diet_type'] ?? null;
        $allergies = $context['restrictions']['allergies'] ?? [];
        $allergyText = $allergies ? ' and avoid '.implode(', ', $allergies) : '';
        $targetProtein = (int) ($context['plans']['nutrition_targets']['protein_g'] ?? 0);
        $needsProtein = $targetProtein > 0 && $protein < $targetProtein;
        $text = mb_strtolower($question);

        if (str_contains($text, 'protein')) {
            if ($needsProtein) {
                return "You are still below your protein target today, so the next meal should center on a lean protein source. Pick an option that matches {$goal}".($dietType ? " and stays within your {$dietType} diet" : '').$allergyText.'.';
            }

            return "Your protein intake already has a decent base today, so you do not need a huge protein-heavy meal. Keep the next meal balanced and make sure it still fits {$goal}{$allergyText}.";
        }

        if (str_contains($text, 'eat') || str_contains($text, 'dinner') || str_contains($text, 'lunch') || str_contains($text, 'breakfast')) {
            return "Choose a simple meal that fits {$goal} and what you already logged today. Aim for one solid protein source, one controlled carb portion, and vegetables, then keep it compatible with your saved restrictions{$allergyText}.";
        }

        return "So far you logged about {$calories} kcal and {$protein} g of protein today. Use the next meal to move closer to {$goal}".($dietType ? " while staying within your {$dietType} diet" : '').$allergyText.'.';
    }

    private function workoutReply(string $question, array $context): string
    {
        $todayWorkedOut = (bool) ($context['today_summary']['workout_logged'] ?? false);
        $last7 = (int) ($context['last_7_days_summary']['workouts_completed'] ?? 0);
        $injuries = $context['restrictions']['injuries'] ?? [];
        $injuryText = $injuries ? ' Be careful around '.implode(', ', $injuries).'.' : '';
        $text = mb_strtolower($question);

        if (str_contains($text, 'today')) {
            if ($todayWorkedOut) {
                return "You already have a workout logged today, so a second session should stay light unless it was only mobility or cardio. Recovery work or easy steps may be the better choice{$injuryText}";
            }

            return "You do not have a workout logged yet today, so you can train if your recovery feels normal. Keep the session aligned with your active plan and avoid movements that aggravate any injury history{$injuryText}";
        }

        return "You completed {$last7} workouts in the last 7 days, so use that recent load to decide whether to push or recover. Follow your plan first, then scale intensity down if a joint or old injury is acting up{$injuryText}";
    }

    private function progressReply(array $context): string
    {
        $measurement = $context['last_7_days_summary']['latest_measurement'] ?? null;
        $last7Workouts = (int) ($context['last_7_days_summary']['workouts_completed'] ?? 0);

        if ($measurement && isset($measurement['weight_kg'])) {
            return "Your latest saved weight is {$measurement['weight_kg']} kg, and you logged {$last7Workouts} workouts over the last 7 days. Judge progress using both body trends and training consistency, not one day by itself.";
        }

        return "I do not see a recent measurement in the current context, so the clearest progress signal right now is your consistency. You logged {$last7Workouts} workouts in the last 7 days, and adding regular measurements will make future answers more specific.";
    }

    private function planReply(string $question, array $context): string
    {
        $hasNutritionPlan = (bool) ($context['plans']['nutrition_plan_active'] ?? false);
        $hasWorkoutPlan = (bool) ($context['plans']['workout_plan_active'] ?? false);
        $text = mb_strtolower($question);

        if (str_contains($text, 'nutrition')) {
            return $hasNutritionPlan
                ? 'You already have an active nutrition plan, so the fastest next step is to compare today’s meals against its targets. Open the dashboard or meal tracker if you want the exact gap for today.'
                : 'I do not see an active nutrition plan in the current context. Check your dashboard first, and if it is still missing, regenerate plans or wait for the plan job to finish.';
        }

        if (str_contains($text, 'workout')) {
            return $hasWorkoutPlan
                ? 'You already have an active workout plan, so follow the next planned day before improvising. Open the workout planner or log page if you want to see the day order and exercises.'
                : 'I do not see an active workout plan in the current context. Check the dashboard or workout planner, and regenerate plans if needed.';
        }

        if ($hasNutritionPlan && $hasWorkoutPlan) {
            return 'You have both an active nutrition plan and an active workout plan, so your next step is execution rather than rebuilding. Use today’s logs to see where you are off target.';
        }

        return 'At least one active plan is missing in the current context. Check the dashboard first, then regenerate plans if they still do not appear.';
    }

    private function nearbyReply(array $context): string
    {
        $lat = $context['nearby_context']['lat'] ?? null;
        $lng = $context['nearby_context']['lng'] ?? null;

        if ($lat === null || $lng === null) {
            return 'Open the Nearby page and allow location access first. Once your location is available, you can filter for gyms or approved professionals near you.';
        }

        return 'Your location is available, so the Nearby page should be able to search around your current area. Use the filters there to narrow results to gyms, trainers, or nutritionists.';
    }

    private function communicationReply(string $question): string
    {
        $text = mb_strtolower($question);

        if (str_contains($text, 'appointment')) {
            return 'Use the Appointments page to request, review, or track appointment status. If the list is empty, you have not booked one yet.';
        }

        if (str_contains($text, 'notification')) {
            return 'Open the notification bell to review unread alerts, then mark them as read or dismiss them. If nothing appears there, you do not have a new notification right now.';
        }

        return 'Use the Messages page to continue an existing conversation or start one from a professional profile or nearby result. If you do not see a thread yet, create it from the professional side first.';
    }

    private function settingsReply(string $question): string
    {
        $text = mb_strtolower($question);

        if (str_contains($text, 'password')) {
            return 'Change your password from the in-app settings area under Password. You will need your current password before the new one is saved.';
        }

        if (str_contains($text, 'two factor') || str_contains($text, '2fa') || str_contains($text, 'authenticator')) {
            return 'Manage two-factor authentication from the settings page. Scan the QR code with an authenticator app, confirm the code, and keep the recovery codes somewhere safe.';
        }

        if (str_contains($text, 'theme') || str_contains($text, 'appearance')) {
            return 'Open Settings and switch the appearance option there. If the theme does not change immediately, refresh the page once.';
        }

        return 'Most account changes live in Settings or Profile, depending on whether you are editing personal info, password, appearance, or security options.';
    }

    private function generalReply(array $context): string
    {
        $goal = $context['user_profile']['goal'] ?? 'your goal';
        $calories = (int) ($context['today_summary']['calories'] ?? 0);
        $protein = (int) ($context['today_summary']['protein_g'] ?? 0);

        return "You can ask about meals, macros, workouts, plans, progress, nearby professionals, messaging, appointments, or settings. Right now I can see about {$calories} kcal and {$protein} g protein logged today, so I can use that context when it helps with {$goal}.";
    }
}
