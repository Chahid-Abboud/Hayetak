<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Concerns\ReleasesSessionLock;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\StorePlanRequest;
use App\Jobs\Ai\GeneratePlansForUser;
use App\Services\Ai\PlannerService;
use App\Services\Ai\Presentation\UserFacingAiPayloadSanitizer;
use App\Services\Ai\Validation\PlannerValidationException;
use App\Services\AppNotificationService;
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
        } catch (Throwable $e) {
            return $this->failedGenerationResponse($e);
        }

        return response()->json($result, 201);
    }

    /**
     * Generate in the background for normal environments, but keep local QA synchronous.
     */
    public function generate(
        Request $request,
        PlannerService $planner,
        UserFacingAiPayloadSanitizer $sanitizer,
        AppNotificationService $notifications
    ): JsonResponse {
        if (function_exists('set_time_limit')) {
            @set_time_limit((int) config('ai.planner.request_timeout_seconds', 300));
        }

        $user = $request->user();
        $days = $this->normalizePlanHorizonDays((int) $request->input(
            'plan_horizon_days',
            $request->input('days', (int) config('ai.planner.default_horizon_days', 14))
        ));
        $regenerate = $request->boolean('regenerate', true);
        $reason = (string) $request->input('reason', 'manual_background_generation');
        $generateDiet = $request->boolean('generate_diet', true);
        $generateWorkout = $request->boolean('generate_workout', true);

        $this->releaseSessionLock($request);

        if ($this->shouldHandleSynchronously()) {
            try {
                $result = $planner->generate($user, [
                    'regenerate' => $regenerate,
                    'reason' => $reason,
                    'created_by' => $user->id,
                    'plan_horizon_days' => $days,
                    'generate_diet' => $generateDiet,
                    'generate_workout' => $generateWorkout,
                ]);
                $result = $sanitizer->sanitizePlannerResponse($result, false);

                $notifications->planGenerated(
                    user: $user,
                    dietGenerated: $generateDiet,
                    workoutGenerated: $generateWorkout,
                    days: $days,
                );

                return response()->json([
                    'ok' => true,
                    'status' => 'completed',
                    'message' => 'Plan generation finished.',
                    'days' => $days,
                    'result' => $result,
                ], 201);
            } catch (Throwable $e) {
                return $this->failedGenerationResponse($e);
            }
        }

        GeneratePlansForUser::dispatch(
            userId: $user->id,
            days: $days,
            regenerate: $regenerate,
            reason: $reason,
            generateDiet: $generateDiet,
            generateWorkout: $generateWorkout,
        );

        return response()->json([
            'ok' => true,
            'status' => 'queued',
            'message' => 'Plan generation started. You can keep using Hayetak while we prepare it.',
            'days' => $days,
        ], 202);
    }

    private function shouldHandleSynchronously(): bool
    {
        return app()->runningUnitTests()
            || config('queue.default') === 'sync';
    }

    private function normalizePlanHorizonDays(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    private function failedGenerationResponse(Throwable $e): JsonResponse
    {
        if ($e instanceof PlannerValidationException) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        report($e);

        $message = trim((string) $e->getMessage());
        $lowerMessage = strtolower($message);
        if (
            str_contains($lowerMessage, 'timed out')
            || str_contains($lowerMessage, 'curl error 28')
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
}
