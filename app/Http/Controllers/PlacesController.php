<?php

namespace App\Http\Controllers;

use App\Services\OverpassService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class PlacesController extends Controller
{
    public function index(Request $request, OverpassService $overpass)
    {
        // Throttle by IP to avoid hammering Overpass on pan/zoom
        $key = 'overpass:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 20)) { // 20 req/min
            return response()->json([
                'message' => 'Too many requests. Slow down a bit.',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }
        RateLimiter::hit($key, 60); // decay (seconds)

        // Input
        $lat    = (float) $request->query('lat', 33.8938);
        $lng    = (float) $request->query('lng', 35.5018);
        $radius = (int)   $request->query('radius', 1500);

        // Handle types - can be comma-separated string or array
        $typesRaw = $request->query('types', 'gym,nutritionist');
        $types = is_string($typesRaw) ? explode(',', $typesRaw) : (array) $typesRaw;
        $types = array_filter(array_map('trim', $types));

        // Optional bbox sanity (if you pass bbox)
        if ($bbox = $request->query('bbox')) {
            $this->assertValidBbox($bbox);
        }

        // Delegate to service
        $elements = $overpass->searchAround($lat, $lng, $radius, $types);

        // Convert Overpass elements to GeoJSON
        $features = [];
        foreach ($elements as $el) {
            $coords = $this->extractCoords($el);
            if (!$coords) {
                continue;
            }

            $tags = $el['tags'] ?? [];
            $name = $tags['name'] ?? $tags['name:en'] ?? 'Unknown';
            $amenity = $tags['amenity'] ?? '';
            $healthcare = $tags['healthcare'] ?? '';

            $category = 'other';
            if ($amenity === 'gym' || str_contains(strtolower($name), 'gym')) {
                $category = 'gym';
            } elseif ($healthcare === 'nutritionist' || str_contains(strtolower($name), 'nutrition')) {
                $category = 'nutritionist';
            }

            // fix address precedence
            $address = $tags['addr:full']
                ?? (($tags['addr:housenumber'] ?? '') . ' ' . ($tags['addr:street'] ?? ''))
                ?? '';

            $features[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => $coords,
                ],
                'properties' => [
                    'id' => ($el['type'] ?? 'node') . '#' . ($el['id'] ?? '0'),
                    'name' => $name,
                    'category' => $category,
                    'address' => trim($address),
                ],
            ];
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    private function extractCoords(array $el): ?array
    {
        // For node elements
        if (isset($el['lat'], $el['lon'])) {
            return [(float) $el['lon'], (float) $el['lat']];
        }

        // For way/relation elements with center
        if (isset($el['center']['lat'], $el['center']['lon'])) {
            return [(float) $el['center']['lon'], (float) $el['center']['lat']];
        }

        // For way/relation elements with bounds
        if (isset($el['bounds'])) {
            $b = $el['bounds'];
            if (isset($b['minlat'], $b['minlon'], $b['maxlat'], $b['maxlon'])) {
                $lat = ($b['minlat'] + $b['maxlat']) / 2;
                $lon = ($b['minlon'] + $b['maxlon']) / 2;
                return [(float) $lon, (float) $lat];
            }
        }

        return null;
    }

    private function assertValidBbox(string $bboxStr): array
    {
        // Expected "south,west,north,east"
        $parts = array_map('trim', explode(',', (string) $bboxStr));
        if (count($parts) !== 4) {
            abort(422, 'Invalid bbox');
        }
        // Limit the span to avoid huge queries
        [$s, $w, $n, $e] = array_map('floatval', $parts);
        if (($n - $s) > 0.5 || ($e - $w) > 0.5) {
            abort(422, 'Bounding box too large—zoom in further');
        }
        return [$s, $w, $n, $e];
    }
}
