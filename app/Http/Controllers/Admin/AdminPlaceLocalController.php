<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlaceLocal;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlaceLocalController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $rows = PlaceLocal::query()
            ->when($q !== '', fn ($qq) => $qq->where('name', 'ILIKE', "%{$q}%"))
            ->orderBy('id')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $place = PlaceLocal::query()->create($data);
        $this->logger->log($request->user()->id, 'admin.place.create', $place, $data);

        return response()->json(['ok' => true, 'place' => $place], 201);
    }

    public function update(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $data = $this->validatePayload($request);
        $before = $placeLocal->only(['name', 'category', 'city', 'lat', 'lng']);
        $placeLocal->update($data);
        $this->logger->log($request->user()->id, 'admin.place.update', $placeLocal, ['before' => $before, 'after' => $placeLocal->only(['name', 'category', 'city', 'lat', 'lng'])]);

        return response()->json(['ok' => true, 'place' => $placeLocal->fresh()]);
    }

    public function destroy(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $payload = $placeLocal->only(['id', 'name', 'category', 'city']);
        $placeLocal->delete();
        $this->logger->log($request->user()->id, 'admin.place.delete', null, $payload);

        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'name' => ['required', 'string', 'max:191'],
            'category' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:120'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'description' => ['nullable', 'string'],
            'google_maps_link' => ['nullable', 'url'],
            'meta' => ['nullable', 'array'],
        ]);
    }
}

