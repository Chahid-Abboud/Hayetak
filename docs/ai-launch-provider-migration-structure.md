# AI Launch Provider Migration Structure

Status: future launch plan only. The current app remains self-hosted:

- Planner provider: `ollama`
- Coach provider: `self_hosted`
- Planner fallback to hosted OpenAI: disabled / not implemented
- Hosted OpenAI API keys: not used by the runtime

This document describes what must change later if Hayetak decides to use the OpenAI Responses API for launch or production scale. Do not treat this as current setup guidance.

## 1. Current Runtime Contract

The current local stack is intentionally locked to local/self-hosted providers.

Runtime files:

- `config/ai.php`
  - `ai.planner.ollama_only` is hard-coded to `true`.
  - Planner model names come from `AI_PLANNER_OLLAMA_MODEL` or `AI_SELF_HOSTED_LLM_MODEL`.
  - Coach model names come from `AI_SELF_HOSTED_LLM_MODEL`.
- `app/Services/Ai/Runtime/FeatureConfigResolver.php`
  - `provider(FEATURE_PLANNER)` always returns `ollama`.
  - `ollamaOnly(FEATURE_PLANNER)` always returns `true`.
  - Chat accepts only `self_hosted`, `http`, or `stub`.
- `app/Services/Ai/Runtime/GenerativeAiGateway.php`
  - Structured generation only supports Ollama.
- `app/Services/Ai/Chat/ChatModelManager.php`
  - Chat resolves to self-hosted, HTTP, or stub clients only.

Current local environment shape:

```env
AI_PLANNER_OLLAMA_ONLY=true
AI_PLANNER_OLLAMA_URL=http://127.0.0.1:11434
AI_PLANNER_OLLAMA_MODEL=llama3.1:8b
AI_CHAT_PROVIDER=self_hosted
AI_SELF_HOSTED_OLLAMA_URL=http://127.0.0.1:11434
AI_SELF_HOSTED_LLM_MODEL=llama3.1:8b
AI_SELF_HOSTED_EMBED_MODEL=nomic-embed-text
AI_SELF_HOSTED_QDRANT_URL=http://127.0.0.1:6333
```

## 2. Launch Decision Gates

Before enabling any hosted model provider, make these decisions explicitly:

- Which features can use hosted models: planner only, coach only, both, or admin-only test runs.
- Whether user health data can leave the local infrastructure.
- Which jurisdictions and privacy requirements apply.
- Whether hosted inference is primary or fallback.
- Whether deterministic local fallback remains available when hosted inference fails.
- Whether Qdrant remains self-hosted or is replaced with another vector store.
- Whether model output can be stored verbatim in `ai_requests`, `ai_messages`, and `ai_usage_logs`.

Recommended launch posture:

- Start with planner-only hosted generation behind an admin-only feature flag.
- Keep coach self-hosted until privacy, tool-calling, and prompt-injection monitoring are production-ready.
- Keep local deterministic planner fallback available for recoverability.

## 3. Future Environment Variables

Add these only when the launch migration is approved:

```env
AI_PROVIDER_ALLOW_HOSTED=false

AI_PLANNER_PROVIDER=ollama
AI_PLANNER_HOSTED_ENABLED=false
AI_PLANNER_HOSTED_PROVIDER=openai
AI_PLANNER_HOSTED_MODEL=gpt-4.1-mini
AI_PLANNER_HOSTED_TIMEOUT=90
AI_PLANNER_HOSTED_MAX_OUTPUT_TOKENS=4500

AI_CHAT_PROVIDER=self_hosted
AI_CHAT_HOSTED_ENABLED=false
AI_CHAT_HOSTED_PROVIDER=openai
AI_CHAT_HOSTED_MODEL=gpt-4.1-mini
AI_CHAT_HOSTED_TIMEOUT=45
AI_CHAT_HOSTED_MAX_OUTPUT_TOKENS=1200

OPENAI_API_KEY=
OPENAI_PROJECT=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_ORG=
```

Guardrail:

- `OPENAI_API_KEY` must never be required for local development.
- Hosted settings should be ignored unless `AI_PROVIDER_ALLOW_HOSTED=true`.
- `AI_PLANNER_PROVIDER=openai` should fail configuration validation unless hosted providers are explicitly allowed.

## 4. Config Structure

Future `config/ai.php` shape:

```php
'providers' => [
    'allow_hosted' => env('AI_PROVIDER_ALLOW_HOSTED', false),
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'project' => env('OPENAI_PROJECT'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'organization' => env('OPENAI_ORG'),
    ],
],

'planner' => [
    'provider' => env('AI_PLANNER_PROVIDER', 'ollama'),
    'ollama_only' => env('AI_PLANNER_OLLAMA_ONLY', true),
    'hosted' => [
        'enabled' => env('AI_PLANNER_HOSTED_ENABLED', false),
        'provider' => env('AI_PLANNER_HOSTED_PROVIDER', 'openai'),
        'model' => env('AI_PLANNER_HOSTED_MODEL', 'gpt-4.1-mini'),
        'timeout' => env('AI_PLANNER_HOSTED_TIMEOUT', 90),
        'max_output_tokens' => env('AI_PLANNER_HOSTED_MAX_OUTPUT_TOKENS', 4500),
    ],
],

'chat' => [
    'provider' => env('AI_CHAT_PROVIDER', 'self_hosted'),
    'hosted' => [
        'enabled' => env('AI_CHAT_HOSTED_ENABLED', false),
        'provider' => env('AI_CHAT_HOSTED_PROVIDER', 'openai'),
        'model' => env('AI_CHAT_HOSTED_MODEL', 'gpt-4.1-mini'),
        'timeout' => env('AI_CHAT_HOSTED_TIMEOUT', 45),
        'max_output_tokens' => env('AI_CHAT_HOSTED_MAX_OUTPUT_TOKENS', 1200),
    ],
],
```

## 5. Service Classes To Add

Add provider-specific classes without changing planner/chat business logic.

```text
app/Services/Ai/Runtime/
  HostedProviderGuard.php
  OpenAiResponsesClient.php
  OpenAiUsageNormalizer.php
  OpenAiToolCallNormalizer.php

app/Services/Ai/Plan/
  PlannerJsonSchema.php

app/Services/Ai/Chat/Providers/
  OpenAiResponsesChatModelClient.php
```

Responsibilities:

- `HostedProviderGuard`
  - Blocks hosted provider use unless `AI_PROVIDER_ALLOW_HOSTED=true`.
  - Verifies API key presence only when hosted provider is selected.
  - Produces clear boot-time or health-check errors.
- `OpenAiResponsesClient`
  - Wraps all HTTP calls to the Responses API.
  - Applies timeout, retry, request ID extraction, and safe error handling.
  - Never logs raw API keys.
- `OpenAiUsageNormalizer`
  - Converts provider usage fields into Hayetak's `input_tokens`, `output_tokens`, `total_tokens` shape.
- `OpenAiToolCallNormalizer`
  - Converts Responses API function calls into the existing coach tool format.
- `PlannerJsonSchema`
  - Provides the strict planner JSON schema currently passed to the gateway.
  - Keeps schema versioned and reusable by tests.
- `OpenAiResponsesChatModelClient`
  - Implements `ChatModelClient`.
  - Uses the existing `CoachToolExecutor` tools.
  - Returns the same normalized result shape as the self-hosted client.

## 6. FeatureConfigResolver Changes

Current behavior must remain the default. Future behavior should be explicit:

```php
public function provider(string $feature): string
{
    return match ($feature) {
        self::FEATURE_CHAT => $this->resolveChatProvider(),
        self::FEATURE_PLANNER => $this->resolvePlannerProvider(),
        default => throw new InvalidArgumentException(...),
    };
}

private function resolvePlannerProvider(): string
{
    if ((bool) config('ai.planner.ollama_only', true)) {
        return 'ollama';
    }

    $provider = strtolower(trim((string) config('ai.planner.provider', 'ollama')));

    if ($provider === 'openai') {
        app(HostedProviderGuard::class)->assertAllowed('planner', 'openai');
        return 'openai';
    }

    return 'ollama';
}
```

Required rules:

- `ollama_only=true` wins over all hosted settings.
- Unknown planner providers fail closed to `ollama` or throw a configuration exception.
- Chat should not silently switch to hosted models when `AI_CHAT_PROVIDER=auto`.

## 7. Planner Responses API Path

Add `generateWithOpenAi()` to `GenerativeAiGateway` later.

Request structure:

```php
$payload = [
    'model' => $settings['model'],
    'input' => $this->toResponsesInput($messages),
    'text' => [
        'format' => [
            'type' => 'json_schema',
            'name' => 'hayetak_plan',
            'strict' => true,
            'schema' => $schema,
        ],
    ],
    'temperature' => 0.1,
    'max_output_tokens' => $settings['max_output_tokens'],
];
```

Normalized return shape must remain:

```php
[
    'provider' => 'openai',
    'provider_request_id' => $requestId,
    'model' => $model,
    'json' => $decodedPlan,
    'usage' => [
        'input_tokens' => $inputTokens,
        'output_tokens' => $outputTokens,
        'total_tokens' => $totalTokens,
    ],
    'latency_ms' => $latencyMs,
    'raw' => [
        'response_id' => $responseId,
        'finish_reason' => $finishReason,
    ],
]
```

Validation after model output stays unchanged:

- `PlannerOutputValidator`
- food safety filters
- calorie and macro bounds
- workout/injury safety checks
- persistence through `PlannerPersistenceService`

## 8. Coach Responses API Path

The coach path is riskier because it handles ongoing conversation, tools, personal context, and prompt injection.

Future flow:

1. `ChatController` receives message.
2. `ChatOrchestrator` classifies and builds context exactly as today.
3. `ChatSafetyGuard::preflight()` runs before any provider call.
4. `CoachToolExecutor::modelToolDefinitions()` provides tool schemas.
5. `OpenAiResponsesChatModelClient` sends:
   - system prompt
   - sanitized user message
   - compact user profile
   - today logs
   - last 7 days summary when relevant
   - available ingredients/equipment
   - tool definitions
6. Tool calls are executed server-side by existing tool classes.
7. Final assistant response is reviewed by `ChatSafetyGuard::review()`.
8. The normalized answer is stored in `ai_messages`.

Required tool mapping:

```text
search_recipes(query, constraints, available_ingredients)
get_day_macros(date)
summarize_last_7_days()
suggest_exercise_alternatives(target, equipment, injuries)
find_gyms_or_nutritionists(lat, lng, goal)
```

The hosted client must never let the model execute tools directly. The model may request a tool call; Laravel executes and filters the result.

## 9. Data Privacy Controls

Before launch:

- Add a consent record for hosted AI processing.
- Redact or minimize sensitive fields before hosted calls.
- Do not send full medical history unless needed for the question or planner safety.
- Send allergy and injury summaries because they are required safety constraints.
- Add audit metadata: provider, model, prompt version, schema version, request ID, consent version.
- Update account deletion/hard-delete flow to include AI requests, messages, and usage logs where legally required.

Suggested table:

```text
user_ai_consents
  id
  user_id
  consent_type         hosted_ai_processing
  consent_version
  accepted_at
  revoked_at
  ip_address
  user_agent
  created_at
  updated_at
```

## 10. Rollout Flags

Use staged flags rather than a single switch:

```env
AI_PROVIDER_ALLOW_HOSTED=false
AI_HOSTED_ADMIN_ONLY=true
AI_HOSTED_PERCENT_ROLLOUT=0
AI_PLANNER_HOSTED_ENABLED=false
AI_CHAT_HOSTED_ENABLED=false
AI_HOSTED_STORE_RAW_RESPONSES=false
AI_HOSTED_REDACTION_ENABLED=true
```

Rollout stages:

1. Local only.
2. Admin-only dry run against hosted planner, no user-visible output.
3. Admin-only compare mode: Ollama output vs hosted output.
4. Small internal user cohort.
5. Planner hosted primary with local fallback.
6. Coach hosted pilot only after tool-call and privacy tests pass.

## 11. Tests To Add Before Launch

Unit tests:

- `FeatureConfigResolver` never selects hosted providers when `AI_PROVIDER_ALLOW_HOSTED=false`.
- `HostedProviderGuard` rejects missing API keys when hosted is enabled.
- `OpenAiUsageNormalizer` maps provider usage correctly.
- `OpenAiToolCallNormalizer` rejects unknown tools and malformed arguments.

Feature tests:

- Planner OpenAI path persists provider/model metadata.
- Planner OpenAI path rejects invalid JSON/schema output.
- Planner OpenAI path still blocks allergic foods.
- Coach OpenAI path executes tools through Laravel only.
- Coach OpenAI path includes today and last 7 days summaries when relevant.
- Coach OpenAI path does not expose internal provider errors to clients.
- Users without hosted-AI consent stay on local provider.

Security tests:

- Hosted provider cannot be selected by env typo alone.
- `OPENAI_API_KEY` is not present in rendered config/debug responses.
- Prompt-injection strings do not override system safety rules.
- Raw provider payloads are not stored when `AI_HOSTED_STORE_RAW_RESPONSES=false`.

## 12. Deployment Checklist

Before hosted launch:

- Store `OPENAI_API_KEY` in the production secret manager only.
- Keep `.env.example` local-first and keyless.
- Run config cache after changing provider settings.
- Verify `APP_DEBUG=false` and `SESSION_ENCRYPT=true`.
- Verify `CACHE_STORE=redis` or another shared cache in multi-server deployments.
- Confirm rate limits and daily caps for planner/chat.
- Confirm privacy policy and consent UI are live.
- Confirm incident fallback: set planner/chat provider back to local without code deploy.

## 13. Files Expected To Change Later

```text
config/ai.php
app/Services/Ai/Runtime/FeatureConfigResolver.php
app/Services/Ai/Runtime/GenerativeAiGateway.php
app/Services/Ai/Runtime/OpenAiResponsesClient.php
app/Services/Ai/Runtime/HostedProviderGuard.php
app/Services/Ai/Chat/ChatModelManager.php
app/Services/Ai/Chat/Providers/OpenAiResponsesChatModelClient.php
app/Services/Ai/Tools/CoachToolExecutor.php
app/Services/Ai/Plan/PlannerJsonSchema.php
app/Http/Controllers/Ai/PlannerHealthController.php
app/Services/Ai/PlannerHealthService.php
database/migrations/*_create_user_ai_consents_table.php
tests/Unit/Ai/FeatureConfigResolverTest.php
tests/Unit/Ai/HostedProviderGuardTest.php
tests/Feature/Ai/PlanGenerationControllerTest.php
tests/Feature/Ai/OpenAiCoachProviderTest.php
```

## 14. Non-Goals For Now

These are intentionally not part of the current local-only work:

- Adding an OpenAI SDK or HTTP client.
- Adding `OPENAI_API_KEY` to local env examples.
- Switching planner provider resolution away from Ollama.
- Making hosted chat the default.
- Sending user health data to any hosted provider.
