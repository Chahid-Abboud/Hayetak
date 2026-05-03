<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAssignmentController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $role = (string) $request->query('role', User::ROLE_TRAINER);
        $search = trim((string) $request->query('search', ''));
        $city = trim((string) $request->query('city', ''));

        abort_unless(in_array($role, [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST], true), 422, 'Invalid role');

        $assignments = ProfessionalClientAssignment::query()
            ->with([
                'client:id,first_name,last_name,email,city,dietary_goal,fitness_goal,diet_name,status',
                'professional:id,first_name,last_name,email,role,city,specialties,verified,status',
                'assignedBy:id,first_name,last_name,email',
            ])
            ->latest('id')
            ->get();

        $roleAssignments = $assignments->where('professional_role', $role);
        $assignedClientIdsForRole = $roleAssignments->pluck('client_id')->unique();

        $clients = User::query()
            ->where('role', User::ROLE_CLIENT)
            ->with(['clientAssignments.professional:id,first_name,last_name,email,role,city,specialties,verified,status'])
            ->withCount(['mealEntries', 'workoutLogs', 'aiPlans'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('dietary_goal', 'like', "%{$search}%")
                        ->orWhere('fitness_goal', 'like', "%{$search}%");
                });
            })
            ->when($city !== '', fn ($query) => $query->where('city', $city))
            ->orderBy('id')
            ->limit(60)
            ->get();

        $professionals = User::query()
            ->where('role', $role)
            ->where('verified', true)
            ->withCount('professionalAssignments')
            ->orderBy('id')
            ->get();

        $cities = User::query()
            ->whereIn('role', [User::ROLE_CLIENT, User::ROLE_TRAINER, User::ROLE_NUTRITIONIST])
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->values();

        $serializedClients = $clients
            ->map(fn (User $client) => $this->serializeClient($client, $role))
            ->values();

        $serializedProfessionals = $professionals
            ->map(fn (User $professional) => $this->serializeProfessional($professional))
            ->values();

        return response()->json([
            'stats' => [
                'unassigned_users' => $serializedClients->where('assignment_state', 'unassigned')->count(),
                'active_assignments' => $assignments->count(),
                'reassignment_needs' => $serializedClients->where('assignment_state', 'reassignment')->count(),
                'over_capacity_professionals' => $serializedProfessionals->where('capacity_state', 'overloaded')->count(),
            ],
            'filters' => [
                'cities' => $cities,
            ],
            'clients' => $serializedClients,
            'professionals' => $serializedProfessionals,
            'assignments' => $assignments
                ->take(25)
                ->map(fn (ProfessionalClientAssignment $assignment) => $this->serializeAssignment($assignment))
                ->values(),
            'current_role_assignments' => $roleAssignments
                ->map(fn (ProfessionalClientAssignment $assignment) => $this->serializeAssignment($assignment))
                ->values(),
            'assigned_client_ids_for_role' => $assignedClientIdsForRole->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', 'exists:users,id'],
            'professional_id' => ['required', 'integer', 'exists:users,id'],
            'professional_role' => ['required', Rule::in([User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'replace_existing' => ['sometimes', 'boolean'],
        ]);

        $client = User::query()->findOrFail($data['client_id']);
        $professional = User::query()->findOrFail($data['professional_id']);

        abort_unless($client->hasRole(User::ROLE_CLIENT), 422, 'Selected user is not a client');
        abort_unless($professional->hasRole($data['professional_role']) && $professional->verified, 422, 'Selected professional is not available for this role');

        if ((bool) ($data['replace_existing'] ?? false)) {
            ProfessionalClientAssignment::query()
                ->where('client_id', $client->id)
                ->where('professional_role', $data['professional_role'])
                ->where('professional_id', '!=', $professional->id)
                ->delete();
        }

        $assignment = ProfessionalClientAssignment::query()->updateOrCreate(
            [
                'professional_id' => $professional->id,
                'client_id' => $client->id,
                'professional_role' => $data['professional_role'],
            ],
            [
                'assigned_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ],
        );

        $this->logger->log($request->user()->id, 'admin.assignment.save', $assignment, [
            'client_id' => $client->id,
            'professional_id' => $professional->id,
            'professional_role' => $data['professional_role'],
            'replace_existing' => (bool) ($data['replace_existing'] ?? false),
        ]);

        return response()->json([
            'ok' => true,
            'assignment' => $this->serializeAssignment($assignment->fresh(['client', 'professional', 'assignedBy'])),
        ], 201);
    }

    public function destroy(Request $request, ProfessionalClientAssignment $assignment): JsonResponse
    {
        $assignmentData = $this->serializeAssignment($assignment->load(['client', 'professional', 'assignedBy']));
        $assignment->delete();

        $this->logger->log($request->user()->id, 'admin.assignment.remove', null, $assignmentData);

        return response()->json(['ok' => true]);
    }

    private function serializeClient(User $client, string $role): array
    {
        $roleAssignments = $client->clientAssignments
            ->where('professional_role', $role)
            ->values();
        $hasRoleAssignment = $roleAssignments->isNotEmpty();
        $assignmentState = $hasRoleAssignment ? 'assigned' : 'unassigned';

        if ($hasRoleAssignment && $roleAssignments->contains(fn ($assignment) => ! $assignment->professional?->verified)) {
            $assignmentState = 'reassignment';
        }

        return [
            'id' => $client->id,
            'name' => $client->display_name,
            'email' => $client->email,
            'city' => $client->city,
            'status' => $client->status,
            'dietary_goal' => $client->dietary_goal,
            'fitness_goal' => $client->fitness_goal,
            'diet_name' => $client->diet_name,
            'activity' => [
                'meal_entries' => (int) ($client->meal_entries_count ?? 0),
                'workout_logs' => (int) ($client->workout_logs_count ?? 0),
                'plans' => (int) ($client->ai_plans_count ?? 0),
            ],
            'assignment_state' => $assignmentState,
            'current_assignments' => $client->clientAssignments
                ->map(fn (ProfessionalClientAssignment $assignment) => $this->serializeAssignment($assignment))
                ->values(),
        ];
    }

    private function serializeProfessional(User $professional): array
    {
        $load = (int) ($professional->professional_assignments_count ?? 0);

        return [
            'id' => $professional->id,
            'name' => $professional->display_name,
            'email' => $professional->email,
            'role' => $professional->role,
            'city' => $professional->city,
            'specialties' => $professional->specialties ?? [],
            'verified' => (bool) $professional->verified,
            'status' => $professional->status,
            'current_load' => $load,
            'capacity' => 12,
            'capacity_state' => $load >= 12 ? 'overloaded' : ($load >= 9 ? 'near_capacity' : 'available'),
        ];
    }

    private function serializeAssignment(ProfessionalClientAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'client_id' => $assignment->client_id,
            'professional_id' => $assignment->professional_id,
            'professional_role' => $assignment->professional_role,
            'notes' => $assignment->notes,
            'created_at' => optional($assignment->created_at)?->toISOString(),
            'updated_at' => optional($assignment->updated_at)?->toISOString(),
            'client' => $assignment->client ? [
                'id' => $assignment->client->id,
                'name' => $assignment->client->display_name,
                'email' => $assignment->client->email,
                'city' => $assignment->client->city,
            ] : null,
            'professional' => $assignment->professional ? [
                'id' => $assignment->professional->id,
                'name' => $assignment->professional->display_name,
                'email' => $assignment->professional->email,
                'role' => $assignment->professional->role,
                'city' => $assignment->professional->city,
                'specialties' => $assignment->professional->specialties ?? [],
                'verified' => (bool) $assignment->professional->verified,
                'status' => $assignment->professional->status,
            ] : null,
            'assigned_by' => $assignment->assignedBy ? [
                'id' => $assignment->assignedBy->id,
                'name' => $assignment->assignedBy->display_name,
                'email' => $assignment->assignedBy->email,
            ] : null,
        ];
    }
}
