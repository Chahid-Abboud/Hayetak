<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaterIntake extends Model
{
    protected $fillable = ['user_id', 'for_day', 'ml', 'drank_at'];

    protected $casts = [
        'for_day' => 'date',
        'drank_at' => 'datetime',
    ];
}
