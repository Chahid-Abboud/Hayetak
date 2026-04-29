<?php

namespace App\Models\Ai;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ai_request_id',
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

    /**
     * User this generated plan belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * AI request execution that produced this plan version.
     */
    public function aiRequest(): BelongsTo
    {
        return $this->belongsTo(AiRequest::class, 'ai_request_id');
    }

    /**
     * User who initiated this generation action.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
