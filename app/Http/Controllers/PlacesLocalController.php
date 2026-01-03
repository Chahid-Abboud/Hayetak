<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlacesLocalController extends Controller
{
    public function index(Request $request)
    {
        // basic input
        $lat    = (float) $request->query('lat');
        $lng    = (float) $request->query('lng');
        $radius = (float) $request->query('radius', 2000); // meters
        $types  = $request->query('types', 'gym,nutritionist');

        // normalize types
        $types = array_filter(array_map('trim', explode(',', $types)));
        $types = array_map('strtolower', $types);

        // get all rows once
        $rows = DB::table('places_local')
            ->select('id', 'name', 'category', 'address', 'city', 'lat', 'lng')
            ->get();

        $features = [];

        foreach ($rows as $row) {
            if ($row->lat === null || $row->lng === null) {
                continue;
            }

            $placeLat = (float) $row->lat;
            $placeLng = (float) $row->lng;

            $distance = $this->distanceMeters($lat, $lng, $placeLat, $placeLng);

            if ($distance > $radius) {
                continue;
            }

            // type filter: make it flexible
            $cat = strtolower((string) $row->category);
            $matchesType = false;
            if (empty($types)) {
                $matchesType = true;
            } else {
                foreach ($types as $t) {
                    if ($t === 'gym' && str_contains($cat, 'gym')) {
                        $matchesType = true;
                        break;
                    }
                    if ($t === 'nutritionist') {
                        if (
                            str_contains($cat, 'nutri') ||
                            str_contains($cat, 'diet') ||
                            str_contains($cat, 'clinic')
                        ) {
                            $matchesType = true;
                            break;
                        }
                    }
                }
            }

            if (!$matchesType) {
                continue;
            }

            $features[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [$placeLng, $placeLat],
                ],
                'properties' => [
                    'id'       => $row->id,
                    'name'     => $row->name,
                    'category' => $cat ?: 'other',
                    'address'  => $row->address,
                    'city'     => $row->city,
                    'distance' => $distance,
                ],
            ];
        }

        // sort by distance in PHP
        usort($features, function ($a, $b) {
            return ($a['properties']['distance'] ?? 0) <=> ($b['properties']['distance'] ?? 0);
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        // Haversine
        $earth = 6371000; // meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earth * $c;
    }
}
