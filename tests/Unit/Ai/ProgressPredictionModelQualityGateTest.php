<?php

use App\Services\Ai\Models\ProgressPredictionModel;
use Illuminate\Support\Facades\File;

uses(Tests\TestCase::class);

function writeProgressPredictorManifest(string $dir, float $weightR2, float $strengthR2, float $weightMae = 0.25, float $strengthMae = 0.8): void
{
    File::ensureDirectoryExists($dir);
    File::put($dir.'/weight_change_model.joblib', 'fake');
    File::put($dir.'/strength_progress_model.joblib', 'fake');
    File::put($dir.'/manifest.json', json_encode([
        'name' => 'test_predictor',
        'real_only' => true,
        'weight_rows' => 100,
        'weight_test_users' => 8,
        'weight_metrics' => [
            'mae' => $weightMae,
            'r2' => $weightR2,
        ],
        'strength_model' => [
            'test_users' => 8,
            'metrics' => [
                'mae' => $strengthMae,
                'r2' => $strengthR2,
            ],
        ],
    ], JSON_THROW_ON_ERROR));
}

function writeWeightOnlyProgressPredictorManifest(string $dir, float $weightR2, float $weightMae = 0.25): void
{
    File::ensureDirectoryExists($dir);
    File::put($dir.'/weight_change_model.joblib', 'fake');
    File::put($dir.'/manifest.json', json_encode([
        'name' => 'test_predictor_weight_only',
        'real_only' => true,
        'weight_rows' => 100,
        'weight_test_users' => 8,
        'weight_metrics' => [
            'mae' => $weightMae,
            'r2' => $weightR2,
        ],
        'strength_model' => [
            'status' => 'disabled_by_training_option',
            'rows' => 100,
        ],
    ], JSON_THROW_ON_ERROR));
}

it('blocks trained progress predictor artifacts with weak manifest holdout metrics', function () {
    $baseRelative = 'tmp/test_progress_predictor_quality_gate';
    $base = base_path($baseRelative);
    File::deleteDirectory($base);

    $primary = $base.'/primary';
    $fallback = $base.'/fallback';
    writeProgressPredictorManifest($primary, 0.01, -0.06, 0.44, 1.55);
    writeProgressPredictorManifest($fallback, -0.33, 0.89, 0.25, 0.68);

    config()->set('ai.progress_predictor.inference.model_dir', $baseRelative.'/primary');
    config()->set('ai.progress_predictor.inference.fallback_model_dir', $baseRelative.'/fallback');
    config()->set('ai.progress_predictor.inference.guardrails.require_manifest_quality', true);
    config()->set('ai.progress_predictor.inference.guardrails.min_weight_r2_for_ml', 0.05);
    config()->set('ai.progress_predictor.inference.guardrails.min_strength_r2_for_ml', 0.05);

    $model = app(ProgressPredictionModel::class);
    $method = new ReflectionMethod($model, 'resolveInferenceModelDir');
    $method->setAccessible(true);

    expect($method->invoke($model))->toBeNull();

    File::deleteDirectory($base);
});

it('allows trained progress predictor artifacts when manifest holdout metrics pass thresholds', function () {
    $baseRelative = 'tmp/test_progress_predictor_quality_gate_pass';
    $base = base_path($baseRelative);
    File::deleteDirectory($base);

    $primary = $base.'/primary';
    writeProgressPredictorManifest($primary, 0.22, 0.31, 0.22, 0.7);

    config()->set('ai.progress_predictor.inference.model_dir', $baseRelative.'/primary');
    config()->set('ai.progress_predictor.inference.fallback_model_dir', $baseRelative.'/primary');
    config()->set('ai.progress_predictor.inference.guardrails.require_manifest_quality', true);
    config()->set('ai.progress_predictor.inference.guardrails.min_weight_r2_for_ml', 0.05);
    config()->set('ai.progress_predictor.inference.guardrails.min_strength_r2_for_ml', 0.05);

    $model = app(ProgressPredictionModel::class);
    $method = new ReflectionMethod($model, 'resolveInferenceModelDir');
    $method->setAccessible(true);

    expect($method->invoke($model))->toBe($primary);

    File::deleteDirectory($base);
});

it('allows weight-only trained artifacts when weight metrics pass and strength ml is disabled', function () {
    $baseRelative = 'tmp/test_progress_predictor_quality_gate_weight_only';
    $base = base_path($baseRelative);
    File::deleteDirectory($base);

    $primary = $base.'/primary';
    writeWeightOnlyProgressPredictorManifest($primary, 0.91, 0.13);

    config()->set('ai.progress_predictor.inference.model_dir', $baseRelative.'/primary');
    config()->set('ai.progress_predictor.inference.fallback_model_dir', $baseRelative.'/primary');
    config()->set('ai.progress_predictor.inference.guardrails.require_manifest_quality', true);
    config()->set('ai.progress_predictor.inference.guardrails.allow_weight_only_ml', true);
    config()->set('ai.progress_predictor.inference.guardrails.min_weight_r2_for_ml', 0.05);
    config()->set('ai.progress_predictor.inference.guardrails.max_weight_mae_kg_for_ml', 0.4);

    $model = app(ProgressPredictionModel::class);
    $method = new ReflectionMethod($model, 'resolveInferenceModelDir');
    $method->setAccessible(true);

    expect($method->invoke($model))->toBe($primary);

    File::deleteDirectory($base);
});
