# Planner Data Minimum + Template Guide

## Bare minimum plan count

If you want the smallest viable dataset that can still improve planner decisions:

- Absolute minimum: `120` completed plan cycles
- Better minimum: `300` completed plan cycles
- Strong training set: `600+` completed plan cycles

A **completed plan cycle** means:

- profile inputs present
- generated plan saved
- adherence captured
- at least one outcome checkpoint captured (14d, 21d, or 28d)

For the `120` minimum, target this checkpoint mix:

- at least `120` with day-14 outcomes
- at least `80` with day-21 outcomes
- at least `50` with day-28 outcomes

## What these plans will do once collected

1. Improve plan quality immediately via retrieval
- Use prior successful plans as examples for similar users.
- Reduce random or repetitive plan choices.

2. Improve regeneration logic
- Learn which plan edits increase adherence and outcomes.
- Make smarter updates when users request "regenerate plan."

3. Improve prediction model quality
- Use real outcomes to calibrate weight/strength forecasts.
- Reduce prediction error over time.

4. Improve safety and constraints consistency
- Better respect medical/injury/allergy patterns from real user history.

## Important coverage rules (do not skip)

Even with low volume, keep distribution balanced:

- goals: fat loss, recomposition, strength/performance all represented
- sex: both represented
- workout location: home and gym represented
- medical/injury buckets represented (not one dominant condition only)

## Files to fill

- `docs/ai/templates/planner_profiles_template.csv`
- `docs/ai/templates/planner_plan_runs_template.csv`
- `docs/ai/templates/planner_outcomes_template.csv`
- `docs/ai/templates/planner_regen_feedback_template.csv`

You can open each CSV in Excel directly.

## Automatic progress check command

Run this after each import batch:

```bash
php artisan ai:planner-dataset-readiness \
  --dir=tmp/planner_realistic_examples_1 \
  --out-json=tmp/ai_deep_audit_safe_run/planner_dataset_readiness_latest.json
```

What it gives you:

- row counts for profiles/plan-runs/outcomes/regen
- integrity checks between files (broken references)
- missing-column and missing-value checks
- progress vs minimum targets:
  - completed plan cycles (`120`)
  - runs with day-14 outcome (`120`)
  - runs with day-21 outcome (`80`)
  - runs with day-28 outcome (`50`)
- exact remaining gaps for each target

If you want CI to fail while below target:

```bash
php artisan ai:planner-dataset-readiness \
  --dir=tmp/planner_realistic_examples_1 \
  --fail-below-target=1
```

## One-step ingest + readiness workflow

Put each new batch folder (4 CSV files) somewhere like:

- `tmp/planner_batches/batch_2026_04_10/`

Then run:

```bash
php artisan ai:planner-dataset-ingest-batch \
  --incoming-dir=tmp/planner_batches/batch_2026_04_10 \
  --master-dir=storage/app/ai/training/planner_dataset \
  --run-readiness=1 \
  --readiness-out-json=tmp/ai_deep_audit_safe_run/planner_dataset_readiness_latest.json
```

This will:

- merge the incoming CSV rows into master dataset files
- deduplicate by IDs (`profile_id`, `plan_run_id`, `outcome_id`, `regen_event_id`)
- update changed rows for existing IDs
- run readiness checks automatically

Ingest summary output:

- `tmp/ai_deep_audit_safe_run/planner_dataset_ingest_latest.json`

## Prompt to request real-data exports (copy/paste)

Use this prompt with your data/ops analyst (or another assistant connected to your DB):

```text
Export a REAL (not synthetic) planner training batch from Hayetak for users who explicitly consented to analytics/model improvement.

Requirements:
1) Export exactly 4 CSVs with these filenames:
   - planner_profiles_template.csv
   - planner_plan_runs_template.csv
   - planner_outcomes_template.csv
   - planner_regen_feedback_template.csv
2) Match headers exactly to our templates in docs/ai/templates.
3) Use hashed user IDs only (no raw email, no name, no phone, no free-text PII).
4) Include only completed plan cycles with valid links:
   - profiles.profile_id -> plan_runs.profile_id
   - plan_runs.plan_run_id -> outcomes.plan_run_id
   - regen previous/new plan IDs must exist in plan_runs
5) Outcome coverage target in this batch:
   - as many day-14 outcomes as possible
   - include day-21/day-28 wherever available
6) Do not fabricate values; leave unknown numeric values empty.
7) Return a short QA note:
   - row counts per CSV
   - missingness per critical column
   - count of records dropped for privacy/consent rules

Output folder name: batch_YYYY_MM_DD_realdata
```
