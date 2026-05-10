<?php

return [
    'chat' => [
        'provider' => env('AI_CHAT_PROVIDER', 'self_hosted'),
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
<<<<<<< HEAD
            'direct_context_fast_path' => [
                'enabled_in_local' => (bool) env('AI_SELF_HOSTED_DIRECT_CONTEXT_FAST_PATH', true),
                'force' => (bool) env('AI_SELF_HOSTED_FORCE_DIRECT_CONTEXT_FAST_PATH', false),
            ],
=======
>>>>>>> origin/main
            'context_sync' => [
                'debounce_seconds' => (int) env('AI_SELF_HOSTED_CONTEXT_SYNC_DEBOUNCE_SECONDS', 8),
                'unique_for_seconds' => (int) env('AI_SELF_HOSTED_CONTEXT_SYNC_UNIQUE_FOR_SECONDS', 120),
                'queue' => env('AI_SELF_HOSTED_CONTEXT_SYNC_QUEUE', 'ai-context-sync'),
            ],
            'sync_during_tests' => (bool) env('AI_SELF_HOSTED_SYNC_DURING_TESTS', false),
        ],
    ],

<<<<<<< HEAD
    'messaging' => [
        'moderation' => [
            'provider' => env('AI_MESSAGE_MODERATION_PROVIDER', 'local_rules'),
            'hard_block_categories' => ['threats', 'sexual_minors', 'hate', 'sexual_coercion', 'spam_abuse'],
            'escalate_categories' => ['medical_emergency', 'abuse_disclosure', 'privacy_sensitive', 'spam_repetition'],
            'allow_flag_categories' => ['harassment', 'contact_sharing', 'health_sensitive'],
            'repetition' => [
                'window_minutes' => (int) env('AI_MESSAGE_MODERATION_REPEAT_WINDOW_MINUTES', 10),
                'escalate_after_same_body_count' => (int) env('AI_MESSAGE_MODERATION_REPEAT_ESCALATE_COUNT', 2),
                'hard_block_after_same_body_count' => (int) env('AI_MESSAGE_MODERATION_REPEAT_BLOCK_COUNT', 4),
            ],
            'rule_sets' => [
                'harassment' => [
                    'idiot',
                    'stupid',
                    'dumb',
                    'loser',
                    'shut up',
                ],
                'threats' => [
                    'kill you',
                    'i will kill',
                    'hurt you',
                    'beat you up',
                    'stab you',
                ],
                'sexual_minors' => [
                    'nude kid',
                    'sexual with child',
                    'underage sex',
                ],
                'hate' => [
                    'dirty arab',
                    'dirty muslim',
                    'go back to your country',
                ],
                'sexual_coercion' => [
                    'send nudes',
                    'send nude',
                    'sexual favors',
                    'sleep with me',
                ],
                'medical_emergency' => [
                    'chest pain',
                    'can not breathe',
                    'cannot breathe',
                    'trouble breathing',
                    'passed out',
                    'fainted',
                ],
                'abuse_disclosure' => [
                    'my trainer touched me',
                    'my trainer assaulted me',
                    'my dietitian harassed me',
                    'he threatened me',
                    'she threatened me',
                ],
                'privacy_sensitive' => [
                    'my lab results',
                    'my diagnosis report',
                    'my test results',
                    'my prescription',
                ],
                'contact_sharing' => [
                    'call me at',
                    'my phone number is',
                    'my whatsapp is',
                    '@gmail.com',
                    '@outlook.com',
                ],
                'health_sensitive' => [
                    'i have diabetes',
                    'high cortisol',
                    'thyroid issue',
                    'knee injury',
                    'back injury',
                    'peanut allergy',
                ],
                'spam_abuse' => [
                    'buy now',
                    'click this link',
                    'free money',
                    'guaranteed profit',
                ],
            ],
        ],
    ],

=======
>>>>>>> origin/main
    'planner' => [
        'ollama_only' => true,
        'prompt_version' => env('AI_PLANNER_PROMPT_VERSION', 'hayetak_planner_v2'),
        'schema_version' => env('AI_PLANNER_SCHEMA_VERSION', 'hayetak_plan_v2'),
        'default_horizon_days' => (int) env('AI_PLANNER_DEFAULT_HORIZON_DAYS', 14),
        'request_timeout_seconds' => (int) env('AI_PLANNER_REQUEST_TIMEOUT', 300),
        'feedback_cycle' => [
            'enabled' => (bool) env('AI_PLANNER_FEEDBACK_CYCLE_ENABLED', true),
            'start_date' => env('AI_PLANNER_FEEDBACK_CYCLE_START_DATE', '2026-01-01'),
            'anchor_date' => env('AI_PLANNER_FEEDBACK_CYCLE_ANCHOR_DATE', '2026-01-01'),
            'interval_days' => (int) env('AI_PLANNER_FEEDBACK_CYCLE_INTERVAL_DAYS', 21),
            'day_19_to_23_checkin_reminder_enabled' => (bool) env('AI_PLANNER_FEEDBACK_CHECKIN_REMINDER_ENABLED', true),
        ],
        'adaptation' => [
            'enabled' => (bool) env('AI_PLANNER_ADAPTATION_ENABLED', true),
            'enforce_when_abs_error_weekly_gte' => (float) env('AI_PLANNER_ADAPTATION_ABS_ERROR_THRESHOLD', 0.12),
            'calorie_step_kcal' => (int) env('AI_PLANNER_ADAPTATION_CALORIE_STEP_KCAL', 120),
            'workout_duration_step_min' => (int) env('AI_PLANNER_ADAPTATION_WORKOUT_DURATION_STEP_MIN', 5),
        ],
        'ollama' => [
            'base_url' => rtrim((string) env('AI_PLANNER_OLLAMA_URL', env('AI_SELF_HOSTED_OLLAMA_URL', 'http://127.0.0.1:11434')), '/'),
            'model' => env('AI_PLANNER_OLLAMA_MODEL', env('AI_SELF_HOSTED_LLM_MODEL', 'llama3.1:8b')),
            'connect_timeout' => (int) env('AI_PLANNER_OLLAMA_CONNECT_TIMEOUT', 4),
            'timeout' => (int) env('AI_PLANNER_OLLAMA_TIMEOUT', 120),
            'temperature' => (float) env('AI_PLANNER_OLLAMA_TEMPERATURE', 0.1),
            'max_output_tokens' => (int) env('AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS', 900),
        ],
        'local_fallback' => [
            'enabled' => (bool) env('AI_PLANNER_LOCAL_FALLBACK_ENABLED', true),
        ],
    ],

    'models' => [
        'planner' => env('AI_PLANNER_OLLAMA_MODEL', env('AI_SELF_HOSTED_LLM_MODEL', 'llama3.1:8b')),
        'coach' => env('AI_SELF_HOSTED_LLM_MODEL', 'llama3.1:8b'),
    ],

    'timeouts' => [
        'request_seconds' => (int) env('AI_CHAT_REQUEST_TIMEOUT', 60),
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
<<<<<<< HEAD
        'labeling' => [
            'weight_match_days_before' => (int) env('AI_PROGRESS_PREDICTOR_LABEL_WEIGHT_MATCH_DAYS_BEFORE', 7),
            'weight_match_days_after' => (int) env('AI_PROGRESS_PREDICTOR_LABEL_WEIGHT_MATCH_DAYS_AFTER', 10),
        ],
=======
>>>>>>> origin/main
        'inference' => [
            'enabled' => (bool) env('AI_PROGRESS_PREDICTOR_INFERENCE_ENABLED', true),
            'python_bin' => env('AI_PROGRESS_PREDICTOR_PYTHON_BIN', 'python'),
            'script' => env('AI_PROGRESS_PREDICTOR_SCRIPT', 'scripts/ai/training/predict_progress_from_features.py'),
            'model_dir' => env('AI_PROGRESS_PREDICTOR_MODEL_DIR', 'storage/app/ai/models/progress_predictor_v1_uploaded_weight_only'),
            'fallback_model_dir' => env('AI_PROGRESS_PREDICTOR_FALLBACK_MODEL_DIR', 'storage/app/ai/models/progress_predictor_v1'),
            'min_weight_rows_for_primary' => (int) env('AI_PROGRESS_PREDICTOR_MIN_WEIGHT_ROWS_FOR_PRIMARY', 60),
            'timeout_seconds' => (float) env('AI_PROGRESS_PREDICTOR_TIMEOUT', 8),
            'guardrails' => [
                'enabled' => (bool) env('AI_PROGRESS_PREDICTOR_GUARDRAILS_ENABLED', true),
                'min_confidence_for_ml' => env('AI_PROGRESS_PREDICTOR_MIN_CONFIDENCE_FOR_ML', 'medium'),
                'require_macro_targets' => (bool) env('AI_PROGRESS_PREDICTOR_REQUIRE_MACRO_TARGETS', true),
                'min_meal_logged_days' => (int) env('AI_PROGRESS_PREDICTOR_MIN_MEAL_LOGGED_DAYS', 0),
                'min_workout_sessions' => (int) env('AI_PROGRESS_PREDICTOR_MIN_WORKOUT_SESSIONS', 0),
                'max_ml_vs_heuristic_weekly_delta_kg' => (float) env('AI_PROGRESS_PREDICTOR_MAX_WEEKLY_DELTA_GAP_KG', 0.8),
                'max_abs_ml_weekly_rate_kg' => (float) env('AI_PROGRESS_PREDICTOR_MAX_ABS_WEEKLY_RATE_KG', 1.2),
                'require_manifest_quality' => (bool) env('AI_PROGRESS_PREDICTOR_REQUIRE_MANIFEST_QUALITY', true),
                'allow_weight_only_ml' => (bool) env('AI_PROGRESS_PREDICTOR_ALLOW_WEIGHT_ONLY_ML', true),
                'min_manifest_test_users' => (int) env('AI_PROGRESS_PREDICTOR_MIN_MANIFEST_TEST_USERS', 5),
                'min_weight_r2_for_ml' => (float) env('AI_PROGRESS_PREDICTOR_MIN_WEIGHT_R2_FOR_ML', 0.05),
                'min_strength_r2_for_ml' => (float) env('AI_PROGRESS_PREDICTOR_MIN_STRENGTH_R2_FOR_ML', 0.05),
                'max_weight_mae_kg_for_ml' => (float) env('AI_PROGRESS_PREDICTOR_MAX_WEIGHT_MAE_KG_FOR_ML', 0.4),
                'max_strength_mae_pct_for_ml' => (float) env('AI_PROGRESS_PREDICTOR_MAX_STRENGTH_MAE_PCT_FOR_ML', 1.2),
            ],
        ],
    ],

    'seed_measurements' => [
        'start_date' => env('AI_SEED_MEASUREMENT_START_DATE', '2025-12-18'),
        'end_date' => env('AI_SEED_MEASUREMENT_END_DATE', '2026-05-18'),
        'min_gap_days' => (int) env('AI_SEED_MEASUREMENT_MIN_GAP_DAYS', 4),
        'max_gap_days' => (int) env('AI_SEED_MEASUREMENT_MAX_GAP_DAYS', 7),
    ],

    'seed_activity_history' => [
        'start_date' => env('AI_SEED_ACTIVITY_HISTORY_START_DATE', '2025-12-18'),
        'end_date' => env('AI_SEED_ACTIVITY_HISTORY_END_DATE', '2026-05-18'),
    ],
];
