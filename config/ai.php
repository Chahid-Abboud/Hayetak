<?php

return [
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

