<?php

namespace App\Services\Ai\Tools;

use App\Models\User;
use App\Models\WorkoutLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SummarizeLast7DaysTool implements AiTool
{
    public function name(): string
    {
        return 'summarize_last_7_days';
    }

    public function description(): string
    {
        return 'Summarizes nutrition and workout consistency over the selected day plus the previous 6 days.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'anchor_date' => [
                    'type' => 'string',
                    'description' => 'Optional YYYY-MM-DD date. Defaults to today.',
                ],
            ],
        ];
    }

    public function execute(User $user, array $arguments): array
    {
        $anchorDate = $this->resolveDate($arguments['anchor_date'] ?? null);
        $from = Carbon::createFromFormat('Y-m-d', $anchorDate)->subDays(6)->startOfDay();
        $to = Carbon::createFromFormat('Y-m-d', $anchorDate)->endOfDay();

        $nutritionRows = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('DATE(me.eaten_at) as day')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $user->id)
            ->whereBetween(DB::raw('DATE(me.eaten_at)'), [$from->toDateString(), $to->toDateString()])
            ->groupBy(DB::raw('DATE(me.eaten_at)'))
            ->orderBy(DB::raw('DATE(me.eaten_at)'))
            ->get();

        $workouts = WorkoutLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('performed_at', [$from, $to])
            ->with('day:id,name')
            ->latest('performed_at')
            ->get();

        $daysLogged = max(1, $nutritionRows->count());
        $summary = [
            'anchor_date' => $anchorDate,
            'range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'nutrition' => [
                'days_logged' => $nutritionRows->count(),
                'avg_kcal' => (int) round($nutritionRows->sum('kcal') / $daysLogged),
                'avg_protein_g' => (float) round($nutritionRows->sum('protein_g') / $daysLogged, 2),
                'avg_carbs_g' => (float) round($nutritionRows->sum('carbs_g') / $daysLogged, 2),
                'avg_fat_g' => (float) round($nutritionRows->sum('fat_g') / $daysLogged, 2),
                'daily_totals' => $nutritionRows->map(fn ($row) => [
                    'day' => (string) $row->day,
                    'kcal' => (int) round((float) ($row->kcal ?? 0)),
                    'protein_g' => (float) round((float) ($row->protein_g ?? 0), 2),
                    'carbs_g' => (float) round((float) ($row->carbs_g ?? 0), 2),
                    'fat_g' => (float) round((float) ($row->fat_g ?? 0), 2),
                ])->values()->all(),
            ],
            'workouts' => [
                'completed' => $workouts->count(),
                'days' => $workouts->pluck('day.name')->filter()->unique()->values()->all(),
                'sessions' => $workouts->map(fn (WorkoutLog $log) => [
                    'performed_at' => optional($log->performed_at)?->toISOString(),
                    'duration_min' => (int) ($log->duration_min ?? 0),
                    'day_name' => $log->day?->name,
                ])->values()->all(),
            ],
        ];

        return $summary;
    }

    private function resolveDate(mixed $value): string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return Carbon::today()->toDateString();
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $raw)->toDateString();
        } catch (\Throwable) {
            return Carbon::today()->toDateString();
        }
    }
}
