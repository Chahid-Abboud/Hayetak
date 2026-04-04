# AI Planner Architecture

## Layers

### 1. AI generation layer
- `app/Services/Ai/Planner/OpenAiPlannerModelClient.php`
- `app/Services/Ai/Planner/OllamaPlannerModelClient.php`
- `app/Services/Ai/Prompts/PlannerPrompt.php`
- `resources/ai/prompts/planner/`
- `app/Services/Ai/Schemas/PlannerSchema.php`

The planner uses a general-purpose LLM, not a custom-trained foundation model. The application provides the intelligence scaffolding through prompt templates, structured JSON schemas, and provider-specific integrations.

### 2. App/business logic layer
- `app/Services/Ai/PlannerService.php`
- `app/Services/Ai/Planner/PlannerProfileSyncService.php`
- `app/Services/Ai/Validation/PlannerOutputValidator.php`
- `app/Services/Ai/Persistence/PlannerPersistenceService.php`
- `app/Http/Controllers/Ai/PlanGenerationController.php`
- `app/Http/Requests/Ai/StorePlanRequest.php`

Laravel is the safety and control layer. It validates inputs, synchronizes normalized restriction/history tables, builds the generation context, enforces safety rules, stores the AI request trace, and persists normalized active plans for the rest of the app.

### 3. Adaptive review layer
- The stored plan schema contains `adaptive_review`.
- The normalized tables and `ai_requests` trace make weekly review and replanning possible later.

This keeps the planner ready for a weekly adherence/result review loop without requiring a second architecture rewrite.

### 4. Optional lightweight ML experiment layer
- `app/Console/Commands/AiExportTrainingData.php`
- The stored plan schema contains `ml_readiness`.

The project can later export structured `(input_context -> target_json)` examples for a small regression or recommendation experiment. That future experiment is intentionally optional and does not replace the main LLM-based planner.

## Why this counts as a real AI system academically

The system is still AI-based even without training a large model from scratch because it combines:

- an LLM inference layer
- structured prompts
- strict machine-readable outputs
- application-side safety validation
- domain-specific persistence and review loops
- future data collection for small downstream ML experiments

That is a realistic resource-aware product architecture for a senior project.

## Prompt templates

Prompt templates live in:

- `resources/ai/prompts/planner/system.md`
- `resources/ai/prompts/planner/user.md`

This keeps prompt engineering explicit, versionable, and thesis-friendly.

## Final stored plan shape

The planner stores a strict JSON object with these top-level sections:

- `overview`
- `safety`
- `diet`
- `workout`
- `adaptive_review`
- `ml_readiness`

This structure is intended to support:

- React rendering
- future planned-meal auto-creation
- future planned-workout auto-creation
- weekly review/replanning
- later dataset export for lightweight ML experiments
