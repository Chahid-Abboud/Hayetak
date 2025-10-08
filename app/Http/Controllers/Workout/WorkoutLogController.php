<?php
// app/Http/Controllers/Workout/WorkoutLogController.php
namespace App\Http\Controllers\Workout;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WorkoutLogController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();

        // Load plan like Planner (days + exercises ordered)
        $plan = WorkoutPlan::with([
            'days.exercises' => function ($q) {
                $q->orderBy('primary_muscle')->orderBy('name');
            },
            'days' => function ($q) {
                $q->orderBy('day_index');
            },
        ])->where('user_id', $userId)->first();

        $today   = Carbon::today();
        $weekday = (int) $today->isoWeekday(); // 1..7
        $currentDay = optional($plan?->days->firstWhere('day_index', $weekday)) ?: $plan?->days->first();

        // Recent logs with sets and exercise eager loaded
        $recentLogs = WorkoutLog::with([
                'sets' => function ($q) {
                    $q->orderBy('set_number');
                },
                'sets.exercise:id,name,primary_muscle',
            ])
            ->where('user_id', $userId)
            ->orderByDesc('workout_date')
            ->orderByDesc('id')
            ->limit(14)
            ->get(['id','workout_date','workout_plan_day_id']);

        // Exercise library (needed for freestyle picker)
        $exercises = Exercise::orderBy('primary_muscle')
            ->orderBy('name')
            ->get(['id','name','primary_muscle','equipment','demo_url']);

        return Inertia::render('workouts/log', [
            'plan'        => $plan,
            'currentDay'  => $currentDay,
            'today'       => $today->toDateString(),
            'recentLogs'  => $recentLogs,
            'exercises'   => $exercises,
            'flash'       => ['activeLogId' => session('activeLogId')],
        ]);
    }

    public function start(Request $request)
    {
        $data = $request->validate([
            'workout_date' => ['required', 'date'],
            'workout_plan_day_id' => ['nullable', 'integer', 'exists:workout_plan_days,id'],
        ]);

        $log = WorkoutLog::create([
            'user_id' => Auth::id(),
            'workout_date' => $data['workout_date'],
            'workout_plan_day_id' => $data['workout_plan_day_id'] ?? null,
        ]);

        return redirect()->route('workouts.log')->with('activeLogId', $log->id);
    }

    public function addSet(Request $request, WorkoutLog $log)
    {
        if ($log->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $data = $request->validate([
            'exercise_id' => ['required', 'integer', 'exists:exercises,id'],
            'set_number'  => ['required', 'integer', 'min:1', 'max:20'],
            'weight_kg'   => ['nullable', 'numeric', 'min:0', 'max:999'],
            'reps'        => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        WorkoutLogSet::updateOrCreate(
            [
                'workout_log_id' => $log->id,
                'exercise_id'    => $data['exercise_id'],
                'set_number'     => $data['set_number'],
            ],
            [
                'weight_kg' => $data['weight_kg'],
                'reps'      => $data['reps'],
            ]
        );

        return back();
    }

    public function finish(Request $request, WorkoutLog $log)
    {
        if ($log->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $data = $request->validate([
            'duration_min' => ['nullable', 'integer', 'min:1', 'max:600'],
            'notes'        => ['nullable', 'string', 'max:2000'],
        ]);

        $log->update($data);

        return back()->with('success', 'Great job! Workout saved ');
    }

    public function progress(Request $request)
    {
        $userId = Auth::id();
        $weeks = (int) ($request->get('weeks', 8));

        $rows = DB::table('workout_log_sets as s')
            ->join('workout_logs as l', 'l.id', '=', 's.workout_log_id')
            ->join('exercises as e', 'e.id', '=', 's.exercise_id')
            ->where('l.user_id', $userId)
            ->where('l.workout_date', '>=', now()->subWeeks($weeks + 1)->toDateString())
            ->selectRaw("YEARWEEK(l.workout_date, 3) as yw, e.primary_muscle, MAX(COALESCE(s.weight_kg,0)) as top_weight")
            ->groupBy('yw', 'e.primary_muscle', 'l.user_id')
            ->orderBy('yw')
            ->get();

        $byWeek = [];
        foreach ($rows as $r) {
            $weekKey = $this->formatWeek((int) $r->yw);
            $byWeek[$weekKey] ??= [];
            $byWeek[$weekKey][$r->primary_muscle] ??= [];
            $byWeek[$weekKey][$r->primary_muscle][] = (float) $r->top_weight;
        }

        $series = [];
        foreach ($byWeek as $week => $muscles) {
            $entry = ['week' => $week];
            foreach ($muscles as $m => $arr) {
                $entry[$m] = round(array_sum($arr) / max(count($arr), 1), 1);
            }
            $series[] = $entry;
        }

        $motivation = $this->motivationFromSeries($series);

        return response()->json(['series' => $series, 'motivation' => $motivation]);
    }

    private function formatWeek(int $yearWeek): string
    {
        $yw   = (string) $yearWeek;
        $year = substr($yw, 0, 4);
        $week = substr($yw, 4);
        return "{$year}-W{$week}";
    }

    private function motivationFromSeries(array $series): array
    {
        if (count($series) < 2) {
            return ['title' => 'Nice start!', 'lines' => ['Keep logging to unlock progress insights.']];
        }
        $last = end($series);
        $prev = prev($series);

        $muscles = ['chest','back','shoulders','legs','glutes','biceps','triceps','core','calves'];
        $lines = [];
        $best = null; $bestDelta = 0.0;

        foreach ($muscles as $m) {
            $a = $last[$m] ?? null;
            $b = $prev[$m] ?? null;
            if ($a !== null && $b !== null) {
                $delta = round($a - $b, 1);
                if ($delta > 0) {
                    $lines[] = "↑ **{$m}** improved by **{$delta} kg** week-over-week.";
                    if ($delta > $bestDelta) { $bestDelta = $delta; $best = $m; }
                } elseif ($delta < 0) {
                    $lines[] = "↔ **{$m}** dipped **".abs($delta)." kg** — deloads happen, bounce back!";
                } else {
                    $lines[] = "→ **{$m}** held steady — consistency wins.";
                }
            }
        }

        $title = $best
            ? "Crushing it! Biggest gain in **{$best}** (+{$bestDelta} kg) "
            : "Solid consistency — keep stacking sets!";

        return ['title' => $title, 'lines' => $lines ?: ['Keep pushing — your future self will thank you.']];
    }
}
