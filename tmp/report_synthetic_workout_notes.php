<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$logs = DB::table('workout_logs')
    ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
    ->selectRaw('notes, COUNT(*) as c')
    ->groupBy('notes')
    ->orderByDesc('c')
    ->limit(25)
    ->get();

$sets = DB::table('workout_log_sets')
    ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
    ->selectRaw('notes, COUNT(*) as c')
    ->groupBy('notes')
    ->orderByDesc('c')
    ->limit(25)
    ->get();

echo json_encode([
    'synthetic_logs_total' => DB::table('workout_logs')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count(),
    'synthetic_sets_total' => DB::table('workout_log_sets')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count(),
    'top_log_notes' => $logs,
    'top_set_notes' => $sets,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

