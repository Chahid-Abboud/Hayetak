<?php

namespace App\Services\Ai\Schemas;

class PlannerSchema
{
    public static function definition(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['why', 'workout', 'diet'],
            'properties' => [
                'why' => ['type' => 'string'],
                'workout' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['weekly_schedule', 'progression_rules', 'substitutions'],
                    'properties' => [
                        'weekly_schedule' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'additionalProperties' => false,
                                'required' => ['day', 'focus', 'location', 'exercises'],
                                'properties' => [
                                    'day' => ['type' => 'string'],
                                    'focus' => ['type' => 'string'],
                                    'location' => ['type' => 'string'],
                                    'exercises' => [
                                        'type' => 'array',
                                        'items' => [
                                            'type' => 'object',
                                            'additionalProperties' => false,
                                            'required' => ['name', 'sets', 'reps', 'rest_sec', 'rpe'],
                                            'properties' => [
                                                'name' => ['type' => 'string'],
                                                'sets' => ['type' => 'integer'],
                                                'reps' => ['type' => 'string'],
                                                'rest_sec' => ['type' => 'integer'],
                                                'rpe' => ['type' => 'number'],
                                                'form_cue' => ['type' => 'string'],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'progression_rules' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                        ],
                        'substitutions' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['home', 'gym'],
                            'properties' => [
                                'home' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'string'],
                                ],
                                'gym' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'string'],
                                ],
                            ],
                        ],
                    ],
                ],
                'diet' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => [
                        'daily_calories',
                        'macros',
                        'meal_structure',
                        'sample_meals',
                        'grocery_list',
                        'substitutions',
                    ],
                    'properties' => [
                        'daily_calories' => ['type' => 'integer'],
                        'macros' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['protein_g', 'carbs_g', 'fat_g'],
                            'properties' => [
                                'protein_g' => ['type' => 'integer'],
                                'carbs_g' => ['type' => 'integer'],
                                'fat_g' => ['type' => 'integer'],
                            ],
                        ],
                        'meal_structure' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'additionalProperties' => false,
                                'required' => ['meal', 'kcal_target'],
                                'properties' => [
                                    'meal' => ['type' => 'string'],
                                    'kcal_target' => ['type' => 'integer'],
                                ],
                            ],
                        ],
                        'sample_meals' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'additionalProperties' => false,
                                'required' => ['meal', 'options'],
                                'properties' => [
                                    'meal' => ['type' => 'string'],
                                    'options' => [
                                        'type' => 'array',
                                        'items' => ['type' => 'string'],
                                    ],
                                ],
                            ],
                        ],
                        'grocery_list' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                        ],
                        'substitutions' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['allergy_safe', 'diet_type_safe'],
                            'properties' => [
                                'allergy_safe' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'string'],
                                ],
                                'diet_type_safe' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'string'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}

