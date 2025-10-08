<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlanDay extends Model
{
    use HasFactory;

    protected $fillable = [
        'workout_plan_id', 'day_index', 'name', 'notes', 'meta',
    ];

    protected $casts = [
        'day_index' => 'integer',
        'meta'      => 'array',
    ];

    public function plan() { return $this->belongsTo(WorkoutPlan::class, 'workout_plan_id'); }

    public function exercises()
    {
        return $this->hasMany(WorkoutPlanExercise::class, 'workout_plan_day_id')
                    ->orderBy('order_index');
    }
}
