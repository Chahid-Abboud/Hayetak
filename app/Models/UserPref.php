<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserPref extends Model
{
    use HasFactory;

    protected $table = 'user_prefs';

    protected $fillable = [
        'user_id',
        'units',               // 'metric'|'imperial'
        'theme',               // 'light'|'dark'|'system'
        'home_gym',
        'is_public',

        // energy & activity
        'bmr_kcal', 'tdee_kcal', 'activity_factor',

        // daily goals
        'daily_goal_calories', 'daily_goal_protein_g', 'daily_goal_carbs_g', 'daily_goal_fat_g',
        'water_cups_per_day', 'workout_days_target',

        // misc
        'notifications',       // json
        'settings',            // json blob for future flags
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'bmr_kcal' => 'integer',
        'tdee_kcal' => 'integer',
        'activity_factor' => 'decimal:2',

        'daily_goal_calories' => 'integer',
        'daily_goal_protein_g' => 'decimal:1',
        'daily_goal_carbs_g' => 'decimal:1',
        'daily_goal_fat_g' => 'decimal:1',

        'water_cups_per_day' => 'integer',
        'workout_days_target' => 'integer',

        'notifications' => 'array',
        'settings' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
