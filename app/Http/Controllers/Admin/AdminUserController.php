<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminBulkUpdateUsersRequest;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Models\AiConversation;
use App\Models\AiPlan;
use App\Models\Appointment;
use App\Models\Measurement;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Services\AdminActionLogger;
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
        $verifiedFilter = filter_var(
            $request->query('verified'),
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE,
        );

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
        DB::transaction(function () use ($request, $user) {
            $user->delete();

            $this->logger->log($request->user()->id, 'admin.user.delete', $user);
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
            ],
        ];
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
