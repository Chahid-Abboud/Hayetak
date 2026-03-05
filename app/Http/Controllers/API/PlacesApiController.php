<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PlacesApiController extends Controller
{
    /**
     * GET /api/places?lat=...&lng=...&radius=...&types=gym,nutritionist
     * Returns GeoJSON FeatureCollection of POIs (Foursquare + Overpass).
     */
    public function index(Request $request)
    {
        $lat = (float) $request->query('lat');
        $lng = (float) $request->query('lng');
        $radius = (int) $request->query('radius', 1500);
        $types = explode(',', (string) $request->query('types', 'gym,nutritionist'));

        if (! $lat || ! $lng) {
            return response()->json([
                'type' => 'FeatureCollection',
                'features' => [],
                'error' => 'lat & lng are required',
            ], 400);
        }

        $features = [];

        // --- Foursquare ---
        $fsqKey = config('services.foursquare.api_key') ?? env('FOURSQUARE_API_KEY');
        if ($fsqKey) {
            foreach ($types as $qRaw) {
                $q = trim($qRaw);
                if ($q === '') {
                    continue;
                }

                $res = Http::withHeaders([
                    'Authorization' => $fsqKey,
                    'Accept' => 'application/json',
                ])->get('https://api.foursquare.com/v3/places/search', [
                    'll' => "{$lat},{$lng}",
                    'radius' => min($radius, 100000),
                    'query' => $q,
                    'limit' => 50,
                    'sort' => 'DISTANCE',
                ]);

                if ($res->ok()) {
                    foreach ($res->json('results', []) as $p) {
                        $coords = $p['geocodes']['main'] ?? $p['geocodes']['roof'] ?? null;
                        if (! $coords || ! isset($coords['longitude'], $coords['latitude'])) {
                            continue;
                        }

                        $features[] = [
                            'type' => 'Feature',
                            'geometry' => [
                                'type' => 'Point',
                                'coordinates' => [
                                    (float) $coords['longitude'],
                                    (float) $coords['latitude'],
                                ],
                            ],
                            'properties' => [
                                'source' => 'foursquare',
                                'name' => $p['name'] ?? $q,
                                'category' => $q,
                                'distance_m' => $p['distance'] ?? null,
                                'fsq_id' => $p['fsq_id'] ?? null,
                                'address' => $p['location']['formatted_address'] ?? null,
                                'website' => $p['website'] ?? null,
                            ],
                        ];
                    }
                }
            }
        }

        // (Your Overpass fallback code here unchanged — omitted for brevity)

        // Simple dedupe
        $seen = [];
        $deduped = [];
        foreach ($features as $f) {
            $k = strtolower($f['properties']['name'] ?? '').'|'.
                 ($f['geometry']['coordinates'][0] ?? '').'|'.
                 ($f['geometry']['coordinates'][1] ?? '');
            if (! isset($seen[$k])) {
                $seen[$k] = true;
                $deduped[] = $f;
            }
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $deduped,
        ]);
    }
}
