param(
    [string]$JsonlOut = "tmp/progress_predictor_dataset_real_only.jsonl",
    [string]$CsvOut = "tmp/progress_predictor_dataset_real_only.csv",
    [string]$ModelOut = "storage/app/ai/models/progress_predictor_v1_real_only",
    [int]$MonitorLimit = 30,
    [double]$MonitorThreshold = 90
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "==> Step 1/4: Retrain progress predictor (real-only)"
powershell -ExecutionPolicy Bypass -File scripts\retrain_progress_predictor_real_data.ps1 -JsonlOut $JsonlOut -CsvOut $CsvOut -ModelOut $ModelOut
if ($LASTEXITCODE -ne 0) {
    throw "Retrain script failed with exit code $LASTEXITCODE"
}

Write-Host "==> Step 2/4: Holdout evaluation (group split by user)"
python scripts/evaluate_progress_predictor_holdout.py --data $JsonlOut --out-dir tmp --tag $stamp
if ($LASTEXITCODE -ne 0) {
    throw "Holdout evaluation failed with exit code $LASTEXITCODE"
}

Write-Host "==> Step 3/4: Latest-$MonitorLimit monitoring snapshot"
php scripts/progress_predictor_monitor_latest.php --limit=$MonitorLimit --threshold=$MonitorThreshold
if ($LASTEXITCODE -ne 0) {
    throw "Monitoring snapshot failed with exit code $LASTEXITCODE"
}

Write-Host "==> Step 4/4: Runtime smoke check (ml_blend sample)"
php tmp\validate_planner_ml_blend_sample.php
if ($LASTEXITCODE -ne 0) {
    throw "Runtime smoke check failed with exit code $LASTEXITCODE"
}

Write-Host "Weekly pipeline completed successfully."
Write-Host "Dataset: $JsonlOut"
Write-Host "Model dir: $ModelOut"

