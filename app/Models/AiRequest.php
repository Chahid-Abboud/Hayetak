<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiRequest extends Model
{
    use HasFactory;

    protected $table = 'ai_requests';

    protected $fillable = [
        'user_id',
        'type',
        'status',
        'input_context_json',
        'output_json',
        'provider',
        'model',
        'prompt_version',
        'schema_version',
        'usage_json',
        'error_json',
    ];

    protected $casts = [
        'input_context_json' => 'array',
        'output_json' => 'array',
        'usage_json' => 'array',
        'error_json' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
