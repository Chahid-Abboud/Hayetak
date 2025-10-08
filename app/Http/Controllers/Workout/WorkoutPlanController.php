<?php

namespace App\Http\Controllers\Workout;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\WorkoutPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WorkoutPlanController extends Controller
{
    /**
     * Show planner UI with current plan and exercise library.
     */
    public function index()
    {
        $userId = Auth::id();

        $plan = WorkoutPlan::with([
            'days.exercises' => function ($q) {
                // include pivot fields if your relation defines them
                $q->orderBy('primary_muscle')->orderBy('name');
            },
            'days' => function ($q) {
                $q->orderBy('day_index');
            },
        ])->where('user_id', $userId)->first();

        $exercises = Exercise::orderBy('primary_muscle')->orderBy('name')->get();

        // render lowercase path to match resources/js/pages/workouts/planner.tsx
        return Inertia::render('workouts/planner', [
            'plan' => $plan,
            'exercises' => $exercises,
        ]);
    }

    /**
     * Create/update plan from the planner UI.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable','string','max:100'],
            'days_per_week' => ['required','integer','min:1','max:7'],
            'days' => ['required','array'],

            'days.*.day_index' => ['required','integer','min:1','max:7'],
            'days.*.title' => ['nullable','string','max:100'],
            'days.*.exercises' => ['array'],

            'days.*.exercises.*.exercise_id' => ['required','integer','exists:exercises,id'],
            'days.*.exercises.*.target_sets' => ['required','integer','min:1','max:10'],
            'days.*.exercises.*.target_reps' => ['required','integer','min:1','max:50'],
        ]);

        // Normalize: keep only 1..days_per_week, sort by day_index, de-dupe exercises in each day
        $daysPerWeek = (int) $data['days_per_week'];
        $days = array_values(array_filter($data['days'] ?? [], function ($d) use ($daysPerWeek) {
            return isset($d['day_index']) && $d['day_index'] >= 1 && $d['day_index'] <= $daysPerWeek;
        }));
        usort($days, fn($a, $b) => $a['day_index'] <=> $b['day_index']);

        foreach ($days as &$d) {
            $seen = [];
            $d['exercises'] = array_values(array_filter($d['exercises'] ?? [], function ($ex) use (&$seen) {
                $id = $ex['exercise_id'] ?? null;
                if (!$id || isset($seen[$id])) return false;
                $seen[$id] = true;
                return true;
            }));
        }
        unset($d);

        DB::transaction(function () use ($data, $days) {
            $plan = WorkoutPlan::updateOrCreate(
                ['user_id' => Auth::id()],
                ['name' => $data['name'] ?? 'My Plan', 'days_per_week' => $data['days_per_week']]
            );

            // Clear existing structure (detach pivots explicitly, then delete days)
            $plan->load('days.exercises');
            foreach ($plan->days as $oldDay) {
                $oldDay->exercises()->detach();
                $oldDay->delete();
            }

            // Rebuild days + pivots
            foreach ($days as $d) {
                $day = $plan->days()->create([
                    'day_index' => (int)$d['day_index'],
                    'title'     => $d['title'] ?? null,
                ]);

                $attach = [];
                foreach ($d['exercises'] as $ex) {
                    $attach[(int)$ex['exercise_id']] = [
                        'target_sets' => (int)$ex['target_sets'],
                        'target_reps' => (int)$ex['target_reps'],
                    ];
                }
                if ($attach) {
                    $day->exercises()->attach($attach);
                }
            }
        });

        return back()->with('success', 'Workout plan saved!');
    }
}
