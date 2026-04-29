<?php

namespace App\Console\Commands\Ai;

use App\Models\Ai\AiRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiExportTrainingData extends Command
{
    protected $signature = 'ai:export-training-data
        {--out=storage/app/ai/training/train.jsonl : Output jsonl path}
        {--limit=0 : Limit rows (0 = no limit)}
        {--type=plan_generator : AiRequest type filter}
        {--status=completed : AiRequest status filter}
        {--with-workout=1 : Include workout_plan in target}
    ';

    protected $description = 'Export successful AI plan generations as (input_context -> output_json) JSONL for training';

    public function handle(): int
    {
        $out = base_path($this->option('out'));
        $limit = (int) $this->option('limit');
        $type = (string) $this->option('type');
        $status = (string) $this->option('status');
        $withWorkout = (int) $this->option('with-workout') === 1;

        File::ensureDirectoryExists(dirname($out));

        $q = AiRequest::query()
            ->where('type', $type)
            ->where('status', $status)
            ->whereNotNull('input_context_json')
            ->whereNotNull('output_json')
            ->orderBy('id', 'asc');

        if ($limit > 0) {
            $q->limit($limit);
        }

        $count = 0;
        $fh = fopen($out, 'w');

        $q->chunkById(500, function ($rows) use (&$count, $fh, $withWorkout) {
            foreach ($rows as $r) {
                // Ensure arrays (your model likely casts json columns to array already,
                // but handle strings safely too)
                $ctx = $r->input_context_json;
                if (is_string($ctx)) {
                    $ctx = json_decode($ctx, true);
                }

                $outJson = $r->output_json;
                if (is_string($outJson)) {
                    $outJson = json_decode($outJson, true);
                }

                if (! is_array($ctx) || ! is_array($outJson)) {
                    continue;
                }

                // We train ONLY the structured plan output
                $target = [
                    'overview' => $outJson['overview'] ?? null,
                    'safety' => $outJson['safety'] ?? null,
                    'diet' => $outJson['diet'] ?? null,
                    'adaptive_review' => $outJson['adaptive_review'] ?? null,
                    'ml_readiness' => $outJson['ml_readiness'] ?? null,
                ];
                if ($withWorkout) {
                    $target['workout'] = $outJson['workout'] ?? null;
                }

                if (! $target['diet']) {
                    continue;
                }

                // Make a stable instruction prompt (this is what the model learns)
                $example = [
                    'schema' => 'hayetak_plan_v2',
                    'instruction' => 'Generate a structured Hayetak plan JSON that contains overview, safety, diet, workout, adaptive_review, and ml_readiness.',
                    'input_context' => $ctx,
                    'target_json' => array_filter($target, fn ($value) => $value !== null),
                ];

                fwrite($fh, json_encode($example, JSON_UNESCAPED_UNICODE)."\n");
                $count++;
            }
        });

        fclose($fh);

        $this->info("✅ Exported {$count} examples to: {$out}");
        $this->line('Tip: start small: --limit=2000 then grow.');

        return self::SUCCESS;
    }
}
