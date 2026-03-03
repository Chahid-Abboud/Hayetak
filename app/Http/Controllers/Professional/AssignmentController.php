<?php

namespace App\Http\Controllers\Professional;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProfessionalAssignmentRequest;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = ProfessionalClientAssignment::query()->with(['professional', 'client']);

        if ($user->isAdmin()) {
            // no-op
        } elseif ($user->hasRole(User::ROLE_NUTRITIONIST, User::ROLE_TRAINER)) {
            $query->where('professional_id', $user->id);
        } else {
            $query->where('client_id', $user->id);
        }

        return response()->json($query->latest('id')->get());
    }

    public function store(StoreProfessionalAssignmentRequest $request): JsonResponse
    {
        $assignment = ProfessionalClientAssignment::query()->updateOrCreate(
            [
                'professional_id' => $request->validated('professional_id'),
                'client_id' => $request->validated('client_id'),
                'professional_role' => $request->validated('professional_role'),
            ],
            [
                'assigned_by' => $request->user()->id,
                'notes' => $request->validated('notes'),
            ]
        );

        $this->logger->log($request->user()->id, 'admin.assignment.upsert', $assignment, $assignment->toArray());

        return response()->json(['ok' => true, 'assignment' => $assignment], 201);
    }

    public function destroy(Request $request, ProfessionalClientAssignment $assignment): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);
        $assignmentData = $assignment->toArray();
        $assignment->delete();

        $this->logger->log($request->user()->id, 'admin.assignment.delete', null, $assignmentData);

        return response()->json(['ok' => true]);
    }
}

