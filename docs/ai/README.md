# Hayetak AI File Map

This folder is the entry point for AI planning, chatbot, audit, and training documentation.

## Backend code

- `app/Services/Ai/` - planner, coach chat, prompts, schemas, tools, audit, training, persistence, and runtime services.
- `app/Http/Controllers/Ai/` - AI web/API controllers.
- `app/Http/Requests/Ai/` - AI request validation.
- `app/Http/Resources/Ai/` - AI response resources.
- `app/Jobs/Ai/` - queued AI work such as plan generation, planner audits, and context sync.
- `app/Console/Commands/Ai/` - AI Artisan commands.
- `app/Models/Ai/` - AI persistence models for plans, requests, conversations, messages, feedback, and usage logs.
- `app/Models/Ai/Audit/` - audit-specific AI models.
- `config/ai.php` - AI provider, planner, chat, and progress predictor settings.

## Database support

- `database/factories/Ai/` - factories for AI models.
- `database/seeders/Ai/` - AI profile and demo-data seeders.
- `database/seeders/Ai/Data/` - AI catalog/data-quality seeders.
- `database/migrations/` - AI migrations stay flat by timestamp so Laravel discovery remains conventional.

## Scripts

- `scripts/ai/audit/` - planner/chatbot audit runners and load-control helpers.
- `scripts/ai/training/` - model training, prediction, and holdout evaluation scripts.
- `scripts/ai/data/` - progress predictor data export, cleanup, retraining, and monitoring scripts.
- `scripts/ai/selfhosted/` - local/self-hosted coach setup scripts.

## Data and outputs

- `database/seeders/data/` - import data used by seeders.
- `docs/ai/checklists/` - planner and chatbot checklist/reference files.
- `docs/ai/audits/` - AI audit writeups and analysis.
- `docs/ai/diagrams/` - AI diagram source markdown.
- `docs/ai/templates/` - planner dataset templates intended for review and reuse.
- `tmp/` - generated audit, planner, chatbot, and predictor outputs. Keep this flat or run-specific unless an output is promoted into docs.

## Notes

Migrations stay in `database/migrations/` because Laravel discovers them there by timestamp. AI migrations are named with `ai`, `planner_audit`, or the affected table in the filename.
