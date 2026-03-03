<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->withCount(['mealEntries', 'workoutLogs'])
            ->orderBy('id')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $payload = [
            'user' => new UserResource($user),
            'meal_entries' => $user->mealEntries()->latest('id')->limit(100)->get(),
            'meal_logs' => $user->mealLogs()->with('items')->latest('id')->limit(50)->get(),
            'workout_logs' => $user->workoutLogs()->with('sets')->latest('performed_at')->limit(50)->get(),
        ];

        return response()->json($payload);
    }

    public function update(AdminUpdateUserRequest $request, User $user): JsonResponse
    {
        $before = $user->only(['role', 'verified', 'status', 'first_name', 'last_name']);
        $user->fill($request->validated())->save();

        $this->logger->log($request->user()->id, 'admin.user.update', $user, [
            'before' => $before,
            'after' => $user->only(['role', 'verified', 'status', 'first_name', 'last_name']),
        ]);

        return response()->json(['ok' => true, 'user' => new UserResource($user)]);
    }

    public function toggleVerification(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['verified' => ['required', 'boolean']]);
        $user->verified = (bool) $data['verified'];
        $user->save();

        $this->logger->log($request->user()->id, 'admin.user.verify', $user, [
            'verified' => $user->verified,
        ]);

        return response()->json(['ok' => true, 'verified' => $user->verified]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        DB::transaction(function () use ($request, $user) {
            $user->delete();

            $this->logger->log($request->user()->id, 'admin.user.delete', $user);
        });

        return response()->json(['ok' => true]);
    }
}

