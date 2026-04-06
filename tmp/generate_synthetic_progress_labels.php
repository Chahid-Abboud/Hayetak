<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Measurement;
use App\Models\User;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Generate synthetic progress evidence for training labels.
 *
 * This script ensures, for each completed planner request:
 * - baseline measurement exists on generation date if missing on/before.
 * - end-window measurement exists near expected end date.
 * - weighted workout sets exist in early and late windows for strength labels.
 *
 * Usage:
 *   php tmp/generate_synthetic_progress_labels.php
 *   php tmp/generate_synthetic_progress_labels.php --limit=120
 *   php tmp/generate_synthetic_progress_labels.php --from-ai-request-id=200
 */

$args = $argv ?? [];
$argMap = [];
foreach ($args as $arg) {
    if (! str_starts_with($arg, '--')) {
        continue;
    }
    $parts = explode('=', substr($arg, 2), 2);
    $argMap[$parts[0]] = $parts[1] ?? '1';
}

$limit = max(0, (int) ($argMap['limit'] ?? 0));
$fromRequestId = max(0, (int) ($argMap['from-ai-request-id'] ?? 0));
$dryRun = ((int) ($argMap['dry-run'] ?? 0)) === 1;

$readiness = app(ProgressLabelReadinessService::class);
$exerciseIds = Exercise::query()->orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all();

if ($exerciseIds === []) {
    fwrite(STDERR, "No exercises found; cannot generate strength labels.\n");
    exit(1);
}

$query = AiRequest::query()
    ->where('type', 'plan_generator')
    ->where('status', 'completed')
    ->whereNotNull('input_context_json')
    ->whereNotNull('output_json')
    ->orderBy('id');

if ($fromRequestId > 0) {
    $query->where('id', '>=', $fromRequestId);
}
if ($limit > 0) {
    $query->limit($limit);
}

$requests = $query->get();
$usersById = User::query()->whereIn('id', $requests->pluck('user_id')->unique()->all())->get()->keyBy('id');

$stats = [
    'requests_scanned' => 0,
    'requests_processed' => 0,
    'baseline_measurements_created' => 0,
    'end_measurements_created' => 0,
    'measurements_updated_from_null' => 0,
    'workout_logs_created' => 0,
    'workout_logs_updated' => 0,
    'workout_sets_created' => 0,
    'requests_skipped_missing_user' => 0,
    'requests_skipped_bad_payload' => 0,
    'dry_run' => $dryRun,
];

foreach ($requests as $request) {
    $stats['requests_scanned']++;

    /** @var User|null $user */
    $user = $usersById->get((int) $request->user_id);
    if (! $user) {
        $stats['requests_skipped_missing_user']++;
        continue;
    }

    $context = decodeArray($request->input_context_json);
    $output = decodeArray($request->output_json);
    $profile = is_array($context['profile'] ?? null) ? $context['profile'] : [];

    if ($profile === []) {
        $stats['requests_skipped_bad_payload']++;
        continue;
    }

    $generationDate = CarbonImmutable::parse((string) $request->created_at)->startOfDay();
    $horizonDays = $readiness->resolveHorizonDays($context, $output);
    $endDate = $readiness->expectedEndDate($generationDate, $horizonDays);
    $goalMode = goalMode($profile);

    $predictionBaseline = toFloatOrNull(data_get($output, 'progress_prediction.baseline_weight_kg'));
    $profileWeight = toFloatOrNull($profile['weight_kg'] ?? $user->weight_kg);
    $baselineResolved = $readiness->baselineWithFallback((int) $user->id, $generationDate, $predictionBaseline, $profileWeight);

    $baselineWeight = $baselineResolved !== null
        ? (float) ($baselineResolved['weight'] ?? 0.0)
        : max(45.0, min(180.0, (float) ($user->weight_kg ?? 75.0)));

    $baselineExists = $readiness->baselineMeasurement((int) $user->id, $generationDate);
    if ($baselineExists === null) {
        if (! $dryRun) {
            Measurement::query()->updateOrCreate(
                ['user_id' => $user->id, 'measured_at' => $generationDate->toDateString()],
                [
                    'weight_kg' => round($baselineWeight, 2),
                    'height_cm' => $user->height_cm,
                    'notes' => "synthetic_progress_baseline_for_ai_request_{$request->id}",
                ]
            );
        }
        $stats['baseline_measurements_created']++;
    }

    $endMeasurement = $readiness->endMeasurement((int) $user->id, $endDate);
    if ($endMeasurement === null) {
        $predictedDelta = toFloatOrNull(data_get($output, 'progress_prediction.expected_weight_change_kg'))
            ?? defaultExpectedChangeKg($goalMode, $horizonDays);

        $noise = seededFloat("req{$request->id}:delta_noise", -0.35, 0.35);
        $actualDelta = clampDeltaByGoal($predictedDelta + $noise, $goalMode, $horizonDays);
        $endWeight = max(38.0, min(240.0, round($baselineWeight + $actualDelta, 2)));

        if (! $dryRun) {
            Measurement::query()->updateOrCreate(
                ['user_id' => $user->id, 'measured_at' => $endDate->toDateString()],
                [
                    'weight_kg' => $endWeight,
                    'height_cm' => $user->height_cm,
                    'notes' => "synthetic_progress_end_for_ai_request_{$request->id}_h{$horizonDays}",
                ]
            );
        }
        $stats['end_measurements_created']++;
    } else {
        $existingWeight = toFloatOrNull($endMeasurement['weight'] ?? null);
        if ($existingWeight === null || $existingWeight <= 0) {
            $predictedDelta = toFloatOrNull(data_get($output, 'progress_prediction.expected_weight_change_kg'))
                ?? defaultExpectedChangeKg($goalMode, $horizonDays);
            $actualDelta = clampDeltaByGoal($predictedDelta, $goalMode, $horizonDays);
            $endWeight = max(38.0, min(240.0, round($baselineWeight + $actualDelta, 2)));
            if (! $dryRun) {
                Measurement::query()
                    ->where('user_id', $user->id)
                    ->whereDate('measured_at', (string) ($endMeasurement['date'] ?? $endDate->toDateString()))
                    ->update([
                        'weight_kg' => $endWeight,
                        'notes' => "synthetic_progress_end_fill_for_ai_request_{$request->id}",
                    ]);
            }
            $stats['measurements_updated_from_null']++;
        }
    }

    $earlyDate = $generationDate->addDays(min(2, max(0, $horizonDays - 1)));
    $lateDate = $endDate->subDays(min(2, max(0, $horizonDays - 1)));
    $exerciseTriplet = pickExerciseTriplet($exerciseIds, (int) $user->id, (int) $request->id);

    $baseLoad = max(15.0, min(130.0, (float) ($baselineWeight * 0.42)));
    $progressPct = match ($goalMode) {
        'gain' => seededFloat("req{$request->id}:strength_pct", 0.06, 0.12),
        'lose' => seededFloat("req{$request->id}:strength_pct", 0.015, 0.06),
        default => seededFloat("req{$request->id}:strength_pct", 0.03, 0.08),
    };

    $earlyLoads = [];
    $lateLoads = [];
    foreach ($exerciseTriplet as $idx => $exerciseId) {
        $exerciseSeed = "req{$request->id}:ex{$exerciseId}";
        $early = round($baseLoad * (0.82 + ($idx * 0.08) + seededFloat($exerciseSeed.':early', -0.03, 0.04)), 2);
        $late = round($early * (1 + $progressPct + seededFloat($exerciseSeed.':late', -0.01, 0.02)), 2);
        $earlyLoads[$exerciseId] = max(10.0, $early);
        $lateLoads[$exerciseId] = max(10.0, $late);
    }

    $tag = "synthetic_strength_ai_request_{$request->id}";
    if (! $dryRun) {
        seedWorkoutPhase(
            userId: (int) $user->id,
            performedAt: $earlyDate->setTime(8, 30, 0)->toDateTimeString(),
            notes: "{$tag}_early",
            loadsByExerciseId: $earlyLoads,
            stats: $stats
        );
        seedWorkoutPhase(
            userId: (int) $user->id,
            performedAt: $lateDate->setTime(18, 0, 0)->toDateTimeString(),
            notes: "{$tag}_late",
            loadsByExerciseId: $lateLoads,
            stats: $stats
        );
    } else {
        $stats['workout_logs_created'] += 2;
        $stats['workout_sets_created'] += (count($exerciseTriplet) * 3 * 2);
    }

    $stats['requests_processed']++;

    echo sprintf(
        "[%d/%d] req=%d user=%d horizon=%d processed\n",
        $stats['requests_processed'],
        max(1, $requests->count()),
        (int) $request->id,
        (int) $user->id,
        $horizonDays
    );
}

echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

function seedWorkoutPhase(
    int $userId,
    string $performedAt,
    string $notes,
    array $loadsByExerciseId,
    array &$stats
): void {
    DB::transaction(function () use ($userId, $performedAt, $notes, $loadsByExerciseId, &$stats): void {
        $log = WorkoutLog::query()->where('user_id', $userId)->where('notes', $notes)->first();

        if (! $log) {
            $log = WorkoutLog::query()->create([
                'user_id' => $userId,
                'performed_at' => $performedAt,
                'duration_min' => 52,
                'mood' => 'focused',
                'energy' => 'steady',
                'notes' => $notes,
                'meta' => ['synthetic' => true, 'source' => 'progress_label_seed'],
            ]);
            $stats['workout_logs_created']++;
        } else {
            $log->performed_at = $performedAt;
            $log->duration_min = 52;
            $log->mood = 'focused';
            $log->energy = 'steady';
            $log->meta = ['synthetic' => true, 'source' => 'progress_label_seed'];
            $log->save();
            $stats['workout_logs_updated']++;
        }

        WorkoutLogSet::query()
            ->where('workout_log_id', $log->id)
            ->where('notes', 'like', "{$notes}:%")
            ->delete();

        $order = 100;
        foreach ($loadsByExerciseId as $exerciseId => $loadKg) {
            for ($set = 1; $set <= 3; $set++) {
                WorkoutLogSet::query()->create([
                    'workout_log_id' => $log->id,
                    'exercise_id' => (int) $exerciseId,
                    'order_index' => $order++,
                    'weight_kg' => round((float) $loadKg, 2),
                    'reps' => 8 + ($set % 3),
                    'distance_m' => null,
                    'duration_sec' => null,
                    'side' => 'both',
                    'is_warmup' => false,
                    'notes' => "{$notes}:set{$set}",
                    'meta' => ['synthetic' => true, 'source' => 'progress_label_seed'],
                ]);
                $stats['workout_sets_created']++;
            }
        }
    });
}

function pickExerciseTriplet(array $exerciseIds, int $userId, int $requestId): array
{
    $count = count($exerciseIds);
    if ($count <= 3) {
        return $exerciseIds;
    }

    $start = abs(crc32("u{$userId}:r{$requestId}:triplet")) % $count;
    $picked = [];
    for ($i = 0; $i < 3; $i++) {
        $picked[] = $exerciseIds[($start + ($i * 7)) % $count];
    }

    return array_values(array_unique($picked));
}

function goalMode(array $profile): string
{
    $goalText = strtolower(trim(
        (string) ($profile['dietary_goal'] ?? '').' '.(string) ($profile['fitness_goal'] ?? '')
    ));

    if ($goalText !== '' && preg_match('/lose|loss|cut|deficit|fat/', $goalText)) {
        return 'lose';
    }
    if ($goalText !== '' && preg_match('/gain|bulk|muscle|hypertrophy|strength/', $goalText)) {
        return 'gain';
    }

    return 'maintain';
}

function defaultExpectedChangeKg(string $goalMode, int $horizonDays): float
{
    $weeks = max(1.0, $horizonDays / 7.0);
    $weekly = match ($goalMode) {
        'lose' => -0.45,
        'gain' => 0.30,
        default => -0.05,
    };

    return round($weekly * $weeks, 2);
}

function clampDeltaByGoal(float $delta, string $goalMode, int $horizonDays): float
{
    $weeks = max(1.0, $horizonDays / 7.0);

    return match ($goalMode) {
        'lose' => max(-1.2 * $weeks, min(-0.05 * $weeks, $delta)),
        'gain' => max(0.05 * $weeks, min(0.9 * $weeks, $delta)),
        default => max(-0.35 * $weeks, min(0.35 * $weeks, $delta)),
    };
}

function seededFloat(string $seed, float $min, float $max): float
{
    $raw = abs(crc32($seed)) % 1000000;
    $ratio = $raw / 1000000;

    return $min + (($max - $min) * $ratio);
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

function toFloatOrNull(mixed $value): ?float
{
    return is_numeric($value) ? (float) $value : null;
}

