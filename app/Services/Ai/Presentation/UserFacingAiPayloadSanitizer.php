<?php

namespace App\Services\Ai\Presentation;

class UserFacingAiPayloadSanitizer
{
    /** @var array<int, string> */
    private const INTERNAL_AI_KEYS = [
        'provider',
        'model',
        'prompt',
        'prompt_version',
        'schema',
        'schema_version',
        'usage',
        'fallback',
        'quality',
        'intent',
        'used_context_keys',
        'chat_path',
        'mode_label',
        'debug',
        'diagnostics',
        'trace',
        'raw',
        'confidence',
        'error_margin',
        'context_score',
        'context_keys',
        'inference_source',
        'model_name',
        'last_prediction_error_kg_per_week',
    ];

    /** @var array<int, string> */
    private const INTERNAL_AI_PREFIXES = [
        'provider_',
        'model_',
        'prompt_',
        'schema_',
        'debug_',
        'trace_',
        'reasoning_',
        'internal_',
    ];

    /**
     * Sanitize planner API payloads for non-admin users.
     */
    public function sanitizePlannerResponse(array $payload, bool $isAdmin = false): array
    {
        if ($isAdmin) {
            return $payload;
        }

        $sanitized = $payload;

        $sanitized = $this->sanitizeArray($sanitized, false);
        unset($sanitized['ai_request_id']);

        if (is_array($sanitized['plan'] ?? null)) {
            $sanitized['plan'] = $this->sanitizePlannerPlan($sanitized['plan'], false);
        }

        if (is_array($sanitized['plans'] ?? null)) {
            if (is_array($sanitized['plans']['diet'] ?? null)) {
                $sanitized['plans']['diet'] = $this->sanitizePlannerPlan($sanitized['plans']['diet'], false);
            }
            if (is_array($sanitized['plans']['workout'] ?? null)) {
                $sanitized['plans']['workout'] = $this->sanitizePlannerPlan($sanitized['plans']['workout'], false);
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize generated planner data before rendering in user-facing pages.
     */
    public function sanitizePlannerPlan(?array $plan, bool $isAdmin = false): ?array
    {
        if ($plan === null || $isAdmin) {
            return $plan;
        }

        $sanitized = $plan;

        $sanitized = $this->sanitizeArray($sanitized, false);

        unset($sanitized['ml_readiness']);

        if (is_array($sanitized['adaptive_review'] ?? null)) {
            unset($sanitized['adaptive_review']['last_adaptation']);
        }

        if (is_array($sanitized['progress_prediction'] ?? null)) {
            $sanitized['progress_prediction'] = $this->sanitizeProgressPrediction($sanitized['progress_prediction'], false);
        }

        $this->sanitizeNarratives($sanitized);

        return $sanitized;
    }

    /**
     * Sanitize persisted nutrition/workout plan resources for user-facing pages.
     */
    public function sanitizePlanResource(?array $resource, bool $isAdmin = false): ?array
    {
        if ($resource === null || $isAdmin) {
            return $resource;
        }

        $sanitized = $this->sanitizeArray($resource, false);

        unset(
            $sanitized['ai_request_id'],
            $sanitized['ai_request'],
            $sanitized['aiRequest']
        );

        if (is_array($sanitized['meta'] ?? null)) {
            $sanitized['meta'] = $this->sanitizeArray($sanitized['meta'], false);
        }

        if (is_array($sanitized['days'] ?? null)) {
            $sanitized['days'] = array_values(array_map(
                fn ($day) => is_array($day) ? $this->sanitizeArray($day, false) : $day,
                $sanitized['days']
            ));
        }

        return $sanitized;
    }

    /**
     * Remove model-logic diagnostics from dashboard prediction payloads.
     */
    public function sanitizeProgressPredictionPayload(?array $prediction, bool $isAdmin = false): ?array
    {
        if ($prediction === null || $isAdmin) {
            return $prediction;
        }

        $sanitized = $this->sanitizeArray($prediction, false);
        unset($sanitized['ai_request_id']);

        if (is_array($sanitized['feedback_adjustment'] ?? null)) {
            unset($sanitized['feedback_adjustment']['last_prediction_error_kg_per_week']);
        }

        return $sanitized;
    }

    /**
     * Remove model-logic diagnostics from progress prediction for end users.
     */
    public function sanitizeProgressPrediction(?array $prediction, bool $isAdmin = false): ?array
    {
        if ($prediction === null || $isAdmin) {
            return $prediction;
        }

        return $this->sanitizeProgressPredictionPayload($prediction, $isAdmin);
    }

    private function sanitizeArray(array $payload, bool $isAdmin): array
    {
        if ($isAdmin) {
            return $payload;
        }

        $sanitized = [];

        foreach ($payload as $key => $value) {
            $keyString = is_string($key) ? $key : null;
            if ($keyString !== null && $this->isInternalKey($keyString)) {
                continue;
            }

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeArray($value, false);
                continue;
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }

    private function isInternalKey(string $key): bool
    {
        $normalized = strtolower(trim($key));
        if ($normalized === '') {
            return false;
        }

        if (in_array($normalized, self::INTERNAL_AI_KEYS, true)) {
            return true;
        }

        foreach (self::INTERNAL_AI_PREFIXES as $prefix) {
            if (str_starts_with($normalized, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function sanitizeNarratives(array &$plan): void
    {
        foreach ([
            'overview.summary',
            'ml_readiness.notes',
        ] as $path) {
            $value = data_get($plan, $path);
            if (is_string($value)) {
                data_set($plan, $path, $this->normalizeNarrative($value));
            }
        }

        foreach ([
            'overview.key_constraints',
            'overview.assumptions',
            'safety.hard_rules_observed',
            'diet.meal_prep_notes',
            'diet.adherence_notes',
            'workout.progression_rules',
            'workout.recovery_rules',
            'workout.coach_notes',
            'adaptive_review.replanning_triggers',
        ] as $path) {
            $value = data_get($plan, $path);
            if (! is_array($value)) {
                continue;
            }

            data_set(
                $plan,
                $path,
                array_values(array_map(
                    fn ($item) => is_string($item) ? $this->normalizeNarrative($item) : $item,
                    $value
                ))
            );
        }
    }

    private function normalizeNarrative(string $value): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return $normalized;
        }

        $normalized = preg_replace('/\bollama\b/i', 'the planner service', $normalized) ?? $normalized;
        $normalized = preg_replace('/\bmodel provider\b/i', 'planning service', $normalized) ?? $normalized;
        $normalized = preg_replace('/\blocal planner engine\b/i', 'safety planner', $normalized) ?? $normalized;
        $normalized = preg_replace('/\blocal model output\b/i', 'personalized plan output', $normalized) ?? $normalized;
        $normalized = preg_replace('/\bschema-compliant\b/i', 'structured', $normalized) ?? $normalized;

        return $normalized;
    }
}
