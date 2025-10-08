<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Exercise extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'primary_muscle', 'equipment', 'difficulty',
        'demo_video', 'tags', 'conditions',
    ];

    protected $casts = [
        'tags'       => 'array',
        'conditions' => 'array',
    ];

    public function planSlots()
    {
        return $this->hasMany(WorkoutPlanExercise::class, 'exercise_id');
    }

    public function logSets()
    {
        return $this->hasMany(WorkoutLogSet::class, 'exercise_id');
    }
}
