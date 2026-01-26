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

        'model_name',
        'model_version',

        'prompt_version',
        'duration_ms',
        'tokens_in',
        'tokens_out',

        'error_message',

        'meta',
    ];

    protected $casts = [
        'input_context_json' => 'array',
        'output_json'        => 'array',
        'meta'               => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
