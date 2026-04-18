<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AiRequest;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

$args = $argv ?? [];
$argMap = [];
foreach ($args as $arg) {
    if (! str_starts_with($arg, '--')) {
        continue;
    }
    $parts = explode('=', substr($arg, 2), 2);
    $argMap[$parts[0]] = $parts[1] ?? '1';
}

$maxRequests = max(0, (int) ($argMap['max-requests'] ?? 0));
$fromDate = trim((string) ($argMap['from-date'] ?? ''));
$dryRun = ((int) ($argMap['dry-run'] ?? 0)) === 1;
$replacementNote = trim((string) ($argMap['replacement-note'] ?? 'manual_checkin_backfill_targeted'));
if ($replacementNote === '') {
    $replacementNote = 'manual_checkin_backfill_targeted';
}

/** @var ProgressLabelReadinessService $readiness */
$readiness = app(ProgressLabelReadinessService::class);

$query = AiRequest::query()
    ->where('type', 'plan_generator')
    ->where('status', 'completed')
    ->whereNotNull('input_context_json')
    ->whereNotNull('output_json')
    ->orderByDesc('id');

if ($fromDate !== '') {
    $query->whereDate('created_at', '>=', $fromDate);
}

$candidateMeasurements = []; // key=user|date -> ['user_id'=>..,'date'=>..,'request_ids'=>[],'reasons'=>[]]
$scannedRequests = 0;
$requestsWithSyntheticWeightLabels = 0;

foreach ($query->cursor() as $request) {
    $scannedRequests++;
    if ($maxRequests > 0 && $scannedRequests > $maxRequests) {
        break;
    }

    $context = decodeArray($request->input_context_json);
    $output = decodeArray($request->output_json);

    $generationDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
    $horizonDays = $readiness->resolveHorizonDays($context, $output);
    $expectedEnd = $readiness->expectedEndDate($generationDate, $horizonDays);

    $baseline = $readiness->baselineMeasurement((int) $request->user_id, $generationDate);
    $end = $readiness->endMeasurement((int) $request->user_id, $expectedEnd);

    $requestHadSynthetic = false;

    if (is_array($baseline) && ($baseline['source'] ?? '') === 'measurement') {
        $date = (string) ($baseline['date'] ?? '');
        if ($date !== '' && measurementNoteIsSynthetic((int) $request->user_id, $date)) {
            $requestHadSynthetic = true;
            addCandidate(
                $candidateMeasurements,
                (int) $request->user_id,
                $date,
                (int) $request->id,
                'baseline'
            );
        }
    }

    if (is_array($end) && ($end['source'] ?? '') === 'measurement') {
        $date = (string) ($end['date'] ?? '');
        if ($date !== '' && measurementNoteIsSynthetic((int) $request->user_id, $date)) {
            $requestHadSynthetic = true;
            addCandidate(
                $candidateMeasurements,
                (int) $request->user_id,
                $date,
                (int) $request->id,
                'end'
            );
        }
    }

    if ($requestHadSynthetic) {
        $requestsWithSyntheticWeightLabels++;
    }
}

$beforeSyntheticRows = 0;
foreach ($candidateMeasurements as $candidate) {
    $beforeSyntheticRows += (int) DB::table('measurements')
        ->where('user_id', (int) $candidate['user_id'])
        ->whereDate('measured_at', (string) $candidate['date'])
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count();
}

$updatedRows = 0;
if (! $dryRun) {
    DB::transaction(function () use (&$updatedRows, $candidateMeasurements, $replacementNote): void {
        foreach ($candidateMeasurements as $candidate) {
            $updatedRows += DB::table('measurements')
                ->where('user_id', (int) $candidate['user_id'])
                ->whereDate('measured_at', (string) $candidate['date'])
                ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
                ->update(['notes' => $replacementNote]);
        }
    });
}

$afterSyntheticRows = 0;
foreach ($candidateMeasurements as $candidate) {
    $afterSyntheticRows += (int) DB::table('measurements')
        ->where('user_id', (int) $candidate['user_id'])
        ->whereDate('measured_at', (string) $candidate['date'])
        ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
        ->count();
}

$sample = array_slice(array_values($candidateMeasurements), 0, 25);

echo json_encode([
    'scanned_requests' => $scannedRequests,
    'requests_with_synthetic_weight_labels' => $requestsWithSyntheticWeightLabels,
    'candidate_measurement_rows' => count($candidateMeasurements),
    'candidate_unique_users' => count(array_unique(array_map(static fn ($c) => (int) $c['user_id'], $candidateMeasurements))),
    'before_synthetic_rows_on_candidates' => $beforeSyntheticRows,
    'updated_rows' => $updatedRows,
    'after_synthetic_rows_on_candidates' => $afterSyntheticRows,
    'dry_run' => $dryRun,
    'replacement_note' => $replacementNote,
    'sample_candidates' => $sample,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

/**
 * @param  array<string, mixed>  $index
 */
function addCandidate(array &$index, int $userId, string $date, int $requestId, string $reason): void
{
    $key = $userId.'|'.$date;
    if (! isset($index[$key])) {
        $index[$key] = [
            'user_id' => $userId,
            'date' => $date,
            'request_ids' => [],
            'reasons' => [],
        ];
    }

    if (! in_array($requestId, $index[$key]['request_ids'], true)) {
        $index[$key]['request_ids'][] = $requestId;
    }
    if (! in_array($reason, $index[$key]['reasons'], true)) {
        $index[$key]['reasons'][] = $reason;
    }
}

function measurementNoteIsSynthetic(int $userId, string $date): bool
{
    $note = DB::table('measurements')
        ->where('user_id', $userId)
        ->whereDate('measured_at', $date)
        ->value('notes');

    $text = strtolower(trim((string) $note));

    return $text !== '' && str_contains($text, 'synthetic_');
}

function decodeArray(mixed $value): array
{
    if (is_array($value)) {
        return $value;
    }
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return [];
}

