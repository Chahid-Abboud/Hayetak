<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NutritionPlan extends Model
{
    use HasFactory;

    protected $table = 'nutrition_plans';

    protected $fillable = [
        'user_id',
        'ai_request_id',
        'name',
        'goal',
        'start_date',
        'duration_days',
        'is_active',
        'targets_json',
        'meta',
    ];

    protected $casts = [
        'start_date' => 'date',
        'duration_days' => 'integer',
        'is_active' => 'boolean',
        'targets_json' => 'array',
        'meta' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function aiRequest()
    {
        return $this->belongsTo(AiRequest::class, 'ai_request_id');
    }

    public function days()
    {
        return $this->hasMany(NutritionPlanDay::class, 'nutrition_plan_id')
            ->orderBy('day_index');
    }
}
