<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $lat = 33.96026;
    $lng = 35.61068;
    $radius = 300;
    $types = ['gym', 'nutritionist'];
    
    $places = DB::table('places_local')
        ->whereIn('category', $types)
        ->select('id', 'name', 'category', 'lat', 'lng')
        ->selectRaw(
            '(6371000 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) as distance',
            [$lat, $lng, $lat]
        )
        ->having('distance', '<=', $radius)
        ->orderBy('distance')
        ->get();
        
    echo "Success! Found " . $places->count() . " places\n";
    foreach ($places as $p) {
        echo "  - {$p->name} ({$p->category}) - Distance: " . ($p->distance ?? 'N/A') . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}

