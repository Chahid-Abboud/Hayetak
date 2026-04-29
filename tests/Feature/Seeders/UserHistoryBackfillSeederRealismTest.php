<?php

use App\Models\Food;
use App\Models\User;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use App\Services\Ai\Seed\SeedUserProfileTargetsService;
use Carbon\CarbonImmutable;
use Database\Seeders\UserHistoryBackfillSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

it('backdates seeded demo accounts and clamps seeded history to non-future dates', function () {
    $user = User::factory()->create([
        'email' => 'demo.reseed@hayetak.local',
        'role' => User::ROLE_CLIENT,
        'gender' => 'other',
        'created_at' => CarbonImmutable::parse('2026-04-21 12:00:00'),
        'updated_at' => CarbonImmutable::parse('2026-04-21 12:00:00'),
    ]);

    $seeder = new UserHistoryBackfillSeeder();

    $today = CarbonImmutable::parse('2026-04-22')->startOfDay();
    $mealFloor = CarbonImmutable::parse('2026-01-01')->startOfDay();

    foreach ([
        'today' => $today,
        'activityStartFloor' => $mealFloor,
        'activityEndCeiling' => $today,
        'measurementStartFloor' => $mealFloor,
        'measurementEndCeiling' => $today,
        'targets' => app(SeedUserProfileTargetsService::class),
    ] as $property => $value) {
        $ref = new ReflectionProperty($seeder, $property);
        $ref->setAccessible(true);
        $ref->setValue($seeder, $value);
    }

    $method = new ReflectionMethod($seeder, 'buildUserProfile');
    $method->setAccessible(true);

    /** @var array<string, mixed> $profile */
    $profile = $method->invoke($seeder, $user->fresh()->loadMissing(['dietaryRestrictions', 'medicalHistories', 'prefs']));
    $user->refresh();

    expect($user->gender)->toBeIn(['male', 'female']);
    expect(CarbonImmutable::parse((string) $user->created_at)->lessThanOrEqualTo($today->subDays(84)))->toBeTrue();
    expect($profile['meal_start']->greaterThanOrEqualTo(CarbonImmutable::parse((string) $user->created_at)->startOfDay()))->toBeTrue();
    expect($profile['meal_end']->greaterThan($today))->toBeFalse();
    expect($profile['measurement_start']->greaterThan($today))->toBeFalse();
    expect($profile['workout_start']->greaterThan($today))->toBeFalse();
});

it('keeps one seven-day historical follow-plan template per user', function () {
    $user = User::factory()->create([
        'email' => 'template.user@hayetak.local',
        'role' => User::ROLE_CLIENT,
    ]);

    $foods = collect([
        ['name' => 'Protein Oatmeal Bowl', 'category' => 'Breakfast'],
        ['name' => 'Charcoal Chicken Fattoush Plate', 'category' => 'Lunch'],
        ['name' => 'Protein Pudding Cup', 'category' => 'Snack'],
        ['name' => 'Tuna Dill Pickle Bowl', 'category' => 'Dinner'],
        ['name' => 'Chocolate Protein Shake', 'category' => 'Drink'],
    ])->map(fn (array $row) => Food::query()->create([
        'name' => $row['name'],
        'category' => $row['category'],
        'calories' => 260,
        'protein_g' => 24,
        'carbs_g' => 22,
        'fat_g' => 8,
        'diets_allowed' => ['general', 'mediterranean', 'high-protein'],
        'allergens' => [],
        'ingredients' => [],
    ]));

    $seeder = new UserHistoryBackfillSeeder();
    $today = CarbonImmutable::parse('2026-04-22')->startOfDay();
    $start = CarbonImmutable::parse('2026-03-01')->startOfDay();

    $foodsByName = $foods->keyBy(fn (Food $food): string => strtolower(trim($food->name)));

    foreach ([
        'today' => $today,
        'activityStartFloor' => $start,
        'activityEndCeiling' => $today,
        'measurementStartFloor' => $start,
        'measurementEndCeiling' => $today,
        'foodsByName' => $foodsByName,
        'foodCatalogAnomalies' => app(FoodCatalogAnomalyService::class),
    ] as $property => $value) {
        $ref = new ReflectionProperty($seeder, $property);
        $ref->setAccessible(true);
        $ref->setValue($seeder, $value);
    }

    $method = new ReflectionMethod($seeder, 'ensureHistoricalFollowPlan');
    $method->setAccessible(true);

    $profile = [
        'diet_key' => 'mediterranean',
        'goal_bucket' => 'maintain',
        'allergies' => [],
        'meal_start' => $start,
        'meal_end' => $today,
    ];

    $method->invoke($seeder, $user, $profile);
    $method->invoke($seeder, $user, $profile);

    $plan = \App\Models\NutritionPlan::query()
        ->where('user_id', $user->id)
        ->where('name', 'Historical Meal Follow Plan (Seeder)')
        ->firstOrFail();

    expect((int) $plan->duration_days)->toBe(7);
    expect(\App\Models\NutritionPlan::query()
        ->where('user_id', $user->id)
        ->where('name', 'Historical Meal Follow Plan (Seeder)')
        ->count())->toBe(1);
    expect(\App\Models\NutritionPlanDay::query()->where('nutrition_plan_id', $plan->id)->count())->toBe(7);
});

it('seeds water intake rows across the configured activity history window', function () {
    $user = User::factory()->create([
        'email' => 'water.history@hayetak.local',
        'role' => User::ROLE_CLIENT,
        'weight_kg' => 78,
        'height_cm' => 176,
        'age' => 31,
        'gender' => 'male',
        'activity_level' => 'moderately_active',
        'workout_days_per_week' => 3,
    ]);

    $seeder = new UserHistoryBackfillSeeder();
    $today = CarbonImmutable::parse('2026-04-22')->startOfDay();
    $start = CarbonImmutable::parse('2025-12-18')->startOfDay();
    $end = CarbonImmutable::parse('2026-05-18')->startOfDay();

    foreach ([
        'today' => $today,
        'activityStartFloor' => $start,
        'activityEndCeiling' => $end,
        'measurementStartFloor' => CarbonImmutable::parse('2026-01-01')->startOfDay(),
        'measurementEndCeiling' => $end,
        'measurementMinGapDays' => 4,
        'measurementMaxGapDays' => 7,
        'targets' => app(SeedUserProfileTargetsService::class),
    ] as $property => $value) {
        $ref = new ReflectionProperty($seeder, $property);
        $ref->setAccessible(true);
        $ref->setValue($seeder, $value);
    }

    $buildProfile = new ReflectionMethod($seeder, 'buildUserProfile');
    $buildProfile->setAccessible(true);
    $seedWaterHistory = new ReflectionMethod($seeder, 'seedWaterHistory');
    $seedWaterHistory->setAccessible(true);

    /** @var array<string, mixed> $profile */
    $profile = $buildProfile->invoke($seeder, $user->fresh()->loadMissing(['dietaryRestrictions', 'medicalHistories', 'prefs']));
    $profile['meal_start'] = $start;
    $profile['meal_end'] = $end;

    $seedWaterHistory->invoke($seeder, $user->fresh(), $profile);

    $rows = \Illuminate\Support\Facades\DB::table('water_intakes')
        ->where('user_id', $user->id)
        ->orderBy('for_day')
        ->get(['for_day', 'ml']);

    expect($rows)->not->toBeEmpty()
        ->and((string) $rows->first()->for_day)->toBe('2025-12-18')
        ->and((string) $rows->last()->for_day)->toBe('2026-05-18')
        ->and((int) $rows->count())->toBe((int) ($start->diffInDays($end) + 1))
        ->and((int) $rows->min('ml'))->toBeGreaterThanOrEqual(1000)
        ->and((int) $rows->max('ml'))->toBeLessThanOrEqual(4600);
});
