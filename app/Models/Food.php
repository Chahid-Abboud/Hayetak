<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Food extends Model
{
    use HasFactory;

    protected $table = 'foods';

    protected $fillable = [
        'name','brand','nationality','cuisine','calories',
        'protein_g','carbs_g','fat_g','fiber_g','sugar_g',
        'sodium_mg','cholesterol_mg','tags','category',
        'serving_size','serving_unit',
    ];

    protected $casts = [
        'protein_g'     => 'decimal:2',
        'carbs_g'       => 'decimal:2',
        'fat_g'         => 'decimal:2',
        'fiber_g'       => 'decimal:2',
        'sugar_g'       => 'decimal:2',
        'serving_size'  => 'decimal:2',
        'sodium_mg'     => 'integer',
        'cholesterol_mg'=> 'integer',
        'calories'      => 'integer',
        'tags'          => 'array',   // json/jsonb
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];
}
