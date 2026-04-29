<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminBulkUpdateUsersRequest;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Models\Ai\AiConversation;
use App\Models\Ai\AiPlan;
use App\Models\Ai\AiRequest;
use App\Models\Appointment;
use App\Models\Measurement;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Services\AdminActionLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 20), 100));
        $search = trim((string) $request->query('search', ''));
        $role = trim((string) $request->query('role', ''));
        $status = trim((string) $request->query('status', ''));
        $includeDeleted = $request->boolean('include_deleted');
        $verifiedFilter = null;
        if ($request->has('verified') && trim((string) $request->query('verified')) !== '') {
            $verifiedFilter = filter_var(
                $request->query('verified'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            );
        }

        $users = User::query()
            ->when($includeDeleted, fn ($query) => $query->withTrashed())
            ->withCount([
                'mealEntries',
                'mealLogs',
                'workoutLogs',
                'notificationsReceived',
                'aiConversations',
                'appointmentsAsClient',
                'appointmentsAsProfessional',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($subQuery) use ($like) {
                    $subQuery
                        ->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('username', 'like', $like)
                        ->orWhere('first_name', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('city', 'like', $like);
                });
            })
            ->when($role !== '', fn ($query) => $query->where('role', $role))
            ->when($status !== '', fn ($query) => $query->where('status', 'like', '%'.$status.'%'))
            ->when($verifiedFilter !== null, fn ($query) => $query->where('verified', $verifiedFilter))
            ->latest('id')
            ->paginate($perPage);

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load([
            'prefs',
            'latestProfessionalVerification.reviewer:id,first_name,last_name,email',
        ])->loadCount([
            'mealEntries',
            'mealLogs',
            'workoutLogs',
            'measurements',
            'notificationsReceived',
            'aiPlans',
            'aiConversations',
            'appointmentsAsClient',
            'appointmentsAsProfessional',
            'clientAssignments',
            'professionalAssignments',
            'dietPlansForClient',
            'trainerWorkoutPlansForClient',
        ]);

        $payload = $this->detailPayload($user);

        return response()->json($payload);
    }

    public function update(AdminUpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();
        $before = $this->snapshot($user->load('prefs'));

        $prefs = Arr::pull($validated, 'prefs', null);
        $emailVerified = Arr::pull($validated, 'email_verified');
        $emailVerifiedAt = null;
        Arr::forget($validated, 'password_confirmation');

        if ($emailVerified !== null) {
            $emailVerifiedAt = $emailVerified
                ? ($user->email_verified_at ?? now())
                : null;
        }

        if (
            ! array_key_exists('name', $validated)
            && (
                array_key_exists('first_name', $validated)
                || array_key_exists('last_name', $validated)
                || array_key_exists('email', $validated)
            )
        ) {
            $validated['name'] = $this->buildDisplayName(
                $validated['first_name'] ?? $user->first_name,
                $validated['last_name'] ?? $user->last_name,
                $validated['email'] ?? $user->email,
            );
        }

        DB::transaction(function () use ($user, $validated, $prefs, $emailVerified, $emailVerifiedAt) {
            if ($emailVerified !== null) {
                $user->email_verified_at = $emailVerifiedAt;
            }

            $user->fill($validated)->save();

            if (is_array($prefs)) {
                $user->prefs()->updateOrCreate(
                    ['user_id' => $user->id],
                    $prefs,
                );
            }
        });

        $user->refresh()->load([
            'prefs',
            'latestProfessionalVerification.reviewer:id,first_name,last_name,email',
        ])->loadCount([
            'mealEntries',
            'mealLogs',
            'workoutLogs',
            'measurements',
            'notificationsReceived',
            'aiPlans',
            'aiConversations',
            'appointmentsAsClient',
            'appointmentsAsProfessional',
            'clientAssignments',
            'professionalAssignments',
            'dietPlansForClient',
            'trainerWorkoutPlansForClient',
        ]);

        $this->logger->log($request->user()->id, 'admin.user.update', $user, [
            'before' => $before,
            'after' => $this->snapshot($user),
        ]);

        return response()->json([
            'ok' => true,
            ...$this->detailPayload($user),
        ]);
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
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $user, $data) {
            $user->delete();

            $this->logger->log($request->user()->id, 'admin.user.delete', $user, [
                'reason' => $data['reason'] ?? null,
            ]);
        });

        return response()->json(['ok' => true]);
    }

    public function bulkUpdate(AdminBulkUpdateUsersRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $userIds = collect($validated['user_ids'])->unique()->values();
        $action = $validated['action'];
        $status = $validated['status'] ?? null;
        $actorId = $request->user()->id;

        $users = User::query()
            ->whereIn('id', $userIds->all())
            ->get()
            ->keyBy('id');

        $results = collect();
        $updatedCount = 0;

        DB::transaction(function () use (
            $actorId,
            $action,
            $status,
            $userIds,
            $users,
            &$results,
            &$updatedCount,
        ): void {
            foreach ($userIds as $userId) {
                /** @var User|null $user */
                $user = $users->get($userId);

                if (! $user) {
                    $results->push([
                        'user_id' => $userId,
                        'updated' => false,
                        'reason' => 'missing_user',
                    ]);

                    continue;
                }

                $before = [
                    'verified' => (bool) $user->verified,
                    'status' => $user->status,
                ];

                if ($action === 'verify') {
                    $user->verified = true;
                } elseif ($action === 'unverify') {
                    $user->verified = false;
                } else {
                    $user->status = $status;
                }

                $after = [
                    'verified' => (bool) $user->verified,
                    'status' => $user->status,
                ];

                if ($before === $after) {
                    $results->push([
                        'user_id' => $user->id,
                        'updated' => false,
                        'reason' => 'no_change',
                        'before' => $before,
                        'after' => $after,
                    ]);

                    continue;
                }

                $user->save();
                $updatedCount++;

                $this->logger->log($actorId, 'admin.user.bulk_update_item', $user, [
                    'action' => $action,
                    'before' => $before,
                    'after' => $after,
                ]);

                $results->push([
                    'user_id' => $user->id,
                    'updated' => true,
                    'before' => $before,
                    'after' => $after,
                ]);
            }

            $this->logger->log($actorId, 'admin.users.bulk_update', null, [
                'action' => $action,
                'status' => $status,
                'user_ids' => $userIds->all(),
                'updated_count' => $updatedCount,
                'skipped_count' => $results->where('updated', false)->count(),
            ]);
        });

        return response()->json([
            'ok' => true,
            'action' => $action,
            'status' => $status,
            'summary' => [
                'requested_count' => $userIds->count(),
                'updated_count' => $updatedCount,
                'skipped_count' => $results->where('updated', false)->count(),
            ],
            'results' => $results->values(),
        ]);
    }

    private function detailPayload(User $user): array
    {
        $appointments = Appointment::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('client_id', $user->id)
                    ->orWhere('professional_id', $user->id);
            })
            ->with([
                'client:id,first_name,last_name,email',
                'professional:id,first_name,last_name,email,role',
            ])
            ->latest('scheduled_at')
            ->limit(10)
            ->get();

        $assignments = ProfessionalClientAssignment::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('client_id', $user->id)
                    ->orWhere('professional_id', $user->id);
            })
            ->with([
                'client:id,first_name,last_name,email',
                'professional:id,first_name,last_name,email,role',
                'assignedBy:id,first_name,last_name,email',
            ])
            ->latest('id')
            ->limit(10)
            ->get();

        $measurements = Measurement::query()
            ->where('user_id', $user->id)
            ->latest('measured_at')
            ->limit(10)
            ->get();

        $conversations = AiConversation::query()
            ->where('user_id', $user->id)
            ->withCount('messages')
            ->latest('last_message_at')
            ->limit(10)
            ->get();

        $plans = AiPlan::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get();

        $measurementRows = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->orderBy('measured_at')
            ->get(['measured_at', 'weight_kg']);

        $plannerFeedback = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('output_json')
            ->latest('id')
            ->limit(10)
            ->get(['id', 'created_at', 'provider', 'model', 'output_json'])
            ->map(function (AiRequest $request) use ($measurementRows): ?array {
                $output = is_array($request->output_json) ? $request->output_json : [];
                $prediction = is_array($output['progress_prediction'] ?? null)
                    ? $output['progress_prediction']
                    : null;

                if (! is_array($prediction)) {
                    return null;
                }

                $feedback = is_array($prediction['feedback_adjustment'] ?? null)
                    ? $prediction['feedback_adjustment']
                    : [];

                $horizonDays = $this->normalizePlanHorizonDays(
                    (int) ($prediction['horizon_days'] ?? 14)
                );
                $weeks = max(1.0, $horizonDays / 7.0);
                $generatedAt = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
                $periodEnd = $generatedAt->addDays(max(1, $horizonDays) - 1);

                $baselineWeight = $this->toFloatOrNull($prediction['baseline_weight_kg'] ?? null)
                    ?? $this->weightOnOrBeforeFromRows($measurementRows, $generatedAt);

                $baseWeeklyRate = $this->toFloatOrNull($feedback['base_weekly_weight_change_kg'] ?? null);
                $adjustedWeeklyRate = $this->toFloatOrNull($feedback['adjusted_weekly_weight_change_kg'] ?? null);
                $lastError = $this->toFloatOrNull($feedback['last_prediction_error_kg_per_week'] ?? null);

                $projectedAfter = $this->toFloatOrNull($prediction['projected_body_weight_kg'] ?? null);
                if ($projectedAfter === null && $baselineWeight !== null) {
                    $expectedChange = $this->toFloatOrNull($prediction['expected_weight_change_kg'] ?? null);
                    if ($expectedChange !== null) {
                        $projectedAfter = $baselineWeight + $expectedChange;
                    } elseif ($adjustedWeeklyRate !== null) {
                        $projectedAfter = $baselineWeight + ($adjustedWeeklyRate * $weeks);
                    }
                }

                $projectedBefore = null;
                if ($baselineWeight !== null && $baseWeeklyRate !== null) {
                    $projectedBefore = $baselineWeight + ($baseWeeklyRate * $weeks);
                }

                $actualWeightMatch = $this->weightNearTargetDateFromRows($measurementRows, $periodEnd);
                $feedbackApplied = $projectedBefore !== null
                    && $projectedAfter !== null
                    && abs($projectedAfter - $projectedBefore) >= 0.01;

                return [
                    'ai_request_id' => (int) $request->id,
                    'generated_at' => optional($request->created_at)?->toISOString(),
                    'provider' => $request->provider,
                    'model' => $request->model,
                    'horizon_days' => $horizonDays,
                    'feedback_period_start_date' => $generatedAt->toDateString(),
                    'feedback_period_end_date' => $periodEnd->toDateString(),
                    'baseline_weight_kg' => $baselineWeight !== null ? round($baselineWeight, 3) : null,
                    'base_weekly_weight_change_kg' => $baseWeeklyRate !== null ? round($baseWeeklyRate, 3) : null,
                    'adjusted_weekly_weight_change_kg' => $adjustedWeeklyRate !== null ? round($adjustedWeeklyRate, 3) : null,
                    'projected_before_feedback_kg' => $projectedBefore !== null ? round($projectedBefore, 3) : null,
                    'projected_after_feedback_kg' => $projectedAfter !== null ? round($projectedAfter, 3) : null,
                    'last_prediction_error_kg_per_week' => $lastError !== null ? round($lastError, 3) : null,
                    'feedback_applied' => $feedbackApplied,
                    'feedback_notes' => $feedback['notes'] ?? null,
                    'confidence' => $prediction['confidence'] ?? null,
                    'inference_source' => $prediction['inference_source'] ?? null,
                    'actual_weight_kg' => isset($actualWeightMatch['weight_kg']) ? round((float) $actualWeightMatch['weight_kg'], 3) : null,
                    'actual_weight_date' => $actualWeightMatch['measured_at'] ?? null,
                ];
            })
            ->filter()
            ->values();

        $planDiffs = $this->buildRecentPlanDiffs($user);

        return [
            'user' => $this->serializeUser($user),
            'prefs' => $this->serializePrefs($user),
            'summary' => [
                'meal_entries' => (int) ($user->meal_entries_count ?? 0),
                'meal_logs' => (int) ($user->meal_logs_count ?? 0),
                'workout_logs' => (int) ($user->workout_logs_count ?? 0),
                'measurements' => (int) ($user->measurements_count ?? 0),
                'notifications' => (int) ($user->notifications_received_count ?? 0),
                'ai_plans' => (int) ($user->ai_plans_count ?? 0),
                'ai_conversations' => (int) ($user->ai_conversations_count ?? 0),
                'appointments' => (int) (($user->appointments_as_client_count ?? 0) + ($user->appointments_as_professional_count ?? 0)),
                'assignments' => (int) (($user->client_assignments_count ?? 0) + ($user->professional_assignments_count ?? 0)),
                'diet_plans' => (int) ($user->diet_plans_for_client_count ?? 0),
                'trainer_workout_plans' => (int) ($user->trainer_workout_plans_for_client_count ?? 0),
            ],
            'verification' => $user->latestProfessionalVerification,
            'recent' => [
                'notifications' => $user->notificationsReceived()
                    ->with('creator:id,first_name,last_name,email')
                    ->latest('created_at')
                    ->limit(10)
                    ->get(),
                'meal_entries' => $user->mealEntries()
                    ->with('food:id,name')
                    ->latest('id')
                    ->limit(10)
                    ->get(),
                'meal_logs' => $user->mealLogs()
                    ->with('items')
                    ->latest('id')
                    ->limit(10)
                    ->get(),
                'workout_logs' => $user->workoutLogs()
                    ->with('sets')
                    ->latest('performed_at')
                    ->limit(10)
                    ->get(),
                'measurements' => $measurements,
                'appointments' => $appointments,
                'assignments' => $assignments,
                'ai_plans' => $plans,
                'ai_conversations' => $conversations,
                'planner_feedback' => $plannerFeedback,
                'plan_diffs' => $planDiffs,
            ],
        ];
    }

    private function buildRecentPlanDiffs(User $user): array
    {
        $plansByType = AiPlan::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['diet', 'workout'])
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->get(['id', 'type', 'version', 'ai_request_id', 'generation_id', 'plan_json', 'created_at'])
            ->groupBy('type');

        $dietRows = $plansByType->has('diet')
            ? $plansByType->get('diet')->take(2)->values()->all()
            : [];
        $workoutRows = $plansByType->has('workout')
            ? $plansByType->get('workout')->take(2)->values()->all()
            : [];

        return [
            'diet' => $this->summarizeDietPlanDiff($dietRows),
            'workout' => $this->summarizeWorkoutPlanDiff($workoutRows),
        ];
    }

    private function summarizeDietPlanDiff(array $rows): ?array
    {
        /** @var AiPlan|null $current */
        $current = $rows[0] ?? null;
        /** @var AiPlan|null $previous */
        $previous = $rows[1] ?? null;

        if (! $current instanceof AiPlan) {
            return null;
        }

        $currentPlan = is_array($current->plan_json) ? $current->plan_json : [];
        $previousPlan = $previous instanceof AiPlan && is_array($previous->plan_json)
            ? $previous->plan_json
            : null;

        $currentMealMap = $this->dietMealSignatureMap($currentPlan);
        $previousMealMap = is_array($previousPlan) ? $this->dietMealSignatureMap($previousPlan) : [];

        $currentFoodMap = $this->dietFoodSignatureMap($currentPlan);
        $previousFoodMap = is_array($previousPlan) ? $this->dietFoodSignatureMap($previousPlan) : [];

        $currentTargets = is_array($currentPlan['daily_targets'] ?? null) ? $currentPlan['daily_targets'] : [];
        $previousTargets = is_array($previousPlan) && is_array($previousPlan['daily_targets'] ?? null)
            ? $previousPlan['daily_targets']
            : [];

        $changedTargetKeys = [];
        foreach (array_unique(array_merge(array_keys($currentTargets), array_keys($previousTargets))) as $key) {
            if ((string) $key === '') {
                continue;
            }

            $currentValue = $currentTargets[$key] ?? null;
            $previousValue = $previousTargets[$key] ?? null;

            if ($currentValue !== $previousValue) {
                $changedTargetKeys[] = (string) $key;
            }
        }

        sort($changedTargetKeys);

        $changed = $previousPlan !== null
            ? $this->hashPlanJson($currentPlan) !== $this->hashPlanJson($previousPlan)
            : false;

        return [
            'type' => 'diet',
            'has_current' => true,
            'has_previous' => $previousPlan !== null,
            'changed' => $changed,
            'current_version' => (int) $current->version,
            'previous_version' => $previous?->version !== null ? (int) $previous->version : null,
            'current_ai_request_id' => $current->ai_request_id !== null ? (int) $current->ai_request_id : null,
            'previous_ai_request_id' => $previous?->ai_request_id !== null ? (int) $previous->ai_request_id : null,
            'current_generated_at' => optional($current->created_at)?->toISOString(),
            'previous_generated_at' => optional($previous?->created_at)?->toISOString(),
            'current_metrics' => $this->dietPlanMetrics($currentPlan),
            'previous_metrics' => $previousPlan !== null ? $this->dietPlanMetrics($previousPlan) : null,
            'changes' => [
                'added_meals' => $this->addedLabels($currentMealMap, $previousMealMap),
                'removed_meals' => $this->addedLabels($previousMealMap, $currentMealMap),
                'added_food_items' => $this->addedLabels($currentFoodMap, $previousFoodMap),
                'removed_food_items' => $this->addedLabels($previousFoodMap, $currentFoodMap),
                'changed_target_keys' => $changedTargetKeys,
            ],
        ];
    }

    private function summarizeWorkoutPlanDiff(array $rows): ?array
    {
        /** @var AiPlan|null $current */
        $current = $rows[0] ?? null;
        /** @var AiPlan|null $previous */
        $previous = $rows[1] ?? null;

        if (! $current instanceof AiPlan) {
            return null;
        }

        $currentPlan = is_array($current->plan_json) ? $current->plan_json : [];
        $previousPlan = $previous instanceof AiPlan && is_array($previous->plan_json)
            ? $previous->plan_json
            : null;

        $currentExerciseMap = $this->workoutExerciseSignatureMap($currentPlan);
        $previousExerciseMap = is_array($previousPlan) ? $this->workoutExerciseSignatureMap($previousPlan) : [];

        $currentFocusMap = $this->workoutFocusSignatureMap($currentPlan);
        $previousFocusMap = is_array($previousPlan) ? $this->workoutFocusSignatureMap($previousPlan) : [];

        $currentProgressionRules = $this->stringSignatureMap($currentPlan['progression_rules'] ?? []);
        $previousProgressionRules = is_array($previousPlan)
            ? $this->stringSignatureMap($previousPlan['progression_rules'] ?? [])
            : [];

        $currentRecoveryRules = $this->stringSignatureMap($currentPlan['recovery_rules'] ?? []);
        $previousRecoveryRules = is_array($previousPlan)
            ? $this->stringSignatureMap($previousPlan['recovery_rules'] ?? [])
            : [];

        $changed = $previousPlan !== null
            ? $this->hashPlanJson($currentPlan) !== $this->hashPlanJson($previousPlan)
            : false;

        return [
            'type' => 'workout',
            'has_current' => true,
            'has_previous' => $previousPlan !== null,
            'changed' => $changed,
            'current_version' => (int) $current->version,
            'previous_version' => $previous?->version !== null ? (int) $previous->version : null,
            'current_ai_request_id' => $current->ai_request_id !== null ? (int) $current->ai_request_id : null,
            'previous_ai_request_id' => $previous?->ai_request_id !== null ? (int) $previous->ai_request_id : null,
            'current_generated_at' => optional($current->created_at)?->toISOString(),
            'previous_generated_at' => optional($previous?->created_at)?->toISOString(),
            'current_metrics' => $this->workoutPlanMetrics($currentPlan),
            'previous_metrics' => $previousPlan !== null ? $this->workoutPlanMetrics($previousPlan) : null,
            'changes' => [
                'added_exercises' => $this->addedLabels($currentExerciseMap, $previousExerciseMap),
                'removed_exercises' => $this->addedLabels($previousExerciseMap, $currentExerciseMap),
                'added_focus_areas' => $this->addedLabels($currentFocusMap, $previousFocusMap),
                'removed_focus_areas' => $this->addedLabels($previousFocusMap, $currentFocusMap),
                'added_progression_rules' => $this->addedLabels($currentProgressionRules, $previousProgressionRules),
                'removed_progression_rules' => $this->addedLabels($previousProgressionRules, $currentProgressionRules),
                'added_recovery_rules' => $this->addedLabels($currentRecoveryRules, $previousRecoveryRules),
                'removed_recovery_rules' => $this->addedLabels($previousRecoveryRules, $currentRecoveryRules),
            ],
        ];
    }

    private function dietPlanMetrics(array $plan): array
    {
        $days = is_array($plan['days'] ?? null) ? $plan['days'] : [];
        $mealCount = 0;
        $itemCount = 0;

        foreach ($days as $day) {
            $meals = is_array($day['meals'] ?? null) ? $day['meals'] : [];
            $mealCount += count($meals);
            foreach ($meals as $meal) {
                $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
                $itemCount += count($items);
            }
        }

        return [
            'days' => count($days),
            'meals' => $mealCount,
            'items' => $itemCount,
        ];
    }

    private function workoutPlanMetrics(array $plan): array
    {
        $schedule = is_array($plan['weekly_schedule'] ?? null) ? $plan['weekly_schedule'] : [];
        $exerciseCount = 0;

        foreach ($schedule as $day) {
            $exerciseCount += count(is_array($day['exercises'] ?? null) ? $day['exercises'] : []);
        }

        return [
            'days' => count($schedule),
            'exercises' => $exerciseCount,
        ];
    }

    private function dietMealSignatureMap(array $plan): array
    {
        $days = is_array($plan['days'] ?? null) ? $plan['days'] : [];
        $map = [];

        foreach ($days as $fallbackDayIndex => $day) {
            $dayIndex = max(1, (int) ($day['day_index'] ?? ($fallbackDayIndex + 1)));
            $meals = is_array($day['meals'] ?? null) ? $day['meals'] : [];

            foreach ($meals as $fallbackMealIndex => $meal) {
                $mealCode = trim((string) ($meal['meal_code'] ?? 'meal-'.($fallbackMealIndex + 1)));
                $title = trim((string) ($meal['title'] ?? ''));
                $key = strtolower($dayIndex.'|'.$mealCode.'|'.$title);
                $label = 'Day '.$dayIndex.': '.($title !== '' ? $title : $mealCode);
                $map[$key] = $label;
            }
        }

        ksort($map);

        return $map;
    }

    private function dietFoodSignatureMap(array $plan): array
    {
        $days = is_array($plan['days'] ?? null) ? $plan['days'] : [];
        $map = [];

        foreach ($days as $day) {
            $meals = is_array($day['meals'] ?? null) ? $day['meals'] : [];
            foreach ($meals as $meal) {
                $items = is_array($meal['items'] ?? null) ? $meal['items'] : [];
                foreach ($items as $item) {
                    $name = trim((string) ($item['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }

                    $key = strtolower($name);
                    $map[$key] = $name;
                }
            }
        }

        ksort($map);

        return $map;
    }

    private function workoutExerciseSignatureMap(array $plan): array
    {
        $schedule = is_array($plan['weekly_schedule'] ?? null) ? $plan['weekly_schedule'] : [];
        $map = [];

        foreach ($schedule as $fallbackDayIndex => $day) {
            $dayIndex = max(1, (int) ($day['day_index'] ?? ($fallbackDayIndex + 1)));
            $exercises = is_array($day['exercises'] ?? null) ? $day['exercises'] : [];

            foreach ($exercises as $exercise) {
                $name = trim((string) ($exercise['name'] ?? ''));
                if ($name === '') {
                    continue;
                }

                $key = strtolower($dayIndex.'|'.$name);
                $map[$key] = 'Day '.$dayIndex.': '.$name;
            }
        }

        ksort($map);

        return $map;
    }

    private function workoutFocusSignatureMap(array $plan): array
    {
        $schedule = is_array($plan['weekly_schedule'] ?? null) ? $plan['weekly_schedule'] : [];
        $map = [];

        foreach ($schedule as $day) {
            $focus = trim((string) ($day['focus'] ?? ''));
            if ($focus === '') {
                continue;
            }

            $key = strtolower($focus);
            $map[$key] = $focus;
        }

        ksort($map);

        return $map;
    }

    private function stringSignatureMap(mixed $values): array
    {
        if (! is_array($values)) {
            return [];
        }

        $map = [];
        foreach ($values as $value) {
            $line = trim((string) $value);
            if ($line === '') {
                continue;
            }

            $key = strtolower($line);
            $map[$key] = $line;
        }

        ksort($map);

        return $map;
    }

    private function addedLabels(array $currentMap, array $baselineMap): array
    {
        $added = [];
        foreach ($currentMap as $key => $label) {
            if (array_key_exists($key, $baselineMap)) {
                continue;
            }

            $added[] = $label;
        }

        return array_values(array_slice($added, 0, 20));
    }

    private function hashPlanJson(array $plan): string
    {
        $encoded = json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);

        return sha1($encoded !== false ? $encoded : serialize($plan));
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

    private function toFloatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function weightOnOrBeforeFromRows(iterable $rows, CarbonImmutable $targetDate): ?float
    {
        $best = null;
        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            if ($rowDate->greaterThan($targetDate)) {
                break;
            }
            $best = (float) $row->weight_kg;
        }

        return $best;
    }

    /**
     * @return array{weight_kg:float,measured_at:string}|null
     */
    private function weightNearTargetDateFromRows(iterable $rows, CarbonImmutable $targetDate): ?array
    {
        $targetTs = $targetDate->startOfDay()->getTimestamp();
        $best = null;
        $bestDistance = null;

        foreach ($rows as $row) {
            $rowDate = CarbonImmutable::parse((string) $row->measured_at)->startOfDay();
            $deltaDays = (int) floor(($rowDate->getTimestamp() - $targetTs) / 86400);

            if ($deltaDays < -7 || $deltaDays > 10) {
                continue;
            }

            $distance = abs($deltaDays);
            if ($bestDistance === null || $distance < $bestDistance) {
                $bestDistance = $distance;
                $best = [
                    'weight_kg' => (float) $row->weight_kg,
                    'measured_at' => $rowDate->toDateString(),
                ];
            }
        }

        return $best;
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'display_name' => $user->display_name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'verified' => (bool) $user->verified,
            'status' => $user->status,
            'gender' => $user->gender,
            'age' => $user->age,
            'height_cm' => $user->height_cm,
            'weight_kg' => $user->weight_kg,
            'has_medical_history' => (bool) $user->has_medical_history,
            'medical_history' => $user->medical_history,
            'dietary_goal' => $user->dietary_goal,
            'fitness_goal' => $user->fitness_goal,
            'diet_name' => $user->diet_name,
            'allergies' => $user->allergies ?? [],
            'activity_level' => $user->activity_level,
            'workout_days_per_week' => $user->workout_days_per_week,
            'workout_location' => $user->workout_location,
            'tried_diet_before' => $user->tried_diet_before,
            'diet_failure_reasons' => $user->diet_failure_reasons ?? [],
            'diet_failure_other' => $user->diet_failure_other,
            'city' => $user->city,
            'contact_display' => $user->contact_display,
            'professional_bio' => $user->professional_bio,
            'specialties' => $user->specialties ?? [],
            'availability_text' => $user->availability_text,
            'profile_lat' => $user->profile_lat,
            'profile_lng' => $user->profile_lng,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'deleted_at' => $user->deleted_at,
        ];
    }

    private function serializePrefs(User $user): array
    {
        $prefs = $user->prefs;

        return [
            'units' => $prefs?->units ?? 'metric',
            'theme' => $prefs?->theme ?? 'system',
            'home_gym' => $prefs?->home_gym,
            'is_public' => (bool) ($prefs?->is_public ?? false),
            'bmr_kcal' => $prefs?->bmr_kcal,
            'tdee_kcal' => $prefs?->tdee_kcal,
            'activity_factor' => $prefs?->activity_factor,
            'daily_goal_calories' => $prefs?->daily_goal_calories,
            'daily_goal_protein_g' => $prefs?->daily_goal_protein_g,
            'daily_goal_carbs_g' => $prefs?->daily_goal_carbs_g,
            'daily_goal_fat_g' => $prefs?->daily_goal_fat_g,
            'water_cups_per_day' => $prefs?->water_cups_per_day,
            'workout_days_target' => $prefs?->workout_days_target,
            'notifications' => $prefs?->notifications ?? [],
            'settings' => $prefs?->settings ?? [],
            'created_at' => $prefs?->created_at,
            'updated_at' => $prefs?->updated_at,
        ];
    }

    private function snapshot(User $user): array
    {
        return [
            ...$this->serializeUser($user),
            'prefs' => $this->serializePrefs($user),
        ];
    }

    private function buildDisplayName(?string $firstName, ?string $lastName, ?string $email): string
    {
        $fullName = trim(implode(' ', array_filter([
            $firstName ? trim($firstName) : null,
            $lastName ? trim($lastName) : null,
        ])));

        if ($fullName !== '') {
            return $fullName;
        }

        return $email ? (strtok($email, '@') ?: 'User') : 'User';
    }
}
