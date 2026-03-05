<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NutritionPlanItem extends Model
{
    use HasFactory;

    protected $table = 'nutrition_plan_items';

    protected $fillable = [
        'nutrition_plan_meal_id',
        'food_id',
        'servings',
        'grams',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'servings' => 'decimal:2',
        'grams' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function meal()
    {
        return $this->belongsTo(NutritionPlanMeal::class, 'nutrition_plan_meal_id');
    }

    public function food()
    {
        return $this->belongsTo(Food::class, 'food_id');
    }
}
