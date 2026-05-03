# Hayetak Project Full Explanation

Generated: 2026-05-02

This document explains Hayetak from the current codebase: what the project does, what each page type is for, how the AI features work, how the Laravel backend is structured, how AI files are grouped, and what current audit/accuracy results say.

## 1. Project Summary

Hayetak is a Laravel 12 + React 19 health and fitness platform. The product combines:

- Client health profile onboarding.
- AI-generated diet and workout plans.
- AI coach chat for fitness, nutrition, recovery, progress, and app guidance.
- Meal tracking, macro tracking, water tracking, measurements, and workout logs.
- Nearby discovery for gyms, nutritionists, dietitians, trainers, and health-related places.
- Messaging and appointments between clients and professionals.
- Professional workflows for trainers and nutritionists.
- Admin workflows for users, professionals, catalog quality, safety profiles, AI audits, notifications, and operational review.

The core user story is: a client signs up, enters body/profile/goal/safety information, receives a personalized diet and workout plan, logs meals/workouts/water/measurements, then uses the coach chatbot for guidance that respects allergies, diet type, medical constraints, injuries, equipment, plans, today logs, and recent history.

## 2. Main Technology Stack

Backend:

- Laravel 12, PHP 8.2+.
- Inertia.js server-rendered React pages.
- Laravel Fortify for auth, email verification, password reset, and two-factor support.
- Eloquent models, migrations, policies, jobs, Artisan commands, service classes.
- Queue jobs for AI plan generation and self-hosted AI context sync.
- PostgreSQL-oriented schema patterns, including JSON/array-style data.

Frontend:

- React 19 + TypeScript.
- Inertia React.
- Vite 7.
- Tailwind CSS 4.
- Radix UI primitives.
- Lucide React icons.
- Mapbox GL for the nearby map.

AI/runtime:

- Planner: Ollama-backed structured JSON generation through `GenerativeAiGateway`.
- Coach: self-hosted chat provider by default, with Ollama + Qdrant retrieval.
- Embeddings: Ollama embedding model, default `nomic-embed-text`.
- Progress predictor: Python/scikit-learn RandomForest artifacts called from PHP through Symfony Process, with heuristic fallback and quality guardrails.
- Deterministic guardrails/tools around model output, because health/fitness safety matters.

Important current implementation note: the project instructions prefer OpenAI Responses API, but the current code path is self-hosted/Ollama-first. `FeatureConfigResolver::provider()` returns `ollama` for the planner, and chat resolves to `self_hosted`, `http`, or `stub`; there is no active OpenAI Responses API client in the current runtime path.

## 3. User Roles

The user model supports four main roles:

- `client`: main consumer role. Gets planner, coach, tracking, nearby, messages, appointments.
- `trainer`: professional role focused on client workout/progress review.
- `nutritionist`: professional role focused on diet and meal guidance.
- `admin`: operational role with access to the admin workspace, data review, user management, professional verification, catalog management, AI review, and audit tooling.

Professional accounts require verification data at registration and are marked pending until reviewed. Client accounts become active more directly and can trigger initial plan generation.

## 4. Route and Page Architecture

Routes are mainly declared in `routes/web.php`, including several `/api/...` routes that are session-authenticated web routes rather than stateless API routes. `routes/api.php` still contains older/simple API endpoints for food search, meal entries, and nearby places.

Main route groups:

- Public: `/`, `/csrf-token`, public places endpoints.
- Guest: `/register`, `/login`, forgot/reset password.
- Authenticated and verified: dashboard, tracker pages, planner, coach, workouts, messages, appointments, professional clients, admin pages.
- Authenticated but not necessarily verified: `/api/ai/plan`, `/api/ai/chat`, `/api/ai/chat/stream`, AI conversations/messages, planner health.
- Admin-only: admin page routes and admin APIs under `/api/admin/...`.

## 5. Page-by-Page Functionality

### Public and Auth Pages

`resources/js/pages/welcome.tsx`

- Route: `/`.
- Public landing page.
- Introduces the product and provides entry points to register/login.

`resources/js/pages/auth/register.tsx`

- Route: `/register`.
- Multi-step registration/profile wizard.
- Collects identity, gender, age, height, weight, medical history, goals, diet type, allergies, activity level, workout days, workout location, previous diet failures, email/password, and account type.
- For trainers/nutritionists it collects professional verification documents and license metadata.
- Posts to `RegisterWizardController::store`.
- Backend then normalizes AI profile data and may dispatch initial plan generation for clients.

`resources/js/pages/auth/login.tsx`

- Route: `/login`.
- Standard login flow through `AuthenticatedSessionController`.

`resources/js/pages/auth/forgot-password.tsx`

- Route: `/forgot-password`.
- Sends password reset link.

`resources/js/pages/auth/reset-password.tsx`

- Route: `/reset-password/{token}`.
- Completes password reset.

`resources/js/pages/auth/verify-email.tsx`

- Route: `/verify-email`.
- Email verification status and resend action.

`resources/js/pages/auth/confirm-password.tsx`

- Used by Fortify for sensitive actions.
- Confirms current password.

`resources/js/pages/auth/two-factor-challenge.tsx`

- Handles 2FA challenge using authenticator code or recovery code.

### Core Client Pages

`resources/js/pages/dashboard.tsx`

- Route: `/dashboard`.
- Main authenticated landing page for clients.
- Admins are redirected to admin overview.
- Shows user summary, BMI/profile data, water status, weekly water summary, today macros, per-meal macro totals, meal previews, weight/height history, active AI nutrition plan, active AI workout plan, recent coach snapshot, progress prediction, and prediction trend.
- Data comes from `HomeController::index`.
- Backend reads `water_intakes`, `measurements`, `meal_logs`, `meal_entries`, `foods`, `nutrition_plans`, `workout_plans`, `ai_conversations`, and `ai_requests`.

`resources/js/pages/track_meal/track_meals.tsx`

- Routes: `/track-meals`, `/meal-tracker`.
- Main meal tracker page.
- Has two modes:
  - Follow active plan.
  - Quick log.
- Supports day selection, daily totals, per-meal totals, planned meal items, exact planned logging, substitute logging, search foods, add manual food entries, delete entries, and copy-day behavior.
- Calls:
  - `GET /api/meal-tracker/day`
  - `GET /api/meal-tracker/month`
  - `GET /api/foods/search`
  - `POST /meal-entries`
  - `DELETE /meal-entries/{entry}`
  - `POST /api/meal-tracker/copy-day`
  - `POST /api/meal-tracker/planned-items/{nutritionPlanItem}/log`

`resources/js/pages/workouts/planner.tsx`

- Route: `/workouts/plan`.
- Shows workout planning options.
- Can show AI-generated plan and manual/premade plan structures.
- Saves manual workout plan to `POST /workouts/plan`.
- Backend controller: `Workout\WorkoutPlanController`.

`resources/js/pages/workouts/log.tsx`

- Route: `/workouts/log`.
- Lets user log workout sessions.
- Modes include follow AI plan, follow manual plan, or freestyle.
- User can start a session, select plan day/exercises, add sets with weight/reps, and finish a session.
- Calls:
  - `POST /workouts/log/start`
  - `POST /workouts/log/{log}/add-set`
  - `POST /workouts/log/{log}/finish`
- Backend controller: `Workout\WorkoutLogController`.

`resources/js/pages/Places.tsx`

- Routes: `/places`, `/nearby`.
- Nearby discovery page.
- Uses `NearbyMap.tsx` for Mapbox rendering.
- Lets user filter place types such as gym, nutritionist, healthcare, hospitals/labs/other categories depending on available data.
- Loads curated/local places from `/api/places-local`.
- Loads dietitians from `/api/dietitians`.
- Supports starting a conversation or booking appointment from place/professional context.

`resources/js/components/NearbyMap.tsx`

- Mapbox GL map component.
- Fetches `/api/places-local?lat=...&lng=...&radius=...&types=...`.
- Displays radius polygon, markers, popups, place categories, and distance labels.
- Normalizes local place records into map features.

`resources/js/pages/messages/index.tsx`

- Route: `/messages`.
- Messaging center.
- Shows conversation list, thread messages, conversation context, and message composer.
- Calls:
  - `GET /api/messages/conversations`
  - `POST /api/messages/conversations`
  - `GET /api/messages/conversations/{conversation}/messages`
  - `GET /api/messages/conversations/{conversation}/context`
  - `POST /api/messages/conversations/{conversation}/messages`

`resources/js/pages/appointments/index.tsx`

- Route: `/appointments`.
- Appointment list and scheduling/status UI.
- Calls:
  - `GET /api/appointments`
  - `POST /api/appointments`
  - `PATCH /api/appointments/{appointment}/status`

### AI Pages

`resources/js/pages/ai/planner.tsx`

- Route: `/ai/planner`.
- Shows latest generated plan, active persisted nutrition/workout plan status, profile constraints, plan horizon, prediction trend, and plan quality checks.
- Lets user generate diet, workout, or both.
- Posts to `POST /api/ai/plan`.
- Admin-specific audit UI exists in the component, including planner audit launch/control/polling, but `showAdminTools` is currently set false in the page code.
- Displays client-facing planner data after backend sanitization; admin gets richer metadata.

`resources/js/pages/ai/chat.tsx`

- Route: `/coach`.
- AI coach chat UI.
- Loads conversations, loads messages for active conversation, sends new messages, displays pending bubbles, formats assistant text, and shows context sources when present.
- Calls:
  - `GET /api/ai/conversations`
  - `GET /api/ai/conversations/{conversation}/messages`
  - `POST /api/ai/chat`
- Backend also supports `POST /api/ai/chat/stream`; the current page primarily uses the persisted JSON chat flow.

### Professional Pages

`resources/js/pages/professionals/clients.tsx`

- Routes:
  - `/trainer/clients`
  - `/dietitian/clients`
- Trainer/nutritionist client workspace.
- Shows assigned clients, progress points, recent workouts, weekly meals, meal choices, and client search/filtering.
- Trainers can review training summary and create appointment-related workflows.
- Nutritionists can review weekly meal history, choose logged meals, and draft substitutions/meal notes.
- Protected by role and professional verification middleware.

### Settings Pages

`resources/js/pages/settings/profile.tsx`

- Route: `/settings/profile`.
- Main settings/profile page.
- Edits basic profile, preferences, measurements, medical/diet/workout-related details.
- Calls controller methods in `Settings\ProfileController`.

`resources/js/pages/settings/security.tsx`

- Route: `/settings/security`.
- Security settings entry page.

`resources/js/pages/settings/password.tsx`

- Route: `/settings/password`.
- Updates password through `PasswordController`.

`resources/js/pages/settings/two-factor.tsx`

- Route: `/settings/two-factor`.
- Two-factor setup page.
- Uses Fortify 2FA behavior and local components for QR/recovery codes.

`resources/js/pages/settings/appearance.tsx`

- Currently redirected to profile by route, retained as a page file for compatibility.

### Admin Workspace Pages

All admin pages are protected by `role:admin`.

`admin/overview/index.tsx`

- Admin landing page.
- Static and operational overview cards for users, verifications, AI warnings, admin actions, queues, and health signals.
- Links into deeper admin workflows.

`admin/users/index.tsx` and `admin/users/show.tsx`

- User management workspace.
- Lists users, filters/searches, shows user detail drawer, bulk actions, verification toggles, deletion, plan diffs, safety context, recent activity, AI conversations, appointments, and assignments.
- API controller: `AdminUserController`.

`admin/people/index.tsx`

- Workspace hub for people-related review: users, safety profiles, assignments, professionals.

`admin/professional-verifications/index.tsx` and `admin/professionals/index.tsx`

- Review professional credential submissions.
- Approve/reject/update professional records.
- API controllers: `AdminProfessionalVerificationController`, `AdminProfessionalController`.

`admin/assignments/index.tsx`

- Manage professional-client assignments.
- API controller: `AdminAssignmentController`.

`admin/meals/index.tsx` and `admin/meal-logs/index.tsx`

- Food catalog and meal log administration.
- Supports creating/updating foods, hiding foods, merging duplicate foods, updating/deleting entries.
- API controller: `AdminMealController`.

`admin/exercises/index.tsx`

- Exercise catalog administration.
- Supports creating/updating exercises, hiding unsafe/irrelevant ones, adding alternatives, marking restrictions.
- API controller: `AdminExerciseController`.

`admin/places/index.tsx`

- Local places administration.
- Supports create/update/hide/delete and coordinate validation.
- API controller: `AdminPlaceLocalController`.

`admin/progress/index.tsx`

- Measurement/progress administration.
- Supports creating/updating/deleting measurements and marking outliers.
- API controller: `AdminProgressController`.

`admin/safety-profiles/index.tsx`

- Safety profile review.
- Uses normalized restrictions and medical history for admin review.

`admin/ai-review/index.tsx`, `admin/ai/planner/index.tsx`, `admin/ai/coach/index.tsx`, `admin/ai-rollouts/index.tsx`

- AI operations and review areas.
- Used for planner/coach status, rollout readiness, quality warnings, and operational AI review.

`admin/notifications/index.tsx`

- Admin-created notifications and resend of failed notification actions.
- API controller: `AdminNotificationController`.

`admin/logs/index.tsx`, `admin/logs-diagnostics/index.tsx`, `admin/diagnostics/index.tsx`

- Operational logs, diagnostics, and admin action history.
- API controller: `AdminActionLogController`.

`admin/analytics/index.tsx`

- Analytics-oriented admin workspace.

`admin/health-data/index.tsx`

- Higher-level health data hub, linking foods, meals, exercises, progress, and safety-impacting data.

`admin/roles-permissions/index.tsx`

- Role and permission overview.

`admin/privacy-compliance/index.tsx`

- Privacy/compliance workspace.

`admin/settings/index.tsx` and `admin/settings-feature-flags/index.tsx`

- Admin configuration and rollout/feature-flag style pages.

`admin/support-cases/index.tsx`

- Support workflow page.

### Error Pages

`resources/js/pages/errors/http-error.tsx`

- Shared HTTP error display page.

## 6. Signup and Initial AI Plan Flow

Important files:

- `app/Http/Controllers/Auth/RegisterWizardController.php`
- `app/Services/Ai/Planner/PlannerProfileSyncService.php`
- `app/Services/Ai/AutoPlanGenerationService.php`
- `app/Jobs/Ai/GeneratePlansForUser.php`

Flow:

1. User submits registration.
2. `RegisterWizardController` validates basic profile, goals, safety data, account type, and professional verification fields when needed.
3. User is created with role/status.
4. Professional accounts get `professional_verifications` records.
5. `PlannerProfileSyncService->prepare($user)` normalizes planner-relevant profile information.
6. User is logged in and email verification is sent.
7. `AutoPlanGenerationService->startIfNeeded()` dispatches `GeneratePlansForUser` for client users if they do not already have active AI nutrition and workout plans and no queued/running planner request exists.
8. The queue job calls `PlannerService->generate()`.

## 7. AI Model 1: Planner

Purpose: generate a structured diet + workout plan for a user.

Main endpoint:

- `POST /api/ai/plan`
- Controller: `app/Http/Controllers/Ai/PlanGenerationController.php`
- Request validation: `app/Http/Requests/Ai/StorePlanRequest.php`
- Main service: `app/Services/Ai/PlannerService.php`

Planner input:

- User profile: age, gender, height, weight, goals, activity level.
- Diet type, allergies, medical conditions, injuries.
- Workout days/week, preferred days, workout location, available equipment.
- Past diet failures.
- Recent meal logs and workout logs.
- Active/previous AI plan versions.
- Food catalog hints.
- Exercise catalog hints.
- Requested generation scope: diet, workout, or both.
- Plan horizon: normalized to 14, 21, or 28 days.

Planner pipeline:

1. `PlanGenerationController::store()` validates request and releases the session lock so long AI calls do not block other tabs.
2. `PlannerService::generate()` checks generation scope and existing plan reuse behavior.
3. `PlannerProfileSyncService` prepares normalized profile and optional overrides.
4. `PlannerContextBuilder` builds the planning context:
   - profile
   - last 7 days nutrition averages
   - last 7 days workout count/minutes
   - planning constraints
   - food catalog hints
   - exercise catalog hints
   - existing plan versions
5. `PlannerPrompt` loads prompt templates from `resources/ai/prompts/planner`.
6. `GenerativeAiGateway` calls Ollama using JSON format.
7. If JSON is invalid, it retries once with stricter JSON-only instructions.
8. `PlannerService` normalizes compact model output:
   - daily targets
   - meal options
   - diet days
   - grocery list
   - workout weekly schedule
   - safety notes
   - adaptive review
9. `PlannerOutputValidator` enforces:
   - required sections
   - meal options grouped by meal type
   - exact day count for selected horizon
   - exactly 7 workout schedule entries
   - calorie/macros sanity
   - realistic portions
   - meal variety
   - allergy/diet safety
   - workout/injury safety
   - adaptive review window
10. If the model path fails and local fallback is enabled, `PlannerLocalFallbackService` builds a deterministic plan.
11. `ProgressPredictionModel` attaches projected weight/strength progress.
12. `PlannerService` applies adaptive adjustment if recent prediction error crosses configured threshold.
13. `PlannerRunQualityScorer` scores the output.
14. `PlannerPersistenceService` persists the result.
15. `AiUsageLogger` logs provider/model/usage/metadata.
16. Response returns a sanitized plan payload.

Planner output structure:

- `overview`
- `safety`
- `diet`
  - `daily_targets`
  - `meal_options`
  - `days`
  - `grocery_list`
  - `meal_prep_notes`
  - `adherence_notes`
- `workout`
  - `weekly_schedule`
  - `progression_rules`
  - `recovery_rules`
  - `coach_notes`
- `adaptive_review`
- `ml_readiness`
- `progress_prediction`

Planner persistence:

- Request trace: `ai_requests`
- Versioned raw/snapshot plans: `ai_plans`
- Operational nutrition plan tables:
  - `nutrition_plans`
  - `nutrition_plan_days`
  - `nutrition_plan_meals`
  - `nutrition_plan_items`
- Operational workout plan tables:
  - `workout_plans`
  - `workout_plan_days`
  - `workout_plan_day_exercises`

Planner safety:

- Planner prompt instructs safety constraints.
- Food catalog filtering avoids diet/allergy conflicts.
- Exercise catalog filtering avoids injury/equipment conflicts.
- `PlannerOutputValidator` blocks unsafe/unrealistic output.
- `PlannerRunQualityScorer` independently checks allergy/diet type, meal structure, workout split, and progress prediction.
- `UserFacingAiPayloadSanitizer` strips internal metadata for normal users.

## 8. AI Model 2: Coach Chatbot

Purpose: answer user questions about nutrition, meals, workouts, recovery, progress, nearby help, app usage, plans, and safe alternatives.

Main endpoints:

- `GET /api/ai/conversations`
- `GET /api/ai/conversations/{conversation}/messages`
- `POST /api/ai/chat`
- `POST /api/ai/chat/stream`

Main files:

- Controller: `app/Http/Controllers/Ai/ChatController.php`
- Main orchestrator: `app/Services/Ai/Chat/ChatOrchestrator.php`
- Intent classifier: `app/Services/Ai/Chat/ChatIntentClassifier.php`
- Context builder: `app/Services/Ai/Chat/ChatContextBuilder.php`
- Safety: `app/Services/Ai/Chat/ChatSafetyGuard.php`
- Deterministic replies: `app/Services/Ai/Chat/CoachDeterministicResponder.php`
- Provider manager: `app/Services/Ai/Chat/ChatModelManager.php`
- Self-hosted provider: `app/Services/Ai/Chat/SelfHostedContextAwareChatService.php`
- Vector store: `app/Services/Ai/Chat/QdrantVectorStore.php`
- Low-level Ollama client: `app/Services/Ai/Runtime/OllamaClient.php`
- Prompt: `resources/ai/prompts/coach`

Coach pipeline:

1. User sends message through `/coach`.
2. `ChatController::store()` validates `StoreChatMessageRequest`, resolves or creates conversation, builds runtime context, releases session lock.
3. `ChatOrchestrator::handle()` classifies the question:
   - nutrition
   - workout
   - progress
   - plans
   - nearby
   - communication
   - settings
   - wellness
   - out of domain
4. User message is saved in `ai_messages`.
5. `ChatSafetyGuard::preflight()` blocks unsafe requests before model call:
   - medication dosing
   - steroids/SARMs/drug stacks
   - crash dieting/dehydration
   - deception/manipulating logs
   - out-of-domain requests
   - ignoring allergies/pain/doctor guidance
   - urgent symptom red flags
6. `ChatContextBuilder` builds a context bundle:
   - saved profile
   - resolved profile facts
   - restrictions
   - selected date summary
   - today calories/protein/carbs/fat/water/workouts
   - last 7 days nutrition/workout summary
   - latest measurements
   - active nutrition/workout plans
   - nearby runtime context
   - recent conversation turns
   - available ingredients
   - role context
7. `CoachToolExecutor` deterministically plans and executes tools based on question keywords and classifier output.
8. Tool results are added back into context.
9. `CoachDeterministicResponder` may answer directly for high-confidence cases such as:
   - allergy conflict
   - restriction summary
   - protein target/gap
   - meal summary
   - out-of-domain boundary
   - app/help style replies
10. If no deterministic answer is available, `ChatModelManager` calls the configured model provider.
11. For self-hosted chat, `SelfHostedContextAwareChatService` embeds the question, queries Qdrant for same-user context, builds a prompt, and calls Ollama.
12. `ChatSafetyGuard::review()` sanitizes the model answer:
   - removes unsafe allergy-matching food suggestions
   - adjusts vegan/vegetarian conflicts
   - removes internal prompt labels
   - replaces empty answers
13. `ChatResponseQualityScorer` computes rule-based quality.
14. Assistant message is persisted with metadata:
   - intent
   - feature
   - warnings
   - used context keys
   - provider/model
   - context sources
   - tools planned/executed
   - quality
15. Usage is logged to `ai_usage_logs`.

Coach tool functions:

- `search_recipes`
  - Searches meal/recipe options while respecting allergies, diet type, constraints, and available ingredients.
- `get_day_macros`
  - Returns calories/protein/carbs/fat for a selected date from logged meals.
- `summarize_last_7_days`
  - Summarizes nutrition and workout consistency for the selected day plus previous six days.
- `suggest_exercise_alternatives`
  - Suggests safer movements based on target, equipment, workout location, and injuries.
- `find_gyms_or_nutritionists`
  - Finds nearby gyms/nutritionists from local places and professional records.

Coach safety strengths:

- It uses both preflight and post-generation review.
- It never intentionally reveals another user's data; admin role context still says use only requester context.
- It has deterministic paths for safety-sensitive answers.
- It stores context source metadata so the UI/admin can see what context categories were used.

## 9. AI Model 3: Progress Predictor

Purpose: estimate expected body-weight and strength trajectory for the generated plan horizon.

Main files:

- Runtime model: `app/Services/Ai/Models/ProgressPredictionModel.php`
- Timeline display helper: `app/Services/Ai/ProgressPredictionTimelineService.php`
- Export command: `app/Console/Commands/Ai/AiExportProgressPredictionData.php`
- Readiness command: `app/Console/Commands/Ai/AiListProgressLabelReadiness.php`
- Training script: `scripts/ai/training/train_progress_predictor.py`
- Inference script: `scripts/ai/training/predict_progress_from_features.py`
- Holdout evaluation script: `scripts/ai/training/evaluate_progress_predictor_holdout.py`
- Operations docs: `docs/ai/progress-predictor.md`, `docs/ai/progress-predictor-ops.md`

Runtime behavior:

1. Determine goal mode from diet/fitness goal:
   - lose
   - gain
   - maintain
2. Get latest known weight from `measurements`, falling back to `users.weight_kg`.
3. Compute a baseline weekly change heuristic.
4. Adjust by adherence:
   - recent calories vs plan target
   - recent workout sessions vs target sessions
5. Adjust using previous prediction error when actual measurements exist.
6. Optionally run trained Python model if enabled and model artifacts pass manifest quality gates.
7. Blend ML prediction with heuristic feedback only if guardrails allow it.
8. Clamp weekly rates to safe/goal-aligned ranges.
9. Return projection with:
   - baseline weight
   - expected weight change
   - projected body weight
   - strength projection
   - confidence
   - inference source
   - feedback adjustment notes

Guardrails:

- Requires usable model directory and manifest.
- Requires minimum holdout users.
- Requires minimum R2 and maximum MAE thresholds.
- Blocks ML if confidence is too low.
- Blocks ML if macro targets are missing.
- Blocks ML if weekly ML rate is too far from heuristic.
- Blocks ML if ML rate conflicts with goal.
- Allows weight-only ML if configured; strength can remain heuristic.

## 10. AI Model 4: Local Fallback and Deterministic Layer

This is not an ML model, but it is an important AI-adjacent model layer.

Files:

- `app/Services/Ai/PlannerLocalFallbackService.php`
- `app/Services/Ai/Chat/CoachDeterministicResponder.php`
- `app/Services/Ai/Tools/*Tool.php`
- `app/Services/Ai/FoodCatalog/PlannerFoodModel.php`
- `app/Services/Ai/Profile/UserSafetyProfileResolver.php`

Why it exists:

- Health/fitness output must remain usable when the LLM fails or returns malformed output.
- Safety-sensitive queries should not depend only on a generative model.
- Tests and audits need deterministic behavior.

Planner fallback:

- Builds structured diet/workout plans from local catalog/profile data.
- Respects allergy/diet/injury/equipment constraints.
- Produces a payload that can pass the same validator/persistence flow as model output.

Coach deterministic layer:

- Handles restriction lookups, allergy exposure checks, protein gap questions, meal summaries, app/domain boundaries, and some medical/diet guardrails.
- Avoids unnecessary model calls when a deterministic answer is safer and more precise.

## 11. AI Runtime and Provider Configuration

Main config file:

- `config/ai.php`

Important defaults:

- Chat provider: `AI_CHAT_PROVIDER`, default `self_hosted`.
- Chat model: `AI_SELF_HOSTED_LLM_MODEL`, default `llama3.1:8b`.
- Embedding model: `AI_SELF_HOSTED_EMBED_MODEL`, default `nomic-embed-text`.
- Planner provider: hardcoded by `FeatureConfigResolver` as `ollama`.
- Planner model: `AI_PLANNER_OLLAMA_MODEL`, defaulting to self-hosted LLM model.
- Planner default horizon: 14 days.
- Planner local fallback: enabled by default.
- AI rate limits:
  - plan: default `3,1`
  - chat: default `20,1`
  - daily caps also configured.
- Progress predictor inference: enabled by default, with Python model artifact paths and guardrails.

Provider selection:

- Planner: always `ollama`.
- Chat:
  - testing -> `stub`
  - configured self-hosted -> `self_hosted`
  - HTTP endpoint configured -> `http`
  - otherwise -> `stub`

## 12. Backend Code Structure

Laravel developers will mainly care about these directories:

`app/Http/Controllers`

- Request orchestration layer.
- Controllers are grouped by domain:
  - `Ai`
  - `Admin`
  - `Auth`
  - `Chat`
  - `Professional`
  - `Settings`
  - `Workout`
  - general controllers like `HomeController`, `MealEntryController`, `PlacesLocalController`.

`app/Http/Requests`

- Form request validation.
- AI-specific requests live in `app/Http/Requests/Ai`.
- Admin requests validate admin mutations.
- Professional and settings requests validate those workflows.

`app/Http/Resources`

- JSON resources for API responses.
- AI resources include:
  - `AiConversationResource`
  - `AiMessageResource`

`app/Models`

- Eloquent models for users, AI, meals, workouts, places, professionals, messages, appointments, admin logs.
- Important AI models:
  - `AiRequest`
  - `AiPlan`
  - `AiConversation`
  - `AiMessage`
  - `AiFeedback`
  - `AiUsageLog`
  - `PlannerAuditRun`

`app/Services`

- Domain services.
- AI-heavy logic lives under `app/Services/Ai`.
- Non-AI service examples:
  - `MealTrackerService`
  - `ProfessionalAccessService`
  - `OverpassService`
  - messaging services

`app/Jobs`

- Queued background work.
- AI jobs:
  - `GeneratePlansForUser`
  - `RunPlannerAudit`
  - `SyncUserAiContext`

`app/Console/Commands`

- Artisan commands for import/export/audit/training operations.
- AI commands are grouped under `app/Console/Commands/Ai`.

`app/Policies`

- Authorization policies for appointments, conversations, diet plans, trainer workout plans, trainer progress notes.

`app/Providers/AppServiceProvider.php`

- Registers policies.
- Defines admin gate.
- Wires model save/delete events to AI context sync for self-hosted coach.
- Sends 2FA recovery codes by mail when generated.

`database/migrations`

- Schema definitions.
- AI-related migrations create request/plans/chat/usage/audit/restriction tables.

`database/seeders`

- Catalog/demo/import seeders.
- Includes food/exercise/local places/professional demo/AI profile diversity data.

`resources/js`

- React app.
- `pages`: Inertia route-level pages.
- `components`: shared UI and feature components.
- `layouts`: app/auth/settings layouts.
- `types`: TypeScript shared types.
- `lib`: frontend utilities.

`resources/ai/prompts`

- Markdown prompt templates for planner and coach.

`scripts/ai`

- Training, audit, self-hosted setup, and data pipeline scripts.

## 13. Database Structure by Domain

Core account/auth:

- `users`
- `user_prefs`
- `sessions`
- `password_reset_tokens`
- `personal_access_tokens`

Profile/safety:

- `user_dietary_restrictions`
- `user_medical_histories`
- `measurements`

Food/meal:

- `foods`
- `food_favorites`
- `meal_entries`
- `meal_logs`
- `meal_log_items`
- legacy/extra diet tables: `diets`, `diet_items`, `meals`, `meal_selections`

Nutrition plans:

- `nutrition_plans`
- `nutrition_plan_days`
- `nutrition_plan_meals`
- `nutrition_plan_items`

Workout:

- `exercises`
- `equipments`
- `restrictions`
- `exercise_variants`
- `exercise_substitutions`
- `exercise_restrictions`
- `workout_plans`
- `workout_plan_days`
- `workout_plan_day_exercises`
- `workout_logs`
- `workout_log_sets`
- `water_intakes`

AI:

- `ai_requests`
- `ai_plans`
- `ai_feedback`
- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`
- `planner_audit_runs`

Nearby/professional:

- `places_local`
- `places_local_images`
- `professional_verifications`
- `professional_client_assignments`
- `diet_plans`
- `trainer_workout_plans`
- `trainer_progress_notes`

Communication/ops:

- `conversations`
- `conversation_participants`
- `messages`
- `appointments`
- `notifications`
- `admin_action_logs`

Queue/cache:

- `jobs`
- `job_batches`
- `failed_jobs`
- `cache`
- `cache_locks`

## 14. AI File Grouping

`app/Services/Ai/Runtime`

- `FeatureConfigResolver`: provider/model/prompt/schema/timeout/retrieval config.
- `GenerativeAiGateway`: structured generation gateway, currently Ollama.
- `OllamaClient`: low-level chat/embedding HTTP client.

`app/Services/Ai/Prompts`

- `PromptTemplateRepository`: loads prompt markdown.
- `PlannerPrompt`: renders planner system/user prompt.
- `CoachPrompt`: renders coach prompt with context/retrieval/tool data.

`app/Services/Ai/Schemas`

- `PlannerSchema`: strict planner JSON schema definition.

`app/Services/Ai/Context`

- `PlannerContextBuilder`: planner input context.
- `CoachContextBuilder`: lower-level coach base context.

`app/Services/Ai/Planner`

- `PlannerProfileSyncService`: normalizes profile into dedicated safety tables/settings.

`app/Services/Ai/Validation`

- `PlannerOutputValidator`: hard validation for planner JSON.
- `PlannerValidationException`: domain exception.

`app/Services/Ai/Persistence`

- `PlannerPersistenceService`: transactional save of AI plans into AI tables and normalized nutrition/workout tables.

`app/Services/Ai/Presentation`

- `UserFacingAiPayloadSanitizer`: removes internal/debug/provider-sensitive fields for normal users.

`app/Services/Ai/Chat`

- `ChatOrchestrator`: complete coach flow.
- `ChatIntentClassifier`: intent and context flags.
- `ChatContextBuilder`: user context for coach.
- `ChatSafetyGuard`: preflight/post-response safety.
- `CoachDeterministicResponder`: deterministic answers.
- `CoachNutritionCalculator`: nutrition math helper.
- `ChatModelManager`: provider selector.
- `SelfHostedContextAwareChatService`: Qdrant + Ollama retrieval chat.
- `QdrantVectorStore`: vector storage/query.
- `UserContextSnapshotBuilder`: documents to sync into vector store.
- `UserProfileFactResolver`: normalized user facts.
- `Providers/*`: HTTP, self-hosted, and stub chat clients.

`app/Services/Ai/Tools`

- Tool interface, registry, executor, and five coach tools:
  - recipes
  - day macros
  - last 7 days summary
  - exercise alternatives
  - nearby gyms/nutritionists

`app/Services/Ai/Models`

- `ProgressPredictionModel`: hybrid heuristic + ML predictor.

`app/Services/Ai/Evaluation`

- Planner and chat quality scorers.
- Structured chatbot audit suite.
- Deep audit question bank and answer grader.

`app/Services/Ai/Audit`

- Planner audit runner, structure validator, GPU load/execution mode helpers.

`app/Services/Ai/FoodCatalog`

- Food anomaly filtering.
- Planner food model/candidate selection.

`app/Services/Ai/Exercises`

- Planner exercise catalog sync.

`app/Services/Ai/Seed` and `Training`

- Seed cleanup/profile target services.
- Dataset importer/readiness services.

## 15. Current Results, Accuracy, and Quality

### Planner latest audit

Latest local planner audit file inspected:

- `tmp/PlannerUserTypesAudit_20260430_after_parser_fix.md`

Results:

- Generated at: 2026-04-30T14:23:19+00:00.
- Scope: selected non-admin users.
- Horizons: 14, 21, 28.
- Total users: 4.
- Runs total: 12.
- Runs completed: 12.
- Runs success: 12.
- Runs failed: 0.
- Success percentage: 100.00%.
- Average quality percentage: 100.00%.
- Structure preflight: passed.
- Provider preflight: passed.
- Structure warning count: 0.
- Structure issue count: 0.

Interpretation:

- This is a strong structural/safety audit result for the sampled users and horizons.
- It is not statistical nutrition/fitness outcome accuracy.
- It means the generated/persisted planner outputs passed the app's rule-based quality, safety, and structure checks in that audit run.

### Runtime predictor evolution audit

Latest local predictor evolution audit inspected:

- `tmp/predictor_evolution_audit_apr01_2026_after_planner_audit.md`

Results:

- Users evaluated: 188.
- Users with predictions: 187.
- Total cycles: 236.
- Total labeled cycles: 14.
- Predictor MAE: 0.7814 kg.
- Predictor RMSE: 0.9241 kg.
- Planner feedback status:
  - works: 49.
  - partial: 0.
  - not_working: 0.
  - insufficient_data: 139.
- Plan transitions:
  - total transitions: 49.
  - changed transitions: 49.
  - diet changed transitions: 38.
  - workout changed transitions: 49.
  - changed transition rate: 100%.
- Chatbot health:
  - assistant messages: 3454.
  - users with chatbot activity: 15.
  - users without chatbot activity: 173.
  - average quality: 100%.
  - fallback messages: 723.
  - safety intervention messages: 35.

Interpretation:

- The runtime progress predictor has limited labeled outcome data in that report: 14 labeled cycles out of 236.
- MAE/RMSE are real outcome-style metrics, but the low labeled-cycle count means the numbers should be treated as early signal, not final scientific accuracy.
- Many users are marked `insufficient_data`, which is expected until enough post-plan measurements/logs exist.

### Trained progress predictor artifacts

Current configured primary model directory in `config/ai.php`:

- `storage/app/ai/models/progress_predictor_v1_uploaded_weight_only`

Primary weight-only manifest:

- Weight rows: 250.
- Train rows: 196.
- Test rows: 54.
- Train users: 96.
- Test users: 24.
- Strategy: group holdout by `user_id`.
- Weight MAE: 0.04794 kg.
- Weight R2: 0.99205.
- Strength model: disabled by training option.

Real-only full manifest:

- Directory: `storage/app/ai/models/progress_predictor_v1_real_only`
- Weight rows: 281.
- Weight MAE: 0.43667 kg.
- Weight R2: 0.01499.
- Strength MAE: 1.54743.
- Strength R2: -0.06031.

Broader fallback manifest:

- Directory: `storage/app/ai/models/progress_predictor_v1`
- Weight rows: 414.
- Weight MAE: 0.25513 kg.
- Weight R2: -0.32681.
- Strength MAE: 0.67735.
- Strength R2: 0.8958.

Interpretation:

- The primary uploaded weight-only artifact has very strong holdout metrics in its manifest, but it is weight-only and should be interpreted together with dataset provenance.
- The real-only full artifact has weak R2 for weight and negative R2 for strength, so runtime guardrails may reject it depending on configured thresholds.
- The broader fallback has a strong strength R2 but negative weight R2, so it is not universally trustworthy for weight.
- Runtime guardrails exist specifically because model artifact quality varies by dataset and label density.

### Chat quality

Chat quality is mostly rule-based in the app:

- `ChatResponseQualityScorer` checks non-empty answer, no leaked internal labels, safety after review, and reasonable warning count.
- `ChatSafetyGuard` can rewrite/replace unsafe responses.
- `StructuredChatbotAuditSuite` and deep audit tooling provide broader test coverage.

The predictor evolution audit reported:

- 3454 assistant messages.
- Average quality: 100%.
- 723 fallback messages.
- 35 safety intervention messages.

Interpretation:

- The 100% quality metric is a rule-based application quality score, not human-rated medical/nutrition correctness.
- The high fallback count shows the app often uses deterministic or fallback paths, which can be a strength for safety but also indicates the self-hosted model/retrieval path is not the only answer source.

## 16. Tests and Quality Coverage

Relevant test areas:

- `tests/Feature/Ai`
  - planner generation controller
  - chat controller
  - self-hosted chat
  - coach tools
  - planner persistence
  - planner audit runner
  - food catalog filtering
  - seeded progress data
  - rate limiting
- `tests/Unit/Ai`
  - planner output validator
  - chat safety guard
  - intent classifier checklist
  - progress prediction quality gate
  - feature config resolver
  - structured chatbot audit suite
- Feature tests also cover auth, dashboard, RBAC, messaging, appointments, professional clients, admin management, and settings.

Useful commands from `composer.json`:

- `composer dev`
- `composer test`
- `composer test:ai`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run types`

## 17. Main Backend Details a Laravel Developer Should Know

The app is not a thin controller app. Most business logic is in services, especially under `app/Services/Ai`.

Controllers generally:

- Validate request.
- Authorize via middleware/policies.
- Release session lock for long AI requests where needed.
- Call service layer.
- Return Inertia page or JSON resource.

Models:

- Use Eloquent relationships heavily.
- `User` is central and has relations to preferences, measurements, meal entries/logs, AI plans, dietary restrictions, medical histories, conversations/messages, workout logs, professional records, appointments, notifications, and assignments.

AI traceability:

- `ai_requests` tracks input context, output JSON, provider, model, prompt/schema version, usage, and errors.
- `ai_plans` stores versioned generated diet/workout plan snapshots.
- `ai_usage_logs` stores runtime/token/metadata information.
- `ai_messages` stores assistant metadata with warnings, tools, context sources, and quality.

Persistence design:

- The planner does not only store raw JSON.
- It also maps generated output into normalized operational tables so the dashboard, tracker, workout log, and plan pages can render and use the data naturally.

Safety design:

- Restrictions are stored both on legacy user fields and normalized tables.
- Services resolve a combined safety profile.
- Both planner and coach enforce safety at multiple layers.

Self-hosted context design:

- `AppServiceProvider` listens for saves/deletes on user/profile/restriction/measurement/meal/workout/plan models.
- It dispatches debounced `SyncUserAiContext` jobs when self-hosted chat is enabled.
- The sync job rebuilds Qdrant context documents for the specific user.

Admin design:

- Admin pages are mostly Inertia frontends over `/api/admin/...` endpoints.
- Admin controllers focus on operational CRUD/review workflows.
- `AdminActionLogger` and admin action logs provide traceability for admin actions.

Rate limiting:

- AI routes use `AiRequestRateLimit` middleware.
- Plan/chat per-minute and daily caps are configured in `config/ai.php`.

## 18. Important Gaps and Caveats

- OpenAI Responses API is not currently wired into planner/chat despite the original project preference.
- The planner is configured as Ollama-only.
- The coach has streaming backend support, but the current chat page mainly uses the normal persisted JSON endpoint.
- Some admin overview numbers appear static/mock-like in frontend page constants; deeper admin API pages fetch real data.
- Progress prediction accuracy is still limited by labeled measurement density.
- Chat/planner quality percentages are rule-based audits, not external clinical validation.
- This is a fitness/nutrition support system, not a medical diagnosis or treatment system.

## 19. Mental Model for Future Development

When adding features:

1. Add/adjust migrations and models first.
2. Put reusable domain behavior into services, not controllers.
3. For AI planner changes, update:
   - context builder
   - prompts
   - schema if output shape changes
   - validator
   - persistence
   - tests/audits
4. For coach changes, update:
   - intent classifier
   - context builder
   - deterministic responder if safety-sensitive
   - tools if external/local data is needed
   - safety guard
   - tests/audits
5. Always check safety constraints:
   - allergies
   - diet type
   - medical conditions
   - injuries
   - equipment and workout location
6. If adding model metrics, clearly separate:
   - rule-based quality score
   - generation success rate
   - structure validation pass rate
   - actual prediction MAE/RMSE/R2
   - human acceptance/feedback score

## 20. Short Defense-Ready Summary

Hayetak is a full-stack AI health planning and coaching platform. The Laravel backend manages auth, user profiles, safety constraints, meal/workout tracking, professional workflows, admin review, and AI traceability. React/Inertia pages provide the user-facing dashboard, tracker, planner, coach, nearby map, messaging, appointments, settings, professional client views, and admin workspaces.

The planner AI generates strict structured JSON, validates it against safety and shape rules, persists both raw AI snapshots and normalized nutrition/workout records, and attaches progress prediction. The coach AI classifies intent, builds personal context from profile/logs/plans/history, executes deterministic tools, uses self-hosted retrieval with Qdrant and Ollama when needed, and sanitizes responses for allergies, diet type, medical boundaries, injuries, and out-of-domain requests.

The current AI system is hybrid: LLM generation, deterministic tools, rule-based safety guards, local fallback plan generation, and a supervised progress predictor. Latest local planner audit results show 12/12 successful sampled planner runs with 100% rule-based quality; latest predictor evolution audit shows 188 users evaluated, 187 with predictions, 14 labeled cycles, MAE 0.7814 kg, and RMSE 0.9241 kg. These are promising engineering audit results, while real outcome accuracy still depends on more logged measurements and continued validation.
