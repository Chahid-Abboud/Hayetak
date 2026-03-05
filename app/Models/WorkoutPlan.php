<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlan extends Model
{
    use HasFactory;

    protected $table = 'workout_plans';

    protected $fillable = [
        'user_id',
        'ai_request_id', // ✅ NEW
        'name',
        'goal',
        'notes',
        'is_active',
        'is_public',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
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
        return $this->hasMany(WorkoutPlanDay::class, 'workout_plan_id')
            ->orderBy('day_index');
    }
}
