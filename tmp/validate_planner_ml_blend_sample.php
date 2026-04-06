<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Services\Ai\PlannerService;
use Carbon\Carbon;

$sampleIds = [1, 40, 50];
$horizons = [14, 21, 28];

// Fast fallback for planner generation while preserving full persistence flow.
config([
    'ai.planner.ollama.base_url' => 'http://127.0.0.1:1',
    'ai.planner.ollama.connect_timeout' => 1,
    'ai.planner.ollama.timeout' => 20,
    'ai.planner.request_timeout_seconds' => 60,
]);

$planner = app(PlannerService::class);
$rows = [];

foreach ($sampleIds as $uid) {
    $user = User::find($uid);
    if (! $user) {
        continue;
    }

    foreach ($horizons as $horizon) {
        $started = microtime(true);
        $status = 'success';
        $error = null;
        $row = [
            'user_id' => $user->id,
            'email' => $user->email,
            'horizon_days' => $horizon,
            'status' => 'success',
            'version' => null,
            'generation_id' => null,
            'ai_request_id' => null,
            'provider' => null,
            'model' => null,
            'inference_source' => null,
            'review_after_days' => null,
            'diet_days_count' => null,
            'workout_days_count' => null,
            'duration_ms' => null,
            'error' => null,
        ];

        try {
            $result = $planner->generate($user, [
                'regenerate' => true,
                'reason' => 'ml_blend_validation_sample',
                'created_by' => (int) $user->id,
                'plan_horizon_days' => $horizon,
            ]);
            $plan = is_array($result['plan'] ?? null) ? $result['plan'] : [];

            $row['version'] = (int) ($result['version'] ?? 0);
            $row['generation_id'] = (string) ($result['generation_id'] ?? '');
            $row['ai_request_id'] = (int) ($result['ai_request_id'] ?? 0);
            $row['provider'] = (string) ($result['provider'] ?? '');
            $row['model'] = (string) ($result['model'] ?? '');
            $row['inference_source'] = (string) data_get($plan, 'progress_prediction.inference_source', '');
            $row['review_after_days'] = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
            $row['diet_days_count'] = count((array) data_get($plan, 'diet.days', []));
            $row['workout_days_count'] = count((array) data_get($plan, 'workout.weekly_schedule', []));
        } catch (Throwable $e) {
            $status = 'error';
            $error = $e->getMessage();
            $row['status'] = 'error';
            $row['error'] = substr(str_replace(["\r", "\n"], ' ', trim($error)), 0, 500);
        }

        $row['duration_ms'] = (int) round((microtime(true) - $started) * 1000);
        $rows[] = $row;

        echo sprintf(
            "user=%d horizon=%d status=%s inference=%s duration_ms=%d\n",
            (int) $row['user_id'],
            (int) $row['horizon_days'],
            $status,
            (string) ($row['inference_source'] ?? ''),
            (int) $row['duration_ms']
        );
    }
}

$stamp = Carbon::now()->format('Ymd_His');
$csvPath = __DIR__."/planner_ml_blend_validation_{$stamp}.csv";
$mdPath = __DIR__."/planner_ml_blend_validation_{$stamp}.md";

$csv = fopen($csvPath, 'wb');
fputcsv($csv, array_keys($rows[0] ?? ['status' => null]));
foreach ($rows as $row) {
    fputcsv($csv, array_values($row));
}
fclose($csv);

$ok = array_values(array_filter($rows, static fn (array $r): bool => $r['status'] === 'success'));
$allMlBlend = count($ok) > 0 && count(array_filter($ok, static fn (array $r): bool => $r['inference_source'] === 'ml_blend')) === count($ok);

$md = [];
$md[] = '# Planner ML Blend Validation';
$md[] = '';
$md[] = '- Generated at: '.Carbon::now()->toIso8601String();
$md[] = '- Rows: '.count($rows);
$md[] = '- Successful: '.count($ok);
$md[] = '- All successful rows ml_blend: '.($allMlBlend ? 'yes' : 'no');
$md[] = '- CSV: `'.$csvPath.'`';
$md[] = '';
$md[] = '| user_id | horizon_days | status | inference_source | review_after_days | diet_days_count | workout_days_count | duration_ms |';
$md[] = '|---:|---:|---|---|---:|---:|---:|---:|';
foreach ($rows as $r) {
    $md[] = sprintf(
        '| %d | %d | %s | %s | %d | %d | %d | %d |',
        (int) ($r['user_id'] ?? 0),
        (int) ($r['horizon_days'] ?? 0),
        (string) ($r['status'] ?? ''),
        (string) ($r['inference_source'] ?? ''),
        (int) ($r['review_after_days'] ?? 0),
        (int) ($r['diet_days_count'] ?? 0),
        (int) ($r['workout_days_count'] ?? 0),
        (int) ($r['duration_ms'] ?? 0)
    );
}

file_put_contents($mdPath, implode(PHP_EOL, $md).PHP_EOL);

echo json_encode([
    'csv_path' => $csvPath,
    'markdown_path' => $mdPath,
    'rows' => count($rows),
    'success_rows' => count($ok),
    'all_success_ml_blend' => $allMlBlend,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

