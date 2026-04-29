<?php

namespace Database\Seeders\Ai\Data;

use App\Models\Exercise;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ExerciseDataQualitySeeder extends Seeder
{
    public function run(): void
    {
        $seen = [];

        Exercise::query()
            ->orderBy('id')
            ->chunkById(200, function ($chunk) use (&$seen): void {
                foreach ($chunk as $exercise) {
                    /** @var Exercise $exercise */
                    $name = trim((string) $exercise->name);
                    $equipment = $this->normalizeEquipment((string) $exercise->equipment);
                    $normalizedName = Str::title(Str::of($name)->replace('-', ' ')->squish()->toString());

                    $duplicateKey = mb_strtolower($normalizedName).'|'.mb_strtolower($equipment);
                    if (array_key_exists($duplicateKey, $seen)) {
                        $variantNumber = ++$seen[$duplicateKey];
                        $normalizedName .= ' (Variation '.$variantNumber.')';
                    } else {
                        $seen[$duplicateKey] = 1;
                    }

                    $difficulty = $this->normalizeDifficulty((string) $exercise->difficulty);
                    $primaryMuscle = $this->normalizePrimaryMuscle((string) $exercise->primary_muscle);

                    $homeFriendly = (bool) $exercise->home_friendly;
                    $tags = collect($exercise->tags ?? [])
                        ->filter()
                        ->map(fn ($tag) => mb_strtolower(trim((string) $tag)))
                        ->filter()
                        ->push($homeFriendly ? 'home' : 'gym')
                        ->push('real-exercise')
                        ->push($equipment)
                        ->push($primaryMuscle)
                        ->unique()
                        ->values()
                        ->all();

                    $jointStress = is_array($exercise->joint_stress) && $exercise->joint_stress !== []
                        ? $exercise->joint_stress
                        : $this->defaultJointStress($primaryMuscle);

                    $description = trim((string) $exercise->description);
                    if ($description === '') {
                        $description = sprintf(
                            '%s training movement targeting %s using %s.',
                            $normalizedName,
                            str_replace('_', ' ', $primaryMuscle),
                            $equipment
                        );
                    }

                    $intensity = trim((string) ($exercise->intensity_level ?? ''));
                    if ($intensity === '') {
                        $intensity = match ($difficulty) {
                            'beginner' => 'low',
                            'advanced' => 'high',
                            default => 'moderate',
                        };
                    }

                    $demoUrl = trim((string) ($exercise->demo_url ?? ''));
                    if ($demoUrl === '') {
                        $demoUrl = 'https://www.youtube.com/results?search_query='.urlencode($normalizedName.' exercise tutorial');
                    }

                    $exercise->forceFill([
                        'name' => $normalizedName,
                        'primary_muscle' => $primaryMuscle,
                        'equipment' => $equipment,
                        'difficulty' => $difficulty,
                        'description' => $description,
                        'movement_pattern' => $exercise->movement_pattern ?: $this->defaultMovementPattern($primaryMuscle),
                        'exercise_type' => $exercise->exercise_type ?: 'strength',
                        'mechanic' => $exercise->mechanic ?: 'compound',
                        'plane' => $exercise->plane ?: 'sagittal',
                        'intensity_level' => $intensity,
                        'demo_url' => $demoUrl,
                        'demo_video' => $exercise->demo_video ?: $demoUrl,
                        'joint_stress' => $jointStress,
                        'tags' => $tags,
                    ])->save();
                }
            });
    }

    private function normalizeEquipment(string $equipment): string
    {
        $value = mb_strtolower(Str::of($equipment)->replace('-', ' ')->squish()->toString());

        return match (true) {
            str_contains($value, 'body') => 'bodyweight',
            str_contains($value, 'dumb') => 'dumbbells',
            str_contains($value, 'bar') => 'barbell',
            str_contains($value, 'kettle') => 'kettlebell',
            str_contains($value, 'band') => 'bands',
            str_contains($value, 'cable') => 'cable',
            str_contains($value, 'machine') => 'machine',
            str_contains($value, 'trx') => 'trx',
            str_contains($value, 'medicine') => 'medicine ball',
            default => $value !== '' ? $value : 'bodyweight',
        };
    }

    private function normalizeDifficulty(string $difficulty): string
    {
        $value = mb_strtolower(trim($difficulty));

        return match (true) {
            in_array($value, ['beginner', 'easy', 'low'], true) => 'beginner',
            in_array($value, ['advanced', 'hard', 'expert', 'high'], true) => 'advanced',
            default => 'intermediate',
        };
    }

    private function normalizePrimaryMuscle(string $muscle): string
    {
        $value = mb_strtolower(Str::of($muscle)->replace('-', ' ')->replace('/', ' ')->squish()->toString());

        return match (true) {
            str_contains($value, 'chest') => 'chest',
            str_contains($value, 'back') => 'back',
            str_contains($value, 'shoulder') || str_contains($value, 'delt') => 'shoulders',
            str_contains($value, 'bicep') => 'biceps',
            str_contains($value, 'tricep') => 'triceps',
            str_contains($value, 'quad') => 'quadriceps',
            str_contains($value, 'hamstring') => 'hamstrings',
            str_contains($value, 'glute') => 'glutes',
            str_contains($value, 'calf') => 'calves',
            str_contains($value, 'core') || str_contains($value, 'abs') => 'core',
            str_contains($value, 'trap') => 'traps',
            default => $value !== '' ? str_replace(' ', '_', $value) : 'full_body',
        };
    }

    private function defaultMovementPattern(string $primaryMuscle): string
    {
        return match ($primaryMuscle) {
            'back', 'biceps', 'hamstrings' => 'pull',
            'chest', 'triceps', 'shoulders' => 'push',
            'quadriceps', 'glutes', 'calves' => 'squat',
            'core' => 'stability',
            default => 'mixed',
        };
    }

    private function defaultJointStress(string $primaryMuscle): array
    {
        return match ($primaryMuscle) {
            'shoulders' => ['shoulders' => 'medium', 'elbows' => 'low', 'wrists' => 'low'],
            'chest' => ['shoulders' => 'medium', 'elbows' => 'low', 'wrists' => 'low'],
            'back' => ['lower back' => 'medium', 'shoulders' => 'low'],
            'quadriceps', 'hamstrings', 'glutes', 'calves' => ['knees' => 'medium', 'ankles' => 'low', 'lower back' => 'low'],
            'core' => ['lower back' => 'low'],
            default => ['shoulders' => 'low', 'knees' => 'low', 'lower back' => 'low'],
        };
    }
}
