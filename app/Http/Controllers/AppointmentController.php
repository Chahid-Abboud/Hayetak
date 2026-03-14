<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\User;
use App\Services\AdminActionLogger;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly ProfessionalAccessService $access,
        private readonly AdminActionLogger $logger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Appointment::query()->with(['client', 'professional'])->latest('scheduled_at');

        if (! $user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('client_id', $user->id)->orWhere('professional_id', $user->id);
            });
        }

        return AppointmentResource::collection($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $actor = $request->user();
        $professional = User::query()->findOrFail((int) $request->validated('professional_id'));
        $clientId = $actor->hasRole(User::ROLE_CLIENT)
            ? $actor->id
            : (int) $request->validated('client_id');

        $client = User::query()->findOrFail($clientId);
        abort_unless($this->access->canInteract($professional, $client), 403);

        $appointment = Appointment::query()->create([
            'client_id' => $client->id,
            'professional_id' => $professional->id,
            'professional_role' => $request->validated('professional_role'),
            'scheduled_at' => $request->validated('scheduled_at'),
            'notes' => $request->validated('notes'),
            'status' => 'requested',
            'created_by' => $actor->id,
        ]);

        $this->logger->log($actor->id, 'appointment.create', $appointment, [
            'client_id' => $client->id,
            'professional_id' => $professional->id,
            'professional_role' => $appointment->professional_role,
            'status' => $appointment->status,
        ]);

        return response()->json([
            'ok' => true,
            'appointment' => new AppointmentResource($appointment->load(['client', 'professional'])),
        ], 201);
    }

    public function updateStatus(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $before = $appointment->only(['status', 'notes', 'scheduled_at']);
        $appointment->update($request->validated());
        $this->logger->log($request->user()->id, 'appointment.update_status', $appointment, [
            'before' => $before,
            'after' => $appointment->only(['status', 'notes', 'scheduled_at']),
        ]);

        return response()->json([
            'ok' => true,
            'appointment' => new AppointmentResource($appointment->load(['client', 'professional'])),
        ]);
    }
}
