<?php

namespace App\Http\Controllers\Workout;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use App\Models\WorkoutPlan;
use App\Models\WorkoutPlanDay;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkoutLogController extends Controller
{
    public function __construct(
        private readonly UserFacingAiPayloadSanitizer $sanitizer,
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $today = Carbon::today();
        $weekday = (int) $today->isoWeekday();
        $isAdmin = (string) ($request->user()?->role ?? '') === 'admin';

        $aiPlan = $this->planQuery()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id')
            ->first();

        $manualPlan = $this->planQuery()
            ->where('user_id', $userId)
            ->whereNull('ai_request_id')
            ->latest('updated_at')
            ->first();

        $recommendedAiDay = $aiPlan?->days->firstWhere('day_index', $weekday) ?? $aiPlan?->days->first();
        $recommendedManualDay = $manualPlan?->days->firstWhere('day_index', $weekday) ?? $manualPlan?->days->first();

        $recentLogs = WorkoutLog::query()
            ->where('user_id', $userId)
            ->with([
                'sets.exercise:id,name',
                'plan:id,name,ai_request_id',
                'day:id,workout_plan_id,day_index,name',
            ])
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->limit(14)
            ->get()
            ->map(function (WorkoutLog $log) {
                $sets = $log->sets
                    ->sortBy('order_index')
                    ->map(function ($set) {
                        return [
                            'id' => (int) $set->id,
                            'exercise' => $set->exercise ? [
                                'id' => (int) $set->exercise->id,
                                'name' => (string) $set->exercise->name,
                            ] : null,
                            'weight_kg' => $set->weight_kg,
                            'reps' => (int) $set->reps,
                            'set_number' => (int) $set->order_index + 1,
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'id' => (int) $log->id,
                    'workout_date' => $log->performed_at?->toDateString(),
                    'workout_plan_id' => $log->workout_plan_id,
                    'workout_plan_day_id' => $log->workout_plan_day_id,
                    'plan_source' => $log->plan?->ai_request_id ? 'ai' : ($log->plan ? 'manual' : 'freestyle'),
                    'day_name' => $log->day?->name,
                    'sets' => $sets,
                ];
            });

        $exercises = Exercise::query()
            ->orderBy('primary_muscle')
            ->orderBy('name')
            ->get(['id', 'name', 'primary_muscle', 'equipment', 'demo_url']);

        return Inertia::render('workouts/log', [
            'aiPlan' => $aiPlan
                ? $this->sanitizer->sanitizePlanResource($aiPlan->toArray(), $isAdmin)
                : null,
            'manualPlan' => $manualPlan
                ? $this->sanitizer->sanitizePlanResource($manualPlan->toArray(), $isAdmin)
                : null,
            'recommendedAiDayId' => $recommendedAiDay?->id,
            'recommendedManualDayId' => $recommendedManualDay?->id,
            'today' => $today->toDateString(),
            'recentLogs' => $recentLogs,
            'exercises' => $exercises,
            'flash' => ['activeLogId' => session('activeLogId')],
        ]);
    }

    public function start(Request $request)
    {
        $data = $request->validate([
            'performed_at' => ['nullable', 'date'],
            'workout_date' => ['nullable', 'date'],
            'workout_plan_day_id' => ['nullable', 'integer', 'exists:workout_plan_days,id'],
        ]);

        $when = $data['performed_at'] ?? $data['workout_date'] ?? now()->toDateString();
        $dayId = isset($data['workout_plan_day_id']) ? (int) $data['workout_plan_day_id'] : null;
        $planId = null;

        if ($dayId) {
            $day = WorkoutPlanDay::query()
                ->with('plan:id,user_id')
                ->findOrFail($dayId);

            abort_unless($day->plan?->user_id === Auth::id(), 403, 'Unauthorized');
            $planId = $day->workout_plan_id;
        }

        $log = WorkoutLog::query()->create([
            'user_id' => Auth::id(),
            'performed_at' => Carbon::parse($when),
            'workout_plan_id' => $planId,
            'workout_plan_day_id' => $dayId,
        ]);

        return redirect()->route('workouts.log')->with('activeLogId', $log->id);
    }

    public function addSet(Request $request, WorkoutLog $log)
    {
        abort_if($log->user_id !== Auth::id(), 403, 'Unauthorized');

        $data = $request->validate([
            'exercise_id' => ['required', 'integer', 'exists:exercises,id'],
            'set_number' => ['required', 'integer', 'min:1', 'max:20'],
            'weight_kg' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'reps' => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        $orderIndex = $data['set_number'] - 1;

        WorkoutLogSet::updateOrCreate(
            [
                'workout_log_id' => $log->id,
                'exercise_id' => $data['exercise_id'],
                'order_index' => $orderIndex,
            ],
            [
                'weight_kg' => $data['weight_kg'],
                'reps' => $data['reps'],
            ]
        );

        return back();
    }

    public function finish(Request $request, WorkoutLog $log)
    {
        abort_if($log->user_id !== Auth::id(), 403, 'Unauthorized');

        $data = $request->validate([
            'duration_min' => ['nullable', 'integer', 'min:1', 'max:600'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $log->update($data);

        return back()->with('success', 'Great job! Workout saved.');
    }

    public function progress(Request $request)
    {
        $userId = Auth::id();
        $weeks = (int) ($request->get('weeks', 8));

        $rows = DB::table('workout_log_sets as s')
            ->join('workout_logs as l', 'l.id', '=', 's.workout_log_id')
            ->join('exercises as e', 'e.id', '=', 's.exercise_id')
            ->where('l.user_id', $userId)
            ->where('l.performed_at', '>=', now()->subWeeks($weeks + 1))
            ->select('l.id as workout_log_id', 'l.performed_at', 'e.primary_muscle', 's.reps')
            ->selectRaw('COALESCE(s.weight_kg, 0) AS top_weight')
            ->orderBy('l.performed_at')
            ->get();

        $byWeekMuscles = [];
        $byWeekContext = [];
        foreach ($rows as $row) {
            $dt = Carbon::parse($row->performed_at);
            $weekKey = sprintf('%d-W%02d', $dt->isoWeekYear, $dt->isoWeek);
            $muscle = (string) $row->primary_muscle;
            $topWeight = (float) $row->top_weight;
            $reps = (int) ($row->reps ?? 0);

            $byWeekMuscles[$weekKey] ??= [];
            $byWeekMuscles[$weekKey][$muscle] = isset($byWeekMuscles[$weekKey][$muscle])
                ? max($byWeekMuscles[$weekKey][$muscle], $topWeight)
                : $topWeight;

            $byWeekContext[$weekKey] ??= [
                'week' => $weekKey,
                'top_set_kg' => 0.0,
                'total_volume_kg' => 0.0,
                'total_reps' => 0,
                'set_count' => 0,
                'workout_log_ids' => [],
            ];

            $byWeekContext[$weekKey]['top_set_kg'] = max(
                (float) $byWeekContext[$weekKey]['top_set_kg'],
                $topWeight
            );
            $byWeekContext[$weekKey]['total_volume_kg'] += max(0, $topWeight) * max(0, $reps);
            $byWeekContext[$weekKey]['total_reps'] += max(0, $reps);
            $byWeekContext[$weekKey]['set_count'] += 1;
            $byWeekContext[$weekKey]['workout_log_ids'][(int) $row->workout_log_id] = true;
        }

        $series = [];
        foreach ($byWeekMuscles as $week => $muscles) {
            $entry = ['week' => $week];
            foreach ($muscles as $muscle => $weight) {
                $entry[$muscle] = round((float) $weight, 1);
            }
            $series[] = $entry;
        }

        $weeklyContext = [];
        foreach ($byWeekContext as $week => $entry) {
            $setCount = (int) $entry['set_count'];
            $weeklyContext[] = [
                'week' => $week,
                'top_set_kg' => round((float) $entry['top_set_kg'], 1),
                'avg_reps' => $setCount > 0 ? round(((int) $entry['total_reps']) / $setCount, 1) : 0.0,
                'total_volume_kg' => round((float) $entry['total_volume_kg'], 1),
                'set_count' => $setCount,
                'workout_count' => count($entry['workout_log_ids']),
            ];
        }

        $motivation = $this->motivationFromSeries($series);

        return response()->json([
            'series' => $series,
            'weekly_context' => $weeklyContext,
            'motivation' => $motivation,
        ]);
    }

    private function planQuery()
    {
        return WorkoutPlan::query()->with([
            'days' => fn ($query) => $query->orderBy('day_index'),
            'days.exercises' => fn ($query) => $query
                ->orderBy('workout_plan_day_exercises.order_index')
                ->orderBy('exercises.name'),
        ]);
    }

    private function motivationFromSeries(array $series): array
    {
        if (count($series) < 2) {
            return ['title' => 'Nice start!', 'lines' => ['Keep logging to unlock progress insights.']];
        }

        $last = end($series);
        $prev = prev($series);

        $muscles = ['chest', 'back', 'shoulders', 'legs', 'glutes', 'biceps', 'triceps', 'core', 'calves'];
        $lines = [];
        $best = null;
        $bestDelta = 0.0;

        foreach ($muscles as $muscle) {
            $current = $last[$muscle] ?? null;
            $before = $prev[$muscle] ?? null;
            if ($current !== null && $before !== null) {
                $delta = round($current - $before, 1);
                if ($delta > 0) {
                    $lines[] = "Improvement in {$muscle}: +{$delta} kg week-over-week.";
                    if ($delta > $bestDelta) {
                        $bestDelta = $delta;
                        $best = $muscle;
                    }
                } elseif ($delta < 0) {
                    $lines[] = "{$muscle} dipped by ".abs($delta).' kg. Deloads happen, keep going.';
                } else {
                    $lines[] = "{$muscle} held steady. Consistency is still progress.";
                }
            }
        }

        $title = $best
            ? "Biggest gain this week: {$best} (+{$bestDelta} kg)"
            : 'Solid consistency. Keep stacking sessions.';

        return ['title' => $title, 'lines' => $lines ?: ['Keep pushing and the trends will become clearer.']];
    }
}
