<?php

namespace App\Http\Controllers;

use App\Models\Food;
use App\Models\MealEntry;
use App\Models\NutritionPlanItem;
use App\Services\MealTrackerService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MealTrackerApiController extends Controller
{
    public function __construct(private MealTrackerService $svc) {}

    public function day(Request $request)
    {
        $date = $request->query('date', now()->format('Y-m-d'));
        $date = Carbon::parse($date)->format('Y-m-d');

        $mealType = $request->query('meal_type');
        $userId = Auth::id();
        $summary = $this->svc->daySummary($userId, $date);
        $recommendations = [];

        try {
            $recommendations = $this->svc->recommendedFoods($userId, $date, is_string($mealType) ? $mealType : null);
        } catch (\Throwable $e) {
            // Recommendations should never break daily totals/entries payload.
            Log::warning('Meal tracker recommendations failed', [
                'user_id' => $userId,
                'date' => $date,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            ...$summary,
            'userAllergies' => $this->svc->userAllergies($userId),
            'recommendations' => $recommendations,
        ]);
    }

    public function month(Request $request)
    {
        $month = $request->query('month', now()->format('Y-m')); // YYYY-MM
        $month = Carbon::parse($month.'-01')->format('Y-m');

        return response()->json([
            'month' => $month,
            'daysWithEntries' => $this->svc->daysWithEntries(Auth::id(), $month),
        ]);
    }

    public function copyDay(Request $request)
    {
        $data = $request->validate([
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date'],
            'replace' => ['sometimes', 'boolean'],
        ]);

        $userId = Auth::id();
        $from = Carbon::parse($data['from_date'])->format('Y-m-d');
        $to = Carbon::parse($data['to_date'])->format('Y-m-d');
        $replace = (bool) ($data['replace'] ?? false);

        DB::transaction(function () use ($userId, $from, $to, $replace) {
            if ($replace) {
                DB::table('meal_entries')->where('user_id', $userId)->whereDate('eaten_at', $to)->delete();
            }

            $rows = DB::table('meal_entries')
                ->where('user_id', $userId)
                ->whereDate('eaten_at', $from)
                ->get(['food_id', 'meal_type', 'servings']);

            foreach ($rows as $r) {
                DB::table('meal_entries')->insert([
                    'user_id' => $userId,
                    'food_id' => $r->food_id,
                    'meal_type' => $r->meal_type,
                    'servings' => $r->servings,
                    'eaten_at' => $to,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return response()->json(['ok' => true]);
    }

    public function logPlannedItem(Request $request, NutritionPlanItem $nutritionPlanItem)
    {
        $user = $request->user();
        $nutritionPlanItem->loadMissing(['meal.day.plan', 'food']);

        abort_unless(
            $nutritionPlanItem->meal?->day?->plan?->user_id === $user?->id,
            403
        );

        $data = $request->validate([
            'food_id' => ['required', 'integer', 'exists:foods,id'],
            'servings' => ['nullable', 'numeric', 'gt:0', 'max:1000', 'required_without_all:grams,milliliters'],
            'grams' => ['nullable', 'numeric', 'gt:0', 'max:100000', 'required_without_all:servings,milliliters'],
            'milliliters' => ['nullable', 'numeric', 'gt:0', 'max:100000', 'required_without_all:servings,grams'],
            'eaten_at' => ['nullable', 'date'],
        ]);

        $plannedDate = $nutritionPlanItem->meal?->day?->date?->toDateString();
        $eatenAt = isset($data['eaten_at'])
            ? Carbon::parse($data['eaten_at'])->toDateString()
            : ($plannedDate ?? now()->toDateString());

        if ($plannedDate !== null && $eatenAt !== $plannedDate) {
            return response()->json([
                'ok' => false,
                'message' => 'Planned items can only be logged on their scheduled date.',
            ], 422);
        }

        $food = Food::query()->findOrFail((int) $data['food_id']);
        try {
            $servings = $this->svc->resolveLoggedServings(
                $food,
                $data,
                (string) ($nutritionPlanItem->meal?->meal_type ?? 'snack')
            );
        } catch (\InvalidArgumentException $exception) {
            return response()->json([
                'ok' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
        $isSubstitute = (int) $food->id !== (int) $nutritionPlanItem->food_id;

        $violations = $this->validateFoodSafety(
            (int) ($user?->id ?? 0),
            $food,
            $isSubstitute
        );
        if ($violations !== []) {
            return response()->json([
                'ok' => false,
                'message' => implode(' ', $violations),
            ], 422);
        }

        $entry = MealEntry::query()->updateOrCreate(
            [
                'user_id' => $user?->id,
                'nutrition_plan_item_id' => $nutritionPlanItem->id,
                'eaten_at' => $eatenAt,
            ],
            [
                'food_id' => $food->id,
                'meal_type' => (string) ($nutritionPlanItem->meal?->meal_type ?? 'snack'),
                'servings' => $servings,
            ]
        );

        return response()->json([
            'ok' => true,
            'message' => 'Planned meal logged successfully.',
            'status' => (int) $entry->food_id === (int) $nutritionPlanItem->food_id
                ? 'logged_exact'
                : 'logged_substitute',
            'entry_id' => $entry->id,
        ]);
    }

    private function validateFoodSafety(int $userId, Food $food, bool $isSubstitute): array
    {
        $violations = [];
        $userAllergies = array_map('mb_strtolower', $this->svc->userAllergies($userId));
        $foodAllergens = array_map('mb_strtolower', is_array($food->allergens) ? $food->allergens : []);

        if ($userAllergies !== [] && array_intersect($userAllergies, $foodAllergens) !== []) {
            $violations[] = $isSubstitute
                ? 'This substitute conflicts with your saved allergies.'
                : 'This planned meal conflicts with your saved allergies.';
        }

        // Diet-type blocking is only applied when the user chooses a substitute.
        // Original AI-planned meals may have incomplete food metadata, so they should
        // not be rejected here after already being generated as part of the plan.
        if ($isSubstitute) {
            $dietName = $this->svc->userDietName($userId);
            $allowedDiets = array_map('mb_strtolower', is_array($food->diets_allowed) ? $food->diets_allowed : []);

            if ($dietName && $allowedDiets !== [] && ! in_array(mb_strtolower($dietName), $allowedDiets, true)) {
                $violations[] = 'This substitute does not match your saved diet type.';
            }
        }

        return $violations;
    }
}
