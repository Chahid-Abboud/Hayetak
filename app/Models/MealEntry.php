<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealEntry extends Model
{
    protected $fillable = ['user_id','food_id','meal_type','servings','eaten_at'];

    protected $casts = [
        'eaten_at' => 'date',
        'servings' => 'decimal:2',
    ];

    public function food(): BelongsTo {
        return $this->belongsTo(Food::class);
    }
    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }
}
