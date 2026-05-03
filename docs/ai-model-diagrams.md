# Hayetak AI Model Diagrams Pack

Generated on: 2026-04-14

This document contains a complete visual set to understand how each AI model works in the project.

## 1) Full AI System Map

```mermaid
flowchart LR
  U[User] --> CHAT_API[POST /api/ai/chat]
  U --> PLAN_API[POST /api/ai/plan]

  CHAT_API --> CHAT_CTRL[ChatController]
  PLAN_API --> PLAN_CTRL[PlanGenerationController]

  CHAT_CTRL --> ORCH[ChatOrchestrator]
  ORCH --> CHAT_CTX[ChatContextBuilder]
  ORCH --> CHAT_INTENT[ChatIntentClassifier]
  ORCH --> CHAT_SAFETY[ChatSafetyGuard]
  ORCH --> TOOL_EXEC[CoachToolExecutor]
  ORCH --> CHAT_MODEL_MGR[ChatModelManager]
  ORCH --> CONV_DB[(ai_conversations + ai_messages)]

  CHAT_MODEL_MGR --> SH_CLIENT[SelfHostedChatModelClient]
  CHAT_MODEL_MGR --> HTTP_CLIENT[HttpChatModelClient]
  CHAT_MODEL_MGR --> STUB_CLIENT[StubChatModelClient]

  SH_CLIENT --> SH_SERVICE[SelfHostedContextAwareChatService]
  SH_SERVICE --> OLLAMA[OllamaClient]
  SH_SERVICE --> QDRANT[QdrantVectorStore]
  SH_SERVICE --> COACH_PROMPT[CoachPrompt]

  PLAN_CTRL --> PLANNER[PlannerService]
  PLANNER --> PROFILE_SYNC[PlannerProfileSyncService]
  PLANNER --> PLAN_CTX[PlannerContextBuilder]
  PLANNER --> PLAN_PROMPT[PlannerPrompt]
  PLANNER --> AI_GATEWAY[GenerativeAiGateway]
  PLANNER --> PLAN_VALIDATOR[PlannerOutputValidator]
  PLANNER --> PLAN_FALLBACK[PlannerLocalFallbackService]
  PLANNER --> PREDICTOR[ProgressPredictionModel]
  PLANNER --> PLAN_PERSIST[PlannerPersistenceService]

  AI_GATEWAY --> OLLAMA

  PLAN_PERSIST --> AI_DB[(ai_requests + ai_plans)]
  PLAN_PERSIST --> NUT_DB[(nutrition_plans + days + meals + items)]
  PLAN_PERSIST --> WRK_DB[(workout_plans + days + exercises)]

  ORCH --> USAGE[AiUsageLogger]
  PLANNER --> USAGE
  USAGE --> USAGE_DB[(ai_usage_logs)]
```

## 2) Chat Model Internals (Component View)

```mermaid
flowchart TD
  START[ChatController::store] --> ORCH[ChatOrchestrator::handle]
  ORCH --> C1[ChatIntentClassifier::classify]
  ORCH --> C2[ChatContextBuilder::build]
  ORCH --> C3[CoachToolExecutor::planAndExecute]
  ORCH --> C4[CoachDeterministicResponder::respond]
  ORCH --> C5[ChatModelManager::client]

  C5 --> P1[SelfHostedChatModelClient]
  C5 --> P2[HttpChatModelClient]
  C5 --> P3[StubChatModelClient]

  P1 --> SH[SelfHostedContextAwareChatService::chatResponse]
  SH --> E1[OllamaClient::embed]
  SH --> V1[QdrantVectorStore::query]
  SH --> PR[CoachPrompt::system]
  SH --> E2[OllamaClient::chat]

  ORCH --> SAFE1[ChatSafetyGuard::preflight]
  ORCH --> SAFE2[ChatSafetyGuard::review]
  ORCH --> SAVE1[(ai_messages insert user turn)]
  ORCH --> SAVE2[(ai_messages insert assistant turn)]
  ORCH --> LOG[(ai_usage_logs insert)]
```

## 3) Chat Request Sequence (Runtime)

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as Frontend ai/chat.tsx
  participant API as ChatController
  participant ORCH as ChatOrchestrator
  participant CLASS as ChatIntentClassifier
  participant CTX as ChatContextBuilder
  participant TOOLS as CoachToolExecutor
  participant MODELS as ChatModelManager
  participant SH as SelfHostedContextAwareChatService
  participant OLL as OllamaClient
  participant QDR as QdrantVectorStore
  participant SAFE as ChatSafetyGuard
  participant DB as PostgreSQL

  User->>FE: Send message
  FE->>API: POST /api/ai/chat
  API->>ORCH: handle(user, message, runtimeContext)
  ORCH->>CLASS: classify(message)
  ORCH->>DB: save user ai_message
  ORCH->>SAFE: preflight(message)
  ORCH->>CTX: build(user, runtime)
  ORCH->>TOOLS: planAndExecute(...)
  ORCH->>MODELS: select client

  alt self_hosted
    MODELS->>SH: chatResponse(userId, question, context)
    SH->>OLL: embed(question)
    SH->>QDR: query user vectors
    SH->>OLL: chat(messages + retrieved context)
    SH-->>ORCH: answer + model + usage
  else http
    MODELS-->>ORCH: HttpChatModelClient response
  else stub
    MODELS-->>ORCH: StubChatModelClient response
  end

  ORCH->>SAFE: review(answer, context)
  ORCH->>DB: save assistant ai_message
  ORCH->>DB: save ai_usage_log
  ORCH-->>API: final payload
  API-->>FE: JSON response
```

## 4) Chat Provider Selection Decision Tree

```mermaid
flowchart TD
  A[FeatureConfigResolver::resolveChatProvider] --> B{AI_CHAT_PROVIDER set?}
  B -->|self_hosted| C[self_hosted]
  B -->|http| D[http]
  B -->|stub| E[stub]
  B -->|auto or empty| F{Testing env?}
  F -->|yes| E
  F -->|no| G{Self-hosted ollama URL configured?}
  G -->|yes| C
  G -->|no| H{HTTP endpoint configured?}
  H -->|yes| D
  H -->|no| E
```

## 5) Chat Safety + Tool Gating

```mermaid
flowchart TD
  Q[Incoming user question] --> P[preflight emergency check]
  P -->|Emergency detected| R[Return urgent-care short-circuit]
  P -->|No emergency| I[Intent classify + context build]
  I --> T[Plan deterministic tool calls]
  T --> X[Execute tools]
  X --> M[Model response]
  M --> S[review safety filters]
  S -->|Allergy/diet conflict| F[Replace unsafe answer with safe alternative message]
  S -->|No conflict| O[Return reviewed answer]
```

## 6) Planner Model Internals (Component View)

```mermaid
flowchart TD
  START[PlanGenerationController::store] --> PS[PlannerService::generate]
  PS --> P1[PlannerProfileSyncService::prepare]
  PS --> P2[PlannerContextBuilder::build]
  PS --> P3[PlannerPrompt::system + user]
  PS --> P4[GenerativeAiGateway::generateStructured]
  PS --> P5[normalizeCompactOutput]
  PS --> P6[PlannerOutputValidator::validate]
  PS --> P7[ProgressPredictionModel::predict]
  PS --> P8[PlannerPersistenceService::persist]
  PS --> P9[AiUsageLogger::log]

  P4 --> OLL[OllamaClient::chat]
  PS --> FB[PlannerLocalFallbackService::build]

  P8 --> DB1[(ai_requests)]
  P8 --> DB2[(ai_plans)]
  P8 --> DB3[(nutrition_plans + children)]
  P8 --> DB4[(workout_plans + children)]
```

## 7) Planner Generation Sequence (Runtime)

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as Frontend ai/planner.tsx
  participant API as PlanGenerationController
  participant PS as PlannerService
  participant PPS as PlannerProfileSyncService
  participant PCB as PlannerContextBuilder
  participant PP as PlannerPrompt
  participant GAG as GenerativeAiGateway
  participant OLL as OllamaClient
  participant VAL as PlannerOutputValidator
  participant PRED as ProgressPredictionModel
  participant PERSIST as PlannerPersistenceService
  participant DB as PostgreSQL

  User->>FE: Generate / regenerate plan
  FE->>API: POST /api/ai/plan
  API->>PS: generate(user, options)
  PS->>PPS: prepare profile
  PS->>PCB: build context
  PS->>DB: create ai_request status=running
  PS->>PP: render prompts
  PS->>GAG: generateStructured(schema)
  GAG->>OLL: chat JSON mode

  alt model fails/timeouts
    PS->>PS: shouldUseLocalFallback()
    PS->>PS: PlannerLocalFallbackService::build
  end

  PS->>VAL: validate output
  PS->>PRED: attach progress prediction
  PS->>PERSIST: persist all plan tables
  PS->>DB: complete ai_request + usage log
  PS-->>API: plan payload + metadata
  API-->>FE: 201 response
```

## 8) Planner Fallback Decision Logic

```mermaid
flowchart TD
  A[Model error in PlannerService] --> B{Local fallback enabled?}
  B -->|no| E[Throw error to controller]
  B -->|yes| C{Planner provider == ollama?}
  C -->|no| E
  C -->|yes| D[Use PlannerLocalFallbackService]
  D --> F[Validate fallback JSON]
  F --> G[Persist as normal]
```

## 9) Progress Prediction Model Logic

```mermaid
flowchart TD
  A[ProgressPredictionModel::predict] --> B[Normalize horizon 14/21/28]
  B --> C[Resolve goal mode lose/gain/maintain]
  C --> D[Base weekly rate heuristic]
  D --> E[Adherence multiplier from logs]
  E --> F[Apply feedback correction from past prediction error]
  F --> G[Optional Python ML inference]
  G --> H{Guardrails pass?}
  H -->|yes| I[Blend heuristic + ML weekly rate]
  H -->|no| J[Keep heuristic path]
  I --> K[Clamp weekly rate by goal bounds]
  J --> K
  K --> L[Compute expected weight change + projected weight]
  L --> M[Return progress_prediction block]
```

## 10) Progress ML Guardrail Decision Tree

```mermaid
flowchart TD
  A[ML prediction available] --> B{guardrails enabled?}
  B -->|no| Z[Allow ML]
  B -->|yes| C{confidence >= min required?}
  C -->|no| R1[Block: low_confidence]
  C -->|yes| D{macro targets present?}
  D -->|no| R2[Block: missing_macro_targets]
  D -->|yes| E{enough meal logged days?}
  E -->|no| R3[Block: insufficient_meal_logs]
  E -->|yes| F{enough workout sessions?}
  F -->|no| R4[Block: insufficient_workout_sessions]
  F -->|yes| G{ML vs heuristic delta <= threshold?}
  G -->|no| R5[Block: ml_delta_too_far_from_heuristic]
  G -->|yes| H{abs ML weekly rate <= max?}
  H -->|no| R6[Block: ml_weekly_rate_out_of_bounds]
  H -->|yes| I{rate aligns with goal mode bounds?}
  I -->|no| R7[Block: ml_weekly_rate_conflicts_with_goal]
  I -->|yes| Z
```

## 11) Data Model ER Diagram (AI + Plan/Log Core)

```mermaid
erDiagram
  USERS ||--o{ AI_REQUESTS : creates
  USERS ||--o{ AI_PLANS : owns
  USERS ||--o{ AI_CONVERSATIONS : owns
  AI_CONVERSATIONS ||--o{ AI_MESSAGES : has
  USERS ||--o{ AI_USAGE_LOGS : has
  USERS ||--o{ AI_FEEDBACK : writes
  AI_REQUESTS ||--o{ AI_FEEDBACK : receives

  USERS ||--o{ USER_DIETARY_RESTRICTIONS : has
  USERS ||--o{ USER_MEDICAL_HISTORIES : has

  USERS ||--o{ NUTRITION_PLANS : has
  NUTRITION_PLANS ||--o{ NUTRITION_PLAN_DAYS : has
  NUTRITION_PLAN_DAYS ||--o{ NUTRITION_PLAN_MEALS : has
  NUTRITION_PLAN_MEALS ||--o{ NUTRITION_PLAN_ITEMS : has

  USERS ||--o{ WORKOUT_PLANS : has
  WORKOUT_PLANS ||--o{ WORKOUT_PLAN_DAYS : has
  WORKOUT_PLAN_DAYS ||--o{ WORKOUT_PLAN_DAY_EXERCISES : has

  USERS ||--o{ MEAL_ENTRIES : logs
  USERS ||--o{ MEAL_LOGS : logs
  USERS ||--o{ WORKOUT_LOGS : logs
```

## 12) AI Request Lifecycle State Diagram

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> running: worker/controller starts
  running --> completed: output validated+persisted
  running --> failed: model/validation/runtime error
  completed --> [*]
  failed --> [*]
```

## 13) Chat Conversation Lifecycle State Diagram

```mermaid
stateDiagram-v2
  [*] --> created: first message
  created --> active: assistant reply saved
  active --> active: additional user/assistant turns
  active --> stale: long inactivity
  stale --> active: new user message
  stale --> [*]
```

## 14) Context Sync Pipeline (Self-Hosted Retrieval)

```mermaid
sequenceDiagram
  autonumber
  participant OBS as Model Observers
  participant DISP as AiContextSyncDispatcher
  participant JOB as SyncUserAiContext
  participant SNAP as UserContextSnapshotBuilder
  participant SH as SelfHostedContextAwareChatService
  participant OLL as Ollama embed
  participant QDR as Qdrant

  OBS->>DISP: user/profile/restriction/log changed
  DISP->>JOB: dispatch debounced sync
  JOB->>SH: syncUserContext(user)
  SH->>SNAP: buildForUser(user)
  SNAP-->>SH: context documents
  loop each document
    SH->>OLL: embed(text)
    OLL-->>SH: vector
    SH->>QDR: upsert(user_id, doc_key, vector, payload)
  end
```

## 15) File Ownership by Model (Quick Visual)

```mermaid
flowchart LR
  subgraph CHAT_MODEL
    C1[ChatOrchestrator.php]
    C2[ChatIntentClassifier.php]
    C3[ChatContextBuilder.php]
    C4[ChatSafetyGuard.php]
    C5[ChatModelManager.php]
    C6[Providers/*ChatModelClient.php]
    C7[CoachToolExecutor.php + Tools/*.php]
    C8[SelfHostedContextAwareChatService.php]
    C9[CoachPrompt.php]
  end

  subgraph PLANNER_MODEL
    P1[PlannerService.php]
    P2[PlannerProfileSyncService.php]
    P3[PlannerContextBuilder.php]
    P4[PlannerPrompt.php]
    P5[PlannerSchema.php]
    P6[GenerativeAiGateway.php]
    P7[PlannerOutputValidator.php]
    P8[PlannerLocalFallbackService.php]
    P9[PlannerPersistenceService.php]
  end

  subgraph PROGRESS_MODEL
    M1[ProgressPredictionModel.php]
    M2[scripts/ai/training/predict_progress_from_features.py]
    M3[config/ai.php progress_predictor]
  end

  C1 --> CHAT_MODEL
  P1 --> PLANNER_MODEL
  M1 --> PROGRESS_MODEL
```
