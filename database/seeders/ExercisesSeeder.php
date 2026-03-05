<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExercisesSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/all_conditions_exercises_with_videos_with_id_removed_second.csv');
        if (! file_exists($path)) {
            $this->command->warn("ExercisesSeeder: CSV not found at {$path} — skipping.");

            return;
        }

        $fh = fopen($path, 'r');
        if ($fh === false) {
            $this->command->warn('ExercisesSeeder: Unable to open CSV — skipping.');

            return;
        }

        // ---- headers
        $header = fgetcsv($fh);
        if (! $header) {
            fclose($fh);
            $this->command->warn('ExercisesSeeder: Empty CSV — skipping.');

            return;
        }
        $header = array_map(fn ($h) => $this->normKey($h), $header);

        $batch = [];
        $batchSize = 500;
        $now = now();
        $unknownMuscles = [];

        $pushBatch = function () use (&$batch, $now) {
            if (empty($batch)) {
                return;
            }

            // 1) de-dupe within batch by (name|equipment) and MERGE tags + conditions
            $dict = [];
            foreach ($batch as $r) {
                $k = $this->keyFor($r['name'], $r['equipment']);
                if (! isset($dict[$k])) {
                    $dict[$k] = $r;

                    continue;
                }

                $e = $dict[$k];
                // keep existing non-null; only fill blanks
                $e['primary_muscle'] = $e['primary_muscle'] ?? $r['primary_muscle'];
                $e['difficulty'] = $e['difficulty'] ?? $r['difficulty'];
                $e['demo_video'] = $e['demo_video'] ?? $r['demo_video'];

                // merge tags
                $tagsA = $this->jsonToArray($e['tags'] ?? null);
                $tagsB = $this->jsonToArray($r['tags'] ?? null);
                $e['tags'] = $this->toJsonUnique(array_merge($tagsA, $tagsB));

                // merge conditions
                $condA = $this->jsonToArray($e['conditions'] ?? null);
                $condB = $this->jsonToArray($r['conditions'] ?? null);
                $e['conditions'] = $this->toJsonUnique(array_merge($condA, $condB));

                $e['updated_at'] = $now;
                $dict[$k] = $e;
            }
            $deduped = array_values($dict);

            // 2) merge with existing DB rows (fill blanks, union tags + conditions)
            $names = array_values(array_unique(array_map(fn ($r) => $r['name'], $deduped)));
            $existingRows = empty($names)
                ? collect()
                : DB::table('exercises')
                    ->whereIn('name', $names)
                    ->get(['id', 'name', 'equipment', 'primary_muscle', 'difficulty', 'demo_video', 'tags', 'conditions']);

            $existingMap = [];
            foreach ($existingRows as $erow) {
                $existingMap[$this->keyFor($erow->name, $erow->equipment)] = $erow;
            }

            $final = [];
            foreach ($deduped as $r) {
                $k = $this->keyFor($r['name'], $r['equipment']);
                if (isset($existingMap[$k])) {
                    $erow = $existingMap[$k];

                    $tags = $this->toJsonUnique(array_merge(
                        $this->jsonToArray($erow->tags ?? null),
                        $this->jsonToArray($r['tags'] ?? null)
                    ));

                    $conds = $this->toJsonUnique(array_merge(
                        $this->jsonToArray($erow->conditions ?? null),
                        $this->jsonToArray($r['conditions'] ?? null)
                    ));

                    $final[] = [
                        'name' => $r['name'],
                        'equipment' => $r['equipment'],
                        'primary_muscle' => $erow->primary_muscle ?? $r['primary_muscle'],
                        'difficulty' => $erow->difficulty ?? $r['difficulty'],
                        'demo_video' => $erow->demo_video ?? $r['demo_video'],
                        'tags' => $tags,
                        'conditions' => $conds,
                        'created_at' => $r['created_at'],
                        'updated_at' => $now,
                    ];
                } else {
                    $final[] = $r;
                }
            }

            // 3) upsert once (no dup keys inside)
            DB::table('exercises')->upsert(
                $final,
                ['name', 'equipment'],
                ['primary_muscle', 'difficulty', 'demo_video', 'tags', 'conditions', 'updated_at']
            );

            $batch = [];
        };

        // ---- stream CSV rows
        while (($data = fgetcsv($fh)) !== false) {
            $row = [];
            foreach ($header as $i => $key) {
                $row[$key] = $data[$i] ?? null;
            }

            $name = $this->take($row, ['name', 'exercise', 'exercise_name', 'title']);
            if (! $this->hasText($name)) {
                continue;
            }

            $muscleRaw = $this->take($row, ['primary_muscle', 'muscle_group', 'muscle', 'target']);
            [$primaryMuscle] = $this->canonMuscle($muscleRaw, $name);
            if (! $primaryMuscle) {
                $u = trim((string) $muscleRaw);
                if ($u !== '') {
                    $unknownMuscles[$u] = true;
                }

continue;
            }

            $equipment = $this->normalizeEquipment($this->take($row, ['equipment', 'apparatus', 'machine', 'tool']));
            $difficulty = $this->canonDifficulty($this->take($row, ['difficulty', 'level', 'lvl', 'experience_level']));
            $video = $this->cleanVideoUrl($this->take($row, ['demo_video', 'video_url', 'video', 'link', 'youtube', 'url']));

            $tagsRaw = $this->take($row, ['tags', 'tag', 'category', 'categories', 'type', 'types', 'movement_type', 'mechanic', 'mechanics']);

            // your CSV has a condition column → include lots of aliases
            $condsRaw = $this->take($row, [
                'condition', 'conditions', 'condition_tags',
                'medical_conditions', 'health_conditions',
                'contraindications', 'warnings', 'safety_notes',
                'notes', 'cautions', 'suitable_for', 'not_recommended_for',
            ]);

            // build arrays
            $conditionsArr = $this->explodeTokens($condsRaw);         // array like ['asthma','high_blood_pressure']
            $tagsArr = $this->buildTags($tagsRaw, $conditionsArr, $equipment);

            $batch[] = [
                'name' => trim($name),
                'primary_muscle' => $primaryMuscle,
                'equipment' => $equipment,
                'difficulty' => $difficulty,
                'demo_video' => $video,
                'tags' => $this->toJsonUnique($tagsArr),
                'conditions' => $this->toJsonUnique($conditionsArr),
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= $batchSize) {
                $pushBatch();
            }
        }

        fclose($fh);
        $pushBatch();

        if (! empty($unknownMuscles)) {
            $some = implode(', ', array_slice(array_keys($unknownMuscles), 0, 8));
            $this->command->warn("ExercisesSeeder: skipped rows with unmapped muscles: {$some}".(count($unknownMuscles) > 8 ? '…' : ''));
        }

        $this->command->info('ExercisesSeeder: CSV imported (conditions column stored + tags merged).');
    }

    // ---------------- helpers ----------------

    private function normKey($h): string
    {
        $h = strtolower(trim((string) $h));
        $h = preg_replace('/\s+/', '_', $h);

        return str_replace(['-', '.'], '_', $h);
    }

    private function take(array $row, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $this->hasText($row[$k])) {
                return trim((string) $row[$k]);
            }
        }

        return null;
    }

    private function hasText($v): bool
    {
        return is_string($v) ? trim($v) !== '' : ($v !== null && $v !== '');
    }

    private function keyFor(?string $name, ?string $equipment): string
    {
        return strtolower(trim((string) $name)).'|'.strtolower(trim((string) ($equipment ?? '')));
    }

    private function normalizeEquipment(?string $v): ?string
    {
        if (! $this->hasText($v)) {
            return 'Bodyweight';
        }
        $s = strtolower(trim($v));
        $map = [
            'no equipment' => 'Bodyweight', 'none' => 'Bodyweight', 'body weight' => 'Bodyweight', 'bodyweight' => 'Bodyweight',
            'dumbbell' => 'Dumbbells', 'dumbbells' => 'Dumbbells',
            'band' => 'Bands', 'bands' => 'Bands', 'resistance band' => 'Bands', 'resistance bands' => 'Bands',
            'kb' => 'Kettlebell', 'kettlebell' => 'Kettlebell', 'kettlebells' => 'Kettlebell',
            'smith' => 'Smith Machine', 'smith machine' => 'Smith Machine',
        ];

        return $map[$s] ?? ucwords($s);
    }

    private function canonDifficulty(?string $v): ?string
    {
        if (! $this->hasText($v)) {
            return null;
        }
        $v = strtolower(trim($v));
        $map = [
            'easy' => 'beginner', 'beginner' => 'beginner', 'novice' => 'beginner', '1' => 'beginner', 'level 1' => 'beginner',
            'moderate' => 'intermediate', 'medium' => 'intermediate', 'intermediate' => 'intermediate', '2' => 'intermediate', 'level 2' => 'intermediate',
            'hard' => 'advanced', 'difficult' => 'advanced', 'advanced' => 'advanced', 'expert' => 'advanced', '3' => 'advanced', 'level 3' => 'advanced',
        ];
        if (isset($map[$v])) {
            return $map[$v];
        }

        return str_contains($v, 'begin') ? 'beginner' : (str_contains($v, 'inter') ? 'intermediate' : (str_contains($v, 'adv') ? 'advanced' : null));
    }

    // enum map
    private function canonMuscle(?string $m, ?string $exerciseName = null): array
    {
        if (! $this->hasText($m)) {
            return [null, null];
        }
        $s = strtolower(trim($m));
        $map = [
            'chest' => 'chest', 'pec' => 'chest', 'pecs' => 'chest', 'pectoralis' => 'chest', 'pectorals' => 'chest',
            'back' => 'back', 'lats' => 'back', 'latissimus' => 'back', 'upper back' => 'back', 'mid back' => 'back', 'lower back' => 'back', 'traps' => 'back', 'trapezius' => 'back', 'rhomboids' => 'back',
            'shoulder' => 'shoulders', 'shoulders' => 'shoulders', 'delts' => 'shoulders', 'deltoid' => 'shoulders', 'deltoids' => 'shoulders',
            'legs' => 'legs', 'quadriceps' => 'legs', 'quads' => 'legs', 'hamstrings' => 'legs', 'thighs' => 'legs', 'adductors' => 'legs', 'abductors' => 'legs',
            'glutes' => 'glutes', 'glute' => 'glutes', 'gluteus' => 'glutes', 'butt' => 'glutes', 'buttocks' => 'glutes',
            'biceps' => 'biceps', 'bicep' => 'biceps', 'arm' => 'biceps', 'arms' => 'biceps', 'upper arm' => 'biceps',
            'triceps' => 'triceps', 'tricep' => 'triceps',
            'core' => 'core', 'abs' => 'core', 'abdominals' => 'core', 'abdominal' => 'core', 'obliques' => 'core', 'waist' => 'core',
            'calves' => 'calves', 'calf' => 'calves', 'gastrocnemius' => 'calves', 'soleus' => 'calves',
            'forearms' => 'biceps', 'forearm' => 'biceps', 'neck' => 'back', 'hip flexors' => 'legs',
        ];
        if (isset($map[$s])) {
            return [$map[$s], $s];
        }
        foreach ($map as $k => $val) {
            if (str_contains($s, $k)) {
                return [$val, $k];
            }
        }

        if (in_array($s, ['arm', 'arms']) && $this->hasText($exerciseName)) {
            $n = strtolower($exerciseName);
            if ($this->containsAny($n, ['curl'])) {
                return ['biceps', 'heuristic'];
            }
            if ($this->containsAny($n, ['extension', 'pressdown', 'skullcrusher', 'kickback', 'dip'])) {
                return ['triceps', 'heuristic'];
            }

            return ['biceps', 'heuristic'];
        }

        return [null, null];
    }

    private function containsAny(string $h, array $needles): bool
    {
        foreach ($needles as $n) {
            if (str_contains($h, $n)) {
                return true;
            }
        }

return false;
    }

    private function cleanVideoUrl(?string $url): ?string
    {
        if (! $this->hasText($url)) {
            return null;
        }
        $url = preg_replace('/\s+/', '', trim($url));
        $p = @parse_url($url);
        if (! $p || empty($p['host'])) {
            return null;
        }
        $h = strtolower($p['host']);
        $yt = str_contains($h, 'youtube.com') || str_contains($h, 'youtu.be');
        $vm = str_contains($h, 'vimeo.com');
        if ($yt) {
            $hasWatch = isset($p['path']) && str_contains($p['path'], '/watch');
            $hasId = isset($p['query']) && preg_match('/(^|&)v=[^&]+/', $p['query']);
            $short = (str_contains($h, 'youtu.be') && isset($p['path']) && strlen(trim($p['path'], '/')) > 1);
            if (! ($hasWatch || $hasId || $short)) {
                return null;
            }
        }
        if ($vm) {
            if (! isset($p['path']) || ! preg_match('/\/\d{5,}/', $p['path'])) {
                return null;
            }
        }

        return $url;
    }

    private function explodeTokens(?string $blob): array
    {
        if (! $this->hasText($blob)) {
            return [];
        }
        $out = [];
        foreach (preg_split('/[|;,]/', strtolower($blob)) as $p) {
            $t = $this->token($p);
            if ($t !== '') {
                $out[] = $t;
            }
        }

        return array_values(array_unique($out));
    }

    private function buildTags(?string $tagsRaw, array $conditions, ?string $equipment): array
    {
        $tags = [];
        if ($this->hasText($tagsRaw)) {
            $tags = array_merge($tags, $this->explodeTokens($tagsRaw));
        }
        $tags = array_merge($tags, $conditions); // include conditions in tags as requested
        if ($this->hasText($equipment)) {
            $eq = strtolower($equipment);
            if (in_array($eq, ['bodyweight', 'no equipment', 'none'])) {
                $tags[] = 'bodyweight';
            }
            $tags[] = $this->token($eq);
        }

        return array_values(array_unique(array_filter($tags)));
    }

    private function token(string $s): string
    {
        $s = trim(strtolower($s));
        $s = str_replace(['-', ' '], '_', $s);
        $s = preg_replace('/[^a-z0-9_]/', '', $s);
        $s = preg_replace('/_+/', '_', $s);

        return trim($s, '_');
    }

    private function jsonToArray($json): array
    {
        if (! $json) {
            return [];
        }
        if (is_array($json)) {
            return $json;
        }
        $arr = json_decode((string) $json, true);

        return is_array($arr) ? $arr : [];
    }

    private function toJsonUnique(array $arr): ?string
    {
        $arr = array_values(array_unique(array_filter($arr)));

        return ! empty($arr) ? json_encode($arr) : null;
    }
}
