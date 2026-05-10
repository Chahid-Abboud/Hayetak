<?php

namespace App\Http\Controllers\Professional;

use App\Http\Controllers\Controller;
use App\Models\DietPlan;
use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\ProfessionalClientAssignment;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use App\Models\WorkoutLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ProfessionalClientController extends Controller
{
    public function trainer(Request $request): Response
    {
        return $this->renderClientsPage($request, User::ROLE_TRAINER);
    }

    public function nutritionist(Request $request): Response
    {
        return $this->renderClientsPage($request, User::ROLE_NUTRITIONIST);
    }

    private function renderClientsPage(Request $request, string $role): Response
    {
        $professional = $request->user();

        abort_unless($professional?->hasRole($role), 403, 'Unauthorized role.');

        $assignments = ProfessionalClientAssignment::query()
            ->with([
                'client:id,first_name,last_name,name,email,username,age,height_cm,weight_kg,allergies',
                'client.dietaryRestrictions' => fn ($q) => $q->where('kind', 'allergy')->where('is_active', true),
            ])
            ->where('professional_id', $professional->id)
            ->where('professional_role', $role)
            ->latest('id')
            ->get();

        $clientIds = $assignments
            ->pluck('client_id')
            ->filter()
            ->unique()
            ->values();

        $measurementsByClient = Measurement::query()
            ->whereIn('user_id', $clientIds)
            ->orderByDesc('measured_at')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->take(12)->sortBy('measured_at')->values());

        $workoutsByClient = $role === User::ROLE_TRAINER
            ? WorkoutLog::query()
                ->withCount('sets')
                ->whereIn('user_id', $clientIds)
                ->orderByDesc('performed_at')
                ->get()
                ->groupBy('user_id')
                ->map(fn ($rows) => $rows->take(8)->values())
            : collect();

        $recentMealEntriesByClient = $role === User::ROLE_NUTRITIONIST
            ? MealEntry::query()
                ->with('food:id,name')
                ->whereIn('user_id', $clientIds)
                ->whereDate('eaten_at', '>=', Carbon::today()->subDays(6)->toDateString())
                ->orderByDesc('eaten_at')
                ->orderBy('meal_type')
                ->orderByDesc('id')
                ->get()
                ->groupBy('user_id')
            : collect();

        $dietPlansByClient = $role === User::ROLE_NUTRITIONIST
            ? DietPlan::query()
                ->whereIn('client_id', $clientIds)
                ->get()
                ->keyBy('client_id')
            : collect();

        $trainerWorkoutPlansByClient = $role === User::ROLE_TRAINER
            ? TrainerWorkoutPlan::query()
                ->whereIn('client_id', $clientIds)
                ->latest('id')
                ->get()
                ->unique('client_id')
                ->keyBy('client_id')
            : collect();

        $clients = $assignments->map(function (ProfessionalClientAssignment $assignment) use (
            $measurementsByClient,
            $workoutsByClient,
            $recentMealEntriesByClient,
            $dietPlansByClient,
            $trainerWorkoutPlansByClient,
            $role
        ) {
            $client = $assignment->client;

            if (! $client) {
                return null;
            }

            $measurements = $measurementsByClient->get($client->id, collect());
            $latestMeasurement = $measurements->last();

            $progressPoints = $measurements->map(fn (Measurement $measurement) => [
                'date' => optional($measurement->measured_at)->toDateString(),
                'weight_kg' => $measurement->weight_kg !== null ? (float) $measurement->weight_kg : null,
                'height_cm' => $measurement->height_cm !== null ? (int) $measurement->height_cm : null,
            ])->values();

            $payload = [
                'assignment_id' => $assignment->id,
                'notes' => $assignment->notes,
                'client' => [
                    'id' => $client->id,
                    'name' => $client->display_name,
                    'email' => $client->email,
                    'username' => $client->username,
                    'age' => $client->age,
                    'height_cm' => $client->height_cm !== null ? (int) $client->height_cm : null,
                    'weight_kg' => $client->weight_kg !== null ? (float) $client->weight_kg : null,
                    'allergens' => $client->client_allergens ?? [],
                ],
                'progress' => [
                    'latest_weight_kg' => $latestMeasurement?->weight_kg !== null
                        ? (float) $latestMeasurement->weight_kg
                        : ($client->weight_kg !== null ? (float) $client->weight_kg : null),
                    'latest_height_cm' => $latestMeasurement?->height_cm !== null
                        ? (int) $latestMeasurement->height_cm
                        : ($client->height_cm !== null ? (int) $client->height_cm : null),
                    'points' => $progressPoints,
                ],
            ];

            if ($role === User::ROLE_TRAINER) {
                $workouts = $workoutsByClient->get($client->id, collect());

                $payload['training'] = [
                    'recent_workouts' => $workouts->map(fn (WorkoutLog $log) => [
                        'id' => $log->id,
                        'performed_at' => optional($log->performed_at)->toIso8601String(),
                        'duration_min' => $log->duration_min,
                        'notes' => $log->notes,
                        'sets_count' => (int) $log->sets_count,
                    ])->values(),
                    'summary' => [
                        'logged_sessions' => $workouts->count(),
                        'latest_session_at' => optional($workouts->first()?->performed_at)->toIso8601String(),
                        'total_sets' => (int) $workouts->sum('sets_count'),
                    ],
                ];

                $trainerWorkoutPlan = $trainerWorkoutPlansByClient->get($client->id);

                $payload['workout_plan'] = $trainerWorkoutPlan ? [
                    'id' => $trainerWorkoutPlan->id,
                    'title' => $trainerWorkoutPlan->title,
                    'plan_json' => $trainerWorkoutPlan->plan_json,
                    'notes' => $trainerWorkoutPlan->notes,
                ] : null;
            }

            if ($role === User::ROLE_NUTRITIONIST) {
                $entries = $recentMealEntriesByClient->get($client->id, collect());
                $dayWindow = collect(range(0, 6))
                    ->map(fn (int $offset) => Carbon::today()->subDays($offset))
                    ->map(function (Carbon $date) use ($entries) {
                        $key = $date->toDateString();
                        $entriesForDay = $entries
                            ->filter(fn (MealEntry $entry) => Carbon::parse($entry->eaten_at)->toDateString() === $key)
                            ->values();

                        $meals = $entriesForDay
                            ->groupBy('meal_type')
                            ->map(fn ($rows, $mealType) => [
                                'meal_type' => $mealType,
                                'items' => collect($rows)->map(fn (MealEntry $entry) => [
                                    'id' => $entry->id,
                                    'food_name' => $entry->food?->name ?? 'Food item',
                                    'servings' => $entry->servings !== null ? (float) $entry->servings : null,
                                ])->values(),
                            ])
                            ->values();

                        return [
                            'date' => $key,
                            'label' => $date->isToday() ? 'Today' : $date->format('D, M j'),
                            'meals' => $meals,
                        ];
                    })
                    ->values();

                $dietPlan = $dietPlansByClient->get($client->id);

                $payload['nutrition'] = [
                    'weekly_days' => $dayWindow,
                ];

                $payload['diet_plan'] = $dietPlan ? [
                    'id' => $dietPlan->id,
                    'title' => $dietPlan->title,
                    'start_date' => optional($dietPlan->start_date)->toDateString(),
                    'end_date' => optional($dietPlan->end_date)->toDateString(),
                    'plan_json' => $dietPlan->plan_json,
                    'notes' => $dietPlan->notes,
                ] : null;
            }

            return $payload;
        })->filter()->values();

        return Inertia::render('professionals/clients', [
            'roleMode' => $role,
            'pageTitle' => $role === User::ROLE_TRAINER ? 'My Clients' : 'My Nutrition Clients',
            'clients' => $clients,
        ]);
    }
}
