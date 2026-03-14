<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Measurement;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProgressController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        $rows = Measurement::query()
            ->with('user:id,email,first_name,last_name')
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->orderByDesc('measured_at')
            ->paginate((int) $request->query('per_page', 30));

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, false);
        $measurement = Measurement::query()->create($data);
        $this->logger->log($request->user()->id, 'admin.progress.create', $measurement, $data);

        return response()->json(['ok' => true, 'measurement' => $measurement], 201);
    }

    public function update(Request $request, Measurement $measurement): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        $before = $measurement->toArray();
        $measurement->update($data);
        $this->logger->log($request->user()->id, 'admin.progress.update', $measurement, ['before' => $before, 'after' => $measurement->fresh()->toArray()]);

        return response()->json(['ok' => true, 'measurement' => $measurement->fresh()]);
    }

    public function destroy(Request $request, Measurement $measurement): JsonResponse
    {
        $payload = $measurement->only(['id', 'user_id', 'measured_at']);
        $measurement->delete();
        $this->logger->log($request->user()->id, 'admin.progress.delete', null, $payload);

        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request, bool $partial): array
    {
        $rules = [
            'user_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:users,id'],
            'measured_at' => [$partial ? 'sometimes' : 'required', 'date'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'body_fat_pct' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'waist_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'chest_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'hip_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'resting_hr' => ['sometimes', 'nullable', 'integer', 'min:20', 'max:260'],
            'systolic_bp' => ['sometimes', 'nullable', 'integer', 'min:50', 'max:260'],
            'diastolic_bp' => ['sometimes', 'nullable', 'integer', 'min:30', 'max:200'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:4000'],
        ];

        return $request->validate($rules);
    }
}

