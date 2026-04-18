# Progress Predictor Ops

## 1) Validate Model Is Used At Runtime

- Generate a fresh planner run for a user and inspect `progress_prediction.inference_source`.
- Expected when model artifacts exist: `ml_blend`.
- Fallback behavior on failure: `heuristic`.

## 2) Export Labeled Dataset

```bash
php artisan ai:export-progress-prediction-data \
  --out-jsonl=tmp/progress_predictor_dataset_latest.jsonl \
  --out-csv=tmp/progress_predictor_dataset_latest.csv \
  --include-unlabeled=0
```

Dataset now includes synthetic markers:

- `is_synthetic_weight_label`
- `is_synthetic_strength_label`
- `is_synthetic_row`

## 3) Train On All Labels (Demo / Bootstrap)

```bash
python scripts/train_progress_predictor.py \
  --data tmp/progress_predictor_dataset_latest.jsonl \
  --out storage/app/ai/models/progress_predictor_v1
```

## 4) Train On Real-Only Labels

Single command (PowerShell):

```powershell
./scripts/retrain_progress_predictor_real_data.ps1
```

This calls the trainer with `--real-only=1`, which excludes:

- weight rows where `is_synthetic_weight_label=1`
- strength rows where `is_synthetic_strength_label=1`

## 5) Production Cleanup (If Needed)

Dry run:

```bash
php scripts/purge_synthetic_progress_data.php --dry-run
```

Apply:

```bash
php scripts/purge_synthetic_progress_data.php
```

## 6) Weekly Automation Pipeline

Run the full retrain/eval/monitor/smoke flow:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run_progress_predictor_weekly_pipeline.ps1
```

This will:

- retrain real-only model
- run user-group holdout evaluation
- generate latest-30 monitor snapshot
- run planner runtime smoke validation (`ml_blend`)

## 7) Inference Guardrails (Safety Gate)

ML blend can be blocked automatically when confidence/data quality checks fail.

Env knobs:

```dotenv
AI_PROGRESS_PREDICTOR_GUARDRAILS_ENABLED=true
AI_PROGRESS_PREDICTOR_MIN_CONFIDENCE_FOR_ML=medium
AI_PROGRESS_PREDICTOR_REQUIRE_MACRO_TARGETS=true
AI_PROGRESS_PREDICTOR_MIN_MEAL_LOGGED_DAYS=0
AI_PROGRESS_PREDICTOR_MIN_WORKOUT_SESSIONS=0
AI_PROGRESS_PREDICTOR_MAX_WEEKLY_DELTA_GAP_KG=0.8
AI_PROGRESS_PREDICTOR_MAX_ABS_WEEKLY_RATE_KG=1.2
```

When blocked, runtime falls back to conservative heuristic and logs a guardrail reason.
