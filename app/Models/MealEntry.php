<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealEntry extends Model
{
    protected $fillable = [
        'user_id',
        'food_id',
        'nutrition_plan_item_id',
        'meal_type',
        'servings',
        'eaten_at',
    ];

    protected $casts = [
        'eaten_at' => 'date:Y-m-d',
        'servings' => 'decimal:2',
        'nutrition_plan_item_id' => 'integer',
    ];

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function nutritionPlanItem(): BelongsTo
    {
        return $this->belongsTo(NutritionPlanItem::class, 'nutrition_plan_item_id');
    }
}
