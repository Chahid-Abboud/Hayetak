<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\Runtime\FeatureConfigResolver;

class CoachPrompt
{
    public function __construct(
        private readonly PromptTemplateRepository $templates,
        private readonly FeatureConfigResolver $features,
    ) {}

    public function system(array $promptContext, array $retrieval): string
    {
        $path = (string) ($retrieval['path'] ?? 'general');

        return $this->templates->render($this->features->promptDirectory(FeatureConfigResolver::FEATURE_CHAT), 'chatbot-prompt', [
            'prompt_version' => $this->features->promptVersion(FeatureConfigResolver::FEATURE_CHAT),
            'active_path' => $path,
            'role_context_block' => $this->renderRoleContext($promptContext),
            'safety_rules_block' => $this->renderSafetyRules($promptContext),
            'resolved_profile_block' => $this->renderResolvedProfileFacts($promptContext),
            'today_summary_block' => $this->renderTodaySummary($promptContext),
            'last_7_days_block' => $this->renderLast7DaysSummary($promptContext),
            'plan_summary_block' => $this->renderPlanSummary($promptContext),
            'conversation_context_block' => $this->renderConversationContext($promptContext),
            'runtime_hints_block' => $this->renderRuntimeHints($promptContext),
            'personal_context' => $retrieval['context_text'] !== ''
                ? $retrieval['context_text']
                : 'No vector-retrieved personal context matched this question above the threshold.',
        ]);
    }

    private function renderSafetyRules(array $promptContext): string
    {
        $restrictions = is_array($promptContext['restrictions'] ?? null) ? $promptContext['restrictions'] : [];

        return implode("\n", [
            'SAFETY_RULES:',
            '- Diet type: '.$this->displayValue($restrictions['diet_type'] ?? null),
            '- Allergies: '.$this->displayList($restrictions['allergies'] ?? []),
            '- Medical conditions: '.$this->displayList($restrictions['medical_conditions'] ?? []),
            '- Injuries: '.$this->displayList($restrictions['injuries'] ?? []),
        ]);
    }

    private function renderResolvedProfileFacts(array $promptContext): string
    {
        $facts = is_array($promptContext['resolved_profile'] ?? null) ? $promptContext['resolved_profile'] : [];

        return implode("\n", [
            'CORE_PROFILE_FACTS:',
            '- Role: '.$this->displayValue($facts['role'] ?? null),
            '- Current weight kg: '.$this->displayValue($facts['current_weight_kg'] ?? null),
            '- Current weight source: '.$this->displayValue($facts['current_weight_source'] ?? null),
            '- Current weight measured at: '.$this->displayValue($facts['current_weight_measured_at'] ?? null),
            '- Current height cm: '.$this->displayValue($facts['current_height_cm'] ?? null),
            '- Current height source: '.$this->displayValue($facts['current_height_source'] ?? null),
            '- Goal: '.$this->displayValue($facts['goal'] ?? null),
            '- Activity level: '.$this->displayValue($facts['activity_level'] ?? null),
            '- Workout location: '.$this->displayValue($facts['workout_location'] ?? null),
            '- Workout days per week: '.$this->displayValue($facts['workout_days_per_week'] ?? null),
        ]);
    }

    private function renderTodaySummary(array $promptContext): string
    {
        $today = is_array($promptContext['today_summary'] ?? null) ? $promptContext['today_summary'] : [];
        $meals = is_array($today['meals'] ?? null) ? $today['meals'] : [];
        $workouts = is_array($today['workouts'] ?? null) ? $today['workouts'] : [];

        $mealLines = array_values(array_filter(array_map(function ($meal): string {
            if (! is_array($meal)) {
                return '';
            }

            $mealType = trim((string) ($meal['meal_type'] ?? 'meal'));
            $name = trim((string) ($meal['name'] ?? 'Unnamed entry'));
            $servings = is_numeric($meal['servings'] ?? null) ? (float) $meal['servings'] : null;

            return sprintf(
                '- %s: %s%s',
                $mealType,
                $name,
                $servings !== null ? ' ('.rtrim(rtrim(number_format($servings, 2, '.', ''), '0'), '.').' servings)' : '',
            );
        }, array_slice($meals, 0, 8))));

        $workoutLines = array_values(array_filter(array_map(function ($workout): string {
            if (! is_array($workout)) {
                return '';
            }

            return sprintf(
                '- %s for %s minutes%s',
                $this->displayValue($workout['day_name'] ?? null),
                $this->displayValue($workout['duration_min'] ?? null),
                trim((string) ($workout['notes'] ?? '')) !== ''
                    ? ' (notes: '.trim((string) $workout['notes']).')'
                    : '',
            );
        }, array_slice($workouts, 0, 4))));

        $lines = [
            'TODAY_SUMMARY:',
            '- Selected date: '.$this->displayValue($today['date'] ?? null),
            '- Calories kcal: '.$this->displayValue($today['calories'] ?? null),
            '- Protein g: '.$this->displayValue($today['protein_g'] ?? null),
            '- Carbs g: '.$this->displayValue($today['carbs_g'] ?? null),
            '- Fat g: '.$this->displayValue($today['fat_g'] ?? null),
            '- Water ml: '.$this->displayValue($today['water_ml'] ?? null),
            '- Target water ml: '.$this->displayValue($today['target_water_ml'] ?? null),
            '- Workout logged: '.(($today['workout_logged'] ?? false) ? 'yes' : 'no'),
        ];

        if ($mealLines !== []) {
            $lines[] = 'Meals:';
            array_push($lines, ...$mealLines);
        }

        if ($workoutLines !== []) {
            $lines[] = 'Logged workouts:';
            array_push($lines, ...$workoutLines);
        }

        return implode("\n", $lines);
    }

    private function renderLast7DaysSummary(array $promptContext): string
    {
        $summary = is_array($promptContext['last_7_days_summary'] ?? null)
            ? $promptContext['last_7_days_summary']
            : [];
        $nutrition = is_array($summary['nutrition'] ?? null) ? $summary['nutrition'] : [];
        $latestMeasurement = is_array($summary['latest_measurement'] ?? null)
            ? $summary['latest_measurement']
            : [];

        return implode("\n", [
            'LAST_7_DAYS_SUMMARY:',
            '- Nutrition summary: '.$this->displayJson($nutrition),
            '- Workouts completed: '.$this->displayValue($summary['workouts_completed'] ?? null),
            '- Workout day names: '.$this->displayList($summary['workout_day_names'] ?? []),
            '- Latest measurement snapshot: '.$this->displayJson($latestMeasurement),
        ]);
    }

    private function renderPlanSummary(array $promptContext): string
    {
        $plans = is_array($promptContext['plans'] ?? null) ? $promptContext['plans'] : [];

        return implode("\n", [
            'ACTIVE_PLANS:',
            '- Nutrition plan active: '.(($plans['nutrition_plan_active'] ?? false) ? 'yes' : 'no'),
            '- Nutrition plan name: '.$this->displayValue($plans['nutrition_plan_name'] ?? null),
            '- Nutrition goal: '.$this->displayValue($plans['nutrition_goal'] ?? null),
            '- Nutrition targets: '.$this->displayJson($plans['nutrition_targets'] ?? []),
            '- Workout plan active: '.(($plans['workout_plan_active'] ?? false) ? 'yes' : 'no'),
            '- Workout plan name: '.$this->displayValue($plans['workout_plan_name'] ?? null),
            '- Workout goal: '.$this->displayValue($plans['workout_goal'] ?? null),
            '- Workout days: '.$this->displayJson($plans['workout_days'] ?? []),
        ]);
    }

    private function renderConversationContext(array $promptContext): string
    {
        $conversation = is_array($promptContext['conversation_context'] ?? null)
            ? $promptContext['conversation_context']
            : [];

        $recentTurns = is_array($conversation['recent_turns'] ?? null)
            ? $conversation['recent_turns']
            : [];

        if ($recentTurns === []) {
            return '';
        }

        $lines = ['RECENT_CONVERSATION:'];

        foreach ($recentTurns as $turn) {
            $role = (string) ($turn['r'] ?? $turn['role'] ?? 'user');
            $content = trim((string) ($turn['c'] ?? $turn['content'] ?? ''));

            if ($content === '') {
                continue;
            }

            $lines[] = sprintf('- %s: %s', $role, $content);
        }

        return count($lines) > 1 ? implode("\n", $lines) : '';
    }

    private function renderRoleContext(array $promptContext): string
    {
        $roleContext = is_array($promptContext['role_context'] ?? null) ? $promptContext['role_context'] : [];

        return implode("\n", [
            'ROLE_CONTEXT:',
            '- Requester role: '.$this->displayValue($roleContext['role'] ?? null),
            '- Guidance: '.$this->displayValue($roleContext['note'] ?? null),
        ]);
    }

    private function renderRuntimeHints(array $promptContext): string
    {
        $runtime = is_array($promptContext['runtime'] ?? null) ? $promptContext['runtime'] : [];

        return implode("\n", [
            'RUNTIME_HINTS:',
            '- Available ingredients: '.$this->displayList($runtime['available_ingredients'] ?? []),
        ]);
    }

    private function displayValue(mixed $value): string
    {
        if ($value === null) {
            return 'not provided';
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed === '' ? 'not provided' : $trimmed;
        }

        return (string) $value;
    }

    private function displayList(mixed $value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [$value];
        }

        if (! is_array($value)) {
            return 'none saved';
        }

        $items = array_values(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value,
        )));

        return $items === [] ? 'none saved' : implode('; ', $items);
    }

    private function displayJson(mixed $value): string
    {
        if ($value === null || $value === []) {
            return 'not provided';
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed === '' ? 'not provided' : $trimmed;
        }

        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (! is_string($encoded) || $encoded === '') {
            return 'not provided';
        }

        return mb_strlen($encoded) > 900
            ? mb_substr($encoded, 0, 900).'...'
            : $encoded;
    }
}
