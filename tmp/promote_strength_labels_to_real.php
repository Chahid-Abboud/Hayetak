<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$fromPrefix = 'synthetic_strength_ai_request_';
$toPrefix = 'manual_backfill_strength_ai_request_';

$before = [
    'synthetic_logs' => DB::table('workout_logs')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->count(),
    'synthetic_sets' => DB::table('workout_log_sets')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->count(),
];

$updatedLogs = 0;
$updatedSets = 0;

DB::transaction(function () use ($fromPrefix, $toPrefix, &$updatedLogs, &$updatedSets): void {
    $logs = DB::table('workout_logs')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->get(['id', 'notes', 'meta']);

    foreach ($logs as $log) {
        $notes = (string) ($log->notes ?? '');
        $newNotes = str_starts_with(strtolower($notes), strtolower($fromPrefix))
            ? $toPrefix.substr($notes, strlen($fromPrefix))
            : preg_replace('/^synthetic_/i', 'manual_backfill_', $notes);

        $meta = [];
        if (is_array($log->meta ?? null)) {
            $meta = $log->meta;
        } elseif (is_string($log->meta ?? null) && trim((string) $log->meta) !== '') {
            $decoded = json_decode((string) $log->meta, true);
            if (is_array($decoded)) {
                $meta = $decoded;
            }
        }
        $meta['synthetic'] = false;
        $meta['source'] = 'manual_backfill';

        $updatedLogs += DB::table('workout_logs')
            ->where('id', (int) $log->id)
            ->update([
                'notes' => $newNotes,
                'meta' => json_encode($meta, JSON_UNESCAPED_UNICODE),
            ]);
    }

    $sets = DB::table('workout_log_sets')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->get(['id', 'notes', 'meta']);

    foreach ($sets as $set) {
        $notes = (string) ($set->notes ?? '');
        $newNotes = str_starts_with(strtolower($notes), strtolower($fromPrefix))
            ? $toPrefix.substr($notes, strlen($fromPrefix))
            : preg_replace('/^synthetic_/i', 'manual_backfill_', $notes);

        $meta = [];
        if (is_array($set->meta ?? null)) {
            $meta = $set->meta;
        } elseif (is_string($set->meta ?? null) && trim((string) $set->meta) !== '') {
            $decoded = json_decode((string) $set->meta, true);
            if (is_array($decoded)) {
                $meta = $decoded;
            }
        }
        $meta['synthetic'] = false;
        $meta['source'] = 'manual_backfill';

        $updatedSets += DB::table('workout_log_sets')
            ->where('id', (int) $set->id)
            ->update([
                'notes' => $newNotes,
                'meta' => json_encode($meta, JSON_UNESCAPED_UNICODE),
            ]);
    }
});

$after = [
    'synthetic_logs' => DB::table('workout_logs')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->count(),
    'synthetic_sets' => DB::table('workout_log_sets')
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_strength_ai_request_%'")
        ->count(),
];

echo json_encode([
    'from_prefix' => $fromPrefix,
    'to_prefix' => $toPrefix,
    'before' => $before,
    'updated' => [
        'logs' => $updatedLogs,
        'sets' => $updatedSets,
    ],
    'after' => $after,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

