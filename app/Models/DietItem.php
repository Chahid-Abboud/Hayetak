<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DietItem extends Model
{
    protected $fillable = ['diet_id','category','label','default_portion','calories'];

    public function diet(): BelongsTo
    {
        return $this->belongsTo(Diet::class);
    }
}
