<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Exercise extends Model
{
    use HasFactory;

    /**
     * Mass-assignable fields.
     * Aligned with your current exercises table columns (per your Antares output).
     */
    protected $fillable = [
        // Core
        'name',
        'primary_muscle',
        'equipment',
        'difficulty',

        // Media + description
        'demo_video',
        'demo_url',
        'intensity_level',
        'description',

        // AI-ready / enrichment (existing in your DB)
        'movement_pattern',
        'exercise_type',
        'mechanic',            // NOTE: your DB column is "mechanic" (singular)
        'plane',
        'home_friendly',
        'joint_stress',
        'cues',
        'common_mistakes',
        'ai_summary',
        'canonical_exercise_id',

        // Tags/constraints
        'tags',
        'conditions',

        // New fields we recommended adding (only works if you added them in DB)
        'secondary_muscles',
        'equipment_list',
        'locations',
        'default_sets',
        'reps_min',
        'reps_max',
        'rest_seconds_min',
        'rest_seconds_max',
    ];

    /**
     * Casts so Inertia/JSON always receives correct types (no undefined/null map crashes).
     */
    protected $casts = [
        'tags' => 'array',
        'conditions' => 'array',

        // If you add these columns (recommended)
        'secondary_muscles' => 'array',
        'equipment_list' => 'array',
        'locations' => 'array',

        // Existing jsonb columns in your DB
        'joint_stress' => 'array',
        'cues' => 'array',
        'common_mistakes' => 'array',

        // Existing boolean column
        'home_friendly' => 'boolean',

        // Existing FK-ish column
        'canonical_exercise_id' => 'integer',
    ];

    /**
     * Relationships
     */
    public function planSlots()
    {
        return $this->hasMany(WorkoutPlanExercise::class, 'exercise_id');
    }

    public function logSets()
    {
        return $this->hasMany(WorkoutLogSet::class, 'exercise_id');
    }

    /**
     * Optional: canonical/variant relationship (only if you want it)
     * An exercise can reference a canonical base exercise.
     */
    public function canonical()
    {
        return $this->belongsTo(self::class, 'canonical_exercise_id');
    }

    public function variants()
    {
        return $this->hasMany(self::class, 'canonical_exercise_id');
    }
}
