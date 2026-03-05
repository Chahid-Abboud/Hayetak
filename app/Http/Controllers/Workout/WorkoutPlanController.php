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
    public function index(Request $request)
    {
        $userId = Auth::id();
        $sort = $request->query('sort', 'muscle'); // 'muscle' | 'name'

        // Fetch the workout plan with exercises
        $plan = WorkoutPlan::with([
            'days' => fn ($q) => $q->orderBy('day_index'),
            'days.exercises' => function ($q) use ($sort) {
                $q->select([
                    'exercises.id',
                    'exercises.name',
                    DB::raw('exercises.primary_muscle as primary_muscle'),
                    'exercises.equipment',
                    'exercises.demo_video as demo_url',
                ]);

                if ($sort === 'name') {
                    $q->orderBy('exercises.name');
                } else {
                    $q->orderBy('exercises.primary_muscle')
                        ->orderBy('exercises.name');
                }
            },
        ])->where('user_id', $userId)->first();

        // Fetch exercise library
        $exercises = Exercise::select(
            'id', 'name',
            DB::raw('primary_muscle as primary_muscle'),
            'equipment', 'demo_video', 'conditions'
        )
            ->orderBy('primary_muscle')
            ->orderBy('name')
            ->get()
            ->map(function ($e) {
                $e->demo_url = $e->demo_video ?: null;
                unset($e->demo_video);
                $e->conditions = is_array($e->conditions) ? $e->conditions : [];

                return $e;
            });

        return Inertia::render('workouts/planner', [
            'plan' => $plan,
            'exercises' => $exercises,
            'sort' => $sort,
        ]);
    }

    /**
     * Create/update plan from the planner UI.
     */
    public function store(Request $request)
    {
        // Validate incoming request
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'days' => ['required', 'array'],
            'days.*.day_index' => ['required', 'integer', 'min:1', 'max:7'],
            'days.*.title' => ['nullable', 'string', 'max:100'],
            'days.*.exercises' => ['array'],
            'days.*.exercises.*.exercise_id' => ['required', 'integer', 'exists:exercises,id'],
            'days.*.exercises.*.target_sets' => ['required', 'integer'],
            'days.*.exercises.*.target_reps' => ['required', 'integer'],
        ]);

        $days = array_values($data['days']);
        usort($days, fn ($a, $b) => $a['day_index'] <=> $b['day_index']);

        DB::transaction(function () use ($data, $days) {
            // Create or update the workout plan
            $plan = WorkoutPlan::updateOrCreate(
                ['user_id' => Auth::id()],
                [
                    'name' => $data['name'] ?? 'My Plan',
                ]
            );

            // Remove old days and exercises
            $plan->load('days.exercises');
            foreach ($plan->days as $oldDay) {
                $oldDay->exercises()->detach();
                $oldDay->delete();
            }

            // Insert new days and exercises
            foreach ($days as $d) {
                $day = $plan->days()->create([
                    'day_index' => (int) $d['day_index'],
                    'title' => $d['title'] ?? null,
                ]);

                if (! empty($d['exercises'])) {
                    $attach = [];
                    foreach ($d['exercises'] as $order => $ex) {
                        $attach[(int) $ex['exercise_id']] = [
                            'order_index' => $order,
                            'sets' => (int) $ex['target_sets'],
                            'reps_min' => (int) $ex['target_reps'],
                            'reps_max' => (int) $ex['target_reps'],
                            'rest_seconds' => 60,
                            'rpe_target' => 0,
                            'rir_target' => 0,
                            'notes' => null,
                        ];
                    }
                    $day->exercises()->attach($attach);
                }
            }
        });

        return back()->with('success', 'Workout plan saved!');
    }
}
