<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Services\Ai\PlannerService;
use Illuminate\Support\Carbon;

/**
 * Usage:
 *   php tmp/generate_all_users_plan_horizons.php
 *   php tmp/generate_all_users_plan_horizons.php --roles=client
 *   php tmp/generate_all_users_plan_horizons.php --days=14,21,28 --sleep-ms=100
 *   php tmp/generate_all_users_plan_horizons.php --from-user-id=14 --to-user-id=30
 */

$args = $argv ?? [];
$argMap = [];
foreach ($args as $arg) {
    if (str_starts_with($arg, '--')) {
        $parts = explode('=', substr($arg, 2), 2);
        $argMap[$parts[0]] = $parts[1] ?? '1';
    }
}

$days = array_values(array_unique(array_map(
    static function (string $value): int {
        $n = (int) trim($value);
        if ($n <= 14) {
            return 14;
        }
        if ($n <= 21) {
            return 21;
        }

        return 28;
    },
    array_filter(
        array_map('trim', explode(',', (string) ($argMap['days'] ?? '14,21,28'))),
        static fn (string $v): bool => $v !== ''
    )
)));
sort($days);

$rolesArg = trim((string) ($argMap['roles'] ?? 'all'));
$roles = $rolesArg === '' || strtolower($rolesArg) === 'all'
    ? []
    : array_values(array_filter(array_map('trim', explode(',', $rolesArg)), static fn (string $v): bool => $v !== ''));

$sleepMs = max(0, (int) ($argMap['sleep-ms'] ?? 0));
$limit = max(0, (int) ($argMap['limit'] ?? 0));
$fastFallback = (string) ($argMap['fast-fallback'] ?? '1') !== '0';
$fromUserId = max(0, (int) ($argMap['from-user-id'] ?? 0));
$toUserId = max(0, (int) ($argMap['to-user-id'] ?? 0));

if ($fastFallback) {
    // Keep runs moving by forcing immediate Ollama refusal, then local fallback.
    config([
        'ai.planner.request_timeout_seconds' => min((int) config('ai.planner.request_timeout_seconds', 300), 90),
        'ai.planner.ollama.base_url' => 'http://127.0.0.1:1',
        'ai.planner.ollama.connect_timeout' => 1,
        'ai.planner.ollama.timeout' => 20,
    ]);
}

$query = User::query()->orderBy('id');
if ($roles !== []) {
    $query->whereIn('role', $roles);
}
if ($limit > 0) {
    $query->limit($limit);
}
if ($fromUserId > 0) {
    $query->where('id', '>=', $fromUserId);
}
if ($toUserId > 0) {
    $query->where('id', '<=', $toUserId);
}

$users = $query->get(['id', 'name', 'email', 'role', 'status', 'updated_at']);
$userCount = $users->count();
$runCount = $userCount * count($days);

$now = Carbon::now();
$stamp = $now->format('Ymd_His');
$outDir = __DIR__;
$csvPath = $outDir."/plan_generation_all_users_{$stamp}.csv";
$mdPath = $outDir."/plan_generation_all_users_{$stamp}.md";

$csv = fopen($csvPath, 'wb');
if ($csv === false) {
    fwrite(STDERR, "Could not create CSV file at {$csvPath}\n");
    exit(1);
}

fputcsv($csv, [
    'run_index',
    'user_id',
    'name',
    'email',
    'role',
    'status',
    'horizon_days',
    'version',
    'generation_id',
    'ai_request_id',
    'provider',
    'model',
    'diet_days_count',
    'workout_days_count',
    'review_after_days',
    'usage_input_tokens',
    'usage_output_tokens',
    'usage_total_tokens',
    'duration_ms',
    'started_at',
    'finished_at',
    'error_type',
    'error_message',
]);

$planner = app(PlannerService::class);
$summary = [
    'started_at' => $now->toIso8601String(),
    'days' => $days,
    'roles_filter' => $roles === [] ? 'all' : implode(', ', $roles),
    'users_total' => $userCount,
    'runs_total' => $runCount,
    'runs_success' => 0,
    'runs_failed' => 0,
    'by_day' => [],
    'failures' => [],
];

foreach ($days as $day) {
    $summary['by_day'][$day] = [
        'success' => 0,
        'failed' => 0,
    ];
}

$runIndex = 0;

foreach ($users as $user) {
    foreach ($days as $day) {
        $runIndex++;
        $startedAt = Carbon::now();
        $start = microtime(true);

        $row = [
            'run_index' => $runIndex,
            'user_id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'role' => (string) ($user->role ?? ''),
            'status' => 'success',
            'horizon_days' => $day,
            'version' => null,
            'generation_id' => null,
            'ai_request_id' => null,
            'provider' => null,
            'model' => null,
            'diet_days_count' => 0,
            'workout_days_count' => 0,
            'review_after_days' => 0,
            'usage_input_tokens' => 0,
            'usage_output_tokens' => 0,
            'usage_total_tokens' => 0,
            'duration_ms' => 0,
            'started_at' => $startedAt->toIso8601String(),
            'finished_at' => null,
            'error_type' => null,
            'error_message' => null,
        ];

        try {
            $result = $planner->generate($user, [
                'regenerate' => true,
                'reason' => "bulk_regeneration_{$day}d_{$stamp}",
                'created_by' => (int) $user->id,
                'plan_horizon_days' => $day,
            ]);

            $plan = is_array($result['plan'] ?? null) ? $result['plan'] : [];
            $dietDays = is_array(data_get($plan, 'diet.days')) ? data_get($plan, 'diet.days') : [];
            $weekly = is_array(data_get($plan, 'workout.weekly_schedule')) ? data_get($plan, 'workout.weekly_schedule') : [];

            $row['version'] = (int) ($result['version'] ?? 0);
            $row['generation_id'] = (string) ($result['generation_id'] ?? '');
            $row['ai_request_id'] = (int) ($result['ai_request_id'] ?? 0);
            $row['provider'] = (string) ($result['provider'] ?? '');
            $row['model'] = (string) ($result['model'] ?? '');
            $row['diet_days_count'] = count($dietDays);
            $row['workout_days_count'] = count($weekly);
            $row['review_after_days'] = (int) data_get($plan, 'adaptive_review.review_after_days', 0);
            $row['usage_input_tokens'] = (int) data_get($result, 'usage.input_tokens', 0);
            $row['usage_output_tokens'] = (int) data_get($result, 'usage.output_tokens', 0);
            $row['usage_total_tokens'] = (int) data_get($result, 'usage.total_tokens', 0);

            $summary['runs_success']++;
            $summary['by_day'][$day]['success']++;
        } catch (Throwable $e) {
            $row['status'] = 'error';
            $row['error_type'] = $e::class;
            $row['error_message'] = substr(str_replace(["\r", "\n"], ' ', trim($e->getMessage())), 0, 500);

            $summary['runs_failed']++;
            $summary['by_day'][$day]['failed']++;
            $summary['failures'][] = [
                'user_id' => (int) $user->id,
                'email' => (string) $user->email,
                'role' => (string) ($user->role ?? ''),
                'horizon_days' => $day,
                'error_type' => $row['error_type'],
                'error_message' => $row['error_message'],
            ];
        }

        $row['duration_ms'] = (int) round((microtime(true) - $start) * 1000);
        $row['finished_at'] = Carbon::now()->toIso8601String();

        fputcsv($csv, array_values($row));
        echo sprintf(
            "[%d/%d] user=%d day=%d status=%s duration_ms=%d\n",
            $runIndex,
            $runCount,
            (int) $user->id,
            $day,
            (string) $row['status'],
            (int) $row['duration_ms']
        );

        if ($sleepMs > 0) {
            usleep($sleepMs * 1000);
        }
    }
}

fclose($csv);

$summary['finished_at'] = Carbon::now()->toIso8601String();
$summary['csv_path'] = $csvPath;
$summary['markdown_path'] = $mdPath;

$md = [];
$md[] = '# Bulk Plan Generation Report';
$md[] = '';
$md[] = '- Generated at: '.$summary['finished_at'];
$md[] = '- Days requested: '.implode(', ', $summary['days']);
$md[] = '- Roles filter: '.$summary['roles_filter'];
$md[] = '- Users processed: '.$summary['users_total'];
$md[] = '- Total runs: '.$summary['runs_total'];
$md[] = '- Successful runs: '.$summary['runs_success'];
$md[] = '- Failed runs: '.$summary['runs_failed'];
$md[] = '- CSV: `'.$csvPath.'`';
$md[] = '';
$md[] = '## By Horizon';
$md[] = '';
$md[] = '| Horizon | Success | Failed |';
$md[] = '|---:|---:|---:|';
foreach ($summary['by_day'] as $day => $stats) {
    $md[] = sprintf('| %d | %d | %d |', (int) $day, (int) $stats['success'], (int) $stats['failed']);
}

if ($summary['failures'] !== []) {
    $md[] = '';
    $md[] = '## Failures';
    $md[] = '';
    $md[] = '| user_id | email | role | horizon_days | error_type | error_message |';
    $md[] = '|---:|---|---|---:|---|---|';
    foreach ($summary['failures'] as $failure) {
        $md[] = sprintf(
            '| %d | %s | %s | %d | %s | %s |',
            (int) $failure['user_id'],
            str_replace('|', '\\|', (string) $failure['email']),
            str_replace('|', '\\|', (string) $failure['role']),
            (int) $failure['horizon_days'],
            str_replace('|', '\\|', (string) $failure['error_type']),
            str_replace('|', '\\|', (string) $failure['error_message'])
        );
    }
}

file_put_contents($mdPath, implode(PHP_EOL, $md).PHP_EOL);

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
