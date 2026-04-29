<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Concerns\ReleasesSessionLock;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StorePlanRequest;
use App\Jobs\Ai\GeneratePlansForUser;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use App\Services\Ai\Validation\PlannerValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class PlanGenerationController extends Controller
{
    use ReleasesSessionLock;

    /**
     * Generate a diet/workout plan immediately, validate it, persist it, and return the user-safe payload.
     */
    public function store(
        StorePlanRequest $request,
        PlannerService $planner,
        UserFacingAiPayloadSanitizer $sanitizer
    ): JsonResponse {
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
            'generate_diet' => $request->generateDiet(),
            'generate_workout' => $request->generateWorkout(),
        ];

        $this->releaseSessionLock($request);

        try {
            $result = $planner->generate($user, $options);
            $result = $sanitizer->sanitizePlannerResponse($result, false);
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
                $message = 'Plan generation took longer than expected. Try again with a shorter cycle in a moment.';
            } else {
                $message = 'Could not generate a plan right now. Please try again shortly.';
            }

            return response()->json([
                'ok' => false,
                'message' => $message,
            ], 503);
        }

        return response()->json($result, 201);
    }

    /**
     * Dispatch background plan generation for the currently logged-in user.
     *
     * Useful for manual testing without re-registering or waiting on the HTTP request.
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
            reason: 'manual_background_generation',
            generateDiet: $request->boolean('generate_diet', true),
            generateWorkout: $request->boolean('generate_workout', true),
        );

        return response()->json([
            'ok' => true,
            'message' => 'Plan generation dispatched',
            'days' => $days,
        ]);
    }
}
