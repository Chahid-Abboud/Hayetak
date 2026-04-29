# Low-GPU Audit Runbook

This runbook prepares and runs Planner + Coach audit flows with throttled settings to avoid GPU spikes.

## 0) Ensure Local AI Services Are Up

```powershell
docker compose -f docker-compose.selfhosted-ai.yml up -d qdrant
```

## 1) Preflight Only (No Heavy AI Load)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai/audit/prepare_ai_low_gpu_run.ps1 -OutDir tmp/ai_deep_audit_safe_run
```

Outputs:

- `tmp/ai_deep_audit_safe_run/preflight_low_gpu_latest.json`
- `tmp/ai_deep_audit_safe_run/logs/`

## 2) Full Audit Pipeline (Low-GPU Profile)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai/audit/run_ai_low_gpu_pipeline.ps1 `
  -OutDir tmp/ai_deep_audit_safe_run `
  -MaxAccounts 3 `
  -QuestionsPerCategory 100 `
  -ChatFullUsers 1 `
  -ChatSecondaryPerCategory 30 `
  -ChatBatchSize 3 `
  -ChatBatchBreakSeconds 15 `
  -ChatCategoryBreakSeconds 25 `
  -PlannerHorizon 21 `
  -PlannerBreakSeconds 30 `
  -PlannerEvalSleepMs 4000 `
  -PlannerEvalLimit 0 `
  -SkipPredictorAudit
```

What this runs:

1. Preflight checks
2. `php artisan ai:deep-audit ...` (throttled)
3. `php artisan ai:planner-batch-eval ...` (throttled)

Optional predictor pipeline:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai/audit/run_ai_low_gpu_pipeline.ps1 `
  -OutDir tmp/ai_deep_audit_safe_run `
  -RunPredictorPipeline
```

## 3) Dry Run (Command Validation Only)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai/audit/run_ai_low_gpu_pipeline.ps1 -DryRun
```

## 4) Adaptive 3-User Deep Audit (Live Progress + Load Popup)

Use this when you want to keep the GPU load adjustable while the run is in progress.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai/audit/run_ai_adaptive_deep_audit.ps1 `
  -OutDir tmp/ai_deep_audit_safe_run `
  -UserIds "17,20,41" `
  -InitialProfile low `
  -IncludePredictorAudit `
  -EtaUpdateMinutes 5
```

What this adds:

- Live terminal progress bar with ETA.
- Always-on popup (`Low`, `Mid`, `High`) to change load profile during the run.
- Per-phase execution:
  1. User 1 full audit (100/100/100 chat + planner)
  2. User 2 secondary audit (30/30/30 chat + planner)
  3. User 3 secondary audit (30/30/30 chat + planner)
- Fresh consolidated report at the end.

Where to monitor:

- Terminal progress bar.
- `.../adaptive_run_<timestamp>/live_progress.json`
- `.../adaptive_run_<timestamp>/logs/`

Where results are saved:

- `.../adaptive_run_<timestamp>/ai_deep_audit_consolidated_<timestamp>.json`
- `.../adaptive_run_<timestamp>/ai_deep_audit_consolidated_<timestamp>.md`
- Per-phase outputs under `.../adaptive_run_<timestamp>/user_*`

## Notes

- This pipeline uses process-local environment overrides to reduce model output/token pressure during the run:
  - `AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS=500`
  - `AI_COACH_MAX_OUTPUT_TOKENS=700`
  - `AI_SELF_HOSTED_TEMPERATURE=0.15`
  - `AI_SELF_HOSTED_LLM_TIMEOUT=90`
  - `AI_PLANNER_OLLAMA_TIMEOUT=90`
- If `nvidia-smi` is available, the runner checks utilization between steps and waits for cooldown automatically.
- Main summaries:
  - `tmp/ai_deep_audit_safe_run/low_gpu_pipeline_summary_latest.json`
  - `tmp/ai_deep_audit_safe_run/ai_deep_audit_*.json` and `.md`
  - `tmp/ai_deep_audit_safe_run/plan_batch_eval_*.json|.csv|.md`
