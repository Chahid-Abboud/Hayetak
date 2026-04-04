<?php

use App\Models\AiPlan;
use App\Models\AiRequest;
use App\Models\Exercise;
use App\Models\Food;
use App\Models\NutritionPlan;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\WorkoutPlan;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);
});

it('generates and persists a structured planner response through the openai provider', function () {
    config()->set('ai.planner.ollama_only', false);
    config()->set('ai.planner.provider', 'openai');
    config()->set('services.openai.api_key', 'test-key');
    config()->set('services.openai.base_url', 'https://api.openai.com/v1');

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
        'https://api.openai.com/v1/responses' => Http::response([
            'id' => 'resp_plan_123',
            'model' => 'gpt-4.1-mini',
            'output_text' => json_encode(buildPlannerPayload([
                'allergies' => ['Peanuts'],
                'equipment' => 'Resistance Band',
            ])),
            'usage' => [
                'input_tokens' => 410,
                'output_tokens' => 690,
                'total_tokens' => 1100,
            ],
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
        ->assertJsonPath('provider', 'openai')
        ->assertJsonPath('plan.diet.daily_targets.calories_kcal', 1850)
        ->assertJsonPath('plan.workout.weekly_schedule.0.session_type', 'train');

    $aiRequest = AiRequest::query()->firstOrFail();
    expect($aiRequest->status)->toBe('completed')
        ->and($aiRequest->provider)->toBe('openai')
        ->and($aiRequest->output_json)->toBeArray();

    expect(AiPlan::query()->where('user_id', $user->id)->count())->toBe(2);
    expect(NutritionPlan::query()->where('user_id', $user->id)->where('is_active', true)->exists())->toBeTrue();
    expect(WorkoutPlan::query()->where('user_id', $user->id)->where('is_active', true)->exists())->toBeTrue();
    expect(UserDietaryRestriction::query()->where('user_id', $user->id)->where('kind', 'allergy')->where('value', 'Peanuts')->exists())->toBeTrue();
    expect(UserMedicalHistory::query()->where('user_id', $user->id)->where('kind', 'injury')->where('value', 'shoulder pain')->exists())->toBeTrue();
});

it('rejects planner output that violates an allergy rule and marks the ai request as failed', function () {
    config()->set('ai.planner.ollama_only', false);
    config()->set('ai.planner.provider', 'openai');
    config()->set('services.openai.api_key', 'test-key');
    config()->set('services.openai.base_url', 'https://api.openai.com/v1');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Peanuts'],
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'https://api.openai.com/v1/responses' => Http::response([
            'id' => 'resp_bad_456',
            'model' => 'gpt-4.1-mini',
            'output_text' => json_encode(buildPlannerPayload([
                'meal_item_name' => 'Peanut Butter',
                'allergies' => ['Peanuts'],
            ])),
            'usage' => [
                'input_tokens' => 300,
                'output_tokens' => 500,
                'total_tokens' => 800,
            ],
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', [
            'reason' => 'unsafe_test_plan',
        ])
        ->assertStatus(422)
        ->assertJsonPath('ok', false);

    expect(AiRequest::query()->firstOrFail()->status)->toBe('failed');
    expect(AiPlan::query()->count())->toBe(0);
});

it('supports the ollama planner provider and can persist profile overrides into normalized tables', function () {
    config()->set('ai.planner.provider', 'ollama');
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
        ->assertJsonPath('provider', 'ollama')
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
    config()->set('ai.planner.provider', 'ollama');
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
        ->assertJsonPath('provider', 'ollama')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);

    $response->assertJsonCount(14, 'plan.diet.days');
    $response->assertJsonCount(7, 'plan.workout.weekly_schedule');
    $response->assertJsonPath('plan.workout.weekly_schedule.0.day_label', 'Monday');
});

it('normalizes workout location both to gym and prefers gym equipment with compact templates', function () {
    config()->set('ai.planner.provider', 'ollama');
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

it('enforces unique daily snacks, practical grocery items, and 5-exercise split training days in compact planner mode', function () {
    config()->set('ai.planner.provider', 'ollama');
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

    $snackNames = collect($plan['diet']['days'] ?? [])
        ->map(function (array $day): ?string {
            $snack = collect($day['meals'] ?? [])->firstWhere('meal_code', 'snack');
            if (! is_array($snack)) {
                return null;
            }

            return $snack['items'][0]['name'] ?? null;
        })
        ->filter();

    expect($snackNames->count())->toBe(14)
        ->and($snackNames->unique()->count())->toBe(14);

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
    config()->set('ai.planner.provider', 'ollama');
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
        ->assertJsonPath('provider', 'ollama')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);
});

it('accepts planner json from ollama even when extra text surrounds the object', function () {
    config()->set('ai.planner.provider', 'ollama');
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
        ->assertJsonPath('provider', 'ollama')
        ->assertJsonPath('plan.overview.summary', 'A practical weekly plan built around your goal, schedule, and safety boundaries.');
});

it('retries the ollama planner once with a larger budget when the first reply is not valid json', function () {
    config()->set('ai.planner.provider', 'ollama');
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
        ->assertJsonPath('provider', 'ollama')
        ->assertJsonPath('plan.workout.weekly_schedule.0.session_type', 'train');
});

it('falls back to openai when ollama planner is unavailable and fallback is enabled', function () {
    config()->set('ai.planner.ollama_only', false);
    config()->set('ai.planner.provider', 'ollama');
    config()->set('ai.planner.fallback.enabled', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');
    config()->set('services.openai.api_key', 'test-key');
    config()->set('services.openai.base_url', 'https://api.openai.com/v1');

    createPlannerCatalog();

    $user = User::factory()->create([
        'diet_name' => 'Balanced',
        'workout_days_per_week' => 3,
        'workout_location' => 'home',
    ]);

    Http::fake([
        'http://127.0.0.1:11434/api/chat' => Http::response(['error' => 'ollama unavailable'], 500),
        'https://api.openai.com/v1/responses' => Http::response([
            'id' => 'resp_fallback_001',
            'model' => 'gpt-4.1-mini',
            'output_text' => json_encode(buildPlannerPayload()),
            'usage' => [
                'input_tokens' => 320,
                'output_tokens' => 640,
                'total_tokens' => 960,
            ],
        ], 200),
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/plan', ['reason' => 'fallback_test'])
        ->assertCreated()
        ->assertJsonPath('provider', 'openai')
        ->assertJsonPath('fallback.used', true)
        ->assertJsonPath('fallback.from', 'ollama')
        ->assertJsonPath('fallback.to', 'openai');

    $aiRequest = AiRequest::query()->latest('id')->firstOrFail();
    expect($aiRequest->status)->toBe('completed')
        ->and($aiRequest->provider)->toBe('openai');
});

it('falls back to the local deterministic planner when ollama fails and openai is unavailable', function () {
    config()->set('ai.planner.ollama_only', false);
    config()->set('ai.planner.provider', 'ollama');
    config()->set('ai.planner.fallback.enabled', false);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('services.openai.api_key', null);
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
        ->assertJsonPath('provider', 'local_fallback')
        ->assertJsonPath('fallback.used', true)
        ->assertJsonPath('fallback.to', 'local_fallback')
        ->assertJsonPath('plan.adaptive_review.review_after_days', 14);

    $dietJson = json_encode($response->json('plan.diet') ?? [], JSON_UNESCAPED_SLASHES);
    expect(strtolower($dietJson ?: ''))->not->toContain('peanut');

    $aiRequest = AiRequest::query()->latest('id')->firstOrFail();
    expect($aiRequest->status)->toBe('completed')
        ->and($aiRequest->provider)->toBe('local_fallback');
});

it('builds a gym-focused varied plan in local fallback mode', function () {
    config()->set('ai.planner.ollama_only', false);
    config()->set('ai.planner.provider', 'ollama');
    config()->set('ai.planner.fallback.enabled', false);
    config()->set('ai.planner.local_fallback.enabled', true);
    config()->set('services.openai.api_key', null);
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
        ->assertJsonPath('provider', 'local_fallback')
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

    $snackNames = collect($plan['diet']['days'] ?? [])
        ->map(function (array $day): ?string {
            $snack = collect($day['meals'] ?? [])->firstWhere('meal_code', 'snack');
            if (! is_array($snack)) {
                return null;
            }

            return $snack['items'][0]['name'] ?? null;
        })
        ->filter();

    expect($snackNames->count())->toBe(14)
        ->and($snackNames->unique()->count())->toBe(14);

    $groceryList = collect($plan['diet']['grocery_list'] ?? []);
    expect($groceryList->count())->toBeGreaterThan(3)
        ->and($groceryList->every(fn (array $item): bool => trim((string) ($item['name'] ?? '')) !== '' && trim((string) ($item['quantity'] ?? '')) !== ''))->toBeTrue();
});

it('returns planner health status including provider checks', function () {
    config()->set('ai.planner.provider', 'ollama');
    config()->set('ai.planner.ollama_only', true);
    config()->set('ai.planner.ollama.base_url', 'http://127.0.0.1:11434');
    config()->set('ai.planner.ollama.model', 'llama3.1:8b');
    config()->set('ai.planner.fallback.enabled', true);
    config()->set('services.openai.api_key', 'test-key');

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
        ->assertJsonPath('health.checks.fallback.ready', false);
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
            'days' => [
                [
                    'day_index' => 1,
                    'theme' => 'Template day A',
                    'meals' => [
                        [
                            'meal_code' => 'breakfast',
                            'title' => 'Simple breakfast',
                            'target_kcal' => 450,
                            'items' => [
                                [
                                    'name' => 'Greek Yogurt',
                                    'portion' => '1 serving',
                                    'calories_kcal' => 120,
                                    'protein_g' => 17,
                                    'carbs_g' => 6,
                                    'fat_g' => 4,
                                ],
                            ],
                        ],
                        [
                            'meal_code' => 'dinner',
                            'title' => 'Simple dinner',
                            'target_kcal' => 600,
                            'items' => [
                                [
                                    'name' => 'Chicken Breast',
                                    'portion' => '150 g',
                                    'calories_kcal' => 250,
                                    'protein_g' => 40,
                                    'carbs_g' => 0,
                                    'fat_g' => 6,
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'day_index' => 2,
                    'theme' => 'Template day B',
                    'meals' => [
                        [
                            'meal_code' => 'breakfast',
                            'title' => 'Alternate breakfast',
                            'target_kcal' => 430,
                            'items' => [
                                [
                                    'name' => 'Apple',
                                    'portion' => '1 serving',
                                    'calories_kcal' => 95,
                                    'protein_g' => 0,
                                    'carbs_g' => 25,
                                    'fat_g' => 0,
                                ],
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
