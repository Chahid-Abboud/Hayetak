<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlacesLocalController extends Controller
{
    public function index(Request $request)
    {
        
        $lat = (float) $request->query('lat');
        $lng = (float) $request->query('lng');
        $radius = (float) $request->query('radius', 2000); // meters
        $types = explode(',', $request->query('types', 'gym,nutritionist'));

        $places = DB::table('places_local')
            ->whereIn('category', $types)
            ->select('*')
            ->selectRaw(
                '(6371000 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) as distance',
                [$lat, $lng, $lat]
            )
            ->having('distance', '<=', $radius)
            ->orderBy('distance')
            ->get();

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $places->map(function ($p) {
                return [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [(float) $p->lng, (float) $p->lat],
                    ],
                    'properties' => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'category' => $p->category,
                        'address' => $p->address,
                        'city' => $p->city,
                    ],
                ];
            }),
        ]);
    }
}
