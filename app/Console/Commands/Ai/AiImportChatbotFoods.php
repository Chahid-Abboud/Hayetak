<?php

namespace App\Console\Commands\Ai;

use App\Models\Ai\AiConversation;
use App\Models\User;
use App\Services\Ai\Chat\ChatOrchestrator;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AiImportChatbotFoods extends Command
{
    protected $signature = 'ai:import-chatbot-foods
        {userId : User ID used to query the chatbot}
        {--per-type=25 : Number of new foods to request per meal type}
        {--batch=5 : How many foods to request per chatbot message}
        {--max-attempts=20 : Max attempts per meal type}
        {--provider= : Override chat provider for this command (self_hosted|http|stub)}
        {--screen-context=coach : Runtime chat screen context}
        {--include-last-7-days=1 : Include 7 day context (1/0)}
        {--dry-run : Do not write to DB}';

    protected $description = 'Query chatbot for food catalog JSON (with macros) and upsert into foods table.';

    private const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];

    public function handle(ChatOrchestrator $orchestrator): int
    {
        $user = User::query()->find((int) $this->argument('userId'));
        if (! $user) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $perType = max(1, min(300, (int) $this->option('per-type')));
        $batch = max(1, min(20, (int) $this->option('batch')));
        $maxAttempts = max(1, min(120, (int) $this->option('max-attempts')));
        $providerOverride = trim((string) $this->option('provider'));
        $screenContext = (string) $this->option('screen-context');
        $includeLast7Days = (bool) ((int) $this->option('include-last-7-days'));
        $dryRun = (bool) $this->option('dry-run');

        if ($providerOverride !== '') {
            config()->set('ai.chat.provider', $providerOverride);
        }

        $this->line('Chat provider: <info>'.(string) config('ai.chat.provider', 'unknown').'</info>');
        if ((string) config('ai.chat.provider') === 'stub') {
            $this->warn('Provider is stub: this is useful for flow checks, but usually will not yield parseable JSON catalog data.');
        }
        if ($dryRun) {
            $this->warn('Dry-run mode enabled: no DB writes.');
        }

        $summary = [];
        foreach (self::MEAL_TYPES as $mealType) {
            $summary[$mealType] = $this->seedMealType(
                $orchestrator,
                $user,
                $mealType,
                $perType,
                $batch,
                $maxAttempts,
                [
                    'screen_context' => $screenContext,
                    'include_last_7_days' => $includeLast7Days,
                ],
                $dryRun
            );
        }

        $this->newLine();
        $this->info('Summary:');
        foreach ($summary as $mealType => $stats) {
            $this->line(sprintf(
                '- foods/%s inserted=%d updated=%d skipped=%d',
                $mealType,
                $stats['inserted'],
                $stats['updated'],
                $stats['skipped'],
            ));
        }

        return self::SUCCESS;
    }

    private function seedMealType(
        ChatOrchestrator $orchestrator,
        User $user,
        string $mealType,
        int $targetAdds,
        int $batch,
        int $maxAttempts,
        array $runtimeContext,
        bool $dryRun
    ): array {
        $attempt = 0;
        $added = 0;
        $stats = ['inserted' => 0, 'updated' => 0, 'skipped' => 0];
        $conversation = AiConversation::query()->create([
            'user_id' => $user->id,
            'title' => "Catalog import {$mealType}",
            'last_message_at' => now(),
        ]);

        $this->newLine();
        $this->info("foods/{$mealType}: add {$targetAdds}");

        while ($added < $targetAdds && $attempt < $maxAttempts) {
            $attempt++;
            $need = $targetAdds - $added;
            $count = min($batch, $need);
            $question = $this->buildPrompt($mealType, $count);

            try {
                $result = $orchestrator->handle($user, $question, $runtimeContext, $conversation);
            } catch (\Throwable $e) {
                $this->warn("  attempt {$attempt}: chat error ({$e->getMessage()})");

                continue;
            }

            $answer = trim((string) data_get($result, 'assistant_message.content', ''));
            $payload = $this->decodeJsonFromText($answer);
            $items = $this->extractItems($payload ?? []);

            if ($items === []) {
                $stats['skipped'] += $count;
                $this->warn("  attempt {$attempt}: chatbot response not parseable JSON");

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

                $resultType = $dryRun ? $this->dryFood($normalized['name']) : $this->saveFood($normalized);
                $stats[$resultType]++;
                $added++;

                if ($added >= $targetAdds) {
                    break;
                }
            }

            $this->line("  attempt {$attempt}: imported {$added}/{$targetAdds}");
        }

        return $stats;
    }

    private function buildPrompt(string $mealType, int $count): string
    {
        return <<<PROMPT
Generate {$count} realistic {$mealType} food catalog entries for a fitness/nutrition app.
Return JSON only in this exact shape:
{"items":[
  {
    "name": "string",
    "category": "string",
    "cuisine": "string",
    "serving_size": number,
    "serving_unit": "g|ml|serving|piece|cup",
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "sodium_mg": number,
    "cholesterol_mg": number,
    "tags": ["string"],
    "allergens": ["string"],
    "diets_allowed": ["string"],
    "ingredients": ["string"],
    "meal_types": ["{$mealType}"]
  }
]}
Rules:
- Real known dish names only.
- meal_types must include "{$mealType}".
- Use lowercase in arrays.
- Keep arrays concise (max 6 items each).
PROMPT;
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

        foreach (['items', 'foods', 'data'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key]) && array_is_list($payload[$key])) {
                return $payload[$key];
            }
        }

        return [];
    }

    private function normalizeFood(array $row, string $mealType): ?array
    {
        $name = $this->clean($row['name'] ?? null);
        if (! $name) {
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
            'serving_size' => $this->num($row['serving_size'] ?? 1, 0.1, 1000),
            'serving_unit' => $this->clean($row['serving_unit'] ?? 'serving'),
            'calories' => (int) $this->num($row['calories'] ?? 120, 10, 3000),
            'protein_g' => $this->num($row['protein_g'] ?? 10, 0, 200),
            'carbs_g' => $this->num($row['carbs_g'] ?? 15, 0, 400),
            'fat_g' => $this->num($row['fat_g'] ?? 6, 0, 200),
            'fiber_g' => $this->num($row['fiber_g'] ?? 2, 0, 100),
            'sugar_g' => $this->num($row['sugar_g'] ?? 3, 0, 200),
            'sodium_mg' => (int) $this->num($row['sodium_mg'] ?? 180, 0, 6000),
            'cholesterol_mg' => (int) $this->num($row['cholesterol_mg'] ?? 25, 0, 2000),
            'tags' => json_encode($this->normalizeList($row['tags'] ?? []), JSON_UNESCAPED_SLASHES),
            'allergens' => json_encode($this->normalizeList($row['allergens'] ?? []), JSON_UNESCAPED_SLASHES),
            'diets_allowed' => json_encode($this->normalizeList($row['diets_allowed'] ?? []), JSON_UNESCAPED_SLASHES),
            'ingredients' => json_encode($this->normalizeList($row['ingredients'] ?? []), JSON_UNESCAPED_SLASHES),
            'meal_types' => '{'.implode(',', $mealTypes).'}',
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
        foreach ([
            'brand', 'nationality', 'cuisine', 'category',
            'serving_size', 'serving_unit',
            'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g',
            'sodium_mg', 'cholesterol_mg',
        ] as $field) {
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

    private function dryFood(string $name): string
    {
        return DB::table('foods')->where('name', $name)->exists() ? 'updated' : 'inserted';
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
