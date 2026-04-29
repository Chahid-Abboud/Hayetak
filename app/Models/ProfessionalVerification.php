<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'role',
        'full_legal_name',
        'license_number',
        'authority',
        'country_state',
        'expiry_date',
        'documents',
        'review_status',
        'reviewed_by',
        'reviewed_at',
        'notes',
    ];

    protected $casts = [
        'documents' => 'array',
        'expiry_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
