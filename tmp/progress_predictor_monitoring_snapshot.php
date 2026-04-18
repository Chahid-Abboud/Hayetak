<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

$thresholdMlBlendPct = 95.0;
$since = CarbonImmutable::now()->subDays(7);

$rows = DB::table('ai_requests')
    ->where('type', 'plan_generator')
    ->where('status', 'completed')
    ->where('created_at', '>=', $since->toDateTimeString())
    ->orderBy('id', 'desc')
    ->limit(1000)
    ->get(['id', 'created_at', 'output_json']);

$total = 0;
$sources = [];
$missingProgressPrediction = 0;

foreach ($rows as $row) {
    $output = decodeArray($row->output_json);
    $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : null;
    if (! is_array($prediction)) {
        $missingProgressPrediction++;
        continue;
    }

    $total++;
    $source = strtolower(trim((string) ($prediction['inference_source'] ?? 'unknown')));
    if ($source === '') {
        $source = 'unknown';
    }
    $sources[$source] = ($sources[$source] ?? 0) + 1;
}

$mlBlend = (int) ($sources['ml_blend'] ?? 0);
$fallback = 0;
foreach ($sources as $key => $count) {
    if ($key !== 'ml_blend') {
        $fallback += (int) $count;
    }
}

$mlBlendPct = $total > 0 ? round(($mlBlend / $total) * 100, 2) : 0.0;
$alert = $total === 0
    ? 'no_data'
    : ($mlBlendPct >= $thresholdMlBlendPct ? 'ok' : 'attention_needed');

$timestamp = CarbonImmutable::now()->format('Ymd_His');
$jsonPath = base_path("tmp/progress_predictor_monitoring_snapshot_{$timestamp}.json");
$mdPath = base_path("tmp/progress_predictor_monitoring_snapshot_{$timestamp}.md");

$payload = [
    'window_start' => $since->toIso8601String(),
    'window_end' => CarbonImmutable::now()->toIso8601String(),
    'threshold_ml_blend_pct' => $thresholdMlBlendPct,
    'total_predictions' => $total,
    'missing_progress_prediction' => $missingProgressPrediction,
    'source_counts' => $sources,
    'ml_blend_count' => $mlBlend,
    'fallback_count' => $fallback,
    'ml_blend_pct' => $mlBlendPct,
    'alert_status' => $alert,
];

file_put_contents($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);

$md = [];
$md[] = '# Progress Predictor Monitoring Snapshot';
$md[] = '';
$md[] = '- Window start: `'.$payload['window_start'].'`';
$md[] = '- Window end: `'.$payload['window_end'].'`';
$md[] = '- Threshold ml_blend %: `'.$thresholdMlBlendPct.'`';
$md[] = '- Total predictions: `'.$total.'`';
$md[] = '- Missing progress_prediction payloads: `'.$missingProgressPrediction.'`';
$md[] = '- ML blend count: `'.$mlBlend.'`';
$md[] = '- Fallback/other count: `'.$fallback.'`';
$md[] = '- ML blend %: `'.$mlBlendPct.'`';
$md[] = '- Alert status: `'.$alert.'`';
$md[] = '';
$md[] = '## Source Counts';
foreach ($sources as $source => $count) {
    $md[] = '- `'.$source.'`: `'.$count.'`';
}
file_put_contents($mdPath, implode(PHP_EOL, $md).PHP_EOL);

echo json_encode([
    'json_path' => $jsonPath,
    'md_path' => $mdPath,
    'summary' => $payload,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

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

