<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'plan_json',
        'version',
        'notes',
        'created_by',
        'generation_id',
    ];

    protected $casts = [
        'plan_json' => 'array',
        'version' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

