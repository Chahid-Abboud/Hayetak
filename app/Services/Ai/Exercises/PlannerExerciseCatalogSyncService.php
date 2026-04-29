<?php

namespace App\Services\Ai\Exercises;

use App\Models\Exercise;

class PlannerExerciseCatalogSyncService
{
    public function sync(): void
    {
        foreach ($this->requiredExercises() as $exercise) {
            $canonicalId = $this->canonicalExerciseId($exercise['canonical_name'] ?? null);
            $homeFriendly = (bool) ($exercise['home_friendly'] ?? false);
            $tags = ['planner-sync', $homeFriendly ? 'home' : 'gym'];

            Exercise::query()->updateOrCreate(
                [
                    'name' => $exercise['name'],
                    'equipment' => $exercise['equipment'],
                ],
                [
                    'primary_muscle' => $exercise['primary_muscle'],
                    'difficulty' => $exercise['difficulty'],
                    'home_friendly' => $homeFriendly,
                    'exercise_type' => 'Strength',
                    'movement_pattern' => $exercise['movement_pattern'] ?? null,
                    'mechanic' => $exercise['mechanic'] ?? null,
                    'plane' => $exercise['plane'] ?? null,
                    'tags' => $tags,
                    'conditions' => [],
                    'canonical_exercise_id' => $canonicalId,
                    'ai_summary' => $exercise['ai_summary'] ?? null,
                ]
            );
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function requiredExercises(): array
    {
        return [
            [
                'name' => 'Machine Lateral Raise',
                'equipment' => 'machine',
                'primary_muscle' => 'shoulders',
                'difficulty' => 'beginner',
                'movement_pattern' => 'shoulder abduction',
                'mechanic' => 'isolation',
                'plane' => 'frontal',
                'canonical_name' => 'Lateral Raise Machine',
                'ai_summary' => 'Seated or fixed-path lateral raise machine for controlled shoulder isolation.',
            ],
            [
                'name' => 'Machine Chest Press',
                'equipment' => 'machine',
                'primary_muscle' => 'chest',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal push',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'canonical_name' => null,
                'ai_summary' => 'Machine-based chest press for stable beginner-friendly upper-body pressing.',
            ],
            [
                'name' => 'Seated Cable Row',
                'equipment' => 'cable machine',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'canonical_name' => null,
                'ai_summary' => 'Cable row variation for controlled upper-back and lat training.',
            ],
            [
                'name' => 'Lat Pulldown',
                'equipment' => 'cable machine',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'vertical pull',
                'mechanic' => 'compound',
                'plane' => 'frontal',
                'canonical_name' => null,
                'ai_summary' => 'Pulldown movement used to train lats and upper back with stable machine support.',
            ],
            [
                'name' => 'Romanian Deadlift',
                'equipment' => 'barbell',
                'primary_muscle' => 'hamstrings',
                'difficulty' => 'intermediate',
                'movement_pattern' => 'hip hinge',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'canonical_name' => null,
                'ai_summary' => 'Posterior-chain hinge exercise emphasizing hamstrings and glutes with controlled loading.',
            ],
            [
                'name' => 'Leg Curl Machine',
                'equipment' => 'machine',
                'primary_muscle' => 'hamstrings',
                'difficulty' => 'beginner',
                'movement_pattern' => 'knee flexion',
                'mechanic' => 'isolation',
                'plane' => 'sagittal',
                'canonical_name' => 'Lying Leg Curl',
                'ai_summary' => 'Machine hamstring curl variation used for controlled posterior-chain work.',
            ],
            [
                'name' => 'Chest Supported Row Machine',
                'equipment' => 'machine',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'canonical_name' => null,
                'ai_summary' => 'Chest-supported machine row for upper-back work with reduced low-back loading.',
            ],
            [
                'name' => 'Bodyweight Squat',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'quadriceps',
                'difficulty' => 'beginner',
                'movement_pattern' => 'squat',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Foundational bodyweight squat used for beginner lower-body strength and movement practice.',
            ],
            [
                'name' => 'Chair Step Up',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'quadriceps',
                'difficulty' => 'beginner',
                'movement_pattern' => 'step up',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Low-impact step-up variation using a stable chair or step for unilateral leg work.',
            ],
            [
                'name' => 'Wall Sit',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'quadriceps',
                'difficulty' => 'beginner',
                'movement_pattern' => 'isometric squat',
                'mechanic' => 'isolation',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Beginner-friendly isometric lower-body hold for quads and local muscular endurance.',
            ],
            [
                'name' => 'Reverse Lunge',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'quadriceps',
                'difficulty' => 'beginner',
                'movement_pattern' => 'lunge',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Beginner-friendly reverse lunge for unilateral leg strength and balance.',
            ],
            [
                'name' => 'Glute Bridge',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'glutes',
                'difficulty' => 'beginner',
                'movement_pattern' => 'hip extension',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Floor-based glute bridge for posterior-chain activation and beginner hip-strength work.',
            ],
            [
                'name' => 'Push Up',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'chest',
                'difficulty' => 'intermediate',
                'movement_pattern' => 'horizontal push',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Standard bodyweight push-up for chest, shoulder, and triceps strength.',
            ],
            [
                'name' => 'Incline Push Up',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'chest',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal push',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Elevated push-up variation that reduces loading while training pressing mechanics.',
            ],
            [
                'name' => 'Pike Push Up',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'shoulders',
                'difficulty' => 'intermediate',
                'movement_pattern' => 'vertical push',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Bodyweight shoulder press progression that trains overhead pressing strength without equipment.',
            ],
            [
                'name' => 'Chair Triceps Dip',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'triceps',
                'difficulty' => 'beginner',
                'movement_pattern' => 'elbow extension',
                'mechanic' => 'compound',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Supported dip variation using a chair or bench for bodyweight triceps work.',
            ],
            [
                'name' => 'Bodyweight Towel Row',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Improvised row variation using a towel and sturdy anchor for home pulling work.',
            ],
            [
                'name' => 'Doorframe Row',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Bodyweight row variation using a stable doorway or anchor for home back work.',
            ],
            [
                'name' => 'Resistance Band Row',
                'equipment' => 'resistance band',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Beginner-friendly horizontal pulling exercise using a resistance band.',
            ],
            [
                'name' => 'Resistance Band Pulldown',
                'equipment' => 'resistance band',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'vertical pull',
                'mechanic' => 'compound',
                'plane' => 'frontal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Band-based pulldown alternative for home lat training without a machine.',
            ],
            [
                'name' => 'One Arm Dumbbell Row',
                'equipment' => 'dumbbell',
                'primary_muscle' => 'back',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal pull',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Single-arm dumbbell row for upper-back strength with home or gym equipment.',
            ],
            [
                'name' => 'Dumbbell Floor Press',
                'equipment' => 'dumbbell',
                'primary_muscle' => 'chest',
                'difficulty' => 'beginner',
                'movement_pattern' => 'horizontal push',
                'mechanic' => 'compound',
                'plane' => 'transverse',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Floor-based dumbbell press that limits shoulder strain and fits home setups.',
            ],
            [
                'name' => 'Dead Bug',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'core',
                'difficulty' => 'beginner',
                'movement_pattern' => 'anti-extension',
                'mechanic' => 'isolation',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Core stability drill used to train bracing and lumbopelvic control.',
            ],
            [
                'name' => 'Plank',
                'equipment' => 'bodyweight',
                'primary_muscle' => 'core',
                'difficulty' => 'beginner',
                'movement_pattern' => 'anti-extension',
                'mechanic' => 'isolation',
                'plane' => 'sagittal',
                'home_friendly' => true,
                'canonical_name' => null,
                'ai_summary' => 'Simple bodyweight plank used for trunk stiffness and core endurance.',
            ],
        ];
    }

    private function canonicalExerciseId(?string $canonicalName): ?int
    {
        $name = trim((string) $canonicalName);
        if ($name === '') {
            return null;
        }

        return Exercise::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($name)])
            ->value('id');
    }
}
