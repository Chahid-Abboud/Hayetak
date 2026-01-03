<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlanExercise extends Model
{
    use HasFactory;

    protected $table = 'workout_plan_day_exercises';

    protected $fillable = [
        'workout_plan_day_id',
        'exercise_id',
        'order_index',
        'sets',
        'reps_min',
        'reps_max',
        'rest_seconds',
        'rpe_target',
        'rir_target',
        'notes',
    ];

    protected $casts = [];

    public function day()
    {
        return $this->belongsTo(WorkoutPlanDay::class, 'workout_plan_day_id');
    }

    public function exercise()
    {
        return $this->belongsTo(Exercise::class, 'exercise_id');
    }
}
