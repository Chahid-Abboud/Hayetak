# Hayetak Project Full Explanation

<<<<<<< HEAD
Rechecked from the codebase on 2026-05-09.

This document is a fresh project explanation based on the current Laravel, React, routes, controllers, services, models, migrations, and tests in the repository. It is meant to describe how Hayetak works today, not how it was originally planned.

## 1. Executive Summary

Hayetak is a Laravel 12 + React 19 health and fitness platform with four main role surfaces:

- `client`
- `trainer`
- `nutritionist`
- `admin`

The product combines:

- guided onboarding with health, diet, workout, and safety inputs
- AI-generated diet and workout plans
- an AI coach chat that uses saved profile data, plan data, today logs, and last-7-days summaries
- meal tracking, food search, food favorites, hydration tracking, measurements, and workout logging
- professional discovery, direct messaging, and appointment requests
- professional workspaces for trainers and nutritionists
- a large admin workspace for moderation, assignments, safety review, catalog curation, and AI audit operations

The project is not a thin CRUD app. Most important domain logic lives in dedicated services, especially under `app/Services/Ai/`.

## 2. Current Technology Stack

### Backend

- Laravel 12
- PHP 8.2+
- Inertia.js with server-side Laravel routing
- Laravel Fortify for auth, email verification, password reset, and two-factor flows
- Eloquent models, policies, jobs, middleware, form requests, and Artisan commands
- queued background work for planner generation, AI context sync, and audit utilities

### Frontend

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- Radix UI primitives
- Lucide React icons
- Mapbox GL for the nearby/discovery map

### AI Runtime

- planner generation through Ollama only
- coach chat through `self_hosted`, `http`, or `stub` chat clients depending on configuration
- Qdrant-backed retrieval for the self-hosted coach path
- deterministic tool execution and rule-based safety layers
- Python-based progress prediction with runtime guardrails and heuristic fallback

Important current implementation note:

- The project instructions mention a preference for the OpenAI Responses API.
- The current runtime path does not implement an active OpenAI planner or chat provider.
- `FeatureConfigResolver` resolves planner to `ollama`, and chat to `self_hosted`, `http`, or `stub`.

## 3. Roles and Access Control

The app uses a role-aware access model built mainly from:

- `RequireRole` middleware
- `professional.verified` middleware
- policies for conversations, appointments, diet plans, trainer workout plans, and progress notes
- `ProfessionalAccessService` for client/professional interaction rules

### Client

Clients can:

- register and build a health profile
- generate AI plans
- use AI coach chat
- track meals, workouts, water, and measurements
- discover professionals and nearby places
- message professionals and request appointments

### Trainer

Trainers can:

- register as professionals and submit verification documents
- access assigned client rosters
- review workout history and progress
- create trainer workout plans
- create trainer progress notes
- message clients and coordinate appointments

### Nutritionist

Nutritionists can:

- register as professionals and submit verification documents
- access assigned nutrition client rosters
- review recent meal activity and progress data
- create or update diet plans
- send meal feedback and substitution guidance through messaging
- coordinate appointments

### Admin

Admins get a separate operational workspace with:

- user management
- professional verification review
- assignment management
- food and exercise catalog moderation
- meal-log and progress-data moderation
- places curation
- safety-profile review
- notifications, logs, diagnostics, and AI audit controls

## 4. Core User Journeys

### 4.1 Client Onboarding and First Plan

Main files:

- `resources/js/pages/auth/register.tsx`
- `app/Http/Controllers/Auth/RegisterWizardController.php`
- `app/Services/Ai/Planner/PlannerProfileSyncService.php`
- `app/Services/Ai/AutoPlanGenerationService.php`

Flow:

1. The registration wizard collects identity, biometrics, goals, diet type, allergies, activity level, workout setup, medical history, and prior diet-failure context.
2. If the selected account type is `trainer` or `nutritionist`, the form also submits verification metadata and uploaded documents.
3. `RegisterWizardController` validates the payload and creates the `users` row.
4. Professional accounts also create a `professional_verifications` row and are marked as pending.
5. `PlannerProfileSyncService->prepare()` normalizes planner-relevant profile data for later AI use.
6. The user is logged in and email verification is triggered.
7. `AutoPlanGenerationService->startIfNeeded()` can dispatch initial planner generation for eligible client accounts.

### 4.2 Daily Client Loop

The normal client loop is:

1. open dashboard
2. review active plans and progress summary
3. log meals, water, and workouts
4. ask AI coach follow-up questions
5. discover nearby professionals or places when needed
6. message or book appointments with professionals

This loop is reflected across:

- `HomeController`
- `MealEntryController`
- `MealTrackerApiController`
- `WorkoutPlanController`
- `WorkoutLogController`
- `ChatController`
- `ConversationController`
- `AppointmentController`
- `DietitianDiscoveryController`
- `PlacesController`
- `PlacesLocalController`

### 4.3 Professional Workflow

Professional flows depend on `professional_client_assignments`.

- Trainers and nutritionists only get the client workspace after role checks and verification checks pass.
- Their pages are populated by `ProfessionalClientController`.
- They then branch into workout, nutrition, messaging, and appointment operations depending on role.

### 4.4 Admin Workflow

Admins are redirected away from the client dashboard into the admin workspace.

The admin frontend groups work into three broad lanes:

- command
- workspaces
- system

This is defined in `resources/js/components/admin/AdminShell.tsx` and matched by the admin route groups in `routes/web.php`.

## 5. Route and Page Architecture

### Main Route File

Most app behavior is defined in `routes/web.php`.

This file includes:

- public landing routes
- guest registration routes
- authenticated page routes
- authenticated session-based `/api/...` routes
- admin page routes
- AI planner and AI chat endpoints

### Secondary API File

`routes/api.php` still exists and contains some older or simpler API-style endpoints, especially for:

- food search
- meal entry create/delete
- nearby places

So the project currently uses both:

- session-authenticated web routes that return JSON
- and a smaller separate `api.php` route file

### Main Page Groups

#### Public / Auth

- `welcome.tsx`
- `auth/register.tsx`
- `auth/login.tsx`
- password reset pages
- email verification pages
- two-factor challenge page

#### Client / Shared Product Pages

- `dashboard.tsx`
- `track_meal/track_meals.tsx`
- `ai/planner.tsx`
- `ai/chat.tsx`
- `workouts/planner.tsx`
- `workouts/log.tsx`
- `Places.tsx`
- `messages/index.tsx`
- `appointments/index.tsx`
- settings pages

#### Professional Pages

- `professionals/clients.tsx`

This single page runs in two modes:

- trainer mode
- nutritionist mode

#### Admin Pages

Admin pages are split into many route-level screens, including:

- overview
- people
- users
- professional verifications
- professionals
- assignments
- meals
- meal logs
- exercises
- places
- progress
- safety profiles
- AI review
- AI planner
- AI coach
- notifications
- logs
- diagnostics
- analytics
- roles and permissions
- privacy/compliance
- settings and feature flags

## 6. Main Product Surfaces

### Dashboard

Main file:

- `app/Http/Controllers/HomeController.php`

The dashboard is an aggregation layer. It builds a single Inertia payload containing:

- core profile values
- hydration totals and weekly summary
- meal-log and meal-entry summaries
- daily macro totals
- per-meal totals
- weight and height history
- active AI nutrition plan
- active AI workout plan
- latest AI coach conversation preview
- progress prediction summary
- prediction trend history

Admins are redirected out of this dashboard into the admin overview.

### Meal Tracker

Main files:

- `app/Http/Controllers/MealEntryController.php`
- `app/Http/Controllers/MealTrackerApiController.php`
- `app/Services/MealTrackerService.php`

The meal tracker supports:

- quick manual logging
- plan-following mode
- planned-item exact logging
- safe substitution logging
- daily and monthly summaries
- day-copy behavior
- food search and favorites

It is one of the most important operational data sources for both the planner and the coach.

### Workout Planning and Logging

Main files:

- `app/Http/Controllers/Workout/WorkoutPlanController.php`
- `app/Http/Controllers/Workout/WorkoutLogController.php`

The app supports both:

- AI-generated workout plans
- user-authored manual workout drafts

Workout logs can be:

- started
- appended with sets
- finalized with duration and notes

The backend later turns those logs into weekly progression summaries.

### Nearby Discovery

Main files:

- `resources/js/pages/Places.tsx`
- `app/Http/Controllers/PlacesController.php`
- `app/Http/Controllers/PlacesLocalController.php`
- `app/Http/Controllers/DietitianDiscoveryController.php`

The nearby page merges:

- curated local place data
- Overpass/OpenStreetMap search results
- verified professional discovery

The frontend then lets the user:

- filter by type
- inspect map markers
- open messaging
- request appointments

### Messaging and Appointments

Main files:

- `app/Http/Controllers/Chat/ConversationController.php`
- `app/Http/Controllers/Chat/MessageController.php`
- `app/Http/Controllers/AppointmentController.php`

Messaging supports:

- conversation creation with policy checks
- thread loading
- read-state updates
- direct user-to-user messages
- conversation context lookup

Appointments support:

- appointment creation
- status transitions
- summary counters
- check-up reminders
- notification dispatch
- admin action logging

## 7. AI System Overview

Hayetak has three important AI-related layers:

- planner generation
- coach chat
- progress prediction

It also has deterministic safety and fallback layers around them.

### 7.1 AI Planner
=======
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
>>>>>>> origin/main

Main endpoint:

- `POST /api/ai/plan`
<<<<<<< HEAD

Main files:

- `app/Http/Controllers/Ai/PlanGenerationController.php`
- `app/Http/Requests/Ai/StorePlanRequest.php`
- `app/Services/Ai/PlannerService.php`
- `app/Services/Ai/Context/PlannerContextBuilder.php`
- `app/Services/Ai/Prompts/PlannerPrompt.php`
- `app/Services/Ai/Schemas/PlannerSchema.php`
- `app/Services/Ai/Validation/PlannerOutputValidator.php`
- `app/Services/Ai/Persistence/PlannerPersistenceService.php`

Current planner behavior:

- provider is Ollama only
- output must be structured JSON
- the request can generate diet only, workout only, or both
- the supported horizons are 14, 21, and 28 days
- local deterministic fallback is enabled

Planner pipeline:

1. `PlanGenerationController` validates request options and releases the session lock for long-running AI calls.
2. `PlannerService` decides scope and regeneration behavior.
3. `PlannerProfileSyncService` prepares normalized planner inputs and optional profile overrides.
4. `PlannerContextBuilder` constructs the planner context from profile, restrictions, equipment, meal/workout history, and existing plan versions.
5. `PlannerPrompt` renders the system and user prompt.
6. `GenerativeAiGateway` sends a structured-generation request through Ollama.
7. If JSON is malformed, the gateway retries with stricter JSON-only instructions.
8. `PlannerService` normalizes compact output into the app's richer internal structure.
9. `PlannerOutputValidator` enforces structure, horizon length, calorie sanity, meal shape, variety, and safety constraints.
10. `ProgressPredictionModel` attaches progress prediction metadata.
11. Adaptive plan adjustments can be applied when configured prediction-error thresholds are hit.
12. `PlannerPersistenceService` stores both AI trace data and normalized operational plans.
13. `AiUsageLogger` stores provider/model/usage metadata.
14. The response is sanitized for normal users before the frontend receives it.

Planner output domains include:
=======
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
>>>>>>> origin/main

- `overview`
- `safety`
- `diet`
<<<<<<< HEAD
- `workout`
- `adaptive_review`
- `progress_prediction`

### 7.2 AI Coach Chat

Main endpoints:

=======
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
>>>>>>> origin/main
- `POST /api/ai/chat`
- `POST /api/ai/chat/stream`

Main files:

<<<<<<< HEAD
- `app/Http/Controllers/Ai/ChatController.php`
- `app/Http/Requests/Ai/StoreChatMessageRequest.php`
- `app/Services/Ai/Chat/ChatOrchestrator.php`
- `app/Services/Ai/Chat/ChatContextBuilder.php`
- `app/Services/Ai/Chat/ChatIntentClassifier.php`
- `app/Services/Ai/Chat/ChatSafetyGuard.php`
- `app/Services/Ai/Chat/CoachDeterministicResponder.php`
- `app/Services/Ai/Chat/ChatModelManager.php`
- `app/Services/Ai/Tools/CoachToolExecutor.php`

Current coach behavior:

- the UI mainly uses the normal persisted JSON endpoint
- the backend also supports streaming over SSE
- conversations are stored in dedicated AI conversation/message tables
- context sources are attached to assistant metadata

Coach pipeline:

1. `ChatController` validates the incoming message and resolves or creates an AI conversation.
2. `ChatOrchestrator` classifies the request intent and feature lane.
3. The user message is persisted.
4. `ChatSafetyGuard` performs a preflight check for obvious safety boundaries.
5. `ChatContextBuilder` builds personalized context from:
   - saved profile
   - restrictions
   - today summary
   - last 7 days summary
   - active plans
   - recent conversation turns
   - runtime request details
6. `CoachToolExecutor` plans and executes deterministic tools when the message suggests they are useful.
7. `CoachDeterministicResponder` can short-circuit with safer or more exact answers for certain classes of questions.
8. If no deterministic answer is used, `ChatModelManager` picks the concrete chat client and runs the model path.
9. `ChatSafetyGuard` reviews the generated answer again after model output.
10. The assistant message is persisted with warnings, tools, context-source metadata, and quality metadata.
11. Usage and notification side effects are recorded.

### 7.3 Coach Tools

The registered coach tools are:

- `search_recipes`
- `get_day_macros`
- `summarize_last_7_days`
- `suggest_exercise_alternatives`
- `find_gyms_or_nutritionists`

These tools are not free-form browsing. They are deterministic, app-controlled tool calls exposed through `AiToolRegistry` and executed by `CoachToolExecutor`.

### 7.4 Progress Prediction

Main file:

- `app/Services/Ai/Models/ProgressPredictionModel.php`

Current predictor behavior:

- planner responses can include projected progress data
- runtime inference uses a Python script
- model directories and guardrails are configured in `config/ai.php`
- heuristic fallback remains important because not every dataset or artifact is reliable enough

The project also contains:

- predictor audits
- readiness commands
- quality-gate tests

### 7.5 Self-Hosted Context Sync

Main file:

- `app/Providers/AppServiceProvider.php`

When AI-related user context changes, the provider dispatches context-sync work for:

- user profile changes
- preferences
- restrictions
- medical histories
- measurements
- meal entries
- workout logs
- workout plans
- nutrition plans
- AI plans

This keeps self-hosted coach retrieval aligned with the current user state.

## 8. AI Runtime Configuration

Main file:

- `config/ai.php`

Important current defaults:

- chat provider defaults to `self_hosted`
- planner is configured as `ollama_only`
- planner local fallback is enabled
- planner prompt version is `hayetak_planner_v2`
- planner schema version is `hayetak_plan_v2`
- AI rate limits are configured for both planner and chat
- progress prediction inference and quality guardrails are configurable

Provider resolution today:

- planner: always `ollama`
- chat: `self_hosted`, `http`, or `stub`

There is no active OpenAI execution path in the current planner or coach runtime.

## 9. Backend Architecture

### Controllers

Controllers are grouped by domain:

- `Ai`
- `Admin`
- `Auth`
- `Chat`
- `Professional`
- `Settings`
- `Workout`
- plus general controllers for dashboard, meals, places, notifications, and appointments

The controllers usually do four things:

1. validate
2. authorize
3. delegate to services
4. return JSON or Inertia

### Services

This is the heart of the app.

Important service areas:

- `app/Services/Ai/`
- `MealTrackerService`
- `ProfessionalAccessService`
- `OverpassService`
- messaging support services
- notification and admin logging services

### Models

Important model groups include:

- account/profile models
- meal, food, and nutrition-plan models
- workout, exercise, and workout-log models
- AI trace and AI chat models
- messaging and appointment models
- professional and admin workflow models

### Jobs

Key jobs include:

- `GeneratePlansForUser`
- `GenerateAiCoachReply`
- `RunPlannerAudit`
- `SyncUserAiContext`

### Middleware and Policies

Important enforcement layers:

- role middleware
- verification middleware
- AI rate-limit middleware
- conversation and appointment policies
- professional plan/note policies

## 10. Database Domain Map

The database is easiest to understand by domain rather than by raw migration order.

### Accounts and Auth
=======
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
>>>>>>> origin/main

- `users`
- `user_prefs`
- `sessions`
- `password_reset_tokens`
- `personal_access_tokens`

<<<<<<< HEAD
### Safety and Health Profile
=======
Profile/safety:
>>>>>>> origin/main

- `user_dietary_restrictions`
- `user_medical_histories`
- `measurements`
<<<<<<< HEAD
- water intake and profile fields on `users`

### Food and Meal Tracking
=======

Food/meal:
>>>>>>> origin/main

- `foods`
- `food_favorites`
- `meal_entries`
- `meal_logs`
- `meal_log_items`
<<<<<<< HEAD
- legacy diet/meal support tables

### Nutrition Plans
=======
- legacy/extra diet tables: `diets`, `diet_items`, `meals`, `meal_selections`

Nutrition plans:
>>>>>>> origin/main

- `nutrition_plans`
- `nutrition_plan_days`
- `nutrition_plan_meals`
- `nutrition_plan_items`

<<<<<<< HEAD
### Workouts

- `exercises`
- workout-plan tables
- workout-log tables
- exercise AI/support tables introduced by later migrations

### AI Traceability
=======
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
>>>>>>> origin/main

- `ai_requests`
- `ai_plans`
- `ai_feedback`
- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`
- `planner_audit_runs`

<<<<<<< HEAD
### Professional and Discovery

=======
Nearby/professional:

- `places_local`
- `places_local_images`
>>>>>>> origin/main
- `professional_verifications`
- `professional_client_assignments`
- `diet_plans`
- `trainer_workout_plans`
- `trainer_progress_notes`
<<<<<<< HEAD
- `places_local`
- `places_local_images`

### Communication and Operations
=======

Communication/ops:
>>>>>>> origin/main

- `conversations`
- `conversation_participants`
- `messages`
- `appointments`
- `notifications`
- `admin_action_logs`

<<<<<<< HEAD
## 11. Frontend Architecture

The React app is organized into:

- `pages` for route-level Inertia screens
- `components` for reusable UI and feature slices
- `layouts` for app/auth/settings wrappers
- `lib` for frontend helpers
- `types` for shared TypeScript types

There are two especially important frontend patterns:

- role-aware surfaces, where the same backend app exposes very different flows depending on role
- server-composed pages, where controllers build large structured props and React mostly orchestrates UI state on top of them

The admin frontend is large enough to behave like a sub-application inside the main product.

## 12. Testing and Evaluation Coverage

The repository already has broad automated coverage.

Important test groups:

- `tests/Feature/Ai`
- `tests/Unit/Ai`
- auth feature tests
- dashboard and navigation tests
- messaging and appointment tests
- RBAC tests
- professional page tests
- settings tests
- admin management tests

Useful commands:

- `composer test`
- `composer test:ai`
=======
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
>>>>>>> origin/main
- `npm run build`
- `npm run lint`
- `npm run types`

<<<<<<< HEAD
The project also includes evaluation and audit infrastructure through:

- planner audit commands
- structured chatbot audit suites
- deep audit commands
- predictor evolution audits
- food catalog anomaly audits

This rewrite intentionally does not restate old numeric audit results unless those reports are re-run and re-verified in the same pass.

## 13. Current Strengths

The strongest engineering characteristics in the current codebase are:

- strong separation between controllers and service-layer logic
- explicit role and assignment enforcement
- normalized nutrition and workout persistence, not just raw AI JSON blobs
- multi-layer safety design for allergies, diet type, medical issues, injuries, and equipment constraints
- hybrid AI strategy using LLM generation plus deterministic tools and fallback paths
- strong operational surfaces for admins and professionals
- meaningful test coverage around AI and RBAC-sensitive flows

## 14. Current Caveats and Reality Check

Important current caveats:

- OpenAI Responses API is not wired into the live planner/chat execution path
- the planner is currently Ollama-only
- the app contains both newer session-authenticated `/api/...` routes in `web.php` and some older endpoints in `api.php`
- quality and audit tooling exist, but not every metric in older docs should be treated as fresh without rerunning the commands
- progress prediction still depends heavily on data quality, label density, and runtime guardrails
- this is a fitness and nutrition support product, not a medical diagnosis system

## 15. Short Defense-Ready Summary

Hayetak is a role-based AI health platform built with Laravel and React. Clients create a detailed health profile, receive structured AI-generated nutrition and workout plans, log meals and workouts, and use an AI coach that can reference their restrictions, current plans, today's data, and recent history. Trainers and nutritionists work through verified professional workflows tied to explicit client assignments, while admins operate a separate moderation and operations workspace for users, safety, catalog quality, professional verification, and AI review.

Technically, the project uses a service-oriented Laravel backend, Inertia-driven React pages, normalized plan persistence, self-hosted AI integrations, deterministic coach tools, rule-based safety review, and a Python-backed progress predictor. The current runtime is hybrid and defensive by design: Ollama for planner generation, self-hosted or stub/http chat providers for coaching, Qdrant retrieval for personalized chat context, and local fallback logic when model output is unsafe, malformed, or incomplete.
=======
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
>>>>>>> origin/main
