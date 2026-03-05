<?php

namespace App\Http\Controllers\Professional;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainerProgressNoteRequest;
use App\Models\TrainerProgressNote;
use App\Models\User;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainerProgressNoteController extends Controller
{
    public function __construct(private readonly ProfessionalAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = TrainerProgressNote::query()->with(['client', 'trainer'])->latest('recorded_on');

        if ($user->isAdmin()) {
            // no-op
        } elseif ($user->hasRole(User::ROLE_TRAINER)) {
            $query->where('trainer_id', $user->id);
        } else {
            $query->where('client_id', $user->id);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function store(StoreTrainerProgressNoteRequest $request): JsonResponse
    {
        $user = $request->user();
        $clientId = (int) $request->validated('client_id');

        if (! $user->isAdmin()) {
            abort_unless($user->hasRole(User::ROLE_TRAINER), 403);
            abort_unless($this->access->isAssigned($user->id, $clientId, User::ROLE_TRAINER), 403);
        }

        $note = TrainerProgressNote::query()->create([
            ...$request->validated(),
            'trainer_id' => $user->id,
        ]);

        return response()->json(['ok' => true, 'progress_note' => $note], 201);
    }
}
