<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutLogSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'workout_log_id', 'exercise_id', 'order_index',
        'weight_kg', 'reps', 'distance_m', 'duration_sec',
        'side', 'is_warmup', 'notes', 'meta',
    ];

    protected $casts = [
        'order_index'  => 'integer',
        'weight_kg'    => 'decimal:2',
        'reps'         => 'integer',
        'distance_m'   => 'integer',
        'duration_sec' => 'integer',
        'is_warmup'    => 'boolean',
        'meta'         => 'array',
    ];

    public function workout()  { return $this->belongsTo(WorkoutLog::class, 'workout_log_id'); }
    public function exercise() { return $this->belongsTo(Exercise::class); }
}
