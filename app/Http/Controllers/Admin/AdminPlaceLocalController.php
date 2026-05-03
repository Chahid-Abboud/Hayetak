<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlaceLocal;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdminPlaceLocalController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $category = trim((string) $request->query('category', 'all'));
        $city = trim((string) $request->query('city', 'all'));
        $visibility = trim((string) $request->query('visibility', 'all'));
        $quality = trim((string) $request->query('quality', 'all'));

        $allRows = PlaceLocal::query()->get();
        $stats = $this->stats($allRows);

        $rows = PlaceLocal::query()
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('category', 'like', "%{$q}%")
                        ->orWhere('city', 'like', "%{$q}%")
                        ->orWhere('address', 'like', "%{$q}%");
                });
            })
            ->when($category !== 'all', fn ($query) => $query->where('category', $category))
            ->when($city !== 'all', fn ($query) => $query->where('city', $city))
            ->orderBy('id')
            ->paginate((int) $request->query('per_page', 25));

        $rows->setCollection($rows->getCollection()
            ->map(fn (PlaceLocal $place) => $this->serializePlace($place))
            ->when($visibility !== 'all', fn ($collection) => $collection
                ->filter(fn (array $place) => $place['visibility'] === $visibility)
                ->values())
            ->when($quality !== 'all', fn ($collection) => $collection
                ->filter(fn (array $place) => $place['recommendation_quality'] === $quality)
                ->values()));

        return response()->json([
            ...$rows->toArray(),
            'stats' => $stats,
            'filters' => [
                'categories' => $this->distinctValues('category'),
                'cities' => $this->distinctValues('city'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['meta'] = $this->normalizeMeta($data['meta'] ?? []);
        $place = PlaceLocal::query()->create($data);
        $this->logger->log($request->user()->id, 'admin.place.create', $place, $data);

        return response()->json(['ok' => true, 'place' => $place], 201);
    }

    public function update(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['meta'] = $this->normalizeMeta($data['meta'] ?? [], $placeLocal);
        $before = $placeLocal->only(['name', 'category', 'address', 'city', 'lat', 'lng', 'meta']);
        $placeLocal->update($data);
        $this->logger->log($request->user()->id, 'admin.place.update', $placeLocal, ['before' => $before, 'after' => $placeLocal->only(['name', 'category', 'address', 'city', 'lat', 'lng', 'meta'])]);

        return response()->json(['ok' => true, 'place' => $placeLocal->fresh()]);
    }

    public function hide(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $meta = $this->normalizeMeta($placeLocal->meta ?? [], $placeLocal);
        $meta['visibility'] = 'hidden';
        $meta['hidden_reason'] = $data['reason'] ?? null;
        $meta['hidden_at'] = now()->toISOString();

        $placeLocal->forceFill(['meta' => $meta])->save();

        $this->logger->log($request->user()->id, 'admin.place.hide', $placeLocal, [
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true, 'place' => $this->serializePlace($placeLocal->fresh())]);
    }

    public function validateCoordinates(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $meta = $this->normalizeMeta($placeLocal->meta ?? [], $placeLocal);
        $meta['coordinates_validated'] = true;
        $meta['coordinates_validated_at'] = now()->toISOString();
        $meta['coordinates_validation_note'] = $data['reason'] ?? null;

        $placeLocal->forceFill([
            'meta' => $meta,
            'last_verified_at' => now(),
        ])->save();

        $this->logger->log($request->user()->id, 'admin.place.validate_coordinates', $placeLocal, [
            'lat' => $placeLocal->lat,
            'lng' => $placeLocal->lng,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true, 'place' => $this->serializePlace($placeLocal->fresh())]);
    }

    public function destroy(Request $request, PlaceLocal $placeLocal): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);
        $payload = $placeLocal->only(['id', 'name', 'category', 'city']);
        $placeLocal->delete();
        $this->logger->log($request->user()->id, 'admin.place.delete', null, [
            ...$payload,
            'reason' => $data['reason'] ?? null,
        ]);

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
            'google_place_id' => ['nullable', 'string', 'max:128'],
            'last_verified_at' => ['nullable', 'date'],
            'meta' => ['nullable', 'array'],
        ]);
    }

    private function serializePlace(PlaceLocal $place): array
    {
        $meta = $this->meta($place->meta);
        $quality = $this->quality($place, $meta);
        $hidden = ($meta['visibility'] ?? 'visible') === 'hidden'
            || (bool) ($meta['hidden'] ?? false);

        return [
            'id' => $place->id,
            'user_id' => $place->user_id,
            'name' => $place->name,
            'category' => $place->category,
            'address' => $place->address,
            'city' => $place->city,
            'lat' => $place->lat,
            'lng' => $place->lng,
            'description' => $place->description,
            'google_maps_link' => $place->google_maps_link,
            'google_place_id' => $place->google_place_id,
            'last_verified_at' => optional($place->last_verified_at)?->toISOString(),
            'visibility' => $hidden ? 'hidden' : 'visible',
            'recommendation_quality' => $quality['state'],
            'quality_warnings' => $quality['warnings'],
            'source' => (string) ($meta['source'] ?? ($place->google_place_id ? 'google_places' : 'local_curated')),
            'coordinates_validated' => (bool) ($meta['coordinates_validated'] ?? false) || $place->last_verified_at !== null,
            'meta' => $meta,
        ];
    }

    private function quality(PlaceLocal $place, array $meta): array
    {
        $warnings = array_values(array_filter([
            $place->address ? null : 'missing_address',
            $place->city ? null : 'missing_city',
            $place->category ? null : 'missing_category',
            $place->description ? null : 'missing_description',
            $this->validCoordinates($place) ? null : 'invalid_coordinates',
            (($meta['visibility'] ?? 'visible') === 'hidden') ? 'hidden' : null,
        ]));

        return [
            'state' => $warnings === [] ? 'ready' : (count($warnings) <= 2 ? 'needs_review' : 'poor'),
            'warnings' => $warnings,
        ];
    }

    private function validCoordinates(PlaceLocal $place): bool
    {
        $lat = (float) $place->lat;
        $lng = (float) $place->lng;

        return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180 && ($lat !== 0.0 || $lng !== 0.0);
    }

    private function stats(Collection $places): array
    {
        $serialized = $places->map(fn (PlaceLocal $place) => $this->serializePlace($place));

        return [
            'total' => $places->count(),
            'visible' => $serialized->where('visibility', 'visible')->count(),
            'hidden' => $serialized->where('visibility', 'hidden')->count(),
            'needs_review' => $serialized->whereIn('recommendation_quality', ['needs_review', 'poor'])->count(),
            'validated_coordinates' => $serialized->where('coordinates_validated', true)->count(),
        ];
    }

    private function distinctValues(string $column): array
    {
        return PlaceLocal::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->values()
            ->all();
    }

    private function normalizeMeta(mixed $meta, ?PlaceLocal $place = null): array
    {
        $normalized = $this->meta($meta);
        $normalized['source'] = trim((string) ($normalized['source'] ?? ($place?->google_place_id ? 'google_places' : 'local_curated')));
        $normalized['visibility'] = trim((string) ($normalized['visibility'] ?? 'visible')) ?: 'visible';

        return $normalized;
    }

    private function meta(mixed $meta): array
    {
        if (is_array($meta)) {
            return $meta;
        }

        if (is_object($meta)) {
            return (array) $meta;
        }

        if (is_string($meta) && trim($meta) !== '') {
            $decoded = json_decode($meta, true);

            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }
}
