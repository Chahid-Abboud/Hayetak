# Next Steps Execution Report

## Completed

- Added synthetic markers in progress export rows:
  - `is_synthetic_weight_label`
  - `is_synthetic_strength_label`
  - `is_synthetic_row`
- Added synthetic row filtering in exporter:
  - `--exclude-synthetic=1`
  - `--only-synthetic=1`
- Added real-only training mode in trainer:
  - `python scripts/train_progress_predictor.py --real-only=1 ...`
- Added one-command real-only retrain script:
  - `scripts/retrain_progress_predictor_real_data.ps1`
- Added synthetic purge utility:
  - `scripts/purge_synthetic_progress_data.php`
- Added ops documentation:
  - `docs/ai/progress-predictor-ops.md`
- Ran sample planner validation (users 1, 40, 50 for horizons 14/21/28):
  - all 9/9 successful
  - all `progress_prediction.inference_source=ml_blend`

## Key Outputs

- Labeled dataset with synthetic markers:
  - `tmp/progress_predictor_dataset_post_seed_v2.csv`
  - `tmp/progress_predictor_dataset_post_seed_v2.jsonl`
- Validation report:
  - `tmp/planner_ml_blend_validation_20260405_115142.csv`
  - `tmp/planner_ml_blend_validation_20260405_115142.md`
- Trained model artifacts (all-label mode):
  - `storage/app/ai/models/progress_predictor_v1/weight_change_model.joblib`
  - `storage/app/ai/models/progress_predictor_v1/strength_progress_model.joblib`
  - `storage/app/ai/models/progress_predictor_v1/manifest.json`

## Real-Only Training Status

- Current real-only weight-labeled rows: 22
- Required minimum for trainer: 30
- Result: real-only training fails by design until more real labels are collected.

## Suggested Ongoing Command

- Keep using:
  - `powershell -ExecutionPolicy Bypass -File scripts/retrain_progress_predictor_real_data.ps1`
- It now exits non-zero if training fails.