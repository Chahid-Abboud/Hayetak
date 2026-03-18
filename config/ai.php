<?php

return [
    'chat' => [
        'provider' => env('AI_CHAT_PROVIDER', 'stub'),
        'http' => [
            'endpoint' => env('AI_CHAT_ENDPOINT'),
            'token' => env('AI_CHAT_TOKEN'),
            'timeout' => (int) env('AI_CHAT_HTTP_TIMEOUT', 30),
        ],
        'self_hosted' => [
            'ollama' => [
                'base_url' => rtrim((string) env('AI_SELF_HOSTED_OLLAMA_URL', 'http://127.0.0.1:11434'), '/'),
                'chat_model' => env('AI_SELF_HOSTED_LLM_MODEL', 'llama3.1:8b'),
                'embedding_model' => env('AI_SELF_HOSTED_EMBED_MODEL', 'nomic-embed-text'),
                'chat_timeout' => (int) env('AI_SELF_HOSTED_LLM_TIMEOUT', 120),
                'embedding_timeout' => (int) env('AI_SELF_HOSTED_EMBED_TIMEOUT', 60),
                'temperature' => (float) env('AI_SELF_HOSTED_TEMPERATURE', 0.2),
            ],
            'qdrant' => [
                'base_url' => rtrim((string) env('AI_SELF_HOSTED_QDRANT_URL', 'http://127.0.0.1:6333'), '/'),
                'collection' => env('AI_SELF_HOSTED_QDRANT_COLLECTION', 'hayetak_user_context'),
                'timeout' => (int) env('AI_SELF_HOSTED_QDRANT_TIMEOUT', 20),
                'distance' => env('AI_SELF_HOSTED_QDRANT_DISTANCE', 'Cosine'),
            ],
            'retrieval' => [
                'threshold' => (float) env('AI_SELF_HOSTED_CONTEXT_THRESHOLD', 0.65),
                'limit' => (int) env('AI_SELF_HOSTED_CONTEXT_LIMIT', 4),
                'max_context_characters' => (int) env('AI_SELF_HOSTED_MAX_CONTEXT_CHARS', 2200),
            ],
        ],
    ],

    'models' => [
        'planner' => env('OPENAI_MODEL_PLANNER', 'gpt-4.1-mini'),
        'coach' => env('OPENAI_MODEL_COACH', 'gpt-4.1-mini'),
    ],

    'timeouts' => [
        'request_seconds' => (int) env('OPENAI_TIMEOUT', 60),
    ],

    'tokens' => [
        'planner_max_output' => (int) env('AI_PLANNER_MAX_OUTPUT_TOKENS', 2200),
        'coach_max_output' => (int) env('AI_COACH_MAX_OUTPUT_TOKENS', 900),
    ],

    'rate_limits' => [
        // format: attempts,minutes
        'plan' => env('AI_PLAN_RATE_LIMIT', '3,1'),
        'chat' => env('AI_CHAT_RATE_LIMIT', '20,1'),
        'plan_daily_cap' => (int) env('AI_PLAN_DAILY_CAP', 12),
        'chat_daily_cap' => (int) env('AI_CHAT_DAILY_CAP', 300),
    ],

    'context_cache_ttl' => (int) env('AI_CONTEXT_CACHE_TTL', 300),

    'usage_logging' => [
        'enabled' => (bool) env('AI_USAGE_LOG_ENABLED', true),
    ],
];
