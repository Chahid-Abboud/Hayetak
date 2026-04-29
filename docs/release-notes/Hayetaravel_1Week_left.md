# Hayetaravel 1 Week Left

## Pull Request Title

Hayetaravel 1 Week Left: AI planner, coach chatbot, admin workspace, audit tooling, and project readiness updates

## Detailed Description

This branch captures the current Hayetak project state for the final one-week push. It includes the AI planner and AI coach chatbot implementation work, the admin workspace additions, expanded data/audit tooling, safety and quality checks, and the related frontend/backend wiring needed to exercise these flows in the Laravel + React application.

### What Changed

- Added and expanded AI planner infrastructure for generating diet and workout plans from user profile, health, injury, goal, equipment, and dietary restriction context.
- Added AI coach chatbot infrastructure with conversation storage, message handling, context assembly, safety review, deterministic fallback responses, and tool-backed support for recipes, macros, recent summaries, exercise alternatives, and nearby professionals or gyms.
- Added AI runtime configuration for self-hosted Ollama/Qdrant based chat and planner flows, including model names, timeouts, token budgets, retrieval settings, and rate limits.
- Added planner schema, validation, persistence, local fallback, prompt templates, plan quality scoring, and user-facing response sanitization support.
- Added progress-prediction support that combines heuristic projections with optional trained model artifacts guarded by manifest and runtime quality checks.
- Added AI audit, checklist, food catalog, seeded data, planner evaluation, and progress-predictor scripts/reports used to test safety and quality.
- Added admin-facing pages and supporting components for overview, analytics, diagnostics, exercises, meal logs, privacy/compliance, assignments, support cases, feature flags, safety rules, and AI rollouts.
- Added role and professional workflow support, including professional clients, appointments, messaging, verification, admin logs, notifications, and related resource/controller/request updates.
- Added and updated tests for AI planner generation, chatbot visibility, safety guard behavior, tool execution, food catalog filtering, planner persistence, audit commands, progress-predictor quality gates, seeders, auth, RBAC, messaging, appointments, and admin/user workflows.
- Added documentation for AI architecture, AI model diagrams, runbooks, checklists, admin workspace behavior, brand palette, and project quick-start material.
- Added generated audit artifacts and imported planner/user data snapshots under `tmp/` for inspection and reproducibility of recent AI evaluation runs.

### User And Developer Impact

- Users can generate safer personalized plans and receive context-aware coach responses using their saved restrictions, logs, active plans, and recent history.
- Admins have broader dashboard/admin surfaces for monitoring users, AI rollouts, safety, diagnostics, meals, exercises, logs, and operational workflows.
- Developers have more structured AI services under `app/Services/Ai/`, clearer AI model diagrams, richer tests, and repeatable audit artifacts for planner/chatbot quality.
- The project is closer to final-demo readiness, with local run instructions and operational notes captured below.

## How To Run The Project Locally

1. Install PHP and Node dependencies:

```bash
composer install
npm install
```

2. Configure environment:

```bash
cp .env.example .env
php artisan key:generate
```

3. Set database and AI-related variables in `.env`. Important AI variables include:

```env
AI_CHAT_PROVIDER=self_hosted
AI_SELF_HOSTED_OLLAMA_URL=http://127.0.0.1:11434
AI_SELF_HOSTED_LLM_MODEL=llama3.1:8b
AI_SELF_HOSTED_EMBED_MODEL=nomic-embed-text
AI_SELF_HOSTED_QDRANT_URL=http://127.0.0.1:6333
```

4. Run migrations and seeders as needed:

```bash
php artisan migrate
php artisan db:seed
```

5. Start the full development stack:

```bash
composer dev
```

The app should be available at:

```text
http://127.0.0.1:8000
```

## How To Run Admin Pages And Features

1. Log in with a user that has the `admin` role.
2. Visit the admin pages from the sidebar/navigation or directly by URL. Common admin areas include:

- `/admin/overview`
- `/admin/users`
- `/admin/analytics`
- `/admin/diagnostics`
- `/admin/ai-rollouts`
- `/admin/settings-feature-flags`
- `/admin/safety-rules`
- `/admin/exercises`
- `/admin/meals`
- `/admin/meal-logs`
- `/admin/assignments`
- `/admin/professionals`
- `/admin/professional-verifications`
- `/admin/appointments`
- `/admin/logs`
- `/admin/notifications`
- `/admin/privacy-compliance`
- `/admin/support-cases`

3. If an admin page returns `403`, confirm the logged-in user role in the database is `admin`.
4. If professional-only pages are hidden or blocked, confirm the user has the correct professional role and verified professional status.
5. If AI pages do not respond, confirm Ollama/Qdrant are running or switch `AI_CHAT_PROVIDER=stub` for local fallback-style testing.

## Useful Feature Checks

```bash
npm run types
npm run lint
php artisan test
php artisan test --testsuite=Feature
php artisan test --filter=Ai
```

For targeted AI checks:

```bash
composer test:ai
php artisan ai:chatbot-checklist
php artisan ai:planner-audit-users
```

## Validation Notes

Before marking this branch ready, run the project checks locally and confirm GitHub Actions pass after push. If `gh` is installed, create the PR with this title and use this file as the body source.
