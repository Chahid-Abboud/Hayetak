<?php

use App\Models\AiConversation;
use App\Models\AiMessage;
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
