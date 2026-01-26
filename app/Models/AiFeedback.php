<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiFeedback extends Model
{
    use HasFactory;

    protected $table = 'ai_feedback';

    protected $fillable = [
        'ai_request_id',
        'user_id',
        'action',            // accepted|edited|rejected
        'rating',            // nullable
        'edited_output_json',
        'notes',
    ];

    protected $casts = [
        'rating'            => 'integer',
        'edited_output_json'=> 'array',
    ];

    public function aiRequest()
    {
        return $this->belongsTo(AiRequest::class, 'ai_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
