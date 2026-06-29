<?php

use App\Jobs\Ai\RunPlannerAudit;
use App\Models\AiPlan;
use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\NutritionPlan;
use App\Models\PlannerAuditRun;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\WorkoutPlan;
use App\Services\Ai\PlannerService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);
});

it('allows unverified users to generate plans during onboarding', function () {
    $user = User::factory()->unverified()->create();

    $this->mock(PlannerService::class, function ($mock) {
        $mock->shouldReceive('generate')->once()->andReturn([
            'ok' => true,
            'ai_request_id' => 1,
            'generation_id' => 'onboarding-unverified',
            'version' => 1,
            'plan' => ['overview' => ['summary' => 'stub plan']],
            'plans' => ['diet' => [], 'workout' => []],
            'persisted' => ['persisted' => false],
            'provider' => 'ollama',
            'model' => 'llama3.1:8b',
            'prompt_version' => 'test',
            'schema_version' => 'test',
            'usage' => [
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
            ],
        ]);
    });

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'onboarding'])
        ->assertCreated()
        ->assertJsonPath('ok', true);
});

it('generates and persists a structured planner response through the ollama provider', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'age' => 29,
        'gender' => 'female',
        'height_cm' => 168,
        'weight_kg' => 72,
        'dietary_goal' => 'Calorie Deficit',
        'fitness_goal' => 'Lose Weight',
        'diet_name' => 'Mediterranean',
        'allergies' => ['Peanuts'],
        'workout_days_per_week' => 4,
        'workout_location' => 'home',
        'diet_failure_reasons' => ['Too restrictive'],
    ]);

    $user->prefs()->create([
        'settings' => [
            'injury_history' => ['shoulder pain'],
            'available_equipment' => ['Resistance Band', 'Bodyweight'],
        ],
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildPlannerPayload([
                    'allergies' => ['Peanuts'],
                    'equipment' => 'Resistance Band',
                ])),
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'feature_test_plan',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonMissingPath('provider')
        ->assertJsonMissingPath('model')
        ->assertJsonMissingPath('prompt_version')
        ->assertJsonMissingPath('schema_version')
        ->assertJsonMissingPath('usage')
        ->assertJsonMissingPath('fallback')
        ->assertJsonMissingPath('quality')
        ->assertJsonPath('plan.diet.daily_targets.calories_kcal', 1850)
        ->assertJsonPath('plan.workout.weekly_schedule.0.session_type', 'train');

    $aiRequest = AiRequest::query()->firstOrFail();
    expect($aiRequest->status)->toBe('completed')
        ->and($aiRequest->provider)->toBe('ollama')
        ->and($aiRequest->output_json)->toBeArray();

    expect(AiPlan::query()->where('user_id', $user->id)->count())->toBe(2);
    expect(NutritionPlan::query()->where('user_id', $user->id)->where('is_active', true)->exists())->toBeTrue();
    expect(WorkoutPlan::query()->where('user_id', $user->id)->where('is_active', true)->exists())->toBeTrue();
    expect(UserDietaryRestriction::query()->where('user_id', $user->id)->where('kind', 'allergy')->where('value', 'Peanuts')->exists())->toBeTrue();
    expect(UserMedicalHistory::query()->where('user_id', $user->id)->where('kind', 'injury')->where('value', 'shoulder pain')->exists())->toBeTrue();
});

it('sanitizes planner output that violates an allergy rule before persisting it', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Peanuts'],
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildPlannerPayload([
                    'meal_item_name' => 'Peanut Butter',
                    'allergies' => ['Peanuts'],
                ])),
            ],
            'prompt_eval_count' => 180,
            'eval_count' => 360,
        ], 200),
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'unsafe_test_plan',
        ])
        ->assertCreated()
        ->assertJsonPath('ok', true);

    $dietJson = json_encode($response->json('plan.diet') ?? [], JSON_UNESCAPED_SLASHES);
    expect(strtolower($dietJson ?: ''))->not->toContain('peanut');
    expect(AiRequest::query()->firstOrFail()->status)->toBe('completed');
    expect(AiPlan::query()->count())->toBe(2);
});

it('supports the ollama planner provider and can persist profile overrides into normalized tables', function () {
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 2,
        'workout_location' => 'gym',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildPlannerPayload([
                    'allergies' => ['Sesame'],
                    'equipment' => 'Dumbbell',
                    'session_focus' => 'Dumbbell Full Body',
                ])),
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'ollama_override_test',
            'persist_profile_overrides' => true,
            'profile' => [
                'diet_type' => 'High Protein',
                'allergies' => ['Sesame'],
                'injury_history' => ['knee pain'],
                'available_equipment' => ['Dumbbell'],
                'workout_location' => 'home',
                'workout_days_per_week' => 3,
                'medical_conditions' => ['asthma'],
            ],
        ]);

    $response
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonPath('plan.overview.summary', 'A practical weekly plan built around your goal, schedule, and safety boundaries.');

    $user->refresh();
    expect($user->diet_name)->toBe('High Protein')
        ->and($user->workout_location)->toBe('home')
        ->and($user->workout_days_per_week)->toBe(3)
        ->and($user->allergies)->toBe(['Sesame'])
        ->and($user->prefs?->settings['available_equipment'] ?? null)->toBe(['Dumbbell'])
        ->and($user->prefs?->settings['injury_history'] ?? null)->toBe(['knee pain']);

    expect(UserDietaryRestriction::query()->where('user_id', $user->id)->where('kind', 'diet_type')->where('value', 'High Protein')->exists())->toBeTrue();
    expect(UserDietaryRestriction::query()->where('user_id', $user->id)->where('kind', 'allergy')->where('value', 'Sesame')->exists())->toBeTrue();
    expect(UserMedicalHistory::query()->where('user_id', $user->id)->where('kind', 'injury')->where('value', 'knee pain')->exists())->toBeTrue();
    expect(UserMedicalHistory::query()->where('user_id', $user->id)->where('kind', 'medical_condition')->where('value', 'asthma')->exists())->toBeTrue();
});

it('expands compact ollama planner templates into full diet and workout week outputs', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildCompactPlannerPayload()),
            ],
            'prompt_eval_count' => 180,
            'eval_count' => 420,
        ], 200),
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'compact_templates_test'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);

    $plan = $response->json('plan');

    $response->assertJsonCount(14, 'plan.diet.days');
    $response->assertJsonCount(7, 'plan.workout.weekly_schedule');
    $response->assertJsonPath('plan.workout.weekly_schedule.0.day_label', 'Monday');
    expect(count($plan['diet']['meal_options']['breakfast'] ?? []))->toBeGreaterThanOrEqual(3)
        ->and(count($plan['diet']['meal_options']['breakfast'] ?? []))->toBeLessThanOrEqual(7)
        ->and(count($plan['diet']['meal_options']['lunch'] ?? []))->toBeGreaterThanOrEqual(3)
        ->and(count($plan['diet']['meal_options']['dinner'] ?? []))->toBeGreaterThanOrEqual(3)
        ->and(count($plan['diet']['meal_options']['snack'] ?? []))->toBeGreaterThanOrEqual(3);
});

it('persists the requested planner horizon on generated workout plans', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 4,
        'workout_location' => 'gym',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildPlannerPayload()),
            ],
            'prompt_eval_count' => 200,
            'eval_count' => 420,
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'workout_duration_persist_test',
            'plan_horizon_days' => 21,
        ])
        ->assertCreated();

    $workoutPlan = WorkoutPlan::query()
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->firstOrFail();

    expect($workoutPlan->duration_days)->toBe(21);
});

it('normalizes unrealistic meal calories and oversized serving text before returning the generated plan', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    $payload = buildPlannerPayload();
    $payload['diet']['days'][0]['meals'][0]['target_kcal'] = 340;
    $payload['diet']['days'][0]['meals'][0]['items'][0]['portion'] = '8 servings';
    $payload['diet']['days'][0]['meals'][0]['items'][0]['calories_kcal'] = 980;
    $payload['diet']['days'][0]['meals'][0]['items'][1]['portion'] = '6 servings';
    $payload['diet']['days'][0]['meals'][0]['items'][1]['calories_kcal'] = 760;

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode($payload),
            ],
            'prompt_eval_count' => 200,
            'eval_count' => 420,
        ], 200),
    ]);

    $plan = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'normalize_meal_guardrails'])
        ->assertCreated()
        ->json('plan');

    $breakfast = collect($plan['diet']['days'][0]['meals'] ?? [])
        ->firstWhere('meal_code', 'breakfast');

    expect($breakfast)->toBeArray();

    $target = (int) ($breakfast['target_kcal'] ?? 0);
    $items = collect($breakfast['items'] ?? []);
    $sumCalories = (int) $items->sum(fn (array $item): int => (int) ($item['calories_kcal'] ?? 0));
    $portions = $items
        ->map(fn (array $item): string => strtolower(trim((string) ($item['portion'] ?? ''))))
        ->values()
        ->all();

    expect($target)->toBeGreaterThan(0)
        ->and(abs($sumCalories - $target))->toBeLessThanOrEqual(2)
        ->and(collect($portions)->every(fn (string $portion): bool => ! str_contains($portion, '8 serving') && ! str_contains($portion, '6 serving')))->toBeTrue();
});

it('cleans breakfast and lunch meal mismatches, fixes portions and macros, and repairs workout structure during normalization', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    $payload = buildPlannerPayload();
    $payload['diet']['days'][0]['meals'][0]['items'][0]['name'] = 'Roasted chickpeas and fruit cup';
    $payload['diet']['days'][0]['meals'][] = [
        'meal_code' => 'lunch',
        'title' => 'Lunch',
        'target_kcal' => 560,
        'items' => [[
            'name' => 'Gandour Rice Pops',
            'portion' => '2 slices',
            'calories_kcal' => 560,
            'protein_g' => 2,
            'carbs_g' => 95,
            'fat_g' => 1,
        ]],
    ];
    $payload['workout']['weekly_schedule'][0]['exercises'][0]['name'] = 'Debug Chest Press';
    $payload['workout']['weekly_schedule'][0]['exercises'][0]['equipment'] = 'Machine';
    $payload['workout']['weekly_schedule'][0]['exercises'][1]['name'] = 'Shoulder Mobility Flow';
    $payload['workout']['weekly_schedule'][0]['day_label'] = 'Monday';
    $payload['workout']['weekly_schedule'][1]['day_label'] = 'Tuesday';
    $payload['workout']['weekly_schedule'][2]['day_label'] = 'Wednesday';

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode($payload),
            ],
            'prompt_eval_count' => 200,
            'eval_count' => 420,
        ], 200),
    ]);

    $plan = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'normalize_meal_and_exercise_quality'])
        ->assertCreated()
        ->json('plan');

    $breakfast = collect($plan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'breakfast');
    expect($breakfast)->toBeArray();

    $breakfastName = strtolower((string) ($breakfast['items'][0]['name'] ?? ''));
    expect($breakfastName)->not->toContain('roasted chickpea')
        ->and($breakfastName)->not->toContain('crackers')
        ->and($breakfastName)->not->toContain('rice cake');

    $lunch = collect($plan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'lunch');
    expect($lunch)->toBeArray();

    $lunchItem = $lunch['items'][0] ?? [];
    $lunchName = strtolower((string) ($lunchItem['name'] ?? ''));
    $lunchCalories = (int) ($lunchItem['calories_kcal'] ?? 0);
    $lunchMacroCalories = ((int) ($lunchItem['protein_g'] ?? 0) * 4)
        + ((int) ($lunchItem['carbs_g'] ?? 0) * 4)
        + ((int) ($lunchItem['fat_g'] ?? 0) * 9);

    expect($lunchName)->not->toContain('gandour')
        ->and($lunchName)->not->toContain('rice pops')
        ->and(strtolower((string) ($lunchItem['portion'] ?? '')))->not->toContain('slice')
        ->and($lunchMacroCalories)->toBeGreaterThan((int) round($lunchCalories * 0.60))
        ->and($lunchMacroCalories)->toBeLessThan((int) round($lunchCalories * 1.30));

    $firstExercise = $plan['workout']['weekly_schedule'][0]['exercises'][0] ?? [];
    expect(strtolower((string) ($firstExercise['name'] ?? '')))->not->toContain('debug')
        ->and(strtolower((string) ($firstExercise['equipment'] ?? '')))->not->toContain('machine');

    $trainExerciseNames = collect($plan['workout']['weekly_schedule'] ?? [])
        ->where('session_type', 'train')
        ->flatMap(fn (array $day) => collect($day['exercises'] ?? [])->pluck('name'))
        ->map(fn ($name): string => strtolower((string) $name));

    expect($trainExerciseNames->contains(fn (string $name): bool => str_contains($name, 'mobility') || str_contains($name, 'stretch')))->toBeFalse()
        ->and(($plan['workout']['weekly_schedule'][3]['day_label'] ?? null))->toBe('Thursday');
});

it('normalizes workout location both to gym and prefers gym equipment with compact templates', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 4,
        'workout_location' => 'both',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildCompactPlannerPayload()),
            ],
            'prompt_eval_count' => 180,
            'eval_count' => 420,
        ], 200),
    ]);

    $plan = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'compact_templates_both_location_test'])
        ->assertCreated()
        ->json('plan');

    $weekly = collect($plan['workout']['weekly_schedule'] ?? []);
    $trainingDays = $weekly->where('session_type', 'train')->values();

    expect($trainingDays->count())->toBeGreaterThanOrEqual(1);
    expect($trainingDays->every(fn (array $day): bool => ($day['location'] ?? null) === 'gym'))->toBeTrue();

    $equipmentUsed = $trainingDays
        ->flatMap(fn (array $day) => collect($day['exercises'] ?? [])->pluck('equipment'))
        ->filter()
        ->map(fn (string $equipment): string => strtolower($equipment))
        ->values();

    expect($equipmentUsed->contains(fn (string $equipment): bool => str_contains($equipment, 'machine') || str_contains($equipment, 'cable')))->toBeTrue();

    $breakfastNames = collect($plan['diet']['days'] ?? [])
        ->map(function (array $day): ?string {
            $breakfast = collect($day['meals'] ?? [])->firstWhere('meal_code', 'breakfast');
            if (! is_array($breakfast)) {
                return null;
            }

            return $breakfast['items'][0]['name'] ?? null;
        })
        ->filter()
        ->unique();

    expect($breakfastNames->count())->toBeGreaterThan(1);
});

it('enforces meal option caps, practical grocery items, and 5-exercise split training days in compact planner mode', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 4,
        'workout_location' => 'gym',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildCompactPlannerPayload()),
            ],
            'prompt_eval_count' => 180,
            'eval_count' => 420,
        ], 200),
    ]);

    $plan = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'compact_enforcement_test'])
        ->assertCreated()
        ->json('plan');

    $snackNames = collect($plan['diet']['meal_options']['snack'] ?? [])
        ->map(fn (array $meal): ?string => $meal['items'][0]['name'] ?? null)
        ->filter();

    expect($snackNames->count())->toBeGreaterThanOrEqual(3)
        ->and($snackNames->count())->toBeLessThanOrEqual(7)
        ->and($snackNames->unique()->count())->toBe($snackNames->count());

    $groceryList = collect($plan['diet']['grocery_list'] ?? []);
    expect($groceryList->count())->toBeGreaterThan(3)
        ->and($groceryList->contains(fn (array $item): bool => str_contains(strtolower((string) ($item['name'] ?? '')), 'chicken') || str_contains(strtolower((string) ($item['name'] ?? '')), 'rice') || str_contains(strtolower((string) ($item['name'] ?? '')), 'yogurt')))->toBeTrue()
        ->and($groceryList->every(fn (array $item): bool => (bool) preg_match('/kg| g|l|ml|pcs|serv/i', (string) ($item['quantity'] ?? ''))))->toBeTrue();

    $trainingDays = collect($plan['workout']['weekly_schedule'] ?? [])
        ->where('session_type', 'train')
        ->values();

    expect($trainingDays->count())->toBe(4)
        ->and($trainingDays->every(fn (array $day): bool => count($day['exercises'] ?? []) >= 5))->toBeTrue();

    $focuses = $trainingDays
        ->pluck('focus')
        ->map(fn (string $focus): string => strtolower($focus));

    expect($focuses->contains(fn (string $focus): bool => str_contains($focus, 'push') || str_contains($focus, 'upper')))->toBeTrue()
        ->and($focuses->contains(fn (string $focus): bool => str_contains($focus, 'pull') || str_contains($focus, 'back')))->toBeTrue()
        ->and($focuses->contains(fn (string $focus): bool => str_contains($focus, 'lower') || str_contains($focus, 'leg')))->toBeTrue();
});

it('accepts planner json from ollama even when the model wraps it in a json code fence', function () {
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => "```json\n".json_encode(buildPlannerPayload())."\n```",
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'ollama_code_fence_json'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);
});

it('accepts planner json from ollama even when extra text surrounds the object', function () {
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => "Here is your plan JSON:\n".json_encode(buildPlannerPayload())."\nUse it directly.",
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'ollama_wrapped_json'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonPath('plan.overview.summary', 'A practical weekly plan built around your goal, schedule, and safety boundaries.');
});

it('retries the ollama planner once with a larger budget when the first reply is not valid json', function () {
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');
    config()->set('ai.planner.ollama.max_output_tokens', 2200);

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::sequence()
            ->push([
                'model' => 'llama3.1:8b',
                'message' => [
                    'content' => '{"overview":{"summary":"truncated"',
                ],
                'prompt_eval_count' => 220,
                'eval_count' => 2200,
            ], 200)
            ->push([
                'model' => 'llama3.1:8b',
                'message' => [
                    'content' => json_encode(buildPlannerPayload()),
                ],
                'prompt_eval_count' => 240,
                'eval_count' => 900,
            ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'ollama_retry_for_json'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonPath('plan.workout.weekly_schedule.0.session_type', 'train');
});

it('falls back to the local deterministic planner when ollama fails', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Peanuts'],
        'workout_days_per_week' => 4,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response(['error' => 'upstream failed'], 500),
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'local_fallback_test'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->assertJsonMissingPath('fallback')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);

    $plan = $response->json('plan');
    $dietJson = json_encode($response->json('plan.diet') ?? [], JSON_UNESCAPED_SLASHES);
    expect(strtolower($dietJson ?: ''))->not->toContain('peanut');

    $snackPortions = collect($plan['diet']['days'] ?? [])
        ->map(function (array $day): ?string {
            $snack = collect($day['meals'] ?? [])->firstWhere('meal_code', 'snack');
            if (! is_array($snack)) {
                return null;
            }

            return strtolower(trim((string) ($snack['items'][0]['portion'] ?? '')));
        })
        ->filter();

    expect($snackPortions->count())->toBe(14)
        ->and($snackPortions->every(fn (string $portion): bool => (bool) preg_match('/serving|g|ml|piece|pcs|slice|wrap|sandwich|bowl/', $portion)))->toBeTrue();

    $activeNutritionPlan = NutritionPlan::query()
        ->with('days.meals.items')
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->first();

    $persistedSnackItemCount = $activeNutritionPlan?->days
        ?->flatMap(fn ($day) => $day->meals)
        ?->filter(fn ($meal) => $meal->meal_type === 'snack')
        ?->sum(fn ($meal) => $meal->items->count()) ?? 0;

    expect($persistedSnackItemCount)->toBeGreaterThan(0);

    $aiRequest = AiRequest::query()->latest('id')->firstOrFail();
    expect($aiRequest->status)->toBe('completed')
        ->and($aiRequest->provider)->toBe('local_fallback');
});

it('builds a gym-focused varied plan in local fallback mode', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'workout_days_per_week' => 5,
        'workout_location' => 'gym',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response(['error' => 'upstream failed'], 500),
    ]);

    $plan = $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'local_fallback_gym_variety_test'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->json('plan');

    $trainingDays = collect($plan['workout']['weekly_schedule'] ?? [])
        ->where('session_type', 'train')
        ->values();

    expect($trainingDays->count())->toBeGreaterThanOrEqual(1);
    expect($trainingDays->every(fn (array $day): bool => ($day['location'] ?? null) === 'gym'))->toBeTrue();
    expect($trainingDays->every(fn (array $day): bool => count($day['exercises'] ?? []) >= 5))->toBeTrue();

    $equipmentUsed = $trainingDays
        ->flatMap(fn (array $day) => collect($day['exercises'] ?? [])->pluck('equipment'))
        ->filter()
        ->map(fn (string $equipment): string => strtolower($equipment))
        ->values();

    expect($equipmentUsed->contains(fn (string $equipment): bool => str_contains($equipment, 'machine') || str_contains($equipment, 'cable')))->toBeTrue();
    expect($trainingDays->pluck('focus')->filter()->unique()->count())->toBeGreaterThan(2);

    $breakfastNames = collect($plan['diet']['days'] ?? [])
        ->map(function (array $day): ?string {
            $breakfast = collect($day['meals'] ?? [])->firstWhere('meal_code', 'breakfast');
            if (! is_array($breakfast)) {
                return null;
            }

            return $breakfast['items'][0]['name'] ?? null;
        })
        ->filter()
        ->unique();

    expect($breakfastNames->count())->toBeGreaterThan(1);

    $snackNames = collect($plan['diet']['meal_options']['snack'] ?? [])
        ->map(fn (array $meal): ?string => $meal['items'][0]['name'] ?? null)
        ->filter();

    expect($snackNames->count())->toBeGreaterThanOrEqual(3)
        ->and($snackNames->count())->toBeLessThanOrEqual(7)
        ->and($snackNames->unique()->count())->toBe($snackNames->count());

    $groceryList = collect($plan['diet']['grocery_list'] ?? []);
    expect($groceryList->count())->toBeGreaterThan(3)
        ->and($groceryList->every(fn (array $item): bool => trim((string) ($item['name'] ?? '')) !== '' && trim((string) ($item['quantity'] ?? '')) !== ''))->toBeTrue();
});

it('produces distinct local fallback plans for different users instead of copy-paste outputs', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $firstUser = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'workout_days_per_week' => 4,
        'workout_location' => 'home',
        'allergies' => ['Peanuts'],
    ]);
    $secondUser = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'workout_days_per_week' => 4,
        'workout_location' => 'home',
        'allergies' => ['Peanuts'],
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response(['error' => 'upstream failed'], 500),
    ]);

    $firstPlan = $this->actingAs($firstUser)
        ->postJson('/api/ai/plan', ['reason' => 'local_fallback_user_a'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->json('plan');

    $secondPlan = $this->actingAs($secondUser)
        ->postJson('/api/ai/plan', ['reason' => 'local_fallback_user_b'])
        ->assertCreated()
        ->assertJsonMissingPath('provider')
        ->json('plan');

    $firstSignature = json_encode([
        'breakfast_day_1' => collect($firstPlan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'breakfast')['items'][0]['name'] ?? null,
        'snack_day_1' => collect($firstPlan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'snack')['items'][0]['name'] ?? null,
        'workout_day_1' => collect($firstPlan['workout']['weekly_schedule'][0]['exercises'] ?? [])->pluck('name')->take(3)->values()->all(),
    ], JSON_UNESCAPED_SLASHES);

    $secondSignature = json_encode([
        'breakfast_day_1' => collect($secondPlan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'breakfast')['items'][0]['name'] ?? null,
        'snack_day_1' => collect($secondPlan['diet']['days'][0]['meals'] ?? [])->firstWhere('meal_code', 'snack')['items'][0]['name'] ?? null,
        'workout_day_1' => collect($secondPlan['workout']['weekly_schedule'][0]['exercises'] ?? [])->pluck('name')->take(3)->values()->all(),
    ], JSON_UNESCAPED_SLASHES);

    expect($firstSignature)->not->toBe($secondSignature);
});

it('returns planner health status including provider checks', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    $user = User::factory()->create();

    Http::fake([
        'http://127.0.0.1:11434/api/tags' => Http::response([
            'models' => [
                ['name' => 'llama3.1:8b'],
            ],
        ], 200),
    ]);

    $this->actingAs($user)
        ->getJson('/api/ai/plan/health')
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('health.primary_provider', 'ollama')
        ->assertJsonPath('health.checks.ollama.reachable', true)
        ->assertJsonPath('health.checks.ollama_only.enabled', true)
        ->assertJsonPath('health.checks.local_fallback.enabled', true);
});

it('flags planner health as not ready when the configured ollama model is missing and local fallback is disabled', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.local_fallback.enabled', false);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    $user = User::factory()->create();

    Http::fake([
        'http://127.0.0.1:11434/api/tags' => Http::response([
            'models' => [
                ['name' => 'mistral:7b'],
            ],
        ], 200),
    ]);

    $this->actingAs($user)
        ->getJson('/api/ai/plan/health')
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('health.ready', false)
        ->assertJsonPath('health.primary_provider', 'ollama')
        ->assertJsonPath('health.checks.ollama.reachable', true)
        ->assertJsonPath('health.checks.ollama.model_loaded', false)
        ->assertJsonPath('health.checks.local_fallback.enabled', false)
        ->assertJsonPath('health.recommendation', 'Planner is locked to Ollama-only mode. Start Ollama and ensure the planner model is pulled.');
});

it('keeps the existing workout active when only the diet section is regenerated', function () {
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode(buildPlannerPayload([
                    'session_focus' => 'Upper Body Strength',
                ])),
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'seed_full_plan',
        ])
        ->assertCreated();

    $originalWorkoutPlan = WorkoutPlan::query()
        ->with('days')
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->firstOrFail();
    $originalNutritionPlan = NutritionPlan::query()
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->firstOrFail();
    $originalWorkoutFocus = $originalWorkoutPlan->days
        ->sortBy('day_index')
        ->first()?->name;

    $dietOnlyPayload = buildPlannerPayload([
        'session_focus' => 'Should not replace workout',
    ]);
    $dietOnlyPayload['diet']['daily_targets']['calories_kcal'] = 2100;

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response([
            'model' => 'llama3.1:8b',
            'message' => [
                'content' => json_encode($dietOnlyPayload),
            ],
            'prompt_eval_count' => 220,
            'eval_count' => 480,
        ], 200),
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'diet_only_refresh',
            'generate_diet' => true,
            'generate_workout' => false,
        ])
        ->assertCreated()
        ->assertJsonPath('plan.workout.weekly_schedule.0.focus', $originalWorkoutFocus);

    $currentNutritionPlan = NutritionPlan::query()
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->firstOrFail();
    $currentWorkoutPlan = WorkoutPlan::query()
        ->with('days')
        ->where('user_id', $user->id)
        ->where('is_active', true)
        ->latest('id')
        ->firstOrFail();

    expect($currentNutritionPlan->id)->not->toBe($originalNutritionPlan->id)
        ->and($currentWorkoutPlan->id)->toBe($originalWorkoutPlan->id)
        ->and($currentWorkoutPlan->days->sortBy('day_index')->first()?->name)->toBe($originalWorkoutFocus)
        ->and(AiPlan::query()->where('user_id', $user->id)->where('type', 'diet')->count())->toBe(2)
        ->and(AiPlan::query()->where('user_id', $user->id)->where('type', 'workout')->count())->toBe(1)
        ->and($response->json('plans.workout.weekly_schedule.0.focus'))->toBe($originalWorkoutFocus);
});

it('queues an admin planner audit with gpu load controls for all non-admin users', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->postJson('/api/ai/planner-audits', [
            'gpu_load' => 'low',
            'execution_mode' => 'live',
            'horizons' => [14, 21, 28],
        ])
        ->assertStatus(202)
        ->assertJsonPath('ok', true)
        ->assertJsonPath('audit.gpu_load', 'low')
        ->assertJsonPath('audit.execution_mode', 'live')
        ->assertJsonPath('audit.horizon_days.0', 14)
        ->assertJsonPath('audit.horizon_days.1', 21)
        ->assertJsonPath('audit.horizon_days.2', 28);

    $run = PlannerAuditRun::query()->latest('id')->firstOrFail();

    expect($run->status)->toBe('queued')
        ->and($run->gpu_load)->toBe('low')
        ->and(data_get($run->summary_json, 'execution_mode'))->toBe('live')
        ->and($run->requested_by)->toBe($admin->id);

    Queue::assertPushed(RunPlannerAudit::class, function (RunPlannerAudit $job) use ($run): bool {
        return $job->auditRunId === $run->id;
    });
});

it('defaults planner audits to low load and normalizes legacy mid rows to medium in responses', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->postJson('/api/ai/planner-audits', [
            'horizons' => [14],
        ])
        ->assertStatus(202)
        ->assertJsonPath('audit.gpu_load', 'low')
        ->assertJsonPath('audit.execution_mode', 'standard');

    $legacyRun = PlannerAuditRun::query()->create([
        'requested_by' => $admin->id,
        'status' => 'completed',
        'gpu_load' => 'mid',
        'horizon_days' => [14, 21, 28],
        'total_users' => 3,
        'total_runs' => 9,
        'completed_runs' => 9,
        'success_runs' => 9,
        'failed_runs' => 0,
    ]);

    $this->actingAs($admin)
        ->getJson('/api/ai/planner-audits/'.$legacyRun->id)
        ->assertOk()
        ->assertJsonPath('audit.gpu_load', 'medium')
        ->assertJsonPath('audit.execution_mode', 'standard');
});

it('updates the gpu load for a running planner audit', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $run = PlannerAuditRun::query()->create([
        'requested_by' => $admin->id,
        'status' => 'running',
        'gpu_load' => 'low',
        'horizon_days' => [14, 21, 28],
        'total_users' => 12,
        'total_runs' => 36,
        'completed_runs' => 6,
        'success_runs' => 6,
        'failed_runs' => 0,
        'summary_json' => [
            'execution_mode' => 'fast-fallback',
        ],
    ]);

    $this->actingAs($admin)
        ->patchJson('/api/ai/planner-audits/'.$run->id, [
            'gpu_load' => 'high',
        ])
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('audit.id', $run->id)
        ->assertJsonPath('audit.gpu_load', 'high');

    $run->refresh();

    expect($run->gpu_load)->toBe('high')
        ->and(data_get($run->summary_json, 'gpu_load_changes.0.from'))->toBe('low')
        ->and(data_get($run->summary_json, 'gpu_load_changes.0.to'))->toBe('high');
});

it('rejects gpu load updates for finished planner audits', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $run = PlannerAuditRun::query()->create([
        'requested_by' => $admin->id,
        'status' => 'completed',
        'gpu_load' => 'medium',
        'horizon_days' => [14, 21, 28],
        'total_users' => 12,
        'total_runs' => 36,
        'completed_runs' => 36,
        'success_runs' => 36,
        'failed_runs' => 0,
        'summary_json' => [
            'execution_mode' => 'standard',
        ],
    ]);

    $this->actingAs($admin)
        ->patchJson('/api/ai/planner-audits/'.$run->id, [
            'gpu_load' => 'high',
        ])
        ->assertStatus(422)
        ->assertJsonPath('ok', false)
        ->assertJsonPath('audit.gpu_load', 'medium');
});

function createPlannerCatalog(): void
{
    foreach ([
        ['name' => 'Greek Yogurt', 'calories' => 120, 'protein_g' => 17, 'carbs_g' => 6, 'fat_g' => 4],
        ['name' => 'Chicken Breast', 'calories' => 165, 'protein_g' => 31, 'carbs_g' => 0, 'fat_g' => 4],
        ['name' => 'Rice', 'calories' => 130, 'protein_g' => 3, 'carbs_g' => 28, 'fat_g' => 0],
        ['name' => 'Apple', 'calories' => 95, 'protein_g' => 0, 'carbs_g' => 25, 'fat_g' => 0],
    ] as $food) {
        Food::query()->create($food);
    }

    foreach ([
        ['name' => 'Bodyweight Squat', 'primary_muscle' => 'Legs', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
        ['name' => 'Resistance Band Row', 'primary_muscle' => 'Back', 'equipment' => 'Resistance Band', 'difficulty' => 'Beginner', 'home_friendly' => true],
        ['name' => 'Dumbbell Romanian Deadlift', 'primary_muscle' => 'Hamstrings', 'equipment' => 'Dumbbell', 'difficulty' => 'Intermediate', 'home_friendly' => true],
        ['name' => 'Incline Push Up', 'primary_muscle' => 'Chest', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
        ['name' => 'Plank', 'primary_muscle' => 'Core', 'equipment' => 'Bodyweight', 'difficulty' => 'Beginner', 'home_friendly' => true],
        ['name' => 'Leg Press', 'primary_muscle' => 'Legs', 'equipment' => 'Machine', 'difficulty' => 'Beginner', 'home_friendly' => false],
        ['name' => 'Seated Cable Row', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner', 'home_friendly' => false],
        ['name' => 'Machine Chest Press', 'primary_muscle' => 'Chest', 'equipment' => 'Machine', 'difficulty' => 'Beginner', 'home_friendly' => false],
        ['name' => 'Lat Pulldown', 'primary_muscle' => 'Back', 'equipment' => 'Cable machine', 'difficulty' => 'Beginner', 'home_friendly' => false],
    ] as $exercise) {
        Exercise::query()->create($exercise);
    }
}

function buildPlannerPayload(array $overrides = []): array
{
    $mealItemName = $overrides['meal_item_name'] ?? 'Greek Yogurt';
    $equipment = $overrides['equipment'] ?? 'Resistance Band';
    $sessionFocus = $overrides['session_focus'] ?? 'Lower Body Strength';
    $pullExerciseName = $equipment === 'Dumbbell' ? 'Incline Push Up' : 'Resistance Band Row';
    $pullExerciseEquipment = $equipment === 'Dumbbell' ? 'Bodyweight' : 'Resistance Band';

    return [
        'overview' => [
            'summary' => 'A practical weekly plan built around your goal, schedule, and safety boundaries.',
            'key_constraints' => array_values($overrides['allergies'] ?? ['No shellfish']),
            'assumptions' => ['Recovery and sleep are average this week.', 'Meal prep time is moderate.'],
        ],
        'safety' => [
            'hard_rules_observed' => ['Allergies avoided', 'Workout respects injuries and equipment'],
            'food_avoidances' => array_values($overrides['allergies'] ?? ['Shellfish']),
            'exercise_cautions' => ['Avoid painful overhead pressing.'],
        ],
        'diet' => [
            'daily_targets' => [
                'calories_kcal' => 1850,
                'protein_g' => 140,
                'carbs_g' => 180,
                'fat_g' => 60,
                'fiber_g' => 28,
                'water_ml' => 2400,
            ],
            'days' => collect(range(1, 7))->map(fn (int $dayIndex) => [
                'day_index' => $dayIndex,
                'theme' => 'Balanced high-protein day',
                'meals' => [
                    [
                        'meal_code' => 'breakfast',
                        'title' => 'Protein breakfast bowl',
                        'target_kcal' => 420,
                        'items' => [
                            [
                                'name' => $mealItemName,
                                'portion' => '1 serving',
                                'calories_kcal' => 120,
                                'protein_g' => 17,
                                'carbs_g' => 6,
                                'fat_g' => 4,
                                'recipe_note' => 'Serve with fruit and cinnamon.',
                                'search_terms' => ['greek yogurt', 'high protein breakfast'],
                                'alternatives' => ['Cottage cheese cup'],
                            ],
                            [
                                'name' => 'Apple',
                                'portion' => '1 serving',
                                'calories_kcal' => 95,
                                'protein_g' => 0,
                                'carbs_g' => 25,
                                'fat_g' => 0,
                                'recipe_note' => 'Fresh fruit on the side.',
                                'search_terms' => ['apple snack'],
                                'alternatives' => ['Pear'],
                            ],
                        ],
                    ],
                    [
                        'meal_code' => 'dinner',
                        'title' => 'Simple protein dinner',
                        'target_kcal' => 580,
                        'items' => [
                            [
                                'name' => 'Chicken Breast',
                                'portion' => '150 g',
                                'calories_kcal' => 250,
                                'protein_g' => 40,
                                'carbs_g' => 0,
                                'fat_g' => 6,
                                'recipe_note' => 'Pan-sear with lemon and herbs.',
                                'search_terms' => ['chicken breast dinner'],
                                'alternatives' => ['Turkey breast'],
                            ],
                            [
                                'name' => 'Rice',
                                'portion' => '150 g',
                                'calories_kcal' => 195,
                                'protein_g' => 4,
                                'carbs_g' => 42,
                                'fat_g' => 1,
                                'recipe_note' => 'Pair with vegetables.',
                                'search_terms' => ['rice side dish'],
                                'alternatives' => ['Potato'],
                            ],
                        ],
                    ],
                ],
                'coaching_notes' => ['Keep meal timing consistent.', 'Stay hydrated.'],
            ])->all(),
            'grocery_list' => [
                ['category' => 'Protein', 'name' => 'Chicken Breast', 'quantity' => '1.5 kg'],
                ['category' => 'Dairy', 'name' => 'Greek Yogurt', 'quantity' => '7 servings'],
                ['category' => 'Carbs', 'name' => 'Rice', 'quantity' => '1 kg'],
            ],
            'meal_prep_notes' => ['Cook proteins in batches twice this week.'],
            'adherence_notes' => ['Keep two backup meals ready for busy days.'],
        ],
        'workout' => [
            'weekly_schedule' => [
                [
                    'day_index' => 1,
                    'day_label' => 'Monday',
                    'session_type' => 'train',
                    'focus' => $sessionFocus,
                    'location' => 'home',
                    'duration_min' => 45,
                    'warmup' => ['5 minutes walking', 'Shoulder-friendly band prep'],
                    'exercises' => [
                        [
                            'name' => $equipment === 'Dumbbell' ? 'Dumbbell Romanian Deadlift' : 'Bodyweight Squat',
                            'sets' => 3,
                            'reps' => '8-10',
                            'rest_sec' => 75,
                            'rpe' => 7.0,
                            'equipment' => $equipment,
                            'movement_notes' => 'Move with control and stop before pain.',
                            'safer_alternative' => 'Glute bridge',
                        ],
                        [
                            'name' => $equipment === 'Dumbbell' ? 'Incline Push Up' : 'Resistance Band Row',
                            'sets' => 3,
                            'reps' => '10-12',
                            'rest_sec' => 60,
                            'rpe' => 7.0,
                            'equipment' => $pullExerciseEquipment,
                            'movement_notes' => 'Keep shoulders down and ribs stacked.',
                            'safer_alternative' => 'Wall push up',
                        ],
                    ],
                    'cooldown' => ['Breathing reset', 'Hamstring stretch'],
                    'safety_notes' => ['Skip any movement that causes joint pain.'],
                ],
                [
                    'day_index' => 2,
                    'day_label' => 'Tuesday',
                    'session_type' => 'recovery',
                    'focus' => 'Active Recovery',
                    'location' => 'home',
                    'duration_min' => 25,
                    'warmup' => ['Easy mobility'],
                    'exercises' => [],
                    'cooldown' => ['Walk 10 minutes'],
                    'safety_notes' => ['Keep intensity light.'],
                ],
                [
                    'day_index' => 3,
                    'day_label' => 'Wednesday',
                    'session_type' => 'train',
                    'focus' => 'Upper Body and Core',
                    'location' => 'home',
                    'duration_min' => 40,
                    'warmup' => ['Band pull-aparts'],
                    'exercises' => [
                        [
                            'name' => $pullExerciseName,
                            'sets' => 3,
                            'reps' => '10-12',
                            'rest_sec' => 60,
                            'rpe' => 7.0,
                            'equipment' => $pullExerciseEquipment,
                            'movement_notes' => 'Lead with elbows and stay pain-free.',
                            'safer_alternative' => 'Seated band row',
                        ],
                        [
                            'name' => 'Plank',
                            'sets' => 3,
                            'reps' => '30-45 sec',
                            'rest_sec' => 45,
                            'rpe' => 6.0,
                            'equipment' => 'Bodyweight',
                            'movement_notes' => 'Brace gently without holding breath.',
                            'safer_alternative' => 'Dead bug',
                        ],
                    ],
                    'cooldown' => ['Thoracic rotation'],
                    'safety_notes' => ['Reduce range if shoulders feel irritated.'],
                ],
                [
                    'day_index' => 4,
                    'day_label' => 'Thursday',
                    'session_type' => 'rest',
                    'focus' => 'Full Rest',
                    'location' => 'home',
                    'duration_min' => 0,
                    'warmup' => [],
                    'exercises' => [],
                    'cooldown' => [],
                    'safety_notes' => ['Prioritize sleep and hydration.'],
                ],
                [
                    'day_index' => 5,
                    'day_label' => 'Friday',
                    'session_type' => 'train',
                    'focus' => 'Full Body Circuit',
                    'location' => 'home',
                    'duration_min' => 35,
                    'warmup' => ['March in place'],
                    'exercises' => [
                        [
                            'name' => 'Bodyweight Squat',
                            'sets' => 3,
                            'reps' => '10-12',
                            'rest_sec' => 60,
                            'rpe' => 7.0,
                            'equipment' => 'Bodyweight',
                            'movement_notes' => 'Sit back comfortably and stay pain-free.',
                            'safer_alternative' => 'Chair squat',
                        ],
                    ],
                    'cooldown' => ['Calf stretch'],
                    'safety_notes' => ['Stop if knee pain increases.'],
                ],
                [
                    'day_index' => 6,
                    'day_label' => 'Saturday',
                    'session_type' => 'recovery',
                    'focus' => 'Walking and Mobility',
                    'location' => 'home',
                    'duration_min' => 20,
                    'warmup' => ['Easy walk'],
                    'exercises' => [],
                    'cooldown' => ['Breathing'],
                    'safety_notes' => ['Keep this session restorative.'],
                ],
                [
                    'day_index' => 7,
                    'day_label' => 'Sunday',
                    'session_type' => 'rest',
                    'focus' => 'Rest',
                    'location' => 'home',
                    'duration_min' => 0,
                    'warmup' => [],
                    'exercises' => [],
                    'cooldown' => [],
                    'safety_notes' => ['Prepare for the next training week.'],
                ],
            ],
            'progression_rules' => ['Add 1-2 reps before increasing difficulty.', 'Keep technique stable before progression.'],
            'recovery_rules' => ['Keep one full rest day.', 'Reduce intensity if soreness lingers more than 48 hours.'],
            'coach_notes' => ['Quality reps matter more than chasing fatigue.'],
        ],
        'adaptive_review' => [
            'review_after_days' => 7,
            'checkpoints' => ['Weight trend', 'Energy levels', 'Meal adherence', 'Workout completion'],
            'replanning_triggers' => ['Pain flare-ups', 'Missed sessions for a full week', 'Repeated hunger and low energy'],
            'next_data_to_collect' => ['Average calories logged', 'Workout completion rate', 'Body-weight trend', 'Adherence notes'],
        ],
        'ml_readiness' => [
            'candidate_features' => ['age', 'sex', 'weight_kg', 'goal', 'adherence_rate', 'schedule_consistency'],
            'candidate_targets' => ['weekly_weight_change', 'plan_adherence', 'regeneration_probability'],
            'notes' => 'Use collected project data later for a small regression or ranking experiment, not as the main planning engine.',
        ],
    ];
}

function buildCompactPlannerPayload(): array
{
    return [
        'overview' => [
            'summary' => 'Compact weekly plan template.',
        ],
        'safety' => [
            'hard_rules_observed' => ['Allergy and injury constraints applied'],
        ],
        'diet' => [
            'daily_targets' => [
                'calories_kcal' => 1800,
                'protein_g' => 135,
                'carbs_g' => 175,
                'fat_g' => 58,
                'fiber_g' => 28,
                'water_ml' => 2400,
            ],
            'meal_options' => [
                'breakfast' => [
                    [
                        'title' => 'Yogurt bowl',
                        'target_kcal' => 430,
                        'items' => [
                            [
                                'name' => 'Greek Yogurt',
                                'portion' => '180 g',
                                'calories_kcal' => 120,
                                'protein_g' => 17,
                                'carbs_g' => 6,
                                'fat_g' => 4,
                            ],
                            [
                                'name' => 'Apple',
                                'portion' => '1 piece',
                                'calories_kcal' => 95,
                                'protein_g' => 0,
                                'carbs_g' => 25,
                                'fat_g' => 0,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Egg toast plate',
                        'target_kcal' => 440,
                        'items' => [
                            [
                                'name' => 'Eggs',
                                'portion' => '2 pcs',
                                'calories_kcal' => 160,
                                'protein_g' => 12,
                                'carbs_g' => 1,
                                'fat_g' => 11,
                            ],
                            [
                                'name' => 'Wholegrain Toast',
                                'portion' => '2 slices',
                                'calories_kcal' => 180,
                                'protein_g' => 6,
                                'carbs_g' => 30,
                                'fat_g' => 4,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Overnight oats',
                        'target_kcal' => 450,
                        'items' => [
                            [
                                'name' => 'Oats',
                                'portion' => '220 g',
                                'calories_kcal' => 260,
                                'protein_g' => 12,
                                'carbs_g' => 42,
                                'fat_g' => 6,
                            ],
                        ],
                    ],
                ],
                'lunch' => [
                    [
                        'title' => 'Chicken rice bowl',
                        'target_kcal' => 610,
                        'items' => [
                            [
                                'name' => 'Chicken Breast',
                                'portion' => '150 g',
                                'calories_kcal' => 250,
                                'protein_g' => 40,
                                'carbs_g' => 0,
                                'fat_g' => 6,
                            ],
                            [
                                'name' => 'Rice',
                                'portion' => '220 g',
                                'calories_kcal' => 286,
                                'protein_g' => 6,
                                'carbs_g' => 62,
                                'fat_g' => 1,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Tuna potato plate',
                        'target_kcal' => 590,
                        'items' => [
                            [
                                'name' => 'Tuna',
                                'portion' => '150 g',
                                'calories_kcal' => 220,
                                'protein_g' => 36,
                                'carbs_g' => 0,
                                'fat_g' => 7,
                            ],
                            [
                                'name' => 'Potatoes',
                                'portion' => '220 g',
                                'calories_kcal' => 190,
                                'protein_g' => 5,
                                'carbs_g' => 43,
                                'fat_g' => 0,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Chicken pasta salad',
                        'target_kcal' => 620,
                        'items' => [
                            [
                                'name' => 'Chicken Breast',
                                'portion' => '150 g',
                                'calories_kcal' => 250,
                                'protein_g' => 40,
                                'carbs_g' => 0,
                                'fat_g' => 6,
                            ],
                            [
                                'name' => 'Wholegrain Pasta',
                                'portion' => '220 g',
                                'calories_kcal' => 310,
                                'protein_g' => 11,
                                'carbs_g' => 60,
                                'fat_g' => 3,
                            ],
                        ],
                    ],
                ],
                'dinner' => [
                    [
                        'title' => 'Chicken dinner',
                        'target_kcal' => 590,
                        'items' => [
                            [
                                'name' => 'Chicken Breast',
                                'portion' => '150 g',
                                'calories_kcal' => 250,
                                'protein_g' => 40,
                                'carbs_g' => 0,
                                'fat_g' => 6,
                            ],
                            [
                                'name' => 'Rice',
                                'portion' => '160 g',
                                'calories_kcal' => 208,
                                'protein_g' => 5,
                                'carbs_g' => 45,
                                'fat_g' => 1,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Fish and potatoes',
                        'target_kcal' => 580,
                        'items' => [
                            [
                                'name' => 'White Fish',
                                'portion' => '180 g',
                                'calories_kcal' => 210,
                                'protein_g' => 35,
                                'carbs_g' => 0,
                                'fat_g' => 6,
                            ],
                            [
                                'name' => 'Potatoes',
                                'portion' => '220 g',
                                'calories_kcal' => 190,
                                'protein_g' => 5,
                                'carbs_g' => 43,
                                'fat_g' => 0,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Turkey bulgur bowl',
                        'target_kcal' => 600,
                        'items' => [
                            [
                                'name' => 'Turkey Breast',
                                'portion' => '150 g',
                                'calories_kcal' => 230,
                                'protein_g' => 38,
                                'carbs_g' => 0,
                                'fat_g' => 5,
                            ],
                            [
                                'name' => 'Bulgur',
                                'portion' => '220 g',
                                'calories_kcal' => 250,
                                'protein_g' => 8,
                                'carbs_g' => 52,
                                'fat_g' => 1,
                            ],
                        ],
                    ],
                ],
                'snack' => [
                    [
                        'title' => 'Yogurt snack',
                        'target_kcal' => 180,
                        'items' => [
                            [
                                'name' => 'Greek Yogurt',
                                'portion' => '180 g',
                                'calories_kcal' => 120,
                                'protein_g' => 17,
                                'carbs_g' => 6,
                                'fat_g' => 4,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Fruit snack',
                        'target_kcal' => 170,
                        'items' => [
                            [
                                'name' => 'Apple',
                                'portion' => '1 piece',
                                'calories_kcal' => 95,
                                'protein_g' => 0,
                                'carbs_g' => 25,
                                'fat_g' => 0,
                            ],
                        ],
                    ],
                    [
                        'title' => 'Protein shake',
                        'target_kcal' => 200,
                        'items' => [
                            [
                                'name' => 'Milk banana protein shake',
                                'portion' => '300 ml',
                                'calories_kcal' => 190,
                                'protein_g' => 18,
                                'carbs_g' => 22,
                                'fat_g' => 4,
                            ],
                        ],
                    ],
                ],
            ],
            'grocery_list' => [],
            'meal_prep_notes' => [],
            'adherence_notes' => [],
        ],
        'workout' => [
            'weekly_schedule' => [
                [
                    'day_index' => 1,
                    'session_type' => 'train',
                    'focus' => 'Full Body',
                    'location' => 'home',
                    'duration_min' => 40,
                    'exercises' => [
                        [
                            'name' => 'Bodyweight Squat',
                            'sets' => 3,
                            'reps' => '10-12',
                            'rest_sec' => 60,
                            'rpe' => 7.0,
                            'equipment' => 'Bodyweight',
                        ],
                    ],
                ],
                [
                    'day_index' => 2,
                    'session_type' => 'recovery',
                    'focus' => 'Mobility',
                    'location' => 'home',
                    'duration_min' => 20,
                    'exercises' => [],
                ],
                [
                    'day_index' => 3,
                    'session_type' => 'rest',
                    'focus' => 'Rest',
                    'location' => 'home',
                    'duration_min' => 0,
                    'exercises' => [],
                ],
            ],
            'progression_rules' => [],
            'recovery_rules' => [],
            'coach_notes' => [],
        ],
        'adaptive_review' => [
            'review_after_days' => 7,
        ],
        'ml_readiness' => [
            'notes' => 'Compact template output for local inference.',
        ],
    ];
}
