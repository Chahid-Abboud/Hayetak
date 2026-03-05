<?php

namespace App\Http\Controllers\Professional;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainerWorkoutPlanRequest;
use App\Models\TrainerWorkoutPlan;
use App\Models\User;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainerWorkoutPlanController extends Controller
{
    public function __construct(private readonly ProfessionalAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = TrainerWorkoutPlan::query()->with(['client', 'trainer'])->latest('id');

        if ($user->isAdmin()) {
            // no-op
        } elseif ($user->hasRole(User::ROLE_TRAINER)) {
            $query->where('trainer_id', $user->id);
        } else {
            $query->where('client_id', $user->id);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(StoreTrainerWorkoutPlanRequest $request): JsonResponse
    {
        $user = $request->user();
        $clientId = (int) $request->validated('client_id');

        if (! $user->isAdmin()) {
            abort_unless($user->hasRole(User::ROLE_TRAINER), 403);
            abort_unless($this->access->isAssigned($user->id, $clientId, User::ROLE_TRAINER), 403);
        }

        $plan = TrainerWorkoutPlan::query()->create([
            ...$request->validated(),
            'trainer_id' => $user->id,
        ]);

        return response()->json(['ok' => true, 'workout_plan' => $plan], 201);
    }

    public function update(StoreTrainerWorkoutPlanRequest $request, TrainerWorkoutPlan $trainerWorkoutPlan): JsonResponse
    {
        $this->authorize('update', $trainerWorkoutPlan);
        $trainerWorkoutPlan->update($request->validated());

        return response()->json(['ok' => true, 'workout_plan' => $trainerWorkoutPlan]);
    }
}
