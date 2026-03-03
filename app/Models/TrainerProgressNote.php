<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainerProgressNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'trainer_id',
        'recorded_on',
        'metrics',
        'notes',
    ];

    protected $casts = [
        'recorded_on' => 'date',
        'metrics' => 'array',
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

