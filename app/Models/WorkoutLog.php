<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'performed_at', 'duration_min', 'notes', 'mood', 'energy',
        'workout_plan_id', 'workout_plan_day_id', 'meta',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
        'duration_min' => 'integer',
        'meta' => 'array',
        'workout_plan_id' => 'integer',
        'workout_plan_day_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sets()
    {
        return $this->hasMany(WorkoutLogSet::class);
    }

    public function plan()
    {
        return $this->belongsTo(WorkoutPlan::class, 'workout_plan_id');
    }

    public function day()
    {
        return $this->belongsTo(WorkoutPlanDay::class, 'workout_plan_day_id');
    }
}
