<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ReleasesSessionLock;
use App\Http\Requests\Ai\StorePlanRequest;
use App\Jobs\GeneratePlansForUser;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Validation\PlannerValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class PlanGenerationController extends Controller
{
    use ReleasesSessionLock;

    public function store(StorePlanRequest $request, PlannerService $planner): JsonResponse
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit((int) config('ai.planner.request_timeout_seconds', 300));
        }

        $user = $request->user();
        $options = [
            'regenerate' => $request->boolean('regenerate', true),
            'reason' => $request->validated('reason'),
            'created_by' => $user->id,
            'profile_overrides' => $request->validated('profile', []),
            'persist_profile_overrides' => $request->boolean('persist_profile_overrides'),
            'plan_horizon_days' => $request->validated('plan_horizon_days')
                ?? (int) config('ai.planner.default_horizon_days', 14),
        ];

        $this->releaseSessionLock($request);

        try {
            $result = $planner->generate($user, $options);
        } catch (PlannerValidationException $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            $message = trim((string) $e->getMessage());
            $lowerMessage = strtolower($message);
            if (
                str_contains($lowerMessage, 'timed out')
                || str_contains($lowerMessage, 'cURL error 28')
                || str_contains($lowerMessage, 'maximum execution time')
            ) {
                $message = 'The planner model took too long to respond. Try a 14-day plan length and make sure Ollama is running.';
            }

            return response()->json([
                'ok' => false,
                'message' => $message !== '' ? $message : 'Could not generate a plan right now.',
            ], 503);
        }

        return response()->json($result, 201);
    }

    /**
     * Trigger plan generation for the currently logged-in user.
     * Useful for manual testing without re-registering.
     */
    public function generate(Request $request)
    {
        $user = $request->user();

        $days = (int) $request->input('days', 14);
        if ($days <= 14) {
            $days = 14;
        } elseif ($days <= 21) {
            $days = 21;
        } else {
            $days = 28;
        }

        GeneratePlansForUser::dispatch(
            userId: $user->id,
            days: $days,
            regenerate: true,
            reason: 'manual_background_generation'
        );

        return response()->json([
            'ok' => true,
            'message' => 'Plan generation dispatched',
            'days' => $days,
        ]);
    }
}
