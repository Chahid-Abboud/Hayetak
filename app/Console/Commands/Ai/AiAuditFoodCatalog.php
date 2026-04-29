<?php

namespace App\Console\Commands\Ai;

use App\Models\Food;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\FoodCatalog\PlannerFoodModel;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiAuditFoodCatalog extends Command
{
    protected $signature = 'ai:audit-food-catalog
        {--apply=0 : Persist anomaly tags to flagged rows}
        {--out-dir=tmp : Output directory for the audit report}
        {--limit=20 : Number of flagged rows to preview in the console}';

    protected $description = 'Audit the food catalog for AI-blocked anomalies plus planner-quality warnings.';

    public function handle(FoodCatalogAnomalyService $anomalies, PlannerFoodModel $plannerFoodModel): int
    {
        $apply = ((int) $this->option('apply')) === 1;
        $limit = max(0, (int) $this->option('limit'));
        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $rows = [];
        $blockedCountsByReason = [];
        $plannerWarningCounts = [];
        $updatedCount = 0;
        $blockedCount = 0;
        $warningCount = 0;

        foreach (Food::query()->orderBy('name')->get() as $food) {
            $anomalyAudit = $anomalies->auditFood($food);
            $plannerAudit = $plannerFoodModel->inspectFood($food);

            $hasExistingBlockTags = (bool) ($anomalyAudit['has_block_tags'] ?? false);
            $plannerWarnings = is_array($plannerAudit['planner_warnings'] ?? null)
                ? $plannerAudit['planner_warnings']
                : [];

            if (! ($anomalyAudit['blocked'] ?? false) && ! $hasExistingBlockTags && $plannerWarnings === []) {
                continue;
            }

            $blockedReasons = is_array($anomalyAudit['reasons'] ?? null) ? $anomalyAudit['reasons'] : [];
            if ($blockedReasons !== [] || $hasExistingBlockTags) {
                $blockedCount++;
            }

            if ($plannerWarnings !== []) {
                $warningCount++;
            }

            foreach ($blockedReasons as $reason) {
                $blockedCountsByReason[$reason] = (int) ($blockedCountsByReason[$reason] ?? 0) + 1;
            }

            foreach ($plannerWarnings as $warning) {
                $plannerWarningCounts[$warning] = (int) ($plannerWarningCounts[$warning] ?? 0) + 1;
            }

            $row = [
                'food_id' => (int) $food->id,
                'name' => (string) $food->name,
                'category' => (string) ($food->category ?? ''),
                'calories' => $food->calories !== null ? (int) $food->calories : null,
                'protein_g' => $food->protein_g !== null ? (float) $food->protein_g : null,
                'fat_g' => $food->fat_g !== null ? (float) $food->fat_g : null,
                'tags_before' => $anomalyAudit['existing_tags'] ?? [],
                'blocked_reasons' => $blockedReasons,
                'planner_warnings' => $plannerWarnings,
                'planner_ready' => (bool) ($plannerAudit['planner_ready'] ?? false),
                'normalized_meal_types' => $plannerAudit['normalized_meal_types'] ?? [],
                'meal_type_source' => $plannerAudit['meal_type_source'] ?? 'explicit',
                'serving_size' => $plannerAudit['serving_size'] ?? null,
                'serving_unit' => $plannerAudit['serving_unit'] ?? null,
            ];

            if ($apply) {
                $applied = $anomalies->syncAiBlockTags($food);
                $row['tags_after'] = $applied['tags'] ?? [];
                $row['updated'] = (bool) ($applied['updated'] ?? false);
                $row['blocked_after'] = (bool) ($applied['blocked'] ?? false);
                if ($row['updated']) {
                    $updatedCount++;
                }
            }

            $rows[] = $row;
        }

        arsort($blockedCountsByReason);
        arsort($plannerWarningCounts);

        $stamp = CarbonImmutable::now('UTC')->format('Ymd_His');
        $jsonPath = $outDir.DIRECTORY_SEPARATOR."food_catalog_audit_{$stamp}.json";

        $payload = [
            'generated_at_utc' => CarbonImmutable::now('UTC')->toIso8601String(),
            'apply' => $apply,
            'summary' => [
                'flagged_count' => count($rows),
                'blocked_count' => $blockedCount,
                'planner_warning_count' => $warningCount,
                'updated_count' => $updatedCount,
                'blocked_reason_counts' => $blockedCountsByReason,
                'planner_warning_counts' => $plannerWarningCounts,
            ],
            'blocked_tags' => $anomalies->blockedAiTags(),
            'rows' => $rows,
        ];

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        $this->info('Flagged catalog rows: '.count($rows));
        $this->line('Blocked rows: '.$blockedCount);
        $this->line('Planner-warning rows: '.$warningCount);
        $this->line('Updated rows: '.$updatedCount);
        $this->line('Report JSON: '.$jsonPath);

        if ($limit > 0 && $rows !== []) {
            foreach (array_slice($rows, 0, $limit) as $row) {
                $this->line(sprintf(
                    '#%d %s [%s] blocked=%s warnings=%s',
                    (int) $row['food_id'],
                    (string) $row['name'],
                    (string) $row['category'],
                    implode(', ', (array) $row['blocked_reasons']),
                    implode(', ', (array) $row['planner_warnings'])
                ));
            }
        }

        return self::SUCCESS;
    }
}
