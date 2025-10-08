<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealLogItem extends Model
{
    protected $fillable = ['meal_log_id','category','label','quantity','unit','calories'];

    public function log(): BelongsTo
    {
        return $this->belongsTo(MealLog::class, 'meal_log_id');
    }
}
