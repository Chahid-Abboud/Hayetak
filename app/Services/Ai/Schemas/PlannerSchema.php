<?php

namespace App\Services\Ai\Schemas;

class PlannerSchema
{
    public static function definition(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['overview', 'safety', 'diet', 'workout', 'adaptive_review', 'ml_readiness'],
            'properties' => [
                'overview' => self::overviewSchema(),
                'safety' => self::safetySchema(),
                'diet' => self::dietSchema(),
                'workout' => self::workoutSchema(),
                'adaptive_review' => self::adaptiveReviewSchema(),
                'ml_readiness' => self::mlReadinessSchema(),
                'progress_prediction' => self::progressPredictionSchema(),
            ],
        ];
    }

    private static function overviewSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['summary'],
            'properties' => [
                'summary' => ['type' => 'string'],
                'key_constraints' => self::stringArraySchema(),
                'assumptions' => self::stringArraySchema(),
            ],
        ];
    }

    private static function safetySchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['hard_rules_observed'],
            'properties' => [
                'hard_rules_observed' => self::stringArraySchema(),
                'food_avoidances' => self::stringArraySchema(),
                'exercise_cautions' => self::stringArraySchema(),
            ],
        ];
    }

    private static function dietSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['daily_targets', 'meal_options', 'grocery_list', 'meal_prep_notes', 'adherence_notes'],
            'properties' => [
                'daily_targets' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'water_ml'],
                    'properties' => [
                        'calories_kcal' => ['type' => 'integer'],
                        'protein_g' => ['type' => 'integer'],
                        'carbs_g' => ['type' => 'integer'],
                        'fat_g' => ['type' => 'integer'],
                        'fiber_g' => ['type' => 'integer'],
                        'water_ml' => ['type' => 'integer'],
                    ],
                ],
                'meal_options' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['breakfast', 'lunch', 'dinner', 'snack'],
                    'properties' => [
                        'breakfast' => self::dietMealOptionsSchema(),
                        'lunch' => self::dietMealOptionsSchema(),
                        'dinner' => self::dietMealOptionsSchema(),
                        'snack' => self::dietMealOptionsSchema(),
                    ],
                ],
                'days' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['day_index', 'theme', 'meals'],
                        'properties' => [
                            'day_index' => ['type' => 'integer'],
                            'theme' => ['type' => 'string'],
                            'meals' => self::dietMealsSchema(true),
                            'coaching_notes' => self::stringArraySchema(),
                        ],
                    ],
                ],
                'grocery_list' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['category', 'name', 'quantity'],
                        'properties' => [
                            'category' => ['type' => 'string'],
                            'name' => ['type' => 'string'],
                            'quantity' => ['type' => 'string'],
                        ],
                    ],
                ],
                'meal_prep_notes' => self::stringArraySchema(),
                'adherence_notes' => self::stringArraySchema(),
            ],
        ];
    }

    private static function dietMealOptionsSchema(): array
    {
        return [
            'type' => 'array',
            'minItems' => 3,
            'maxItems' => 7,
            'items' => self::dietMealSchema(false),
        ];
    }

    private static function dietMealsSchema(bool $includeMealCode): array
    {
        return [
            'type' => 'array',
            'items' => self::dietMealSchema($includeMealCode),
        ];
    }

    private static function dietMealSchema(bool $includeMealCode): array
    {
        $required = ['title', 'target_kcal', 'items'];
        $properties = [
            'title' => ['type' => 'string'],
            'target_kcal' => ['type' => 'integer'],
            'items' => [
                'type' => 'array',
                'items' => self::dietMealItemSchema(),
            ],
        ];

        if ($includeMealCode) {
            array_unshift($required, 'meal_code');
            $properties = ['meal_code' => ['type' => 'string']] + $properties;
        }

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => $required,
            'properties' => $properties,
        ];
    }

    private static function dietMealItemSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['name', 'portion', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g'],
            'properties' => [
                'name' => ['type' => 'string'],
                'portion' => ['type' => 'string'],
                'calories_kcal' => ['type' => 'integer'],
                'protein_g' => ['type' => 'integer'],
                'carbs_g' => ['type' => 'integer'],
                'fat_g' => ['type' => 'integer'],
                'recipe_note' => ['type' => 'string'],
                'search_terms' => self::stringArraySchema(),
                'alternatives' => self::stringArraySchema(),
            ],
        ];
    }

    private static function workoutSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['weekly_schedule', 'progression_rules', 'recovery_rules', 'coach_notes'],
            'properties' => [
                'weekly_schedule' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['day_index', 'session_type', 'focus', 'location', 'duration_min', 'exercises'],
                        'properties' => [
                            'day_index' => ['type' => 'integer'],
                            'day_label' => ['type' => 'string'],
                            'session_type' => ['type' => 'string'],
                            'focus' => ['type' => 'string'],
                            'location' => ['type' => 'string'],
                            'duration_min' => ['type' => 'integer'],
                            'warmup' => self::stringArraySchema(),
                            'exercises' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'additionalProperties' => false,
                                    'required' => ['name', 'sets', 'reps', 'rest_sec', 'rpe', 'equipment'],
                                    'properties' => [
                                        'name' => ['type' => 'string'],
                                        'sets' => ['type' => 'integer'],
                                        'reps' => ['type' => 'string'],
                                        'rest_sec' => ['type' => 'integer'],
                                        'rpe' => ['type' => 'number'],
                                        'equipment' => ['type' => 'string'],
                                        'movement_notes' => ['type' => 'string'],
                                        'safer_alternative' => ['type' => 'string'],
                                    ],
                                ],
                            ],
                            'cooldown' => self::stringArraySchema(),
                            'safety_notes' => self::stringArraySchema(),
                        ],
                    ],
                ],
                'progression_rules' => self::stringArraySchema(),
                'recovery_rules' => self::stringArraySchema(),
                'coach_notes' => self::stringArraySchema(),
            ],
        ];
    }

    private static function adaptiveReviewSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['review_after_days'],
            'properties' => [
                'review_after_days' => ['type' => 'integer'],
                'checkpoints' => self::stringArraySchema(),
                'replanning_triggers' => self::stringArraySchema(),
                'next_data_to_collect' => self::stringArraySchema(),
            ],
        ];
    }

    private static function mlReadinessSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['notes'],
            'properties' => [
                'candidate_features' => self::stringArraySchema(),
                'candidate_targets' => self::stringArraySchema(),
                'notes' => ['type' => 'string'],
            ],
        ];
    }

    private static function stringArraySchema(): array
    {
        return [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ];
    }

    private static function progressPredictionSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => [
                'model_name',
                'horizon_days',
                'baseline_weight_kg',
                'expected_weight_change_kg',
                'projected_body_weight_kg',
                'strength_projection',
                'confidence',
                'feedback_adjustment',
            ],
            'properties' => [
                'model_name' => ['type' => 'string'],
                'horizon_days' => ['type' => 'integer'],
                'baseline_weight_kg' => ['type' => 'number'],
                'expected_weight_change_kg' => ['type' => 'number'],
                'projected_body_weight_kg' => ['type' => 'number'],
                'strength_projection' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['upper_body_compound_pct', 'lower_body_compound_pct'],
                    'properties' => [
                        'upper_body_compound_pct' => ['type' => 'number'],
                        'lower_body_compound_pct' => ['type' => 'number'],
                    ],
                ],
                'confidence' => ['type' => 'string'],
                'feedback_adjustment' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => [
                        'base_weekly_weight_change_kg',
                        'adjusted_weekly_weight_change_kg',
                        'last_prediction_error_kg_per_week',
                        'notes',
                    ],
                    'properties' => [
                        'base_weekly_weight_change_kg' => ['type' => 'number'],
                        'adjusted_weekly_weight_change_kg' => ['type' => 'number'],
                        'last_prediction_error_kg_per_week' => ['type' => ['number', 'null']],
                        'notes' => ['type' => 'string'],
                    ],
                ],
            ],
        ];
    }
}
