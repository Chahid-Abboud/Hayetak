<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Meal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'logged_at',     // datetime column in your migration
        'meal_type',     // e.g. breakfast/lunch/dinner/snack
        'name', 'notes',
        'tot_calories', 'tot_protein_g', 'tot_carbs_g', 'tot_fat_g', // optional rollups
    ];

    protected $casts = [
        'logged_at'     => 'datetime',
        'tot_calories'  => 'integer',
        'tot_protein_g' => 'decimal:2',
        'tot_carbs_g'   => 'decimal:2',
        'tot_fat_g'     => 'decimal:2',
    ];

    public function user()     { return $this->belongsTo(User::class); }
    public function entries()  { return $this->hasMany(MealEntry::class); }
}
