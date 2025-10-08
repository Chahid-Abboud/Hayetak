<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MealLog extends Model
{
    protected $fillable = ['user_id','consumed_at','other_notes','photo_path'];
    protected $casts = [
        'consumed_at' => 'date',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(MealLogItem::class);
    }
}
