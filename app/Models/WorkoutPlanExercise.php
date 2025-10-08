<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlanExercise extends Model
{
    use HasFactory;

    // table name is not the default plural of the class
    protected $table = 'workout_plan_day_exercises';

    protected $fillable = [
        'workout_plan_day_id', 'exercise_id', 'order_index',
        'sets', 'reps_min', 'reps_max', 'rest_seconds',
        'tempo', 'rpe_target', 'rir_target', 'notes',
    ];

    protected $casts = [
        'order_index'  => 'integer',
        'sets'         => 'integer',
        'reps_min'     => 'integer',
        'reps_max'     => 'integer',
        'rest_seconds' => 'integer',
        'rpe_target'   => 'decimal:1',
        'rir_target'   => 'decimal:1',
    ];

    public function day()      { return $this->belongsTo(WorkoutPlanDay::class, 'workout_plan_day_id'); }
    public function exercise() { return $this->belongsTo(Exercise::class); }
}
