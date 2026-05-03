# Hayetak AI Pipelines: Visual Sequence Diagrams

Branch context: `planner_updated`  
Generated: 2026-04-06

This file contains visual sequence diagrams for both AI pipelines:
- Planner pipeline
- Coach pipeline

## 1) Planner Pipeline (Signup + Manual Trigger)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as React/Inertia (ai/planner.tsx or auth/register.tsx)
    participant API as Laravel Controller
    participant PS as PlannerService
    participant PPS as PlannerProfileSyncService
    participant PCB as PlannerContextBuilder
    participant PP as PlannerPrompt
    participant GAG as GenerativeAiGateway
    participant OLL as OllamaClient
    participant POV as PlannerOutputValidator
    participant PPM as ProgressPredictionModel
    participant PERSIST as PlannerPersistenceService
    participant DB as PostgreSQL

    Note over U,DB: A) Signup flow can dispatch background plan generation
    U->>FE: Complete registration wizard
    FE->>API: POST /register
    API->>API: RegisterWizardController creates user
    API->>PPS: prepare(user) for normalized profile safety tables
    API->>DB: Save user + restrictions/history
    API->>API: AutoPlanGenerationService::startIfNeeded()
    API->>PS: (queued) generate(user, options)

    Note over U,DB: B) Manual planner page generation
    U->>FE: Click "Generate/Regenerate Plan"
    FE->>API: POST /api/ai/plan
    API->>PS: PlannerService::generate(user, options)
    PS->>PPS: prepare(user, overrides)
    PPS->>DB: Sync user_dietary_restrictions + user_medical_histories
    PS->>PCB: build(user, profile, horizon)
    PCB->>DB: Fetch recent nutrition/workout history + catalogs
    PCB-->>PS: context JSON
    PS->>PP: system() + user(context)
    PP-->>PS: prompt messages
    PS->>GAG: generateStructured(feature=planner, messages, schema)
    GAG->>OLL: /api/chat (JSON output expected)
    OLL-->>GAG: raw model answer + usage
    GAG-->>PS: decoded JSON payload
    PS->>PS: normalizeCompactOutput()
    PS->>POV: validate(user, payload, profile, horizon)
    POV-->>PS: validated safe plan
    PS->>PPM: predict(user, profile, context, plan, horizon)
    PPM->>PPM: heuristic baseline + adherence + feedback correction
    PPM->>PPM: optional Python ML blend + guardrails
    PPM-->>PS: progress_prediction block
    PS->>PERSIST: persist(validatedOutput, generationId, aiRequestId)
    PERSIST->>DB: Save ai_requests + ai_plans + nutrition/workout normalized plans
    PS->>DB: Save ai_usage_logs + quality metadata
    PS-->>API: ok + plan + provider/model + usage + quality
    API-->>FE: 201 JSON response
    FE-->>U: Render plan cards, days, meals, workouts, metadata
```

## 2) Coach Pipeline (Context-Aware Chat)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as React/Inertia (ai/chat.tsx)
    participant API as ChatController
    participant ORCH as ChatOrchestrator
    participant CLASS as ChatIntentClassifier
    participant SAFE as ChatSafetyGuard
    participant CTX as ChatContextBuilder
    participant TOOLS as CoachToolExecutor
    participant DET as CoachDeterministicResponder
    participant CMM as ChatModelManager
    participant SH as SelfHostedContextAwareChatService
    participant OLL as OllamaClient
    participant QDR as QdrantVectorStore
    participant DB as PostgreSQL

    U->>FE: Send coach message
    FE->>API: POST /api/ai/chat (message + runtime context)
    API->>ORCH: handle(user, message, runtimeContext, conversation?)
    ORCH->>CLASS: classify(question, runtimeContext)
    CLASS-->>ORCH: intent + feature + context flags
    ORCH->>DB: Store user message (ai_messages)
    ORCH->>SAFE: preflight(question)
    SAFE-->>ORCH: emergency short-circuit? + warnings

    alt No emergency short-circuit
        ORCH->>CTX: build(user, runtimeContext, conversation, classification)
        CTX->>DB: Load profile, restrictions, today logs, last 7 days, plans, memory
        CTX-->>ORCH: context bundle + used_context_keys
        ORCH->>TOOLS: planAndExecute(user, question, runtimeContext, classification)
        TOOLS->>DB: Deterministic tool queries (recipes/macros/summary/alternatives/nearby)
        TOOLS-->>ORCH: tool results + warnings
        ORCH->>DET: respond(user, question, context, classification)
    end

    alt Deterministic answer exists
        DET-->>ORCH: immediate answer + reason/mode
    else Need model generation
        ORCH->>CMM: client()
        CMM-->>ORCH: SelfHostedChatModelClient
        ORCH->>SH: chatResponse(userId, question, context)
        SH->>OLL: embed(question) using nomic-embed-text
        OLL-->>SH: embedding vector
        SH->>QDR: query(user_id-filtered vectors)
        QDR-->>SH: top matches + scores
        SH->>OLL: chat(messages with prompt + retrieved context)
        OLL-->>SH: answer + usage
        SH-->>ORCH: answer + model + usage + retrieval metadata
        ORCH->>SAFE: review(answer, context, question/classification)
        SAFE-->>ORCH: sanitized answer + warnings
    end

    ORCH->>DB: Store assistant message + metadata (intent, tools, warnings, quality)
    ORCH->>DB: Store ai_usage_logs
    ORCH-->>API: conversation + user_message + assistant_message + provider/model
    API-->>FE: 201 JSON response
    FE-->>U: Render assistant answer + updated thread
```

## 3) Context Sync Pipeline (for Self-Hosted Coach Retrieval)

```mermaid
sequenceDiagram
    autonumber
    participant OBS as Eloquent Observers (AppServiceProvider)
    participant DISP as AiContextSyncDispatcher
    participant JOB as SyncUserAiContext Job
    participant SNAP as UserContextSnapshotBuilder
    participant SH as SelfHostedContextAwareChatService
    participant OLL as Ollama embed
    participant QDR as Qdrant

    OBS->>DISP: User/Profile/Restriction/Meal/Workout/Plan changed
    DISP->>JOB: dispatchSync(userId) on terminate/after-commit
    JOB->>SH: syncUserContext(user)
    SH->>SNAP: buildForUser(user)
    SNAP-->>SH: documents (profile, nutrition, workouts, plans, measurements...)
    loop for each document
        SH->>OLL: embed(document text)
        OLL-->>SH: vector
        SH->>QDR: upsert(user_id, doc_key, vector, payload)
    end
```

