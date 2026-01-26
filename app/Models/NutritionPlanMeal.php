<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NutritionPlanMeal extends Model
{
    use HasFactory;

    protected $table = 'nutrition_plan_meals';

    protected $fillable = [
        'nutrition_plan_day_id',
        'meal_type',   // breakfast|lunch|dinner|snack
        'order',
        'notes',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function day()
    {
        return $this->belongsTo(NutritionPlanDay::class, 'nutrition_plan_day_id');
    }

    public function items()
    {
        return $this->hasMany(NutritionPlanItem::class, 'nutrition_plan_meal_id')
            ->orderBy('sort_order');
    }
}
