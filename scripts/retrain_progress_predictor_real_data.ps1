param(
    [string]$JsonlOut = "tmp/progress_predictor_dataset_real_only.jsonl",
    [string]$CsvOut = "tmp/progress_predictor_dataset_real_only.csv",
    [string]$ModelOut = "storage/app/ai/models/progress_predictor_v1_real_only"
)

$ErrorActionPreference = "Stop"

Write-Host "Exporting labeled progress dataset..."
php artisan ai:export-progress-prediction-data --out-jsonl=$JsonlOut --out-csv=$CsvOut --include-unlabeled=0
if ($LASTEXITCODE -ne 0) {
    throw "Export command failed with exit code $LASTEXITCODE"
}

Write-Host "Training progress predictor (real-only mode)..."
python scripts/train_progress_predictor.py --data $JsonlOut --out $ModelOut --real-only=1
if ($LASTEXITCODE -ne 0) {
    throw "Training command failed with exit code $LASTEXITCODE"
}

Write-Host "Done."
Write-Host "Dataset: $JsonlOut"
Write-Host "Model dir: $ModelOut"
