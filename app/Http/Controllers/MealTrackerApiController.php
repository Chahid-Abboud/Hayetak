<?php

namespace App\Http\Controllers;

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
            'userAllergies'   => $this->svc->userAllergies($userId),
            'recommendations' => $recommendations,
        ]);
    }

    public function month(Request $request)
    {
        $month = $request->query('month', now()->format('Y-m')); // YYYY-MM
        $month = Carbon::parse($month . '-01')->format('Y-m');

        return response()->json([
            'month' => $month,
            'daysWithEntries' => $this->svc->daysWithEntries(Auth::id(), $month),
        ]);
    }

    public function copyDay(Request $request)
    {
        $data = $request->validate([
            'from_date' => ['required','date'],
            'to_date'   => ['required','date'],
            'replace'   => ['sometimes','boolean'],
        ]);

        $userId = Auth::id();
        $from = Carbon::parse($data['from_date'])->format('Y-m-d');
        $to   = Carbon::parse($data['to_date'])->format('Y-m-d');
        $replace = (bool)($data['replace'] ?? false);

        DB::transaction(function () use ($userId, $from, $to, $replace) {
            if ($replace) {
                DB::table('meal_entries')->where('user_id', $userId)->whereDate('eaten_at', $to)->delete();
            }

            $rows = DB::table('meal_entries')
                ->where('user_id', $userId)
                ->whereDate('eaten_at', $from)
                ->get(['food_id','meal_type','servings']);

            foreach ($rows as $r) {
                DB::table('meal_entries')->insert([
                    'user_id'    => $userId,
                    'food_id'    => $r->food_id,
                    'meal_type'  => $r->meal_type,
                    'servings'   => $r->servings,
                    'eaten_at'   => $to,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return response()->json(['ok' => true]);
    }
}
