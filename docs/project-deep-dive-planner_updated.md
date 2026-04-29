# Hayetak Project Deep Dive (Branch: `planner_updated`)

Generated on: 2026-04-06  
Repo branch checked: `planner_updated`

This document explains your project end-to-end:
- what the project is about
- how the Laravel + React app is structured
- all major file types and what they do
- each page and its functionality
- each AI model/runtime path, its structure, and execution flow
- whether this is truly an AI system and how complex it is

## 1) What Your Project Is About

Hayetak is a health platform focused on:
- personalized nutrition planning
- personalized workout planning
- adaptive AI coaching chat
- daily tracking (meals, macros, workouts, water, measurements)
- nearby discovery (gyms/nutritionists)
- professional workflows (trainers/dietitians + client assignments)
- admin moderation and operations

From the codebase behavior, your two core AI features are:
- Planner: generates structured diet + workout plans from user profile and restrictions.
- Coach Chatbot: answers nutrition/workout questions using user context (profile, restrictions, today logs, last 7 days, plans, recent chat context), with safety controls.

## 2) High-Level Architecture

## Backend
- Framework: Laravel 12
- Language: PHP 8.2+
- Auth/security: Laravel Fortify + email verification + optional 2FA
- Database: PostgreSQL-style schema design (JSONB-compatible patterns used)
- Queue/jobs: used for plan generation and AI context sync

## Frontend
- Framework: React 19 + TypeScript
- Transport: Inertia.js (server-side Laravel routes render React pages)
- Styling/UI: Tailwind + componentized UI layer (`resources/js/components`)

## AI Runtime Layer
- Planner generation: Ollama (configured), with strict JSON schema
- Coach generation: self-hosted Ollama + Qdrant retrieval
- Embeddings: `nomic-embed-text` (Ollama embedding endpoint)
- Additional ML predictor: scikit-learn RandomForest via Python subprocess

## 3) End-to-End Functional Flows

## A) Signup -> Profile Sync -> Auto Plan Generation
1. User registers from `auth/register`.
2. `RegisterWizardController` validates profile, goals, restrictions, account type.
3. User and optional professional verification records are created.
4. `PlannerProfileSyncService` normalizes profile safety data into dedicated tables:
   - `user_dietary_restrictions`
   - `user_medical_histories`
5. `AutoPlanGenerationService` dispatches `GeneratePlansForUser` for client users if no active AI plans exist.
6. Queue job calls `PlannerService->generate(...)`.

## B) Manual Planner Flow (`/ai/planner`)
1. Frontend page posts to `POST /api/ai/plan`.
2. `StorePlanRequest` validates horizon + profile overrides.
3. `PlanGenerationController` calls `PlannerService`.
4. Planner pipeline:
   - context build
   - strict prompt + strict schema generation
   - normalization + safety validation
   - progress prediction attachment
   - persistence to AI and normalized operational plan tables
5. Response includes generated plan, provider/model metadata, usage, and quality.

## C) Coach Chat Flow (`/coach`)
1. Frontend loads conversations and messages.
2. User sends message to `POST /api/ai/chat`.
3. `ChatOrchestrator` performs:
   - intent classification
   - preflight emergency safety short-circuit
   - context construction (profile + restrictions + selected date + last 7 days + plans + memory)
   - deterministic tool planning/execution
   - deterministic responder override when applicable
   - otherwise model call via selected provider (self-hosted in your env)
   - post-response safety sanitization
   - persistence + usage + quality logging

## D) Self-Hosted Coach Context Sync
When relevant models change (user profile, restrictions, meals, workouts, plans):
1. observers in `AppServiceProvider` trigger `AiContextSyncDispatcher`
2. `SyncUserAiContext` job runs
3. `SelfHostedContextAwareChatService->syncUserContext(...)` rebuilds indexed documents for that user in Qdrant

## 4) File Types In This Project (Tracked Files)

Counts from tracked files (`git ls-files`):

| File type | Count | Purpose in your project |
|---|---:|---|
| `.php` | 387 | Laravel app logic: controllers, models, services, policies, jobs, commands, migrations, config |
| `.tsx` | 179 | React pages/components with Inertia rendering and frontend business logic |
| `.md` | 49 | Project docs and architecture notes |
| `.json` | 28 | Config metadata, package config, manifests |
| `.csv` | 23 | Datasets/catalog data |
| `.ts` | 13 | Frontend utility/types/routing helpers |
| `.py` | 10 | ML/data scripts (training, inference, generation, serving) |
| `.jsonl` | 7 | AI training/export datasets |
| `.ps1` | 6 | Windows automation scripts (self-hosted AI setup/start/pipeline tasks) |
| `.css` | 5 | Global/style assets |
| `.yml` | 4 | CI or service configuration |
| `.sql` | 2 | SQL helper scripts |
| `.svg/.png/.ico` | few | Static assets |
| `.lock` | 1 | Dependency lockfile |
| `[no-ext]` | 3 | Shell-ish/utility files with no extension |

Important note:
- Your working directory also contains runtime/vendor/generated files not listed above (for example many `.js`/`.map` under dependencies). The table above is only tracked source files.

## 5) Project Directory Roles

## Backend core
- `app/Http/Controllers`: web/API orchestration
- `app/Http/Requests`: request validation contracts
- `app/Models`: Eloquent models and relations
- `app/Services/Ai`: AI domain logic (planner/chat/runtime/tools/evaluation)
- `app/Jobs`: queued execution (`GeneratePlansForUser`, `SyncUserAiContext`)
- `app/Console/Commands`: operational commands for AI pipelines and exports
- `app/Support/Ai`: sync dispatcher glue
- `database/migrations`: schema evolution

## Frontend core
- `resources/js/pages`: route-level pages (Inertia endpoints)
- `resources/js/components`: reusable UI and feature components
- `resources/js/layouts`: auth/settings/global page layouts
- `resources/js/types`: shared TS domain types

## AI prompt assets
- `resources/ai/prompts/planner/*`
- `resources/ai/prompts/coach/*`

## Data/ML scripts
- `scripts/*.py`: training/inference/serving helpers
- `scripts/*.ps1`: setup/retrain/operational automation

## 6) Page-by-Page Functionality Map

Below is each page under `resources/js/pages` and what it does.

## Public + Auth
- `welcome.tsx`
  - Route: `/`
  - Landing page, marketing/explainer, CTA to register/login.

- `auth/register.tsx`
  - Route: `/register`
  - Multi-section registration wizard collecting profile + goals + restrictions + account type.
  - Posts to `register.store`.

- `auth/login.tsx`
  - Route: `/login`
  - Auth login flow.

- `auth/forgot-password.tsx`
  - Route: `/forgot-password`
  - Requests reset link.

- `auth/reset-password.tsx`
  - Route: `/reset-password/{token}`
  - Completes password reset.

- `auth/verify-email.tsx`
  - Route: `/verify-email`
  - Email verification UI and resend action.

- `auth/confirm-password.tsx`
  - Route: Fortify confirm password route
  - Password confirmation for secure actions.

- `auth/two-factor-challenge.tsx`
  - Route: `/two-factor-challenge`
  - 2FA challenge (OTP/recovery code).

## Core app pages
- `dashboard.tsx`
  - Route: `/dashboard`
  - Unified summary: BMI/water/macros/plans/progress trends and navigation shortcuts.
  - Loads workout progress, admin snippets (for admin role), and planner metadata.

- `track_meal/track_meals.tsx`
  - Routes: `/track-meals`, `/meal-tracker`
  - Day-based meal logging, search foods, add/delete entries, copy day, log planned items.
  - Calls:
    - `GET /api/meal-tracker/day`
    - `GET /api/foods/search`
    - `POST /meal-entries`
    - `DELETE /meal-entries/{entry}`
    - `POST /api/meal-tracker/planned-items/{id}/log`

- `workouts/planner.tsx`
  - Route: `/workouts/plan`
  - Shows active AI plan + manual draft builder + premade plans.
  - Saves manual draft to `POST /workouts/plan`.

- `workouts/log.tsx`
  - Route: `/workouts/log`
  - Session logging flow: start workout, add sets, finish, view recent logs.
  - Calls:
    - `POST /workouts/log/start`
    - `POST /workouts/log/{log}/add-set`
    - `POST /workouts/log/{log}/finish`

- `Places.tsx`
  - Routes: `/places`, `/nearby`
  - Nearby discovery/map view for gyms/nutritionists.
  - Supports initiating message/appointment actions from place context.

- `messages/index.tsx`
  - Route: `/messages`
  - User messaging center for conversations and thread messages.
  - Calls:
    - `GET /api/messages/conversations`
    - `POST /api/messages/conversations`
    - `GET /api/messages/conversations/{id}/messages`
    - `POST /api/messages/conversations/{id}/messages`

- `appointments/index.tsx`
  - Route: `/appointments`
  - Appointment listing/creation/status updates.
  - Calls:
    - `GET /api/appointments`
    - `POST /api/appointments`
    - `PATCH /api/appointments/{id}/status`

## AI pages
- `ai/planner.tsx`
  - Route: `/ai/planner`
  - Planner UI for viewing latest generated plan and requesting regeneration.
  - Posts to `POST /api/ai/plan`.
  - Displays provider/model/prompt/schema metadata.

- `ai/chat.tsx`
  - Route: `/coach`
  - AI coach conversation UI (conversation list + message pane).
  - Calls:
    - `GET /api/ai/conversations`
    - `GET /api/ai/conversations/{id}/messages`
    - `POST /api/ai/chat`

## Settings pages
- `settings/profile.tsx`
  - Routes: `/profile` and `/settings/profile`
  - Updates basics, preferences, and measurements.
  - Calls:
    - `PATCH /settings/profile`
    - `POST /settings/profile/prefs`
    - `POST /settings/profile/measurements`

- `settings/password.tsx`
  - Route: `/settings/password`
  - Password update page.

- `settings/security.tsx`
  - Route: `/settings/security`
  - Security controls, especially 2FA management.

- `settings/two-factor.tsx`
  - Route: `/settings/two-factor`
  - Dedicated 2FA setup/disable and recovery handling.

- `settings/appearance.tsx`
  - File exists but route is redirected in backend (`/settings/appearance -> /settings/profile`).
  - This means component exists but route currently points elsewhere.

## Professional pages
- `professionals/clients.tsx`
  - Routes:
    - `/trainer/clients`
    - `/dietitian/clients`
  - Client management view for verified professionals.
  - Integrates communication/context actions.

## Admin pages
- `admin/users/index.tsx` and `admin/users/show.tsx`
  - User listing/detail/edit/verification control.
  - Calls `/api/admin/users*`.

- `admin/logs/index.tsx`
  - Admin action logs viewer.
  - Calls `/api/admin/action-logs`.

- `admin/notifications/index.tsx`
  - Broadcast/notification management.
  - Calls `/api/admin/notifications` and admin user lookup.

- `admin/professional-verifications/index.tsx`
  - Professional verification review queue.
  - Calls `/api/admin/professional-verifications*`.

- `admin/professionals/index.tsx`
  - Professional profile management.
  - Calls `/api/admin/professionals*`.

- `admin/meals/index.tsx`
  - Food catalog + meal entries moderation.
  - Calls `/api/admin/foods*` and `/api/admin/meal-entries*`.

- `admin/places/index.tsx`
  - Curated local places management.
  - Calls `/api/admin/places-local*`.

- `admin/progress/index.tsx`
  - Measurement/progress moderation.
  - Calls `/api/admin/progress*`.

## Error page
- `errors/http-error.tsx`
  - Generic HTTP error display page.

## 7) Backend Functionality Modules

## Authentication & account lifecycle
- Guest auth routes + Fortify-based login/logout/password/2FA
- Email verification gating for most app areas
- Registration supports client/trainer/nutritionist with verification workflow

## Profile & health context
- Profile basics/preferences/measurements updates
- Dedicated normalized safety tables for allergies/diet/medical/injury

## Meal tracking
- Food search/favorites
- Day/month summaries
- manual + planned-item logging
- macro aggregation and target gap calculations

## Workout tracking
- Workout plan management (AI and manual)
- workout logs and set-level logging
- progression analytics endpoint

## Messaging and appointments
- role-aware conversation system
- appointment lifecycle
- professional-client assignment

## Admin operations
- user/professional moderation
- action logs
- notifications
- food/meal/place/progress curation

## 8) Database / Data Model Overview

From migrations, your schema includes:

## User + auth + prefs
- `users`, `user_prefs`, fortify/sanctum/auth supporting tables

## Nutrition + meals
- `foods`
- `meal_entries` (+ related tracking tables)
- `nutrition_plans`, `nutrition_plan_days`, `nutrition_plan_meals`, `nutrition_plan_items`

## Workouts
- `exercises` (AI-ready metadata fields present)
- `workout_plans`, `workout_plan_days`, `workout_plan_day_exercises`
- `workout_logs`, `workout_log_sets`

## AI core
- `ai_requests`
- `ai_plans`
- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`
- `ai_feedback`

## Safety normalization tables
- `user_dietary_restrictions`
- `user_medical_histories`

## Collaboration and operations
- conversations/messages, appointments, assignments
- professional verifications
- notifications and admin action logs

## 9) AI Models and How They Run (Detailed)

This section answers your key question directly: what AI models exist, which are active, and how each runs.

## 9.1 Active Planner Model (LLM, structured JSON)

## Current configured runtime (from `.env` + `config/ai.php`)
- Provider: `ollama`
- Forced mode: `AI_PLANNER_OLLAMA_ONLY=true`
- Model: `llama3.1:8b`
- Temperature: `0.1`
- Timeout: `120s` model timeout, `300s` request timeout
- OpenAI fallback: disabled
- Local fallback: disabled in env (`AI_PLANNER_LOCAL_FALLBACK_ENABLED=false`)

## Execution pipeline (actual code path)
1. `POST /api/ai/plan` -> `PlanGenerationController@store`
2. Request validation by `StorePlanRequest`
3. `PlannerService->generate(...)`
4. Profile prep:
   - `PlannerProfileSyncService->prepare(...)`
5. Context build:
   - `PlannerContextBuilder->build(...)`
6. Prompt build:
   - `PlannerPrompt->system()` + `PlannerPrompt->user(context_json)`
7. Model call:
   - `GenerativeAiGateway->generateStructured(...)`
   - with `OllamaClient->chat(...)` and JSON decoding/retry logic
8. Output shaping:
   - `normalizeCompactOutput(...)` expands/normalizes days and weekly schedule
9. Safety/business validation:
   - `PlannerOutputValidator->validate(...)`
10. Progress predictor attachment:
   - `ProgressPredictionModel->predict(...)`
11. Quality scoring:
   - `PlannerRunQualityScorer`
12. Persistence:
   - `PlannerPersistenceService->persist(...)`
13. Usage logging:
   - `AiUsageLogger`
14. Response returns full plan + metadata + usage + quality.

## Planner output contract
- Strict schema in `PlannerSchema`:
  - `overview`
  - `safety`
  - `diet`
  - `workout`
  - `adaptive_review`
  - `ml_readiness`
  - optional `progress_prediction`

This is not free-form text generation; it is constrained structured generation.

## 9.2 Active Coach Model (LLM + Retrieval + Tools + Safety)

## Current configured runtime
- Provider: `self_hosted`
- Chat model: `llama3.1:8b`
- Embedding model: `nomic-embed-text`
- Vector DB: Qdrant collection `hayetak_user_context`
- Retrieval: threshold `0.65`, top-k `4`, context cap `2200 chars`

## Execution pipeline
1. `POST /api/ai/chat` -> `ChatController@store`
2. `StoreChatMessageRequest` validates payload
3. `ChatOrchestrator->handle(...)`
4. Intent classification:
   - `ChatIntentClassifier`
5. Emergency safety preflight:
   - `ChatSafetyGuard->preflight(...)`
6. Context assembly:
   - `ChatContextBuilder` (today summary + last 7 days + plans + restrictions + memory)
7. Tool planning/execution:
   - `CoachToolExecutor->planAndExecute(...)`
8. Deterministic override:
   - `CoachDeterministicResponder` handles many common high-confidence intents
9. If no deterministic answer:
   - `ChatModelManager` selects provider client
   - `SelfHostedChatModelClient` -> `SelfHostedContextAwareChatService`
10. Self-hosted service:
   - embed question (Ollama embedding)
   - query Qdrant filtered by `user_id`
   - build prompt with template + retrieved snippets
   - call Ollama chat model
11. Post safety review/sanitization:
   - `ChatSafetyGuard->review(...)`
12. Persist user/assistant messages and metadata
13. Log usage and response quality

## Important coach safety behavior
- blocks obvious emergency-medical prompts with urgent-care fallback message
- sanitizes internal prompt labels from outputs
- allergy-aware and diet-type-aware post-processing
- integrates injury/medical restrictions into context and tool selection

## 9.3 Active Tooling Model Layer (Deterministic “Functions”)

These are tool functions, not neural models:
- `search_recipes`
  - filters against diet/allergies and ranks by query + ingredient overlap
- `get_day_macros`
  - aggregates macros from actual logged meals for one date
- `summarize_last_7_days`
  - weekly nutrition/workout summary
- `suggest_exercise_alternatives`
  - injury/equipment/workout-location-aware alternatives
- `find_gyms_or_nutritionists`
  - proximity + goal/category ranking against local DB/professionals

Tool planning is deterministic by keyword/intent in `CoachToolExecutor`.

## 9.4 Active Progress Prediction Model (Hybrid ML)

This is a separate model layer attached to planner outputs.

## Runtime behavior
- Main class: `ProgressPredictionModel`
- Generates:
  - expected weight change
  - projected body weight
  - strength projection
  - confidence + feedback adjustment metadata

## Core design
1. Heuristic baseline:
   - goal mode (`lose/gain/maintain`)
   - baseline weekly rates
2. Adherence adjustment:
   - compares recent macros/workouts vs targets
3. Feedback correction:
   - uses prior prediction error where possible
4. Optional ML inference:
   - Python script `predict_progress_from_features.py`
   - loads `weight_change_model.joblib` (and optional strength model)
5. Guardrails before ML blending:
   - minimum confidence
   - macro target presence
   - meal/workout logging thresholds
   - max divergence from heuristic
   - goal-compatible weekly bounds
6. Final output attached to planner JSON.

## ML training stack
- Script: `train_progress_predictor.py`
- Model family: scikit-learn `RandomForestRegressor`
- Preprocessing:
  - numeric median imputation
  - categorical mode + one-hot encoding
- Persisted artifacts:
  - `weight_change_model.joblib`
  - optional `strength_progress_model.joblib`
  - `manifest.json` with features/metrics

This is a genuine ML model (supervised regression), not just rules.

## 9.5 Additional/Legacy AI Scripts (Not Active Runtime Path)

Present in `scripts/`:
- `train_hayetak_chatbot.py` (FLAN-T5 fine-tuning for Q/A)
- `serve_hayetak_chat_model.py` (FastAPI serving wrapper)
- `train_hayetak_planner.py` (FLAN-T5 planning fine-tune)

These are valid AI training/serving experiments, but your current app runtime is not using them directly in the main Laravel execution path.

## 10) Is This “Really AI”? Is It Complex?

Short answer: yes, this is a real AI system.

## Why it counts as AI
- It performs model inference (LLM inference for planner and coach).
- It uses retrieval-augmented generation (embeddings + vector search + model).
- It enforces structured generation with schema constraints.
- It includes a separate supervised ML model for progress forecasting.
- It uses safety and business guardrails around model outputs.

## Complexity assessment
- Planner AI complexity: medium-high applied AI orchestration
  - strong because of strict schema, normalization, validation, persistence, metadata tracing
- Coach AI complexity: high applied AI architecture
  - strong because of intent routing, deterministic overrides, tool calls, RAG, safety review, context sync
- Progress predictor complexity: medium ML subsystem
  - strong because of model training + runtime blending + guardrails

Overall project AI complexity for a capstone/senior project:
- High for applied product AI engineering
- Not a custom foundation model research project
- Still clearly beyond “simple chatbot wrapper” level

## 11) Important Branch-Specific Findings

These are operational realities in your current branch/config:

1. Planner horizon env value is `7`, but code normalizes horizon to `14/21/28`.
   - So effective generated horizon is never 7.
2. `AI_PLANNER_OLLAMA_ONLY=true` forces planner provider to Ollama.
3. `AI_PLANNER_FALLBACK_TO_OPENAI=false` and `AI_PLANNER_LOCAL_FALLBACK_ENABLED=false`.
   - So planner fallback paths are effectively not active in your current env.
4. Coach endpoint currently returns normal JSON response (not streaming transport).
5. You have both deterministic and LLM pathways in chat, which is good for safety and stability.

## 12) Quick Verification Commands You Can Run

From project root:

```powershell
git branch --show-current
php artisan route:list
php artisan route:list --path=api/ai
php artisan route:list --path=ai/planner
```

Planner/coach health checks:

```powershell
php artisan route:list --path=api/ai/plan/health
php artisan ai:setup-self-hosted-chat --sync-existing=0
php artisan ai:sync-user-context
```

## 13) Final Verdict For Your Question

Your project is definitely an AI project.
- It is not “just static rules”.
- It is not “fake AI”.
- It is an applied multi-layer AI architecture:
  - LLM planner + strict schema
  - LLM coach + retrieval + tool execution + safety
  - supervised regression model for progress prediction

If your concern is whether it qualifies as “complex enough”: yes, it does for applied AI engineering, especially with your safety constraints, structured persistence, and multi-model orchestration.

