<?php

namespace App\Http\Controllers\Workout;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Models\WorkoutPlan;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkoutPlanController extends Controller
{
    public function __construct(
        private readonly UserFacingAiPayloadSanitizer $sanitizer,
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $sort = $request->query('sort', 'muscle');
        $isAdmin = (string) ($request->user()?->role ?? '') === 'admin';

        $activeAiPlan = $this->planQuery($sort)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->whereNotNull('ai_request_id')
            ->latest('id')
            ->first();

        $manualPlan = $this->planQuery($sort)
            ->where('user_id', $userId)
            ->whereNull('ai_request_id')
            ->latest('updated_at')
            ->first();

        $premadePlans = $this->planQuery($sort)
            ->where('is_public', true)
            ->latest('id')
            ->take(6)
            ->get();

        $todayIndex = (int) now()->isoWeekday();
        $recommendedAiDay = $activeAiPlan?->days->firstWhere('day_index', $todayIndex) ?? $activeAiPlan?->days->first();
        $recommendedManualDay = $manualPlan?->days->firstWhere('day_index', $todayIndex) ?? $manualPlan?->days->first();

        $exercises = Exercise::query()
            ->select(
                'id',
                'name',
                DB::raw('primary_muscle as primary_muscle'),
                'equipment',
                'demo_video',
                'conditions'
            )
            ->orderBy('primary_muscle')
            ->orderBy('name')
            ->get()
            ->map(function ($exercise) {
                $exercise->demo_url = $exercise->demo_video ?: null;
                unset($exercise->demo_video);
                $exercise->conditions = is_array($exercise->conditions) ? $exercise->conditions : [];

                return $exercise;
            });

        return Inertia::render('workouts/planner', [
            'activeAiPlan' => $activeAiPlan
                ? $this->sanitizer->sanitizePlanResource($activeAiPlan->toArray(), $isAdmin)
                : null,
            'manualPlan' => $manualPlan
                ? $this->sanitizer->sanitizePlanResource($manualPlan->toArray(), $isAdmin)
                : null,
            'recommendedAiDayId' => $recommendedAiDay?->id,
            'recommendedManualDayId' => $recommendedManualDay?->id,
            'today' => now()->toDateString(),
            'exercises' => $exercises,
            'sort' => $sort,
            'premadePlans' => $premadePlans->map(
                fn (WorkoutPlan $plan) => $this->sanitizer->sanitizePlanResource($plan->toArray(), $isAdmin)
            )->values()->all(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'days' => ['required', 'array'],
            'days.*.day_index' => ['required', 'integer', 'min:1', 'max:7'],
            'days.*.name' => ['nullable', 'string', 'max:100'],
            'days.*.title' => ['nullable', 'string', 'max:100'],
            'days.*.exercises' => ['array'],
            'days.*.exercises.*.exercise_id' => ['required', 'integer', 'exists:exercises,id'],
            'days.*.exercises.*.target_sets' => ['required', 'integer', 'min:1', 'max:10'],
            'days.*.exercises.*.target_reps' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $days = collect($data['days'])
            ->map(function (array $day): array {
                return [
                    'day_index' => (int) $day['day_index'],
                    'name' => trim((string) ($day['name'] ?? $day['title'] ?? '')),
                    'exercises' => array_values($day['exercises'] ?? []),
                ];
            })
            ->sortBy('day_index')
            ->values()
            ->all();

        DB::transaction(function () use ($data, $days) {
            $user = Auth::user();

            $plan = WorkoutPlan::query()->firstOrNew([
                'user_id' => $user->id,
                'ai_request_id' => null,
            ]);

            $existingMeta = is_array($plan->meta) ? $plan->meta : [];
            $plan->fill([
                'name' => trim((string) ($data['name'] ?? 'My Workout Draft')) ?: 'My Workout Draft',
                'goal' => $user->fitness_goal ?: null,
                'start_date' => now()->toDateString(),
                'duration_days' => max(1, count($days)),
                'notes' => null,
                'is_active' => false,
                'is_public' => false,
                'meta' => array_merge($existingMeta, [
                    'source' => 'manual_builder_draft',
                    'last_saved_from' => 'workout_planner_ui',
                ]),
            ]);
            $plan->save();

            $plan->load('days.exercises');
            foreach ($plan->days as $oldDay) {
                $oldDay->exercises()->detach();
                $oldDay->delete();
            }

            foreach ($days as $dayData) {
                $day = $plan->days()->create([
                    'day_index' => $dayData['day_index'],
                    'name' => $dayData['name'] !== '' ? $dayData['name'] : 'Day '.$dayData['day_index'],
                    'notes' => null,
                    'meta' => ['source' => 'manual_builder_draft'],
                ]);

                if ($dayData['exercises'] === []) {
                    continue;
                }

                $attach = [];
                foreach ($dayData['exercises'] as $order => $exercise) {
                    $attach[(int) $exercise['exercise_id']] = [
                        'order_index' => $order,
                        'sets' => (int) $exercise['target_sets'],
                        'reps_min' => (int) $exercise['target_reps'],
                        'reps_max' => (int) $exercise['target_reps'],
                        'rest_seconds' => 60,
                        'rpe_target' => 0,
                        'rir_target' => 0,
                        'notes' => null,
                    ];
                }

                $day->exercises()->attach($attach);
            }
        });

        return back()->with('success', 'Your custom workout draft has been saved.');
    }

    private function planQuery(string $sort)
    {
        return WorkoutPlan::query()->with([
            'days' => fn ($query) => $query->orderBy('day_index'),
            'days.exercises' => function ($query) use ($sort) {
                $query->select([
                    'exercises.id',
                    'exercises.name',
                    DB::raw('exercises.primary_muscle as primary_muscle'),
                    'exercises.equipment',
                    'exercises.demo_video as demo_url',
                    'exercises.difficulty',
                ]);

                if ($sort === 'name') {
                    $query->orderBy('exercises.name');
                } else {
                    $query
                        ->orderBy('exercises.primary_muscle')
                        ->orderBy('exercises.name');
                }
            },
        ]);
    }
}
