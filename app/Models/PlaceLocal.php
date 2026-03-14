<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlaceLocal extends Model
{
    use HasFactory;

    // table name deviates from Laravel’s default
    protected $table = 'places_local';

    protected $fillable = [
        'user_id', 'name', 'category', 'address',
        'lat', 'lng', 'city', 'meta',
        'description', 'google_maps_link', 'google_place_id', 'last_verified_at',
    ];

    protected $casts = [
        'lat' => 'decimal:6',
        'lng' => 'decimal:6',
        'meta' => 'array',
        'last_verified_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
