# Progress Predictor (Data + Training)

This project now includes a real supervised-data pipeline for progress prediction based on planner generations and user outcomes.

## What changed

- New export command:
  - `php artisan ai:export-progress-prediction-data`
- New training script:
  - `python scripts/train_progress_predictor.py`
- Runtime predictor improvement:
  - `ProgressPredictionModel` now prefers latest `measurements.weight_kg` and adjusts projections using measured historical error when available.

## Export training rows

Run:

```bash
php artisan ai:export-progress-prediction-data
```

Check label readiness:

```bash
php artisan ai:list-progress-label-readiness
```

Optional flags:

- `--limit=2000`
- `--user-id=40`
- `--include-unlabeled=1` (keeps rows even when end weight is missing)
- `--out-jsonl=storage/app/ai/training/progress_predictor_dataset.jsonl`
- `--out-csv=storage/app/ai/training/progress_predictor_dataset.csv`

The exporter joins:

- `ai_requests` (`plan_generator`, completed)
- `measurements` (baseline/end labels)
- `meal_entries` + `foods` (adherence and intake features)
- `workout_logs` + `workout_log_sets` (training load and strength features)

## Train with open-source model

Install dependencies:

```bash
pip install pandas numpy scikit-learn joblib
```

Train:

```bash
python scripts/train_progress_predictor.py \
  --data storage/app/ai/training/progress_predictor_dataset.jsonl \
  --out storage/app/ai/models/progress_predictor_v1
```

Outputs:

- `storage/app/ai/models/progress_predictor_v1/weight_change_model.joblib`
- `storage/app/ai/models/progress_predictor_v1/strength_progress_model.joblib` (if enough labels)
- `storage/app/ai/models/progress_predictor_v1/manifest.json`

## Retraining loop (recommended)

1. Export fresh rows weekly.
2. Retrain model.
3. Compare MAE/R2 in `manifest.json`.
4. Keep the better artifact version.

This keeps predictions aligned with real user behavior as more logs and measurements are collected.
