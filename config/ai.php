<?php

return [
    'chat' => [
        'provider' => env('AI_CHAT_PROVIDER', 'stub'),
        'prompt_version' => env('AI_CHAT_PROMPT_VERSION', 'hayetak_coach_v1'),
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
                'connect_timeout' => (int) env('AI_SELF_HOSTED_OLLAMA_CONNECT_TIMEOUT', 4),
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
            'sync_during_tests' => (bool) env('AI_SELF_HOSTED_SYNC_DURING_TESTS', false),
        ],
    ], 

    'planner' => [
        'ollama_only' => (bool) env('AI_PLANNER_OLLAMA_ONLY', true),
        'provider' => env(
            'AI_PLANNER_PROVIDER',
            'ollama',
        ),
        'prompt_version' => env('AI_PLANNER_PROMPT_VERSION', 'hayetak_planner_v2'),
        'schema_version' => env('AI_PLANNER_SCHEMA_VERSION', 'hayetak_plan_v2'),
        'default_horizon_days' => (int) env('AI_PLANNER_DEFAULT_HORIZON_DAYS', 14),
        'request_timeout_seconds' => (int) env('AI_PLANNER_REQUEST_TIMEOUT', 300),
        'openai' => [
            'model' => env('OPENAI_MODEL_PLANNER', 'gpt-4.1-mini'),
            'max_output_tokens' => (int) env('AI_PLANNER_MAX_OUTPUT_TOKENS', 3200),
        ],
        'ollama' => [
            'base_url' => rtrim((string) env('AI_PLANNER_OLLAMA_URL', env('AI_SELF_HOSTED_OLLAMA_URL', 'http://127.0.0.1:11434')), '/'),
            'model' => env('AI_PLANNER_OLLAMA_MODEL', env('AI_SELF_HOSTED_LLM_MODEL', 'llama3.1:8b')),
            'connect_timeout' => (int) env('AI_PLANNER_OLLAMA_CONNECT_TIMEOUT', 4),
            'timeout' => (int) env('AI_PLANNER_OLLAMA_TIMEOUT', 120),
            'temperature' => (float) env('AI_PLANNER_OLLAMA_TEMPERATURE', 0.1),
            'max_output_tokens' => (int) env('AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS', 900),
        ],
        'fallback' => [
            'enabled' => (bool) env('AI_PLANNER_FALLBACK_TO_OPENAI', false),
        ],
        'local_fallback' => [
            'enabled' => (bool) env('AI_PLANNER_LOCAL_FALLBACK_ENABLED', true),
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
        'planner_max_output' => (int) env('AI_PLANNER_MAX_OUTPUT_TOKENS', 3200),
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

    'progress_predictor' => [
        'inference' => [
            'enabled' => (bool) env('AI_PROGRESS_PREDICTOR_INFERENCE_ENABLED', true),
            'python_bin' => env('AI_PROGRESS_PREDICTOR_PYTHON_BIN', 'python'),
            'script' => env('AI_PROGRESS_PREDICTOR_SCRIPT', 'scripts/predict_progress_from_features.py'),
            'model_dir' => env('AI_PROGRESS_PREDICTOR_MODEL_DIR', 'storage/app/ai/models/progress_predictor_v1_real_only'),
            'timeout_seconds' => (float) env('AI_PROGRESS_PREDICTOR_TIMEOUT', 8),
            'guardrails' => [
                'enabled' => (bool) env('AI_PROGRESS_PREDICTOR_GUARDRAILS_ENABLED', true),
                'min_confidence_for_ml' => env('AI_PROGRESS_PREDICTOR_MIN_CONFIDENCE_FOR_ML', 'medium'),
                'require_macro_targets' => (bool) env('AI_PROGRESS_PREDICTOR_REQUIRE_MACRO_TARGETS', true),
                'min_meal_logged_days' => (int) env('AI_PROGRESS_PREDICTOR_MIN_MEAL_LOGGED_DAYS', 0),
                'min_workout_sessions' => (int) env('AI_PROGRESS_PREDICTOR_MIN_WORKOUT_SESSIONS', 0),
                'max_ml_vs_heuristic_weekly_delta_kg' => (float) env('AI_PROGRESS_PREDICTOR_MAX_WEEKLY_DELTA_GAP_KG', 0.8),
                'max_abs_ml_weekly_rate_kg' => (float) env('AI_PROGRESS_PREDICTOR_MAX_ABS_WEEKLY_RATE_KG', 1.2),
            ],
        ],
    ],
];
