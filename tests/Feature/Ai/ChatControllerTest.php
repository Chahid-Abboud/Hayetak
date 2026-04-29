<?php

use App\Models\Ai\AiConversation;
use App\Models\Ai\AiMessage;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\User;

it('creates an ai conversation and stores both messages', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'fitness_goal' => 'fat loss',
        'diet_name' => 'high protein',
        'allergies' => ['peanuts'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'How should I adjust dinner if my protein is low?',
            'screen_context' => 'coach',
            'include_last_7_days' => true,
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('conversation.title', 'How should I adjust dinner if my protein is low?')
        ->assertJsonPath('user_message.role', 'user')
        ->assertJsonPath('assistant_message.role', 'assistant');

    $conversation = AiConversation::query()->firstOrFail();

    expect($conversation->user_id)->toBe($user->id);
    expect($conversation->messages()->count())->toBe(2);
});

it('allows unverified users to use ai coach chat during onboarding', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->unverified()->create([
        'fitness_goal' => 'fat loss',
        'diet_name' => 'high protein',
        'allergies' => ['peanuts'],
    ]);

    $this->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Can I still use coach before verifying my email?',
            'screen_context' => 'coach',
        ])
        ->assertCreated()
        ->assertJsonPath('ok', true);
});

it('streams an ai coach response as server sent events while storing messages', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'fitness_goal' => 'fat loss',
        'diet_name' => 'Mediterranean',
        'allergies' => ['peanuts'],
    ]);

    $response = $this
        ->actingAs($user)
        ->post('/api/ai/chat/stream', [
            'message' => 'Give me a safe dinner idea based on my profile.',
            'screen_context' => 'coach',
            'include_last_7_days' => true,
        ], [
            'Accept' => 'text/event-stream',
        ]);

    $response->assertCreated();
    expect($response->headers->get('content-type'))->toContain('text/event-stream');

    $stream = $response->streamedContent();
    expect($stream)
        ->toContain('event: status')
        ->toContain('event: token')
        ->toContain('event: message')
        ->toContain('event: done');

    expect(AiConversation::query()->where('user_id', $user->id)->count())->toBe(1);
    expect(AiMessage::query()->where('user_id', $user->id)->count())->toBe(2);
});

it('prevents users from reading another users ai conversation', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $conversation = AiConversation::query()->create([
        'user_id' => $owner->id,
        'title' => 'Owner chat',
        'last_message_at' => now(),
    ]);

    $this->actingAs($intruder)
        ->getJson("/api/ai/conversations/{$conversation->id}/messages")
        ->assertForbidden();
});

it('summarizes todays meals without collapsing into an allergy-removal warning', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'fitness_goal' => 'fat loss',
        'allergies' => ['avocado'],
    ]);

    $user->prefs()->create([
        'daily_goal_calories' => 1600,
        'daily_goal_protein_g' => 110,
        'daily_goal_carbs_g' => 150,
        'daily_goal_fat_g' => 50,
    ]);

    $foodA = Food::query()->create([
        'name' => 'Greek yogurt bowl',
        'calories' => 280,
        'protein_g' => 24,
        'carbs_g' => 22,
        'fat_g' => 8,
    ]);

    $foodB = Food::query()->create([
        'name' => 'Chicken rice plate',
        'calories' => 520,
        'protein_g' => 42,
        'carbs_g' => 48,
        'fat_g' => 14,
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $foodA->id,
        'meal_type' => 'breakfast',
        'servings' => 1,
        'eaten_at' => now()->toDateString(),
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $foodB->id,
        'meal_type' => 'lunch',
        'servings' => 1,
        'eaten_at' => now()->toDateString(),
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Meal thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'Try a chicken bowl with avocado on top for dinner.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What stands out from my meals today?',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
            'include_last_7_days' => true,
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'meal_summary')
        ->assertJsonMissingPath('warnings.0');

    expect(data_get($response->json(), 'assistant_message.content'))->toContain('Today ('.now()->toDateString().') you have logged 800 kcal, 66 g protein, 70 g carbs, and 22 g fat.')
        ->toContain('The biggest gap is protein')
        ->not->toContain('I removed a food suggestion');
});

it('summarizes yesterdays meals when the user asks about yesterday', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create();

    $food = Food::query()->create([
        'name' => 'Chicken and rice',
        'calories' => 500,
        'protein_g' => 40,
        'carbs_g' => 45,
        'fat_g' => 12,
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $food->id,
        'meal_type' => 'lunch',
        'servings' => 1,
        'eaten_at' => now()->subDay()->toDateString(),
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $food->id,
        'meal_type' => 'dinner',
        'servings' => 0.5,
        'eaten_at' => now()->toDateString(),
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => "what about yesterday's meals?",
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'meal_summary')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Yesterday ('.now()->subDay()->toDateString().') you have logged 500 kcal, 40 g protein, 45 g carbs, and 12 g fat.')
        ->not->toContain('750 kcal');
});

it('does not fake zero macros when the requested date has no meal entries', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => "what about yesterday's meals?",
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'missing_today_meals');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('I do not see any logged meals for Yesterday ('.now()->subDay()->toDateString().') yet.');
});

it('uses the active thread to provide the full recipe and macros for the safe snack that was already suggested', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['avocado'],
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Snack thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'For a high-protein snack, try a Greek yogurt berry parfait.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'give me the full recipe and macros',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'safe_recipe_follow_up')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Greek yogurt berry parfait')
        ->toContain('Macros per serving:')
        ->toContain('g carbs');
});

it('uses the active thread to offer safe alternatives when the user dislikes the currently discussed snack', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['avocado'],
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Alternative thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'For a high-protein snack, try a Greek yogurt berry parfait.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'any alternatives if i hate the taste of greek yogurt?',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'taste_based_alternatives')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Cottage cheese berry cup')
        ->toContain('Ricotta cinnamon bowl')
        ->toContain('Protein oats cup');
});

it('keeps dinner follow-up requests anchored to the current thread and returns total meal macros', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'fitness_goal' => 'fat loss',
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Dinner thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'A healthy and balanced dinner could be grilled chicken with roasted vegetables and quinoa.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'any dinner meal that contains taouk chicken?',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'dinner_ingredient_follow_up')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Balanced taouk chicken dinner bowl')
        ->toContain('Total meal macros:')
        ->toContain('g carbs');
});

it('treats allergens and injury history questions as a profile summary instead of a food safety correction', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['corn'],
        'medical_history' => 'asthma',
    ]);

    $user->prefs()->create([
        'settings' => [
            'injury_history' => ['shoulder pain'],
        ],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'what about my allergens and my injury history?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'restriction_summary');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Based on your profile')
        ->toContain('Allergies: corn')
        ->toContain('Medical conditions: asthma')
        ->toContain('Injuries: shoulder pain')
        ->not->toContain('I removed a food suggestion');
});

it('answers ingredient safety checks with a direct safe-or-not response', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['corn', 'sesame'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Is avocado safe for me?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'food_safety_check')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('safe')
        ->not->toContain('You can ask about meals, macros, workouts');
});

it('refuses saved-allergen recipe requests and maintains the boundary on scrape follow-ups', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['Garlic'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Can you make me a Garlic high-protein snack even though Garlic is in my allergies?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'allergy_conflict_guard');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('I cannot recommend Garlic')
        ->toContain('conflicts with your saved allergy')
        ->toContain('safer high-protein alternative');

    $conversationId = (int) data_get($response->json(), 'conversation.id');

    $followUp = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What if I only take one bite or scrape the Garlic off?',
            'conversation_id' => $conversationId,
            'screen_context' => 'coach',
        ]);

    $followUp
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'allergy_conflict_guard');

    expect(data_get($followUp->json(), 'assistant_message.content'))
        ->toContain('I cannot treat one bite')
        ->toContain('cross-contact or residue')
        ->toContain('Safer swap');
});

it('builds a safe recipe and macros from available ingredients before generic safety routing', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Low FODMAP',
        'allergies' => ['Garlic', 'Onion', 'Avocado'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Use my available ingredients: yogurt, berries, oats. Give me the safe recipe and macros.',
            'screen_context' => 'coach',
            'available_ingredients' => ['yogurt', 'berries', 'oats'],
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'available_ingredient_safe_recipe');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Safe yogurt berry oat bowl')
        ->toContain('295 kcal')
        ->toContain("Ingredients:\n- 3/4 cup plain yogurt")
        ->toContain("Steps:\n1. Spoon the yogurt into a bowl.");
});

it('does not misroute avocado alternatives to greek-yogurt taste fallback text', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['corn', 'sesame'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Give me a safe alternative to avocado toast.',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'food_safety_check')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('safe alternative')
        ->not->toContain('do not like the taste of Greek yogurt');
});

it('keeps lower-carb follow-ups tied to the active recipe thread', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
        'allergies' => ['avocado'],
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Lower carb thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'For a high-protein snack, try a Greek yogurt berry parfait.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'make it lower carb',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'lower_carb_recipe_follow_up')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('lower-carb version')
        ->toContain('Updated macros per serving');
});

it('returns total meal macros on thread follow-up after a dinner suggestion', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'diet_name' => 'Mediterranean',
    ]);

    $conversation = AiConversation::query()->create([
        'user_id' => $user->id,
        'title' => 'Meal totals thread',
        'last_message_at' => now(),
    ]);

    AiMessage::query()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'role' => 'assistant',
        'content' => 'Total meal macros: 470 kcal, 44 g protein, 49 g carbs, 12 g fat.',
        'metadata' => [],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'give me the total macros for the whole meal',
            'conversation_id' => $conversation->id,
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'meal_total_macros_follow_up')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('470 kcal')
        ->toContain('44 g protein')
        ->toContain('49 g carbs')
        ->toContain('12 g fat');
});

it('does not falsely block low-calorie snack guidance because corn appears inside popcorn', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'allergies' => ['corn'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What are healthy low-calorie snack ideas?',
            'screen_context' => 'coach',
        ]);

    $response->assertCreated();

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Low-calorie snack ideas')
        ->not->toContain('I removed a food suggestion because it included your saved allergy');
});

it('preserves line breaks for recipe-style answers after safety review sanitization', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'allergies' => ['corn', 'sesame'],
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Just give me the recipe and macros.',
            'screen_context' => 'coach',
        ]);

    $response->assertCreated();

    $content = (string) data_get($response->json(), 'assistant_message.content');
    expect($content)
        ->toContain("Ingredients:\n- 1 cup plain Greek yogurt")
        ->toContain("Steps:\n1. Add yogurt to a bowl.");
});

it('treats past-week phrasing as a weekly meal summary instead of a single-day summary', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create();

    $food = Food::query()->create([
        'name' => 'Chicken bowl',
        'calories' => 450,
        'protein_g' => 35,
        'carbs_g' => 40,
        'fat_g' => 12,
    ]);

    foreach ([1, 3, 5] as $daysAgo) {
        MealEntry::query()->create([
            'user_id' => $user->id,
            'food_id' => $food->id,
            'meal_type' => 'dinner',
            'servings' => 1,
            'eaten_at' => now()->subDays($daysAgo)->toDateString(),
        ]);
    }

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'What stands out from my meals in the past week?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'meal_summary_last_7_days');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Over your last 7 days, you logged meals on 3 day(s).')
        ->not->toContain('I do not see any logged meals for Today');
});

it('answers monthly allergy-exposure checks directly from logged meals', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'allergies' => ['Corn', 'Sesame'],
    ]);

    $safeFood = Food::query()->create([
        'name' => 'Chicken and rice',
        'calories' => 500,
        'protein_g' => 40,
        'carbs_g' => 45,
        'fat_g' => 12,
        'allergens' => [],
        'ingredients' => ['chicken', 'rice'],
    ]);

    $cornFood = Food::query()->create([
        'name' => 'Corn salad',
        'calories' => 220,
        'protein_g' => 6,
        'carbs_g' => 34,
        'fat_g' => 8,
        'allergens' => ['corn'],
        'ingredients' => ['corn', 'tomato', 'parsley'],
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $safeFood->id,
        'meal_type' => 'lunch',
        'servings' => 1,
        'eaten_at' => now()->subDays(8)->toDateString(),
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $cornFood->id,
        'meal_type' => 'dinner',
        'servings' => 1,
        'eaten_at' => now()->subDays(3)->toDateString(),
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Have I ever consumed over the past month anything I am allergic for?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'allergy_exposure_check');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Yes. I found')
        ->toContain('Corn salad')
        ->toContain('matched: corn')
        ->not->toContain('I removed a food suggestion because it included your saved allergy');
});

it('answers ingredient exposure history checks without misrouting to dinner follow-up', function () {
    config()->set('ai.chat.provider', 'stub');
    config()->set('ai.usage_logging.enabled', false);

    $user = User::factory()->create([
        'allergies' => ['sesame'],
    ]);

    $fishMeal = Food::query()->create([
        'name' => 'Grilled salmon plate',
        'calories' => 430,
        'protein_g' => 38,
        'carbs_g' => 22,
        'fat_g' => 18,
        'allergens' => ['fish'],
        'ingredients' => ['salmon', 'lemon', 'olive oil'],
    ]);

    $otherMeal = Food::query()->create([
        'name' => 'Chicken quinoa bowl',
        'calories' => 460,
        'protein_g' => 36,
        'carbs_g' => 40,
        'fat_g' => 12,
        'allergens' => [],
        'ingredients' => ['chicken', 'quinoa', 'vegetables'],
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $fishMeal->id,
        'meal_type' => 'dinner',
        'servings' => 1,
        'eaten_at' => now()->subDays(4)->toDateString(),
    ]);

    MealEntry::query()->create([
        'user_id' => $user->id,
        'food_id' => $otherMeal->id,
        'meal_type' => 'lunch',
        'servings' => 1,
        'eaten_at' => now()->subDays(2)->toDateString(),
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson('/api/ai/chat', [
            'message' => 'Did I log any meal containing fish in the last 30 days?',
            'screen_context' => 'coach',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('assistant_message.metadata.chat.reason', 'ingredient_exposure_check')
        ->assertJsonPath('assistant_message.metadata.chat.chat_path', 'personalized');

    expect(data_get($response->json(), 'assistant_message.content'))
        ->toContain('Yes. I found')
        ->toContain('Grilled salmon plate')
        ->not->toContain('Balanced taouk chicken dinner bowl')
        ->not->toContain('Total meal macros:');
});
