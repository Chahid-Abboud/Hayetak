<?php

namespace App\Services\Ai\Context;

use App\Models\AiPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PlannerContextBuilder
{
    public function build(User $user): array
    {
        $cacheKey = sprintf('ai:planner:ctx:%d:%s', $user->id, now()->toDateString());
        $ttl = (int) config('ai.context_cache_ttl', 300);

        return Cache::remember($cacheKey, $ttl, function () use ($user) {
            return $this->buildFresh($user);
        });
    }

    private function buildFresh(User $user): array
    {
        $prefs = $user->prefs;
        $settings = is_array($prefs?->settings) ? $prefs->settings : [];

        $allergies = $this->normalizeList($user->allergies);
        $injuryHistory = $this->normalizeList($settings['injury_history'] ?? $settings['injuries'] ?? []);
        $equipment = $this->normalizeList($settings['available_equipment'] ?? []);

        $today = Carbon::today();
        $start = $today->copy()->subDays(6);

        $mealRows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('DATE(me.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings), 0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings), 0) as p')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings), 0) as c')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings), 0) as f')
            ->where('me.user_id', $user->id)
            ->whereBetween('me.eaten_at', [$start->toDateString(), $today->toDateString()])
            ->groupBy(DB::raw('DATE(me.eaten_at)'))
            ->orderBy('day')
            ->get();

        $daysLogged = max(1, $mealRows->count());
        $mealSummary = [
            'days_logged' => $mealRows->count(),
            'avg_kcal' => (int) round($mealRows->sum('kcal') / $daysLogged),
            'avg_p' => (int) round($mealRows->sum('p') / $daysLogged),
            'avg_c' => (int) round($mealRows->sum('c') / $daysLogged),
            'avg_f' => (int) round($mealRows->sum('f') / $daysLogged),
        ];

        $workoutRows = DB::table('workout_logs')
            ->selectRaw('COUNT(*) as sessions')
            ->selectRaw('COALESCE(SUM(duration_min), 0) as min_total')
            ->where('user_id', $user->id)
            ->whereBetween(DB::raw('DATE(performed_at)'), [$start->toDateString(), $today->toDateString()])
            ->first();

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

        $context = [
            'p' => [
                'w' => (float) ($user->weight_kg ?? 0),
                'h' => (int) ($user->height_cm ?? 0),
                'g' => strtolower((string) ($user->gender ?? '')),
                'ag' => (int) ($user->age ?? 0),
            ],
            'constraints' => [
                'allg' => $allergies,
                'diet' => $this->truncate((string) ($user->diet_name ?? ''), 40),
                'inj' => $injuryHistory,
                'mh' => $this->truncate((string) ($user->medical_history ?? ''), 220),
                'loc' => strtolower((string) ($user->workout_location ?? '')),
                'eq' => $equipment,
            ],
            'goals' => [
                'fit' => $this->truncate((string) ($user->fitness_goal ?? ''), 80),
                'diet' => $this->truncate((string) ($user->dietary_goal ?? ''), 80),
                'days_per_week' => (int) ($user->workout_days_per_week ?? 0),
                'past_fail' => $this->normalizeList($user->diet_failure_reasons),
                'past_fail_other' => $this->truncate((string) ($user->diet_failure_other ?? ''), 120),
            ],
            'history_7d' => [
                'meals' => $mealSummary,
                'workouts' => [
                    'sessions' => (int) ($workoutRows->sessions ?? 0),
                    'minutes' => (int) ($workoutRows->min_total ?? 0),
                ],
            ],
            'latest_plans' => [
                'diet_v' => $latestDiet?->version,
                'workout_v' => $latestWorkout?->version,
            ],
        ];

        $citations = [
            ['source' => 'profile'],
            ['source' => 'meal_summary_7d'],
            ['source' => 'workout_summary_7d'],
        ];

        return [
            'context' => $context,
            'citations' => $citations,
        ];
    }

    private function truncate(string $value, int $max): string
    {
        $clean = trim(preg_replace('/\s+/', ' ', $value) ?? '');

        return mb_strlen($clean) > $max
            ? mb_substr($clean, 0, $max).'...'
            : $clean;
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

        $out = [];
        foreach ($value as $item) {
            $text = trim((string) $item);
            if ($text !== '') {
                $out[] = $text;
            }
        }

        return array_values(array_unique($out));
    }
}
