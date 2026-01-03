<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlanDay extends Model
{
    use HasFactory;

    protected $table = 'workout_plan_days';

    protected $fillable = [
        'workout_plan_id',
        'day_index',
        'name',
    ];

    protected $casts = [
        'day_index' => 'integer',
    ];

    public function plan()
    {
        return $this->belongsTo(WorkoutPlan::class, 'workout_plan_id');
    }

    public function exercises()
    {
        return $this->belongsToMany(Exercise::class, 'workout_plan_day_exercises', 'workout_plan_day_id', 'exercise_id')
            ->withPivot([
                'order_index',
                'sets',
                'reps_min',
                'reps_max',
                'rest_seconds',
                'rpe_target',
                'rir_target',
                'notes',
                'created_at',
                'updated_at',
            ])
            ->withTimestamps();
    }
}
