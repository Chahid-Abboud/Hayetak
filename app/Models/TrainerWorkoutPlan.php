<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainerWorkoutPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'trainer_id',
        'title',
        'plan_json',
        'notes',
    ];

    protected $casts = [
        'plan_json' => 'array',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }
}

