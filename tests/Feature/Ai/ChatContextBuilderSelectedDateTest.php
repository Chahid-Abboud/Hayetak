<?php

use App\Models\Food;
use App\Models\User;
use App\Models\WaterIntake;
use App\Models\WorkoutLog;
use App\Services\Ai\Chat\ChatContextBuilder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

it('uses selected_date consistently for daily summaries and 7-day ranges', function () {
    $user = User::factory()->create();
    $selectedDate = Carbon::today()->subDay();
    $today = Carbon::today();

    $foodSelected = Food::query()->create([
        'name' => 'Selected-day meal',
        'calories' => 100,
        'protein_g' => 10,
        'carbs_g' => 5,
        'fat_g' => 2,
    ]);
    $foodToday = Food::query()->create([
        'name' => 'Today meal',
        'calories' => 400,
        'protein_g' => 20,
        'carbs_g' => 40,
        'fat_g' => 10,
    ]);

    DB::table('meal_entries')->insert([
        [
            'user_id' => $user->id,
            'food_id' => $foodSelected->id,
            'meal_type' => 'lunch',
            'servings' => 2,
            'eaten_at' => $selectedDate->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'user_id' => $user->id,
            'food_id' => $foodToday->id,
            'meal_type' => 'dinner',
            'servings' => 1,
            'eaten_at' => $today->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    WaterIntake::query()->create([
        'user_id' => $user->id,
        'for_day' => $selectedDate->toDateString(),
        'ml' => 1550,
    ]);
    WaterIntake::query()->create([
        'user_id' => $user->id,
        'for_day' => $today->toDateString(),
        'ml' => 2200,
    ]);

    WorkoutLog::query()->create([
        'user_id' => $user->id,
        'performed_at' => $selectedDate->copy()->setTime(10, 0),
        'duration_min' => 35,
    ]);
    WorkoutLog::query()->create([
        'user_id' => $user->id,
        'performed_at' => $today->copy()->setTime(10, 0),
        'duration_min' => 45,
    ]);

    $bundle = app(ChatContextBuilder::class)->build(
        $user->fresh(),
        [
            'selected_date' => $selectedDate->toDateString(),
            'include_last_7_days' => true,
        ],
        null,
        ['context_flags' => ['include_last_7_days' => true]]
    );

    expect(data_get($bundle, 'context.today_summary.date'))->toBe($selectedDate->toDateString());
    expect((int) data_get($bundle, 'context.today_summary.calories'))->toBe(200);
    expect((int) data_get($bundle, 'context.today_summary.water_ml'))->toBe(1550);
    expect((bool) data_get($bundle, 'context.today_summary.workout_logged'))->toBeTrue();
    expect(count((array) data_get($bundle, 'context.today_summary.workouts')))->toBe(1);

    expect((int) data_get($bundle, 'context.last_7_days_summary.workouts_completed'))->toBe(1);
});
