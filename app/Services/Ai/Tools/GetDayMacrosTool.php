<?php

namespace App\Services\Ai\Tools;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GetDayMacrosTool implements AiTool
{
    public function name(): string
    {
        return 'get_day_macros';
    }

    public function description(): string
    {
        return 'Returns calories and macro totals for a specific day from the user meal logs.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'date' => [
                    'type' => 'string',
                    'description' => 'Date in YYYY-MM-DD format.',
                ],
            ],
        ];
    }

    public function execute(User $user, array $arguments): array
    {
        $date = $this->resolveDate($arguments['date'] ?? null);

        $totals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->selectRaw('COALESCE(SUM(f.calories * me.servings),0) as kcal')
            ->selectRaw('COALESCE(SUM(f.protein_g * me.servings),0) as protein_g')
            ->selectRaw('COALESCE(SUM(f.carbs_g * me.servings),0) as carbs_g')
            ->selectRaw('COALESCE(SUM(f.fat_g * me.servings),0) as fat_g')
            ->where('me.user_id', $user->id)
            ->whereDate('me.eaten_at', $date)
            ->first();

        $meals = DB::table('meal_entries as me')
            ->join('foods as f', 'f.id', '=', 'me.food_id')
            ->where('me.user_id', $user->id)
            ->whereDate('me.eaten_at', $date)
            ->orderBy('me.eaten_at')
            ->get([
                'me.meal_type',
                'f.name',
                'me.servings',
                'f.calories',
                'f.protein_g',
                'f.carbs_g',
                'f.fat_g',
            ])
            ->map(fn ($row) => [
                'meal_type' => (string) $row->meal_type,
                'name' => (string) $row->name,
                'servings' => (float) $row->servings,
                'macros' => [
                    'calories_kcal' => (int) round(((float) ($row->calories ?? 0)) * ((float) ($row->servings ?? 1))),
                    'protein_g' => (float) round(((float) ($row->protein_g ?? 0)) * ((float) ($row->servings ?? 1)), 2),
                    'carbs_g' => (float) round(((float) ($row->carbs_g ?? 0)) * ((float) ($row->servings ?? 1)), 2),
                    'fat_g' => (float) round(((float) ($row->fat_g ?? 0)) * ((float) ($row->servings ?? 1)), 2),
                ],
            ])
            ->values()
            ->all();

        $targets = [
            'calories_kcal' => $user->prefs?->daily_goal_calories,
            'protein_g' => $user->prefs?->daily_goal_protein_g,
            'carbs_g' => $user->prefs?->daily_goal_carbs_g,
            'fat_g' => $user->prefs?->daily_goal_fat_g,
        ];

        $totalsArray = [
            'calories_kcal' => (int) round((float) ($totals->kcal ?? 0)),
            'protein_g' => (float) round((float) ($totals->protein_g ?? 0), 2),
            'carbs_g' => (float) round((float) ($totals->carbs_g ?? 0), 2),
            'fat_g' => (float) round((float) ($totals->fat_g ?? 0), 2),
        ];

        return [
            'date' => $date,
            'totals' => $totalsArray,
            'targets' => $targets,
            'target_gaps' => $this->targetGaps($totalsArray, $targets),
            'meal_count' => count($meals),
            'meals' => $meals,
        ];
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

    private function targetGaps(array $totals, array $targets): array
    {
        $gaps = [];

        foreach ($targets as $key => $target) {
            if (! is_numeric($target)) {
                continue;
            }

            $gaps[$key] = (float) round(((float) $target) - ((float) ($totals[$key] ?? 0)), 2);
        }

        return $gaps;
    }
}
