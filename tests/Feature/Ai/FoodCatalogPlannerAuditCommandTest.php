<?php

use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

it('writes planner warning counts into the catalog audit report', function () {
    $outDir = base_path('tmp/food-audit-command-test');
    File::deleteDirectory($outDir);

    Food::query()->create([
        'name' => 'Breakfast Protein Cup',
        'category' => 'Breakfast',
        'serving_size' => 1,
        'serving_unit' => 'serving',
        'calories' => 260,
        'protein_g' => 22,
        'carbs_g' => 18,
        'fat_g' => 9,
        'tags' => [],
        'allergens' => [],
        'diets_allowed' => [],
        'ingredients' => [],
    ]);

    $this->artisan('ai:audit-food-catalog', [
        '--apply' => 0,
        '--out-dir' => 'tmp/food-audit-command-test',
        '--limit' => 0,
    ])->assertExitCode(0);

    $reportPath = collect(File::files($outDir))
        ->map(fn (\SplFileInfo $file): string => $file->getPathname())
        ->first(fn (string $path): bool => str_ends_with($path, '.json'));

    expect($reportPath)->not->toBeNull();

    $report = json_decode((string) File::get($reportPath), true, 512, JSON_THROW_ON_ERROR);
    $row = collect($report['rows'] ?? [])->firstWhere('name', 'Breakfast Protein Cup');

    expect((int) data_get($report, 'summary.planner_warning_counts.meal_types_derived_from_category', 0))->toBeGreaterThan(0)
        ->and((int) data_get($report, 'summary.planner_warning_count', 0))->toBeGreaterThan(0)
        ->and($row)->not->toBeNull()
        ->and($row['planner_warnings'])->toContain('meal_types_derived_from_category');
});
