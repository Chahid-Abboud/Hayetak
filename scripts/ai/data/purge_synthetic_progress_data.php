<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$dryRun = in_array('--dry-run', $argv, true);

$counts = [
    'measurement_rows' => (int) DB::table('measurements')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count(),
    'workout_log_set_rows' => (int) DB::table('workout_log_sets')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count(),
    'workout_log_rows' => (int) DB::table('workout_logs')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count(),
];

if (! $dryRun) {
    DB::transaction(function (): void {
        DB::table('measurements')
            ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
            ->delete();

        DB::table('workout_log_sets')
            ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
            ->delete();

        DB::table('workout_logs')
            ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
            ->delete();
    });
}

echo json_encode([
    'dry_run' => $dryRun,
    'would_delete_or_deleted' => $counts,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
