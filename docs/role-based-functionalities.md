# Role-Based Functionalities

Rechecked from the codebase on 2026-05-09.

Hayetak is segmented by role-aware middleware, policy checks, and assignment logic. The main enforcement layers are:

- `RequireRole`
- `EnsureVerifiedProfessional`
- Eloquent policies for appointments, conversations, diet plans, trainer workout plans, and trainer progress notes
- `ProfessionalAccessService`, which decides whether two users are allowed to interact

The active roles are:

- `client`
- `trainer`
- `nutritionist`
- `admin`

## Client-Based Functionalities

- **Guided onboarding and profile capture**: The multi-step React/Inertia registration wizard posts identity, biometrics, goals, allergies, diet type, medical history, workout frequency, workout location, and prior diet-failure context to `RegisterWizardController`, which validates and persists the user profile before preparing planner context.
- **Immediate post-signup AI bootstrap**: For client accounts, `PlannerProfileSyncService` normalizes AI-facing profile data and `AutoPlanGenerationService` can start the initial plan-generation workflow after signup.
- **Client dashboard aggregation**: `HomeController` composes the client dashboard from profile data, hydration totals, meal summaries, daily macros, active AI nutrition/workout plans, recent AI coach context, and progress prediction telemetry.
- **AI planner generation and regeneration**: The planner page calls `POST /api/ai/plan` or the background endpoint, where `PlanGenerationController` validates generation scope and horizon, then delegates to `PlannerService` for structured generation, validation, persistence, and sanitized response output.
- **AI coach chat with persisted context**: The coach UI posts to `ChatController`, which resolves or creates an AI conversation, persists the user turn, and runs `ChatOrchestrator` to classify intent, build personal context, execute tools, apply safety review, and store the assistant reply.
- **Coach streaming support**: The backend also exposes `POST /api/ai/chat/stream`, which emits the persisted AI answer as server-sent event chunks after the normal orchestration flow finishes.
- **Meal logging and nutrition tracking**: `MealEntryController` and `MealTrackerApiController` support manual meal entry, deletion, per-day totals, per-meal totals, monthly calendars, copy-day behavior, and plan-aware day summaries through `MealTrackerService`.
- **Safe planned-meal logging and substitution**: Planned nutrition items can be logged through `logPlannedItem`, which verifies ownership, restricts logging to the scheduled day, and rejects substitutes that violate allergies or saved diet type.
- **Food search and reusable favorites**: `FoodController` supports filtered food search with meal-type, allergen, substitution, and diet-awareness logic, while `FoodFavoriteController` stores personalized shortcuts for faster logging.
- **Workout plan access and manual drafts**: `WorkoutPlanController` exposes active AI plans, manual plans, and public templates, and also lets the client save a structured manual workout draft into normalized workout-plan relations.
- **Workout session logging and progress signals**: `WorkoutLogController` starts sessions, appends sets, finalizes the workout, and derives weekly strength/progression summaries from `workout_logs` and `workout_log_sets`.
- **Hydration tracking**: Water intake writes feed dashboard-level daily and weekly hydration summaries, including a weight-based target.
- **Nearby discovery and local place search**: The client-facing nearby page consumes curated local places and Overpass-backed results through `PlacesLocalController` and `PlacesController`, with GeoJSON output and distance filtering.
- **Verified professional discovery**: `DietitianDiscoveryController` lists approved trainers and nutritionists, supports area/role filtering, and annotates each professional with interaction eligibility for the current viewer.
- **Direct messaging**: `ConversationController` and `MessageController` support conversation creation, thread loading, read-state updates, and direct messages once policy and interaction checks pass.
- **Appointment requests and status visibility**: `AppointmentController` lets clients request appointments with trainers or nutritionists, view filtered appointment history, and receive status-change notifications.
- **Notifications and settings**: Clients can fetch, mark read, and dismiss notifications, and use the standard profile, password, security, and two-factor settings surfaces.

## Trainer-Based Functionalities

- **Professional registration with verification intake**: Trainer signup extends the normal onboarding flow with legal name, license metadata, expiry date, and uploaded verification documents, which are stored in `professional_verifications`.
- **Pending-verification access model**: Unverified trainers are blocked by `EnsureVerifiedProfessional` from client-facing professional actions such as taking appointments or working client workflows, but they are not blocked from the broader authenticated product surface.
- **Assigned client workspace**: `ProfessionalClientController::trainer` builds a trainer-specific client roster by loading assignment-linked clients, measurement history, recent workout logs, set totals, and the latest trainer-authored workout plan.
- **Trainer-authored workout plans**: `TrainerWorkoutPlanController` lets verified trainers list, create, and update client workout plans after confirming the trainer-to-client assignment through `ProfessionalAccessService`.
- **Progress-note authoring**: `TrainerProgressNoteController` lets trainers store structured coaching notes tied to assigned clients, giving them a lightweight longitudinal coaching record.
- **Messaging with clients**: Trainers can open or reuse direct conversation threads with clients when the interaction rules allow it.
- **Appointment coordination and check-up reminders**: Trainers can view appointments they participate in, update appointment status when authorized, and trigger reminder/check-up flows through `AppointmentController`.

## Nutritionist-Based Functionalities

- **Professional registration with verification intake**: Nutritionist signup follows the same verification workflow as trainer signup, persisting credential metadata and uploaded proof documents before full professional activation.
- **Pending-verification access model**: Unverified nutritionists are restricted from professional-client actions by `EnsureVerifiedProfessional`, while still being able to access the rest of the authenticated app like a normal user.
- **Assigned nutrition client workspace**: `ProfessionalClientController::nutritionist` loads assigned clients with measurement history, allergy context, recent 7-day meal activity, and existing diet plans for a nutrition-focused review surface.
- **Diet plan authoring and revision**: `NutritionistDietPlanController` lets verified nutritionists list, create, and update structured diet plans for assigned clients.
- **Allergen conflict enforcement in authored plans**: Diet-plan writes are validated with allergen conflict detection inside `StoreDietPlanRequest`, so unsafe foods can be blocked before persistence.
- **Meal-review and substitution workflow**: From the nutritionist client page, the professional can inspect logged meals, search allowed food replacements, and message the client with structured meal guidance.
- **Messaging with clients**: Nutritionists can open or continue conversation threads with eligible clients through the shared messaging layer.
- **Appointment coordination**: Nutritionists can participate in the same appointment request, status, and check-up workflows used across the professional side of the app.

## Admin-Based Functionalities

- **Dedicated admin workspace**: Admins are redirected away from the standard client dashboard and into a dedicated admin command surface with separate operational navigation.
- **User and profile administration**: `AdminUserController` supports user listing, filtering, role/verification edits, bulk updates, account deletion, plan comparisons, and deep user inspection.
- **Professional verification review**: `AdminProfessionalVerificationController` manages approval and rejection of trainer/nutritionist verification records.
- **Professional directory management**: `AdminProfessionalController` lets admins inspect and update professional-facing records for both trainers and nutritionists.
- **Assignment management**: `AdminAssignmentController` creates and removes `professional_client_assignments`, which later drive professional workspaces, messaging access, and appointment relationship rules.
- **Food catalog and meal-log moderation**: `AdminMealController` manages food creation, updates, hiding, merging, meal-entry corrections, and meal-entry deletion.
- **Exercise catalog and safety moderation**: `AdminExerciseController` manages exercise CRUD, visibility, alternatives, and unsafe restriction tagging.
- **Progress-data moderation**: `AdminProgressController` lets admins create, update, delete, and mark outlier measurements.
- **Safety-profile review**: `AdminSafetyProfileController` assembles role-aware risk views from allergies, injuries, workout location, equipment, and plan state.
- **Local places curation**: `AdminPlaceLocalController` handles create/update/hide/delete operations for curated places, plus coordinate validation and audit logging.
- **Communications and notifications**: `AdminNotificationController` sends targeted notifications, supports resending failures, and exposes audience segmentation across clients, professionals, and admins.
- **Action logs and auditability**: `AdminActionLogController` exposes moderation and mutation history so high-risk changes remain traceable.
- **Planner audit operations**: `PlannerAuditController` gives admins control over planner audit runs, including launching audits, loading the latest status, and updating workload/execution settings.
- **Admin oversight of AI, health data, and diagnostics**: The admin page set also includes dedicated workspaces for AI review, diagnostics, logs, analytics, privacy/compliance, roles/permissions, settings, and feature-flag style controls.

## Access Logic Notes

- A `client` can interact with approved trainers and nutritionists through the broader interaction rules in `ProfessionalAccessService`, not only through explicit assignment records.
- Explicit assignment records become especially important for trainer and nutritionist client workspaces and authored client plans.
- `admin` bypasses most role-specific restrictions and can inspect or mutate data across all major role surfaces.
