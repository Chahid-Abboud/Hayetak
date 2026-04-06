# Progress Predictor Pipeline Summary

- Date: 2026-04-05
- Scope: Seed labels for all planner requests, export supervised dataset, train models, wire runtime inference.

## Synthetic Label Seeding

- Script: `tmp/generate_synthetic_progress_labels.php`
- Requests processed: 292
- Baseline measurements created: 40
- End measurements created: 268
- Workout logs created: 584
- Workout sets created: 5256

## Export Results

- Command: `php artisan ai:export-progress-prediction-data --out-jsonl=tmp/progress_predictor_dataset_post_seed.jsonl --out-csv=tmp/progress_predictor_dataset_post_seed.csv --include-unlabeled=0`
- Exported rows: 292
- Rows with weight labels: 292
- Rows with strength labels: 292

## Training Results

- Trainer: `scripts/train_progress_predictor.py`
- Dataset: `tmp/progress_predictor_dataset_post_seed.jsonl`
- Output dir: `storage/app/ai/models/progress_predictor_v1`
- Weight model MAE: 0.22464
- Weight model R2: 0.02662
- Strength model MAE: 0.04454
- Strength model R2: 0.98578

## Runtime Inference Wiring

- Added Python inference bridge script: `scripts/predict_progress_from_features.py`
- Updated runtime predictor to call trained model with fallback:
  - `app/Services/Ai/Models/ProgressPredictionModel.php`
- Added config keys:
  - `config/ai.php` (`progress_predictor.inference.*`)

## Artifacts

- Dataset CSV: `tmp/progress_predictor_dataset_post_seed.csv`
- Dataset JSONL: `tmp/progress_predictor_dataset_post_seed.jsonl`
- Model manifest: `storage/app/ai/models/progress_predictor_v1/manifest.json`
- Weight model: `storage/app/ai/models/progress_predictor_v1/weight_change_model.joblib`
- Strength model: `storage/app/ai/models/progress_predictor_v1/strength_progress_model.joblib`