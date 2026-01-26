<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NutritionPlanDay extends Model
{
    use HasFactory;

    protected $table = 'nutrition_plan_days';

    protected $fillable = [
        'nutrition_plan_id',
        'day_index',
        'date',
        'notes',
    ];

    protected $casts = [
        'day_index' => 'integer',
        'date'      => 'date',
    ];

    public function plan()
    {
        return $this->belongsTo(NutritionPlan::class, 'nutrition_plan_id');
    }

    public function meals()
    {
        return $this->hasMany(NutritionPlanMeal::class, 'nutrition_plan_day_id')
            ->orderBy('meal_type')
            ->orderBy('order');
    }
}
