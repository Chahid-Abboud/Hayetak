<?php

namespace App\Http\Controllers\Professional;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDietPlanRequest;
use App\Models\DietPlan;
use App\Models\User;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NutritionistDietPlanController extends Controller
{
    public function __construct(private readonly ProfessionalAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = DietPlan::query()->with(['client', 'nutritionist'])->latest('id');

        if ($user->isAdmin()) {
            // no-op
        } elseif ($user->hasRole(User::ROLE_NUTRITIONIST)) {
            $query->where('nutritionist_id', $user->id);
        } else {
            $query->where('client_id', $user->id);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(StoreDietPlanRequest $request): JsonResponse
    {
        $user = $request->user();
        $clientId = (int) $request->validated('client_id');

        if (! $user->isAdmin()) {
            abort_unless($user->hasRole(User::ROLE_NUTRITIONIST), 403);
            abort_unless($this->access->isAssigned($user->id, $clientId, User::ROLE_NUTRITIONIST), 403);
        }

        $plan = DietPlan::query()->create([
            ...$request->validated(),
            'nutritionist_id' => $user->isAdmin()
                ? (int) $request->input('nutritionist_id', $user->id)
                : $user->id,
        ]);

        return response()->json(['ok' => true, 'diet_plan' => $plan], 201);
    }

    public function update(StoreDietPlanRequest $request, DietPlan $dietPlan): JsonResponse
    {
        $this->authorize('update', $dietPlan);
        $dietPlan->update($request->validated());

        return response()->json(['ok' => true, 'diet_plan' => $dietPlan]);
    }
}
