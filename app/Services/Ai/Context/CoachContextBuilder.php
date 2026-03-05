<?php

namespace App\Services\Ai\Context;

use App\Models\AiConversation;
use App\Models\AiPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CoachContextBuilder
{
    public function build(User $user, array $runtimeContext = [], ?AiConversation $conversation = null): array
    {
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];
        $today = Carbon::today()->toDateString();

        $todayMacros = $this->macroSummaryForDay($user->id, $today);
        $citations = [
            ['source' => 'user_profile'],
            ['source' => 'today_macros'],
        ];

        $last7 = null;
        if ((bool) ($runtimeContext['include_last_7_days'] ?? false)) {
            $last7 = $this->macroSummaryForRange($user->id, Carbon::today()->subDays(6), Carbon::today());
            $citations[] = ['source' => 'meal_summary_7d'];
        }

        $latestDiet = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'diet')
            ->latest('version')
            ->first();
        $latestWorkout = AiPlan::query()
            ->where('user_id', $user->id)
            ->where('type', 'workout')
            ->latest('version')
            ->first();

        if ($latestDiet || $latestWorkout) {
            $citations[] = ['source' => 'saved_plans'];
        }

        $recentTurns = [];
        $summary = null;
        if ($conversation) {
            $recentTurns = $conversation->messages()
                ->orderByDesc('id')
                ->limit(8)
                ->get(['role', 'content'])
                ->reverse()
                ->values()
                ->map(fn ($m) => [
                    'r' => $m->role,
                    'c' => mb_substr((string) $m->content, 0, 280),
                ])
                ->all();

            $summary = is_array($conversation->summary_json) ? $conversation->summary_json : null;
        }

        $profile = [
            'age' => (int) ($user->age ?? 0),
            'gender' => strtolower((string) ($user->gender ?? '')),
            'height_cm' => (int) ($user->height_cm ?? 0),
            'weight_kg' => (float) ($user->weight_kg ?? 0),
            'activity' => strtolower((string) ($user->activity_level ?? '')),
            'workout_location' => strtolower((string) ($user->workout_location ?? '')),
            'workout_days_per_week' => (int) ($user->workout_days_per_week ?? 0),
            'fitness_goal' => $this->truncate((string) ($user->fitness_goal ?? ''), 80),
            'dietary_goal' => $this->truncate((string) ($user->dietary_goal ?? ''), 80),
            'diet_type' => strtolower((string) ($user->diet_name ?? '')),
            'allergies' => $this->normalizeList($user->allergies),
            'medical_history' => $this->truncate((string) ($user->medical_history ?? ''), 220),
            'injury_history' => $this->normalizeList($settings['injury_history'] ?? $settings['injuries'] ?? []),
            'available_equipment' => $this->normalizeList($settings['available_equipment'] ?? []),
        ];

        $context = [
            'profile' => $profile,
            'today_macros' => $todayMacros,
            'last_7_days' => $last7,
            'latest_plans' => [
                'diet' => $latestDiet?->plan_json,
                'workout' => $latestWorkout?->plan_json,
            ],
            'runtime' => [
                'available_ingredients' => $this->normalizeList($runtimeContext['available_ingredients'] ?? []),
                'lat' => $runtimeContext['lat'] ?? null,
                'lng' => $runtimeContext['lng'] ?? null,
                'goal' => $this->truncate((string) ($runtimeContext['goal'] ?? ''), 80),
            ],
            'memory' => [
                'summary' => $summary,
                'recent_turns' => $recentTurns,
            ],
        ];

        return [
            'context' => $context,
            'citations' => $citations,
        ];
    }

    private function macroSummaryForDay(int $userId, string $date): array
    {
        $row = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $userId)
            ->whereDate('me.eaten_at', $date)
            ->first();

        return [
            'date' => $date,
            'kcal' => (int) round((float) ($row->kcal ?? 0)),
            'protein_g' => (int) round((float) ($row->protein_g ?? 0)),
            'carbs_g' => (int) round((float) ($row->carbs_g ?? 0)),
            'fat_g' => (int) round((float) ($row->fat_g ?? 0)),
        ];
    }

    private function macroSummaryForRange(int $userId, Carbon $from, Carbon $to): array
    {
        $rows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('DATE(me.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $userId)
            ->whereBetween(DB::raw('DATE(me.eaten_at)'), [$from->toDateString(), $to->toDateString()])
            ->groupBy(DB::raw('DATE(me.eaten_at)'))
            ->get();

        $days = max(1, $rows->count());

        return [
            'days_logged' => $rows->count(),
            'avg_kcal' => (int) round($rows->sum('kcal') / $days),
            'avg_protein_g' => (int) round($rows->sum('protein_g') / $days),
            'avg_carbs_g' => (int) round($rows->sum('carbs_g') / $days),
            'avg_fat_g' => (int) round($rows->sum('fat_g') / $days),
        ];
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = [$value];
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

    private function truncate(string $value, int $max): string
    {
        $clean = trim(preg_replace('/\s+/', ' ', $value) ?? '');

        return mb_strlen($clean) > $max
            ? mb_substr($clean, 0, $max).'...'
            : $clean;
    }
}
