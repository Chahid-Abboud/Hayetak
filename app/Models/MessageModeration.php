<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageModeration extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'conversation_id',
        'sender_id',
        'decision',
        'severity',
        'categories',
        'matched_terms',
        'original_body',
        'sanitized_body',
        'reason',
        'escalated_at',
        'resolved_at',
        'provider',
    ];

    protected $casts = [
        'categories' => 'array',
        'matched_terms' => 'array',
        'escalated_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
