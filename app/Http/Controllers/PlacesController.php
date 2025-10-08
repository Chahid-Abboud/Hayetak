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
        $types  = (array) $request->query('types', ['gym','nutritionist']);

        // Optional bbox sanity (if you pass bbox)
        if ($bbox = $request->query('bbox')) {
            $this->assertValidBbox($bbox);
        }

        // Delegate to service (logic unchanged)
        $elements = $overpass->searchAround($lat, $lng, $radius, $types);

        return response()->json([
            'count' => is_array($elements) ? count($elements) : 0,
            'items' => $elements ?? [],
        ]);
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
