<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PlacesLocalController extends Controller
{
    public function index(Request $request)
    {
        [$lat, $lng, $radius, $types, $hasExplicitTypes] = $this->parseInputs($request);

        if ($lat === null || $lng === null) {
            return response()->json([
                'type' => 'FeatureCollection',
                'features' => [],
                'error' => 'lat and lng query params are required and must be numeric.',
            ], 422);
        }

        if ($hasExplicitTypes && empty($types)) {
            return $this->featureCollection([]);
        }

        $latDelta = $radius / 111320.0;
        $lngDelta = $radius / max(111320.0 * cos(deg2rad($lat)), 0.0001);

        $rows = DB::table('places_local')
            ->select([
                'id',
                'user_id',
                'name',
                'category',
                'address',
                'city',
                'lat',
                'lng',
                'meta',
                'description',
                'google_maps_link',
                'google_place_id',
                'last_verified_at',
            ])
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->whereBetween('lat', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('lng', [$lng - $lngDelta, $lng + $lngDelta])
            ->get();

        $matches = [];

        foreach ($rows as $row) {
            $placeLat = (float) $row->lat;
            $placeLng = (float) $row->lng;
            $category = $this->normalizeCategory((string) ($row->category ?? ''));

            if (! $this->matchesType($category, $types)) {
                continue;
            }

            $distance = $this->distanceMeters($lat, $lng, $placeLat, $placeLng);

            if ($distance > $radius) {
                continue;
            }

            $matches[] = [
                'row' => $row,
                'category' => $category,
                'distance_m' => round($distance, 1),
                'meta' => $this->parseMeta($row->meta ?? null),
            ];
        }

        usort($matches, function (array $a, array $b): int {
            return ($a['distance_m'] ?? 0) <=> ($b['distance_m'] ?? 0);
        });

        $placeIds = array_map(
            fn (array $item): int => (int) ($item['row']->id ?? 0),
            $matches
        );
        $imagesByPlace = $this->loadImagesByPlace($placeIds);

        $features = [];

        foreach ($matches as $item) {
            $row = $item['row'];
            $meta = $item['meta'];
            $placeId = (int) $row->id;
            $imageUrls = $imagesByPlace[$placeId] ?? [];
            $primaryImageUrl = $imageUrls[0]
                ?? $this->metaString($meta, 'image_url')
                ?? $this->metaString($meta, 'image')
                ?? null;

            $features[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $row->lng, (float) $row->lat],
                ],
                'properties' => [
                    'id' => $placeId,
                    'name' => (string) $row->name,
                    'type' => $item['category'],
                    'category' => $item['category'],
                    'address' => $this->nullableTrim($row->address ?? null),
                    'city' => $this->nullableTrim($row->city ?? null),
                    'distance' => $item['distance_m'],
                    'distance_m' => $item['distance_m'],
                    'distance_km' => round(((float) $item['distance_m']) / 1000, 2),
                    'description' => $this->nullableTrim($row->description ?? null),
                    'google_maps_link' => $this->nullableTrim($row->google_maps_link ?? null),
                    'google_place_id' => $this->nullableTrim($row->google_place_id ?? null),
                    'last_verified_at' => $row->last_verified_at ? (string) $row->last_verified_at : null,
                    'source' => $this->metaString($meta, 'source') ?? 'local',
                    'website' => $this->metaString($meta, 'website'),
                    'phone' => $this->metaString($meta, 'phone'),
                    'rating' => $this->metaFloat($meta, 'rating'),
                    'opening_hours' => $this->metaStringList($meta, 'opening_hours'),
                    'primary_image_url' => $primaryImageUrl,
                    'image_urls' => $imageUrls,
                    'meta' => $meta,
                ],
            ];
        }

        return $this->featureCollection($features);
    }

    private function parseInputs(Request $request): array
    {
        $latRaw = $request->query('lat');
        $lngRaw = $request->query('lng');
        $radiusRaw = $request->query('radius', 2000);
        $hasExplicitTypes = $request->has('types');
        $typesRaw = $request->query('types');

        $lat = is_numeric($latRaw) ? (float) $latRaw : null;
        $lng = is_numeric($lngRaw) ? (float) $lngRaw : null;

        $radius = is_numeric($radiusRaw) ? (float) $radiusRaw : 2000.0;
        $radius = min(max($radius, 100.0), 50000.0);

        if ($typesRaw === null) {
            $typesRaw = 'gym,nutritionist';
        }

        return [$lat, $lng, $radius, $this->parseTypes((string) $typesRaw), $hasExplicitTypes];
    }

    private function parseTypes(string $rawTypes): array
    {
        $parts = array_map('trim', explode(',', $rawTypes));
        $parts = array_map('strtolower', $parts);
        $parts = array_filter($parts, fn (string $v): bool => $v !== '');

        return array_values(array_unique($parts));
    }

    private function normalizeCategory(string $rawCategory): string
    {
        $category = strtolower(trim($rawCategory));

        if ($category === '') {
            return 'other';
        }
        if (str_contains($category, 'gym')) {
            return 'gym';
        }
        if (
            str_contains($category, 'nutri') ||
            str_contains($category, 'diet') ||
            str_contains($category, 'clinic')
        ) {
            return 'nutritionist';
        }

        return $category;
    }

    private function matchesType(string $category, array $types): bool
    {
        foreach ($types as $type) {
            if ($type === 'gym' && str_contains($category, 'gym')) {
                return true;
            }
            if (
                $type === 'nutritionist' &&
                (
                    str_contains($category, 'nutri') ||
                    str_contains($category, 'diet') ||
                    str_contains($category, 'clinic')
                )
            ) {
                return true;
            }
            if ($type === 'other' && $category === 'other') {
                return true;
            }
            if ($type === $category || str_contains($category, $type)) {
                return true;
            }
        }

        return false;
    }

    private function parseMeta(mixed $rawMeta): array
    {
        if (is_array($rawMeta)) {
            return $rawMeta;
        }
        if (is_object($rawMeta)) {
            return (array) $rawMeta;
        }
        if (is_string($rawMeta) && trim($rawMeta) !== '') {
            $decoded = json_decode($rawMeta, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function loadImagesByPlace(array $placeIds): array
    {
        if (empty($placeIds) || ! Schema::hasTable('places_local_images')) {
            return [];
        }

        $rows = DB::table('places_local_images')
            ->select(['place_local_id', 'image_url', 'is_primary', 'sort_order', 'id'])
            ->whereIn('place_local_id', $placeIds)
            ->whereNotNull('image_url')
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $imagesByPlace = [];

        foreach ($rows as $row) {
            $placeId = (int) ($row->place_local_id ?? 0);
            $url = $this->nullableTrim($row->image_url ?? null);

            if ($placeId <= 0 || $url === null) {
                continue;
            }

            if (! isset($imagesByPlace[$placeId])) {
                $imagesByPlace[$placeId] = [];
            }

            if (! in_array($url, $imagesByPlace[$placeId], true)) {
                $imagesByPlace[$placeId][] = $url;
            }
        }

        return $imagesByPlace;
    }

    private function metaString(array $meta, string $key): ?string
    {
        return $this->nullableTrim($meta[$key] ?? null);
    }

    private function metaFloat(array $meta, string $key): ?float
    {
        $value = $meta[$key] ?? null;

        return is_numeric($value) ? (float) $value : null;
    }

    private function metaStringList(array $meta, string $key): array
    {
        $value = $meta[$key] ?? null;
        if (is_array($value)) {
            $items = array_map(fn ($item): ?string => $this->nullableTrim($item), $value);
            return array_values(array_filter($items, fn (?string $v): bool => $v !== null));
        }
        if (is_string($value)) {
            $single = $this->nullableTrim($value);
            return $single === null ? [] : [$single];
        }

        return [];
    }

    private function nullableTrim(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function featureCollection(array $features)
    {
        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earth * $c;
    }
}
