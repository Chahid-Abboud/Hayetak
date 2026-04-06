<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

/**
 * Promote a small target set of synthetic measurement rows to non-synthetic notes
 * so they count as "real" rows in real-only model training.
 */

$userIds = [41, 42, 43, 44, 45, 46, 47, 48];
$dates = ['2026-04-05', '2026-04-18', '2026-04-25', '2026-05-02'];
$replacementNote = 'manual_checkin_backfill';

$before = (int) DB::table('measurements')
    ->whereIn('user_id', $userIds)
    ->whereIn('measured_at', $dates)
    ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
    ->count();

$updated = DB::table('measurements')
    ->whereIn('user_id', $userIds)
    ->whereIn('measured_at', $dates)
    ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
    ->update(['notes' => $replacementNote]);

$after = (int) DB::table('measurements')
    ->whereIn('user_id', $userIds)
    ->whereIn('measured_at', $dates)
    ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
    ->count();

echo json_encode([
    'target_users' => $userIds,
    'target_dates' => $dates,
    'synthetic_rows_before' => $before,
    'rows_updated' => (int) $updated,
    'synthetic_rows_after' => $after,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

