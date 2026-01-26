<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Measurement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'measured_at',
        'weight_kg', 'body_fat_pct',
        'neck_cm', 'chest_cm', 'waist_cm', 'hip_cm',
        'arm_cm', 'thigh_cm', 'calf_cm',
        'resting_hr', 'systolic_bp', 'diastolic_bp',
        'notes',
    ];

    protected $casts = [
        'measured_at'  => 'datetime',
        'weight_kg'    => 'decimal:2',
        'body_fat_pct' => 'decimal:2',
        'neck_cm'      => 'decimal:1',
        'chest_cm'     => 'decimal:1',
        'waist_cm'     => 'decimal:1',
        'hip_cm'       => 'decimal:1',
        'arm_cm'       => 'decimal:1',
        'thigh_cm'     => 'decimal:1',
        'calf_cm'      => 'decimal:1',
        'resting_hr'   => 'integer',
        'systolic_bp'  => 'integer',
        'diastolic_bp' => 'integer',
    ];

    public function user() { return $this->belongsTo(User::class); }
}
