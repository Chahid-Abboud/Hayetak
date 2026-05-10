# Hayetak Project Full Explanation

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

Main endpoint:

- `POST /api/ai/plan`

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

- `overview`
- `safety`
- `diet`
- `workout`
- `adaptive_review`
- `progress_prediction`

### 7.2 AI Coach Chat

Main endpoints:

- `POST /api/ai/chat`
- `POST /api/ai/chat/stream`

Main files:

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

- `users`
- `user_prefs`
- `sessions`
- `password_reset_tokens`
- `personal_access_tokens`

### Safety and Health Profile

- `user_dietary_restrictions`
- `user_medical_histories`
- `measurements`
- water intake and profile fields on `users`

### Food and Meal Tracking

- `foods`
- `food_favorites`
- `meal_entries`
- `meal_logs`
- `meal_log_items`
- legacy diet/meal support tables

### Nutrition Plans

- `nutrition_plans`
- `nutrition_plan_days`
- `nutrition_plan_meals`
- `nutrition_plan_items`

### Workouts

- `exercises`
- workout-plan tables
- workout-log tables
- exercise AI/support tables introduced by later migrations

### AI Traceability

- `ai_requests`
- `ai_plans`
- `ai_feedback`
- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`
- `planner_audit_runs`

### Professional and Discovery

- `professional_verifications`
- `professional_client_assignments`
- `diet_plans`
- `trainer_workout_plans`
- `trainer_progress_notes`
- `places_local`
- `places_local_images`

### Communication and Operations

- `conversations`
- `conversation_participants`
- `messages`
- `appointments`
- `notifications`
- `admin_action_logs`

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
- `npm run build`
- `npm run lint`
- `npm run types`

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
