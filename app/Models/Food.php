<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Food extends Model
{
    use HasFactory;

    protected $table = 'foods';

    protected $fillable = [
        'name','brand','nationality','cuisine','category',
        'serving_size','serving_unit',
        'calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g',
        'sodium_mg','cholesterol_mg',
        'tags','allergens','diets_allowed','ingredients','meal_types',
    ];

    protected $casts = [
        'calories'      => 'integer',
        'protein_g'     => 'decimal:2',
        'carbs_g'       => 'decimal:2',
        'fat_g'         => 'decimal:2',
        'fiber_g'       => 'decimal:2',
        'sugar_g'       => 'decimal:2',
        'serving_size'  => 'decimal:2',

        'tags'          => 'array',
        'allergens'     => 'array',   // jsonb array
        'diets_allowed' => 'array',   // jsonb array
        'ingredients'   => 'array',   // jsonb array
        'meal_types'    => 'array',   // jsonb array like ["breakfast","snack"]
    ];
}
