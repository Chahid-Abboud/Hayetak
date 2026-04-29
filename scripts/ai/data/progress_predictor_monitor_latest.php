<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

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

$limit = max(1, (int) ($argMap['limit'] ?? 30));
$thresholdMlBlendPct = max(0.0, min(100.0, (float) ($argMap['threshold'] ?? 90.0)));

$rows = DB::table('ai_requests')
    ->where('type', 'plan_generator')
    ->where('status', 'completed')
    ->orderByDesc('id')
    ->limit($limit)
    ->get(['id', 'user_id', 'created_at', 'output_json']);

$sourceCounts = [];
$missingProgressPrediction = 0;
$missingInferenceSource = 0;
$considered = 0;

foreach ($rows as $row) {
    $output = decodeArray($row->output_json);
    $prediction = is_array($output['progress_prediction'] ?? null) ? $output['progress_prediction'] : null;
    if (! is_array($prediction)) {
        $missingProgressPrediction++;

        continue;
    }

    $considered++;
    $source = strtolower(trim((string) ($prediction['inference_source'] ?? '')));
    if ($source === '') {
        $source = 'unknown';
        $missingInferenceSource++;
    }
    $sourceCounts[$source] = ($sourceCounts[$source] ?? 0) + 1;
}

$mlBlendCount = (int) ($sourceCounts['ml_blend'] ?? 0);
$nonMlBlendCount = $considered - $mlBlendCount;
$mlBlendPct = $considered > 0 ? round(($mlBlendCount / $considered) * 100, 2) : 0.0;

$alertStatus = $considered === 0
    ? 'no_predictions'
    : ($mlBlendPct >= $thresholdMlBlendPct ? 'ok' : 'attention_needed');

$timestamp = CarbonImmutable::now()->format('Ymd_His');
$jsonPath = base_path("tmp/progress_predictor_monitor_latest{$limit}_{$timestamp}.json");
$mdPath = base_path("tmp/progress_predictor_monitor_latest{$limit}_{$timestamp}.md");

$payload = [
    'generated_at' => CarbonImmutable::now()->toIso8601String(),
    'limit' => $limit,
    'threshold_ml_blend_pct' => $thresholdMlBlendPct,
    'completed_plan_requests_scanned' => count($rows),
    'predictions_considered' => $considered,
    'missing_progress_prediction' => $missingProgressPrediction,
    'missing_inference_source' => $missingInferenceSource,
    'source_counts' => $sourceCounts,
    'ml_blend_count' => $mlBlendCount,
    'non_ml_blend_count' => $nonMlBlendCount,
    'ml_blend_pct' => $mlBlendPct,
    'alert_status' => $alertStatus,
];

file_put_contents($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);

$md = [];
$md[] = '# Progress Predictor Latest-'.$limit.' Monitoring';
$md[] = '';
$md[] = '- Generated at: `'.$payload['generated_at'].'`';
$md[] = '- Completed plan requests scanned: `'.$payload['completed_plan_requests_scanned'].'`';
$md[] = '- Predictions considered: `'.$considered.'`';
$md[] = '- Missing progress_prediction: `'.$missingProgressPrediction.'`';
$md[] = '- Missing inference_source: `'.$missingInferenceSource.'`';
$md[] = '- ML blend count: `'.$mlBlendCount.'`';
$md[] = '- Non-ML blend count: `'.$nonMlBlendCount.'`';
$md[] = '- ML blend %: `'.$mlBlendPct.'`';
$md[] = '- Threshold ML blend %: `'.$thresholdMlBlendPct.'`';
$md[] = '- Alert status: `'.$alertStatus.'`';
$md[] = '';
$md[] = '## Source Counts';
foreach ($sourceCounts as $source => $count) {
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
