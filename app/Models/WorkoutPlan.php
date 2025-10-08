<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkoutPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'goal', 'notes', 'is_active', 'is_public', 'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'meta'      => 'array',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function days() { return $this->hasMany(WorkoutPlanDay::class); }
}
