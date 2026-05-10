# AI Complexity Gap Analysis Checklist (Action Plan)

Branch context: `planner_updated`  
Goal: Strengthen technical depth and defense strength.

How to use:
- Mark each item as done when implemented.
- Keep evidence links (PRs, logs, metrics, demo screenshots).

## 1) Current Baseline Snapshot

- [x] Planner uses LLM structured generation with strict JSON schema
- [x] Coach uses context-aware chat with retrieval and safety checks
- [x] Tool layer exists (`search_recipes`, macros, 7-day summary, alternatives, nearby)
- [x] Progress predictor includes supervised ML + guardrails
- [x] AI requests/messages/usage are persisted and traceable
- [ ] Streaming chat transport is enabled
- [ ] Automated red-team safety benchmark exists
- [ ] Offline quality benchmark and regression gate exists
- [ ] Controlled provider fallback strategy is active in production
- [ ] Model versioning dashboard with drift alerts exists

## 2) Highest-Impact Gaps (Priority Order)

## P1: Safety Evaluation Suite
Impact: Very high  
Effort: Medium

- [ ] Build a fixed test set for allergy, diet-type, injury, and emergency prompts
- [ ] Add automated pass/fail safety checks in CI
- [ ] Track safety score trend by commit and by model version
- [ ] Require zero critical safety violations before merge

Evidence to collect:
- CI report screenshots
- before/after violation counts
- sample blocked unsafe outputs

## P1: Deterministic + LLM Consistency Bench
Impact: High  
Effort: Medium

- [ ] Create benchmark prompts for deterministic responder coverage
- [ ] Measure consistency between deterministic and model paths
- [ ] Add explicit assertions for profile-grounded answers (weight/protein examples)
- [ ] Fail tests when hallucinated profile facts appear

Evidence to collect:
- benchmark table (coverage %, factuality %, safety %)
- failed-example catalog

## P1: Planner Output Structural Robustness
Impact: High  
Effort: Medium

- [ ] Add property-based tests for planner JSON shape and day counts
- [ ] Add stress tests for malformed model output and retry behavior
- [ ] Add schema migration/version compatibility tests
- [ ] Add idempotency checks for persistence layer

Evidence to collect:
- automated test counts and pass rates
- malformed-output recovery examples

## P2: Streaming Chat Experience
Impact: Medium-high  
Effort: Medium

- [ ] Implement token-streaming endpoint for `/api/ai/chat`
- [ ] Add frontend streaming renderer in `ai/chat.tsx`
- [ ] Maintain safety post-check in streamed completion finalization
- [ ] Add timeout/cancel/retry UX with graceful degradation

Evidence to collect:
- demo recording
- latency comparison (streaming vs non-streaming)

## P2: Retrieval Quality and Drift Monitoring
Impact: Medium-high  
Effort: Medium

- [ ] Add retrieval diagnostics: hit rate, top score, context truncation rate
- [ ] Add stale-context detector for key profile changes
- [ ] Add periodic vector integrity checks for per-user data
- [ ] Add retrieval quality dashboards (weekly trend)

Evidence to collect:
- retrieval telemetry charts
- stale-context incident rate

## P2: ML Predictor Validation Rigor
Impact: Medium-high  
Effort: Medium

- [ ] Add holdout and time-split evaluation reports for progress predictor
- [ ] Track MAE/R2 by segment (goal type, adherence level, logging completeness)
- [ ] Add calibration/error plots to model artifacts
- [ ] Add automatic retrain trigger threshold with approval workflow

Evidence to collect:
- metrics report in `storage/app/ai/models/...`
- calibration charts
- retrain log trail

## P3: Fallback Strategy Maturity
Impact: Medium  
Effort: Low-medium

- [ ] Enable and test planner fallback matrix (primary/fallback/local)
- [ ] Add explicit fallback reason taxonomy in logs
- [ ] Add dashboard card for fallback frequency and causes
- [ ] Add SLO alerts for repeated fallback events

Evidence to collect:
- fallback event distribution
- MTTR after provider incidents

## P3: Explainability and Defense Artifacts
Impact: Medium  
Effort: Low

- [ ] Add model cards for planner, coach, and predictor
- [ ] Add architecture decision records (ADR) for key AI design choices
- [ ] Add “known limitations” section with mitigation status
- [ ] Add reproducibility script for evaluation pipeline

Evidence to collect:
- model card docs
- ADR entries

## 3) Complexity Upgrade Targets (Scoring)

Use this scoring to show defense progression.

## Current estimated level
- Applied AI architecture: Strong
- Evaluation maturity: Moderate
- Observability maturity: Moderate
- Safety benchmark maturity: Basic-moderate

## Target after checklist completion
- Applied AI architecture: Very strong
- Evaluation maturity: Strong
- Observability maturity: Strong
- Safety benchmark maturity: Strong

## 4) Acceptance Criteria for “Advanced AI Project” Claim

Mark all to confidently claim advanced applied AI complexity:

- [ ] Reproducible benchmark suite with historical results
- [ ] Automated safety regression gates in CI
- [ ] Streaming or low-latency adaptive UX for chat
- [ ] Measured retrieval quality and drift monitoring
- [ ] ML predictor evaluation by segments with documented metrics
- [ ] Incident-aware fallback strategy and telemetry
- [ ] Publicly presentable model cards and limitations document

## 5) 30-60-90 Day Practical Plan

## First 30 days
- [ ] Implement safety benchmark suite + CI gate
- [ ] Add planner structural robustness tests
- [ ] Add basic retrieval diagnostics logs

## Next 60 days
- [ ] Launch streaming chat
- [ ] Add predictor segmented metrics and calibration reports
- [ ] Enable fallback telemetry and dashboard card

## Next 90 days
- [ ] Complete model cards + ADR package
- [ ] Add drift alerts and retrain governance loop
- [ ] Freeze a defense-ready benchmark report snapshot

## 6) Suggested Evidence Folder Structure

Create and maintain:

- `docs/defense/evidence/benchmarks/`
- `docs/defense/evidence/safety/`
- `docs/defense/evidence/retrieval/`
- `docs/defense/evidence/predictor/`
- `docs/defense/evidence/incidents/`

Store:
- screenshots
- CSV metric exports
- CI logs
- short demo clips
- PR links

