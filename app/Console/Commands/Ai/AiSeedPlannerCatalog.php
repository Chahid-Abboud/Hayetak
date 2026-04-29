<?php

namespace App\Console\Commands\Ai;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiSeedPlannerCatalog extends Command
{
    protected $signature = 'ai:seed-planner-catalog
        {--foods-per-type=150}
        {--home-exercises=100}
        {--gym-exercises=100}
        {--batch=20}
        {--max-attempts=12}
        {--model=}
        {--base-url=}
        {--temperature=0.2}
        {--timeout=120}
        {--connect-timeout=8}
        {--num-predict-food=650}
        {--num-predict-exercise=900}
        {--keep-alive=30m}
        {--retry-delay-ms=1200}
        {--dry-run}';

    protected $description = 'Generate realistic foods/exercises with local Ollama and upsert planner catalogs.';

    private const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];

    public function handle(): int
    {
        $foodsPerType = max(20, min(300, (int) $this->option('foods-per-type')));
        $homeTarget = max(20, min(250, (int) $this->option('home-exercises')));
        $gymTarget = max(20, min(250, (int) $this->option('gym-exercises')));
        $batch = max(5, min(40, (int) $this->option('batch')));
        $maxAttempts = max(1, min(40, (int) $this->option('max-attempts')));
        $temperature = (float) $this->option('temperature');
        $timeout = max(20, min(300, (int) $this->option('timeout')));
        $connectTimeout = max(2, min(20, (int) $this->option('connect-timeout')));
        $numPredictFood = max(200, min(1200, (int) $this->option('num-predict-food')));
        $numPredictExercise = max(250, min(1600, (int) $this->option('num-predict-exercise')));
        $keepAlive = trim((string) $this->option('keep-alive')) ?: '30m';
        $retryDelayMs = max(0, min(10000, (int) $this->option('retry-delay-ms')));
        $dryRun = (bool) $this->option('dry-run');
        $baseUrl = rtrim((string) ($this->option('base-url') ?: config('ai.planner.ollama.base_url', 'http://127.0.0.1:11434')), '/');
        $model = (string) ($this->option('model') ?: config('ai.planner.ollama.model', 'llama3.1:8b'));

        $this->line("Ollama: <info>{$baseUrl}</info>");
        $this->line("Model: <info>{$model}</info>");
        if ($dryRun) {
            $this->warn('Dry-run mode enabled: no DB writes.');
        }

        if (! $this->ensureOllamaReady($baseUrl, $model, $timeout, $connectTimeout)) {
            return self::FAILURE;
        }
        $this->warmupModel($baseUrl, $model, max($timeout, 180), $connectTimeout, $keepAlive);

        $summary = [];

        foreach (self::MEAL_TYPES as $mealType) {
            $summary["food_{$mealType}"] = $this->seedMealType(
                $mealType,
                $foodsPerType,
                $batch,
                $maxAttempts,
                $baseUrl,
                $model,
                $temperature,
                $timeout,
                $connectTimeout,
                $numPredictFood,
                $keepAlive,
                $retryDelayMs,
                $dryRun,
            );
        }

        $summary['exercise_home'] = $this->seedExercises(
            'home',
            $homeTarget,
            $batch,
            $maxAttempts,
            $baseUrl,
            $model,
            $temperature,
            $timeout,
            $connectTimeout,
            $numPredictExercise,
            $keepAlive,
            $retryDelayMs,
            $dryRun,
        );

        $summary['exercise_gym'] = $this->seedExercises(
            'gym',
            $gymTarget,
            $batch,
            $maxAttempts,
            $baseUrl,
            $model,
            $temperature,
            $timeout,
            $connectTimeout,
            $numPredictExercise,
            $keepAlive,
            $retryDelayMs,
            $dryRun,
        );

        $this->newLine();
        $this->info('Summary:');
        foreach ($summary as $bucket => $stats) {
            $this->line(sprintf(
                '- %s start=%d end=%d inserted=%d updated=%d skipped=%d',
                $bucket,
                $stats['start'],
                $stats['end'],
                $stats['inserted'],
                $stats['updated'],
                $stats['skipped']
            ));
        }

        return self::SUCCESS;
    }

    private function seedMealType(
        string $mealType,
        int $target,
        int $batch,
        int $maxAttempts,
        string $baseUrl,
        string $model,
        float $temperature,
        int $timeout,
        int $connectTimeout,
        int $numPredict,
        string $keepAlive,
        int $retryDelayMs,
        bool $dryRun
    ): array {
        $start = $this->mealTypeCount($mealType);
        $attempt = 0;
        $effectiveBatch = $batch;
        $stats = ['inserted' => 0, 'updated' => 0, 'skipped' => 0];

        $this->newLine();
        $this->info("foods/{$mealType}: {$start} -> {$target}");

        while ($this->mealTypeCount($mealType) < $target && $attempt < $maxAttempts) {
            $attempt++;
            $need = max(1, $target - $this->mealTypeCount($mealType));
            $count = min($effectiveBatch, $need);
            $prompt = $this->foodPrompt($mealType, $count, $this->existingFoodNames($mealType, 20));
            try {
                $items = $this->extractItems($this->ollamaJson(
                    $baseUrl,
                    $model,
                    $prompt,
                    $temperature,
                    $timeout,
                    $connectTimeout,
                    $numPredict,
                    $keepAlive,
                ));
            } catch (\Throwable $e) {
                $this->warn("  attempt {$attempt}: generation error ({$e->getMessage()})");
                if (str_contains(strtolower($e->getMessage()), 'timed out') && $effectiveBatch > 1) {
                    $effectiveBatch = max(1, (int) floor($effectiveBatch / 2));
                    $this->warn("  reducing batch to {$effectiveBatch} due to timeout");
                }
                if ($retryDelayMs > 0 && $attempt < $maxAttempts) {
                    usleep($retryDelayMs * 1000);
                }

                continue;
            }

            if ($items === []) {
                $this->warn("  attempt {$attempt}: no usable {$mealType} items");

                continue;
            }

            foreach ($items as $row) {
                if (! is_array($row)) {
                    $stats['skipped']++;

                    continue;
                }

                $normalized = $this->normalizeFood($row, $mealType);
                if ($normalized === null) {
                    $stats['skipped']++;

                    continue;
                }

                $result = $dryRun ? $this->dryFood($normalized['name']) : $this->saveFood($normalized);
                $stats[$result]++;
            }

            if ($dryRun) {
                break;
            }

            $this->line('  attempt '.$attempt.': now '.$this->mealTypeCount($mealType).'/'.$target);
        }

        return [
            'start' => $start,
            'end' => $this->mealTypeCount($mealType),
            ...$stats,
        ];
    }

    private function seedExercises(
        string $location,
        int $target,
        int $batch,
        int $maxAttempts,
        string $baseUrl,
        string $model,
        float $temperature,
        int $timeout,
        int $connectTimeout,
        int $numPredict,
        string $keepAlive,
        int $retryDelayMs,
        bool $dryRun
    ): array {
        $start = $this->exerciseLocationCount($location);
        $attempt = 0;
        $effectiveBatch = $batch;
        $stats = ['inserted' => 0, 'updated' => 0, 'skipped' => 0];

        $this->newLine();
        $this->info("exercises/{$location}: {$start} -> {$target}");

        while ($this->exerciseLocationCount($location) < $target && $attempt < $maxAttempts) {
            $attempt++;
            $need = max(1, $target - $this->exerciseLocationCount($location));
            $count = min($effectiveBatch, $need);
            $prompt = $this->exercisePrompt($location, $count, $this->existingExerciseNames($location, 25));
            try {
                $items = $this->extractItems($this->ollamaJson(
                    $baseUrl,
                    $model,
                    $prompt,
                    $temperature,
                    $timeout,
                    $connectTimeout,
                    $numPredict,
                    $keepAlive,
                ));
            } catch (\Throwable $e) {
                $this->warn("  attempt {$attempt}: generation error ({$e->getMessage()})");
                if (str_contains(strtolower($e->getMessage()), 'timed out') && $effectiveBatch > 1) {
                    $effectiveBatch = max(1, (int) floor($effectiveBatch / 2));
                    $this->warn("  reducing batch to {$effectiveBatch} due to timeout");
                }
                if ($retryDelayMs > 0 && $attempt < $maxAttempts) {
                    usleep($retryDelayMs * 1000);
                }

                continue;
            }

            if ($items === []) {
                $this->warn("  attempt {$attempt}: no usable {$location} exercises");

                continue;
            }

            foreach ($items as $row) {
                if (! is_array($row)) {
                    $stats['skipped']++;

                    continue;
                }

                $normalized = $this->normalizeExercise($row, $location);
                if ($normalized === null) {
                    $stats['skipped']++;

                    continue;
                }

                $result = $dryRun
                    ? $this->dryExercise($normalized['name'], $normalized['equipment'])
                    : $this->saveExercise($normalized);
                $stats[$result]++;
            }

            if ($dryRun) {
                break;
            }

            $this->line('  attempt '.$attempt.': now '.$this->exerciseLocationCount($location).'/'.$target);
        }

        return [
            'start' => $start,
            'end' => $this->exerciseLocationCount($location),
            ...$stats,
        ];
    }

    private function ensureOllamaReady(string $baseUrl, string $model, int $timeout, int $connectTimeout): bool
    {
        try {
            $json = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->connectTimeout($connectTimeout)
                ->timeout($timeout)
                ->get('/api/tags')
                ->throw()
                ->json();

            $models = collect((array) ($json['models'] ?? []))->pluck('name')->filter()->values()->all();
            if (! in_array($model, $models, true)) {
                $this->error("Model {$model} was not found in /api/tags.");

                return false;
            }
        } catch (\Throwable $e) {
            $this->error('Could not connect to Ollama: '.$e->getMessage());

            return false;
        }

        return true;
    }

    private function warmupModel(string $baseUrl, string $model, int $timeout, int $connectTimeout, string $keepAlive): void
    {
        try {
            Http::baseUrl($baseUrl)
                ->acceptJson()
                ->connectTimeout($connectTimeout)
                ->timeout($timeout)
                ->post('/api/generate', [
                    'model' => $model,
                    'prompt' => '{"items":[]}',
                    'format' => 'json',
                    'stream' => false,
                    'keep_alive' => $keepAlive,
                    'options' => [
                        'temperature' => 0.0,
                        'num_predict' => 32,
                        'num_ctx' => 2048,
                    ],
                ])
                ->throw();

            $this->line("Warm-up: model <info>{$model}</info> loaded.");
        } catch (\Throwable $e) {
            $this->warn('Warm-up skipped: '.$e->getMessage());
        }
    }

    private function ollamaJson(
        string $baseUrl,
        string $model,
        string $prompt,
        float $temperature,
        int $timeout,
        int $connectTimeout,
        int $numPredict,
        string $keepAlive
    ): array {
        $json = Http::baseUrl($baseUrl)
            ->acceptJson()
            ->connectTimeout($connectTimeout)
            ->timeout($timeout)
            ->post('/api/chat', [
                'model' => $model,
                'stream' => false,
                'format' => 'json',
                'keep_alive' => $keepAlive,
                'messages' => [
                    ['role' => 'system', 'content' => 'Return valid JSON only.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'options' => [
                    'temperature' => $temperature,
                    'num_predict' => $numPredict,
                    'num_ctx' => 2048,
                ],
            ])
            ->throw()
            ->json();

        $text = trim((string) data_get($json, 'message.content', ''));
        $decoded = $this->decodeJsonFromText($text);
        if (! is_array($decoded)) {
            throw new RuntimeException('Ollama did not return valid JSON.');
        }

        return $decoded;
    }

    private function decodeJsonFromText(string $text): ?array
    {
        if ($text === '') {
            return null;
        }

        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/```(?:json)?\s*(\{.*\}|\[.*\])\s*```/is', $text, $matches) === 1) {
            $decoded = json_decode(trim((string) ($matches[1] ?? '')), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $firstCurly = strpos($text, '{');
        $lastCurly = strrpos($text, '}');
        if ($firstCurly !== false && $lastCurly !== false && $lastCurly > $firstCurly) {
            $candidate = substr($text, $firstCurly, ($lastCurly - $firstCurly) + 1);
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $firstBracket = strpos($text, '[');
        $lastBracket = strrpos($text, ']');
        if ($firstBracket !== false && $lastBracket !== false && $lastBracket > $firstBracket) {
            $candidate = substr($text, $firstBracket, ($lastBracket - $firstBracket) + 1);
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    private function extractItems(array $payload): array
    {
        if (array_is_list($payload)) {
            return $payload;
        }

        foreach (['items', 'foods', 'exercises', 'data'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key]) && array_is_list($payload[$key])) {
                return $payload[$key];
            }
        }

        return [];
    }

    private function foodPrompt(string $mealType, int $count, array $existing): string
    {
        $avoid = $existing === [] ? 'none' : implode(', ', array_slice($existing, 0, 30));

        return <<<PROMPT
Generate {$count} realistic {$mealType} dish records for a fitness app.
Return JSON only with an "items" array. Each item must include:
name, category, cuisine, ingredients[], tags[], allergens[], diets_allowed[], meal_types[].
Rules:
- Use concrete meal names (no generic names like "Balanced meal" or "Healthy bowl").
- meal_types must include {$mealType}.
- Use lowercase for tags/allergens/diets_allowed/meal_types.
- Keep lists concise: tags<=4, allergens<=4, diets_allowed<=4, ingredients<=8.
- Avoid duplicates and avoid these names: {$avoid}
PROMPT;
    }

    private function exercisePrompt(string $location, int $count, array $existing): string
    {
        $avoid = $existing === [] ? 'none' : implode(', ', array_slice($existing, 0, 35));
        $locationRule = $location === 'home'
            ? 'home-friendly only, bodyweight/bands/dumbbells preferred'
            : 'gym-focused only, include standard gym equipment';

        return <<<PROMPT
Generate {$count} realistic {$location} exercises for a fitness app.
Return JSON only with an "items" array. Each item must include:
name, primary_muscle, equipment, difficulty, locations[], tags[], conditions[].
Rules:
- Use known exercise names only (no invented moves).
- {$locationRule}.
- locations must include {$location}.
- Use lowercase for enum-like values and arrays.
- Keep lists concise: secondary_muscles<=4, equipment_list<=5, cues<=4, common_mistakes<=4, tags<=5, conditions<=4.
- ai_summary should be <= 18 words.
- Avoid duplicates and avoid these names: {$avoid}
PROMPT;
    }

    private function normalizeFood(array $row, string $mealType): ?array
    {
        $name = $this->clean($row['name'] ?? null);
        if (! $name || str_contains(strtolower($name), 'balanced ') || str_contains(strtolower($name), 'generic')) {
            return null;
        }

        $mealTypes = $this->normalizeMealTypes($row['meal_types'] ?? [$mealType]);
        if (! in_array($mealType, $mealTypes, true)) {
            $mealTypes[] = $mealType;
        }

        return [
            'name' => $name,
            'brand' => $this->clean($row['brand'] ?? null),
            'nationality' => $this->clean($row['nationality'] ?? null),
            'cuisine' => $this->clean($row['cuisine'] ?? null),
            'category' => $this->clean($row['category'] ?? ucfirst($mealType)),
            'serving_size' => $this->num($row['serving_size'] ?? 1, 0.1, 500),
            'serving_unit' => $this->clean($row['serving_unit'] ?? 'serving'),
            'calories' => (int) $this->num($row['calories'] ?? 120, 30, 2000),
            'protein_g' => $this->num($row['protein_g'] ?? 10, 0, 150),
            'carbs_g' => $this->num($row['carbs_g'] ?? 15, 0, 250),
            'fat_g' => $this->num($row['fat_g'] ?? 6, 0, 120),
            'fiber_g' => $this->num($row['fiber_g'] ?? 2, 0, 60),
            'sugar_g' => $this->num($row['sugar_g'] ?? 3, 0, 120),
            'sodium_mg' => (int) $this->num($row['sodium_mg'] ?? 180, 0, 4000),
            'cholesterol_mg' => (int) $this->num($row['cholesterol_mg'] ?? 25, 0, 1200),
            'tags' => json_encode($this->normalizeList($row['tags'] ?? []), JSON_UNESCAPED_SLASHES),
            'allergens' => json_encode($this->normalizeList($row['allergens'] ?? []), JSON_UNESCAPED_SLASHES),
            'diets_allowed' => json_encode($this->normalizeList($row['diets_allowed'] ?? []), JSON_UNESCAPED_SLASHES),
            'ingredients' => json_encode($this->normalizeList($row['ingredients'] ?? []), JSON_UNESCAPED_SLASHES),
            'meal_types' => '{'.implode(',', $mealTypes).'}',
            'updated_at' => Carbon::now(),
            'created_at' => Carbon::now(),
        ];
    }

    private function normalizeExercise(array $row, string $location): ?array
    {
        $name = $this->clean($row['name'] ?? null);
        if (! $name || strtolower($name) === 'exercise' || str_contains(strtolower($name), 'generic')) {
            return null;
        }

        $difficulty = strtolower((string) ($row['difficulty'] ?? 'beginner'));
        if (! in_array($difficulty, ['beginner', 'intermediate', 'advanced'], true)) {
            $difficulty = 'beginner';
        }

        $locations = $this->normalizeLocations($row['locations'] ?? [$location]);
        if (! in_array($location, $locations, true)) {
            $locations[] = $location;
        }

        return [
            'name' => $name,
            'primary_muscle' => strtolower((string) ($row['primary_muscle'] ?? 'core')),
            'equipment' => $this->clean($row['equipment'] ?? ($location === 'home' ? 'Bodyweight' : 'Machine')),
            'difficulty' => $difficulty,
            'movement_pattern' => $this->clean($row['movement_pattern'] ?? null),
            'exercise_type' => $this->clean($row['exercise_type'] ?? null),
            'mechanic' => $this->clean($row['mechanic'] ?? null),
            'plane' => $this->clean($row['plane'] ?? null),
            'home_friendly' => $location === 'home' ? true : (bool) ($row['home_friendly'] ?? false),
            'locations' => json_encode($locations, JSON_UNESCAPED_SLASHES),
            'secondary_muscles' => json_encode($this->normalizeList($row['secondary_muscles'] ?? []), JSON_UNESCAPED_SLASHES),
            'equipment_list' => json_encode($this->normalizeList($row['equipment_list'] ?? []), JSON_UNESCAPED_SLASHES),
            'joint_stress' => json_encode(is_array($row['joint_stress'] ?? null) ? $row['joint_stress'] : [], JSON_UNESCAPED_SLASHES),
            'cues' => json_encode($this->normalizeList($row['cues'] ?? []), JSON_UNESCAPED_SLASHES),
            'common_mistakes' => json_encode($this->normalizeList($row['common_mistakes'] ?? []), JSON_UNESCAPED_SLASHES),
            'ai_summary' => $this->clean($row['ai_summary'] ?? null),
            'tags' => json_encode($this->normalizeList($row['tags'] ?? []), JSON_UNESCAPED_SLASHES),
            'conditions' => json_encode($this->normalizeList($row['conditions'] ?? []), JSON_UNESCAPED_SLASHES),
            'updated_at' => Carbon::now(),
            'created_at' => Carbon::now(),
        ];
    }

    private function saveFood(array $incoming): string
    {
        $existing = DB::table('foods')->where('name', $incoming['name'])->first();
        if (! $existing) {
            DB::table('foods')->insert($incoming);

            return 'inserted';
        }

        $update = $incoming;
        foreach (['brand', 'nationality', 'cuisine', 'category', 'serving_size', 'serving_unit', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'cholesterol_mg'] as $field) {
            $current = $existing->{$field} ?? null;
            if (($current !== null && $current !== '' && (! is_numeric($current) || (float) $current > 0))) {
                $update[$field] = $current;
            }
        }

        $update['tags'] = json_encode(array_values(array_unique(array_merge(
            $this->normalizeList($existing->tags ?? []),
            $this->normalizeList(json_decode((string) $incoming['tags'], true) ?? [])
        ))), JSON_UNESCAPED_SLASHES);

        $update['allergens'] = json_encode(array_values(array_unique(array_merge(
            $this->normalizeList($existing->allergens ?? []),
            $this->normalizeList(json_decode((string) $incoming['allergens'], true) ?? [])
        ))), JSON_UNESCAPED_SLASHES);

        $update['diets_allowed'] = json_encode(array_values(array_unique(array_merge(
            $this->normalizeList($existing->diets_allowed ?? []),
            $this->normalizeList(json_decode((string) $incoming['diets_allowed'], true) ?? [])
        ))), JSON_UNESCAPED_SLASHES);

        $update['ingredients'] = json_encode(array_values(array_unique(array_merge(
            $this->normalizeList($existing->ingredients ?? []),
            $this->normalizeList(json_decode((string) $incoming['ingredients'], true) ?? [])
        ))), JSON_UNESCAPED_SLASHES);

        $update['meal_types'] = '{'.implode(',', array_values(array_unique(array_merge(
            $this->parsePgArray((string) ($existing->meal_types ?? '{}')),
            $this->parsePgArray((string) $incoming['meal_types'])
        )))).'}';

        DB::table('foods')->where('name', $incoming['name'])->update($update);

        return 'updated';
    }

    private function saveExercise(array $incoming): string
    {
        $existing = DB::table('exercises')
            ->where('name', $incoming['name'])
            ->where('equipment', $incoming['equipment'])
            ->first();

        if (! $existing) {
            DB::table('exercises')->insert($incoming);

            return 'inserted';
        }

        $update = $incoming;
        foreach (['primary_muscle', 'difficulty', 'movement_pattern', 'exercise_type', 'mechanic', 'plane', 'ai_summary'] as $field) {
            $current = $existing->{$field} ?? null;
            if ($current !== null && $current !== '') {
                $update[$field] = $current;
            }
        }

        foreach (['tags', 'conditions', 'secondary_muscles', 'equipment_list', 'locations', 'cues', 'common_mistakes'] as $jsonField) {
            $update[$jsonField] = json_encode(array_values(array_unique(array_merge(
                $this->normalizeList($existing->{$jsonField} ?? []),
                $this->normalizeList(json_decode((string) $incoming[$jsonField], true) ?? [])
            ))), JSON_UNESCAPED_SLASHES);
        }

        $existingHome = $existing->home_friendly;
        if ($existingHome !== null) {
            $update['home_friendly'] = (bool) $existingHome;
        }

        DB::table('exercises')->where('id', $existing->id)->update($update);

        return 'updated';
    }

    private function dryFood(string $name): string
    {
        return DB::table('foods')->where('name', $name)->exists() ? 'updated' : 'inserted';
    }

    private function dryExercise(string $name, string $equipment): string
    {
        return DB::table('exercises')->where('name', $name)->where('equipment', $equipment)->exists()
            ? 'updated'
            : 'inserted';
    }

    private function mealTypeCount(string $mealType): int
    {
        return (int) DB::table('foods')->whereRaw('? = ANY(meal_types)', [$mealType])->count();
    }

    private function exerciseLocationCount(string $location): int
    {
        if ($location === 'home') {
            return (int) DB::table('exercises')
                ->where(function ($q) {
                    $q->where('home_friendly', true)->orWhereJsonContains('locations', 'home');
                })
                ->count();
        }

        return (int) DB::table('exercises')
            ->where(function ($q) {
                $q->whereJsonContains('locations', 'gym')->orWhere('home_friendly', false);
            })
            ->count();
    }

    private function existingFoodNames(string $mealType, int $limit): array
    {
        return DB::table('foods')
            ->whereRaw('? = ANY(meal_types)', [$mealType])
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->pluck('name')
            ->filter()
            ->map(fn ($n) => trim((string) $n))
            ->values()
            ->all();
    }

    private function existingExerciseNames(string $location, int $limit): array
    {
        $q = DB::table('exercises');
        if ($location === 'home') {
            $q->where(function ($qq) {
                $qq->where('home_friendly', true)->orWhereJsonContains('locations', 'home');
            });
        } else {
            $q->where(function ($qq) {
                $qq->whereJsonContains('locations', 'gym')->orWhere('home_friendly', false);
            });
        }

        return $q->orderByDesc('updated_at')->limit($limit)->pluck('name')->filter()->map(fn ($n) => trim((string) $n))->values()->all();
    }

    private function clean(mixed $value): ?string
    {
        $v = trim((string) $value);

        return $v !== '' ? $v : null;
    }

    private function num(mixed $value, float $min, float $max): float
    {
        $n = is_numeric($value) ? (float) $value : $min;

        return max($min, min($max, round($n, 2)));
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\r\n,;]+/', $value) ?: [];
            }
        }

        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $clean = strtolower(trim((string) $item));
            if ($clean !== '') {
                $items[] = $clean;
            }
        }

        return array_values(array_unique($items));
    }

    private function normalizeMealTypes(mixed $value): array
    {
        $out = [];
        foreach ($this->normalizeList($value) as $item) {
            if (str_contains($item, 'break')) {
                $out[] = 'breakfast';
            } elseif (str_contains($item, 'lunch')) {
                $out[] = 'lunch';
            } elseif (str_contains($item, 'dinner') || str_contains($item, 'supper')) {
                $out[] = 'dinner';
            } elseif (str_contains($item, 'snack')) {
                $out[] = 'snack';
            } elseif (str_contains($item, 'drink') || str_contains($item, 'beverage')) {
                $out[] = 'drink';
            }
        }

        return array_values(array_unique($out));
    }

    private function normalizeLocations(mixed $value): array
    {
        $out = [];
        foreach ($this->normalizeList($value) as $item) {
            if (str_contains($item, 'home')) {
                $out[] = 'home';
            } elseif (str_contains($item, 'gym')) {
                $out[] = 'gym';
            }
        }

        return array_values(array_unique($out));
    }

    private function parsePgArray(string $value): array
    {
        $value = trim($value);
        if (! str_starts_with($value, '{') || ! str_ends_with($value, '}')) {
            return $this->normalizeList($value);
        }

        $inner = trim($value, '{}');
        if ($inner === '') {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            fn ($p) => strtolower(trim((string) $p, "\" \t\n\r\0\x0B")),
            explode(',', $inner)
        ))));
    }
}
