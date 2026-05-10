<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\User;
use App\Services\AdminActionLogger;
use App\Services\AppNotificationService;
use App\Services\ProfessionalAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly ProfessionalAccessService $access,
        private readonly AdminActionLogger $logger,
        private readonly AppNotificationService $notifications,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $status = trim((string) $request->query('status', ''));
        $statusesFromArray = collect($request->query('statuses', []))
            ->filter(fn ($item) => is_string($item) && trim($item) !== '')
            ->map(fn ($item) => trim($item))
            ->values();
        $statusesFromCsv = collect(explode(',', (string) $request->query('statuses_csv', '')))
            ->map(fn ($item) => trim($item))
            ->filter()
            ->values();
        $allowedStatuses = ['requested', 'accepted', 'declined', 'completed', 'cancelled'];
        $statuses = $statusesFromArray
            ->merge($statusesFromCsv)
            ->merge($status !== '' ? [$status] : [])
            ->unique()
            ->filter(fn ($item) => in_array($item, $allowedStatuses, true))
            ->values();

        $summaryQuery = Appointment::query();
        $this->applyVisibilityScope($summaryQuery, $user);

        $statusSummary = [];
        foreach ($allowedStatuses as $summaryStatus) {
            $statusSummary[$summaryStatus] = (clone $summaryQuery)
                ->where('status', $summaryStatus)
                ->count();
        }

        $query = Appointment::query()
            ->with(['client', 'professional'])
            ->latest('scheduled_at');
        $this->applyVisibilityScope($query, $user);

        if ($statuses->isNotEmpty()) {
            $query->whereIn('status', $statuses->all());
        }

        $paginator = $query->paginate((int) $request->query('per_page', 20));

        return AppointmentResource::collection($paginator)->additional([
            'summary' => [
                'by_status' => $statusSummary,
                'upcoming' => (clone $summaryQuery)
                    ->where('scheduled_at', '>=', now())
                    ->whereIn('status', ['requested', 'accepted'])
                    ->count(),
                'past' => (clone $summaryQuery)
                    ->where('scheduled_at', '<', now())
                    ->count(),
            ],
            'filters' => [
                'status' => $statuses->all(),
            ],
        ]);
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

        $this->notifications->appointmentRequested(
            $client,
            $professional,
            (string) $appointment->scheduled_at,
            $appointment->notes,
        );

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

        $appointment->load(['client', 'professional']);
        $actor = $request->user();
        if ($appointment->client && $appointment->professional) {
            $this->notifications->appointmentStatusChanged(
                $actor,
                $appointment->client,
                $appointment->professional,
                (string) $appointment->status,
                (string) $appointment->scheduled_at,
            );
        }

        return response()->json([
            'ok' => true,
            'appointment' => new AppointmentResource($appointment->load(['client', 'professional'])),
        ]);
    }

    public function requestCheckup(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $actor = $request->user();
        $isValidRole = $actor->hasRole(User::ROLE_NUTRITIONIST, User::ROLE_TRAINER)
            && (int) $actor->id === (int) $appointment->professional_id;

        abort_unless($isValidRole || $actor->isAdmin(), 403);

        $notes = trim((string) $request->input('notes', ''));

        if ($appointment->client && $appointment->professional) {
            $this->notifications->checkupReminder(
                $appointment->professional,
                $appointment->client,
                $notes,
            );
        }

        $this->logger->log($actor->id, 'appointment.checkup_request', $appointment, [
            'notes' => $notes,
            'appointment_id' => $appointment->id,
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Check-up reminder sent to client.',
        ]);
    }

    private function applyVisibilityScope(Builder $query, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $query->where(function ($scope) use ($user) {
            $scope->where('client_id', $user->id)
                ->orWhere('professional_id', $user->id);
        });
    }
}
