<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MealSelection extends Model
{
    protected $fillable = [
        'meal_log_id',
        'category',
        'label',
        'quantity',
        'unit',
    ];

    public function mealLog()
    {
        return $this->belongsTo(MealLog::class);
    }
}
