<?php

namespace Database\Seeders;

use App\Models\Exercise;
use App\Models\Food;
use App\Models\MealEntry;
use App\Models\Measurement;
use App\Models\User;
use App\Models\UserDietaryRestriction;
use App\Models\UserMedicalHistory;
use App\Models\WorkoutLog;
use App\Models\WorkoutLogSet;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserHistoryBackfillSeeder extends Seeder
{
    private CarbonImmutable $today;

    private CarbonImmutable $mealStartFloor;

    /** @var \Illuminate\Support\Collection<string,\App\Models\Food> */
    private Collection $foodsByName;

    /** @var \Illuminate\Support\Collection<string,\App\Models\Exercise> */
    private Collection $exercisesByName;

    public function run(): void
    {
        $this->call(DocxMealCatalogSeeder::class);
        $this->call(ExerciseDataQualitySeeder::class);
        $this->call(PremadeWorkoutPrototypeSeeder::class);

        $this->today = CarbonImmutable::today();
        $this->mealStartFloor = CarbonImmutable::parse('2026-02-02');
        $this->foodsByName = Food::query()->get()->keyBy(fn (Food $food) => $this->normalizeKey($food->name));
        $this->exercisesByName = Exercise::query()->get()->keyBy(fn (Exercise $exercise) => $this->normalizeKey($exercise->name));

        $users = User::query()
            ->with(['dietaryRestrictions', 'medicalHistories'])
            ->orderBy('id')
            ->get();

        DB::transaction(function () use ($users): void {
            foreach ($users as $user) {
                $profile = $this->buildUserProfile($user);

                $this->syncRestrictionTables($user, $profile);
                $this->seedMealHistory($user, $profile);
                $this->seedWorkoutHistory($user, $profile);
                $this->seedMeasurementHistory($user, $profile);
            }
        });
    }

    private function buildUserProfile(User $user): array
    {
        $scenario = $this->scenarioForUser($user);
        $inferredWorkoutDays = $this->resolveWorkoutDaysPerWeek($user);
        if ((int) ($user->workout_days_per_week ?? 0) <= 0) {
            $user->forceFill(['workout_days_per_week' => $inferredWorkoutDays])->save();
            $user->refresh();
        }

        $dietKey = $this->normalizeDietName($user->diet_name);
        $allergies = collect($user->allergies ?? [])
            ->merge(
                $user->dietaryRestrictions
                    ->where('kind', 'allergy')
                    ->pluck('value')
            )
            ->filter()
            ->map(fn ($value) => $this->normalizeKey((string) $value))
            ->unique()
            ->values()
            ->all();

        $issues = $this->parseMedicalIssues($user);
        $createdAt = $user->created_at ? CarbonImmutable::parse($user->created_at) : $this->today;

        return [
            'scenario' => $scenario,
            'goal_bucket' => $this->goalBucket($user),
            'diet_key' => $dietKey,
            'allergies' => $allergies,
            'issues' => $issues,
            'created_at' => $createdAt,
            'meal_start' => $createdAt->greaterThan($this->mealStartFloor) ? $createdAt->startOfDay() : $this->mealStartFloor,
            'measurement_start' => $createdAt->startOfDay(),
            'workout_start' => $createdAt->greaterThan($this->mealStartFloor) ? $createdAt->startOfDay() : $this->mealStartFloor,
            'workout_days' => max(1, $inferredWorkoutDays),
            'workout_location' => $this->normalizeKey((string) ($user->workout_location ?? 'home')),
            'activity_key' => $this->normalizeKey((string) ($user->activity_level ?? '')),
            'weight_kg' => $this->resolveCurrentWeight($user),
            'height_cm' => $user->height_cm ? (int) $user->height_cm : null,
        ];
    }

    private function syncRestrictionTables(User $user, array $profile): void
    {
        if ($user->diet_name) {
            UserDietaryRestriction::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => 'diet_type',
                    'value' => $user->diet_name,
                ],
                [
                    'notes' => 'Backfilled from user profile for seeded history.',
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }

        foreach ($profile['allergies'] as $allergy) {
            UserDietaryRestriction::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => 'allergy',
                    'value' => Str::headline(str_replace('-', ' ', $allergy)),
                ],
                [
                    'notes' => 'Backfilled from user profile for seeded history.',
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }

        foreach ($profile['issues'] as $issue) {
            UserMedicalHistory::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'kind' => $issue['kind'],
                    'value' => $issue['label'],
                ],
                [
                    'notes' => $issue['notes'],
                    'source' => 'history_backfill',
                    'is_active' => true,
                ]
            );
        }
    }

    private function scenarioForUser(User $user): string
    {
        return match ($user->id % 4) {
            0 => 'steady_progress',
            1 => 'plateau',
            2 => 'regression',
            default => 'rebound',
        };
    }

    private function goalBucket(User $user): string
    {
        $goalText = $this->normalizeKey(
            trim(((string) ($user->dietary_goal ?? '')).' '.((string) ($user->fitness_goal ?? '')))
        );

        if (Str::contains($goalText, ['loss', 'lose', 'deficit', 'fat'])) {
            return 'loss';
        }

        if (Str::contains($goalText, ['gain', 'surplus', 'muscle', 'bulk'])) {
            return 'gain';
        }

        return 'maintain';
    }

    private function normalizeDietName(?string $dietName): string
    {
        $normalized = $this->normalizeKey((string) $dietName);

        return match (true) {
            $normalized === 'intermittent fasting' => 'intermittent fasting',
            $normalized === 'low fodmap' => 'low fodmap',
            $normalized === 'low-carb' => 'low-carb',
            $normalized === 'high-protein' => 'high-protein',
            default => $normalized !== '' ? $normalized : 'general',
        };
    }

    private function resolveCurrentWeight(User $user): float
    {
        $latestMeasurementWeight = Measurement::query()
            ->where('user_id', $user->id)
            ->whereNotNull('weight_kg')
            ->latest('measured_at')
            ->value('weight_kg');

        if ($latestMeasurementWeight !== null) {
            return round((float) $latestMeasurementWeight, 2);
        }

        if ($user->weight_kg !== null) {
            return (float) $user->weight_kg;
        }

        $base = 67 + (($user->id * 7) % 19);
        if ($this->normalizeKey((string) $user->gender) === 'female') {
            $base -= 8;
        }

        if ($user->role === User::ROLE_TRAINER) {
            $base += 6;
        }

        return (float) $base;
    }

    private function resolveWorkoutDaysPerWeek(User $user): int
    {
        $current = (int) ($user->workout_days_per_week ?? 0);
        if ($current > 0) {
            return min(7, $current);
        }

        $activity = $this->normalizeKey((string) ($user->activity_level ?? ''));
        $base = match (true) {
            str_contains($activity, 'sedentary') => 2,
            str_contains($activity, 'light') => 3,
            str_contains($activity, 'moderate') => 4,
            str_contains($activity, 'very') => 5,
            str_contains($activity, 'athlete') => 6,
            default => 3,
        };

        if ($user->role === User::ROLE_TRAINER) {
            $base = max($base, 5);
        } elseif ($user->role === User::ROLE_NUTRITIONIST) {
            $base = max($base, 3);
        }

        return min(7, max(1, $base));
    }

    private function parseMedicalIssues(User $user): array
    {
        $sourceText = collect([
            $user->medical_history,
            ...$user->medicalHistories->pluck('value')->all(),
        ])->filter()->implode(' | ');

        $normalized = $this->normalizeKey($sourceText);
        $catalog = [
            'type 2 diabetes' => ['kind' => 'medical_condition', 'label' => 'Type 2 Diabetes'],
            'diabetes' => ['kind' => 'medical_condition', 'label' => 'Diabetes'],
            'asthma' => ['kind' => 'medical_condition', 'label' => 'Asthma'],
            'iron-deficiency anemia' => ['kind' => 'medical_condition', 'label' => 'Iron-Deficiency Anemia'],
            'anemia' => ['kind' => 'medical_condition', 'label' => 'Anemia'],
            'vitamin d' => ['kind' => 'medical_condition', 'label' => 'Low Vitamin D'],
            'pcos' => ['kind' => 'medical_condition', 'label' => 'PCOS'],
            'insulin resistance' => ['kind' => 'medical_condition', 'label' => 'Insulin Resistance'],
            'lactose intolerance' => ['kind' => 'medical_condition', 'label' => 'Lactose Intolerance'],
            'acid reflux' => ['kind' => 'medical_condition', 'label' => 'Acid Reflux'],
            'high blood pressure' => ['kind' => 'medical_condition', 'label' => 'High Blood Pressure'],
            'hypertension' => ['kind' => 'medical_condition', 'label' => 'Hypertension'],
            'ibs' => ['kind' => 'medical_condition', 'label' => 'IBS'],
            'sleep apnea' => ['kind' => 'medical_condition', 'label' => 'Sleep Apnea'],
            'high triglycerides' => ['kind' => 'medical_condition', 'label' => 'High Triglycerides'],
            'hypothyroidism' => ['kind' => 'medical_condition', 'label' => 'Hypothyroidism'],
            'migraine' => ['kind' => 'medical_condition', 'label' => 'Migraines'],
            'fatty liver' => ['kind' => 'medical_condition', 'label' => 'NAFLD'],
            'elevated ldl' => ['kind' => 'medical_condition', 'label' => 'Elevated LDL'],
            'shoulder injury' => ['kind' => 'injury', 'label' => 'Shoulder Injury'],
            'shoulder impingement' => ['kind' => 'injury', 'label' => 'Shoulder Impingement'],
            'broken ankle' => ['kind' => 'injury', 'label' => 'Broken Ankle'],
            'ankle sprain' => ['kind' => 'injury', 'label' => 'Ankle Sprain'],
            'lower-back tightness' => ['kind' => 'injury', 'label' => 'Lower Back Tightness'],
            'lower back tightness' => ['kind' => 'injury', 'label' => 'Lower Back Tightness'],
            'wrist strain' => ['kind' => 'injury', 'label' => 'Wrist Strain'],
            'knee pain' => ['kind' => 'injury', 'label' => 'Knee Pain'],
            'patellofemoral knee pain' => ['kind' => 'injury', 'label' => 'Patellofemoral Knee Pain'],
            'postpartum core weakness' => ['kind' => 'injury', 'label' => 'Postpartum Core Weakness'],
        ];

        $issues = [];
        foreach ($catalog as $needle => $issue) {
            if (! Str::contains($normalized, $needle)) {
                continue;
            }

            $issues[$issue['kind'].'|'.$issue['label']] = [
                ...$issue,
                'notes' => $sourceText !== '' ? $sourceText : null,
            ];
        }

        return array_values($issues);
    }

    private function seedMealHistory(User $user, array $profile): void
    {
        if ($profile['meal_start']->greaterThan($this->today)) {
            return;
        }

        $existingCounts = MealEntry::query()
            ->where('user_id', $user->id)
            ->whereBetween('eaten_at', [$profile['meal_start']->toDateString(), $this->today->toDateString()])
            ->get(['id', 'meal_type', 'eaten_at', 'food_id'])
            ->groupBy(fn (MealEntry $entry) => $entry->eaten_at->toDateString().'|'.$entry->meal_type);

        $date = $profile['meal_start'];
        while ($date->lessThanOrEqualTo($this->today)) {
            foreach ($this->mealTypesForDay($profile, $date) as $mealType) {
                $key = $date->toDateString().'|'.$mealType;
                $existing = $existingCounts->get($key, collect());
                $targetEntries = $this->targetMealEntriesForMeal($profile, $mealType, $date);

                if ($existing->count() >= $targetEntries) {
                    continue;
                }

                $excludedFoodIds = $existing->pluck('food_id')->filter()->values()->all();

                for ($slotIndex = $existing->count(); $slotIndex < $targetEntries; $slotIndex++) {
                    $food = $this->pickFoodForUser($profile, $mealType, $date, $slotIndex, $excludedFoodIds);
                    if (! $food) {
                        continue;
                    }

                    $entry = MealEntry::query()->create([
                        'user_id' => $user->id,
                        'food_id' => $food->id,
                        'meal_type' => $mealType,
                        'servings' => $this->servingsForMeal($profile, $mealType, $date, $food, $slotIndex),
                        'eaten_at' => $date->toDateString(),
                    ]);

                    $existing->push($entry);
                    $existingCounts->put($key, $existing);
                    $excludedFoodIds[] = $food->id;
                }
            }

            $date = $date->addDay();
        }
    }

    private function mealTypesForDay(array $profile, CarbonImmutable $date): array
    {
        if ($profile['diet_key'] === 'intermittent fasting') {
            $meals = ['lunch', 'snack', 'dinner'];
            if ($date->isWeekend() && $profile['scenario'] !== 'regression') {
                array_unshift($meals, 'breakfast');
            }

            return $meals;
        }

        return ['breakfast', 'lunch', 'snack', 'dinner'];
    }

    private function targetMealEntriesForMeal(array $profile, string $mealType, CarbonImmutable $date): int
    {
        $signature = abs(crc32($profile['scenario'].'|'.$profile['goal_bucket'].'|'.$mealType.'|'.$date->toDateString())) % 100;

        $target = 1;
        if (in_array($mealType, ['lunch', 'dinner'], true) && $signature < 38) {
            $target++;
        }

        if (
            $mealType === 'snack'
            && in_array($profile['goal_bucket'], ['gain', 'maintain'], true)
            && in_array($profile['activity_key'], ['very active', 'athlete'], true)
            && $signature < 30
        ) {
            $target++;
        }

        if ($profile['scenario'] === 'regression' && $date->isWeekend() && $mealType === 'snack') {
            $target++;
        }

        return min(2, max(1, $target));
    }

    private function pickFoodForUser(
        array $profile,
        string $mealType,
        CarbonImmutable $date,
        int $slotIndex = 0,
        array $excludedFoodIds = [],
    ): ?Food
    {
        $foodNames = $this->mealPoolNames($profile['diet_key'], $mealType);
        $foods = collect($foodNames)
            ->map(fn (string $name) => $this->foodsByName->get($this->normalizeKey($name)))
            ->filter(fn ($food) => $food instanceof Food)
            ->reject(fn (Food $food) => in_array($food->id, $excludedFoodIds, true))
            ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
            ->values();

        if ($foods->isEmpty()) {
            $foods = $this->foodsByName
                ->values()
                ->filter(fn (Food $food) => in_array($mealType, (array) ($food->meal_types ?? []), true))
                ->reject(fn (Food $food) => in_array($food->id, $excludedFoodIds, true))
                ->filter(fn (Food $food) => $this->foodIsAllowedForUser($food, $profile))
                ->values();
        }

        if ($foods->isEmpty()) {
            return null;
        }

        $index = abs(crc32($profile['diet_key'].'|'.$mealType.'|'.$date->toDateString().'|'.$slotIndex)) % $foods->count();

        return $foods->get($index);
    }

    private function mealPoolNames(string $dietKey, string $mealType): array
    {
        $pools = [
            'general' => [
                'breakfast' => [
                    'Three-Egg Cheese Avocado Plate',
                    'Turkey Egg Avocado Toast',
                    'Strawberry Mango Protein Yogurt Bowl',
                    'Protein Oatmeal Bowl',
                    'Chocolate Protein Shake',
                    'Greek Yogurt Fruit Bowl',
                    'Brown Yogurt Flatbread Kashkaval',
                ],
                'lunch' => [
                    'Charcoal Chicken Fattoush Plate',
                    'Lean Beef Rice Laban Plate',
                    'Kafta Tabbouleh Hummus Plate',
                    'Chicken Creme Fraiche Pasta Plate',
                    'Chicken Liver Warak Enab Salad Plate',
                    'Turkey Gouda Brown Toast Sandwich',
                    'Chicken Rice Spinach Plate',
                    'Herb Chicken Quinoa Plate',
                    'Salmon Sushi Combo',
                    'Vodka Pasta Chicken Plate',
                ],
                'dinner' => [
                    'Tuna Dill Pickle Bowl',
                    'Labneh Lean Beef Plate',
                    'Air Fryer Salmon Potato Plate',
                    'Chicken Brown Pasta Cream Plate',
                    'Chicken Caesar Salad Bowl',
                    'Herb Salmon Carrot Plate',
                    'Baked Salmon Potato Tray',
                    'Lemon Chicken Veg Plate',
                ],
                'snack' => [
                    'Banana Bread Slice',
                    'Rice Pop Peanut Butter Honey Snack',
                    'Protein Pudding Cup',
                    'Kinder Maxi Bar',
                    'Smoked Turkey Roll-Ups',
                ],
            ],
            'mediterranean' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Turkey Egg Avocado Toast', 'Strawberry Mango Protein Yogurt Bowl', 'Chocolate Protein Shake'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lean Beef Rice Laban Plate', 'Kafta Tabbouleh Hummus Plate', 'Chicken Liver Warak Enab Salad Plate', 'Chicken Rice Spinach Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Air Fryer Salmon Potato Plate', 'Herb Salmon Carrot Plate', 'Lemon Chicken Veg Plate'],
                'snack' => ['Protein Pudding Cup', 'Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip'],
            ],
            'dash' => [
                'breakfast' => ['Protein Oatmeal Bowl', 'Strawberry Mango Protein Yogurt Bowl', 'Chia Berry Breakfast Jar', 'Rice Flakes Berry Bowl'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Chicken Rice Spinach Plate', 'Lentil Quinoa Power Bowl'],
                'dinner' => ['Baked Salmon Potato Tray', 'Herb Salmon Carrot Plate', 'Lemon Chicken Veg Plate', 'Lentil Stuffed Pepper Plate'],
                'snack' => ['Protein Pudding Cup', 'Greek Yogurt Fruit Bowl'],
            ],
            'high-protein' => [
                'breakfast' => ['Chocolate Protein Shake', 'Protein Oatmeal Bowl', 'Strawberry Mango Protein Yogurt Bowl', 'Protein Pudding Cup', 'Three-Egg Cheese Avocado Plate'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Turkey Gouda Brown Toast Sandwich', 'Chicken Mozzarella Pasta Bake', 'Chicken Liver Warak Enab Salad Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Chicken Brown Pasta Cream Plate', 'Chicken Caesar Salad Bowl', 'Air Fryer Salmon Potato Plate', 'Kafta Hummus Pepper Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Protein Pudding Cup', 'Edamame Snack Bowl', 'Low-Fat Labneh Dip'],
            ],
            'keto' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Avocado Egg Plate', 'Chocolate Protein Shake'],
                'lunch' => ['Beef Zucchini Skillet', 'Labneh Lean Beef Plate', 'Kafta Hummus Pepper Plate', 'Salmon Broccoli Butter Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Beef Meatballs Zucchini Plate', 'Salmon Broccoli Butter Plate', 'Labneh Lean Beef Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip', 'Protein Pudding Cup'],
            ],
            'low-carb' => [
                'breakfast' => ['Three-Egg Cheese Avocado Plate', 'Avocado Egg Plate', 'Chocolate Protein Shake'],
                'lunch' => ['Beef Zucchini Skillet', 'Kafta Hummus Pepper Plate', 'Charcoal Chicken Fattoush Plate', 'Chicken Thigh Air Fryer Plate'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Labneh Lean Beef Plate', 'Salmon Broccoli Butter Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Low-Fat Labneh Dip', 'Protein Pudding Cup'],
            ],
            'paleo' => [
                'breakfast' => ['Avocado Egg Plate', 'Turkey Sweet Potato Hash', 'Sweet Potato Turkey Hash'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lemon Chicken Root Veg Plate', 'Beef Zucchini Skillet', 'Chicken Thigh Air Fryer Plate'],
                'dinner' => ['Herb Salmon Carrot Plate', 'Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups'],
            ],
            'whole30' => [
                'breakfast' => ['Avocado Egg Plate', 'Turkey Sweet Potato Hash', 'Sweet Potato Turkey Hash'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Lemon Chicken Root Veg Plate', 'Beef Zucchini Skillet'],
                'dinner' => ['Herb Salmon Carrot Plate', 'Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Smoked Turkey Roll-Ups'],
            ],
            'vegan' => [
                'breakfast' => ['Chickpea Tomato Breakfast Bowl', 'Rice Flakes Berry Bowl'],
                'lunch' => ['Lentil Quinoa Power Bowl', 'Lentil Stuffed Pepper Plate'],
                'dinner' => ['Tofu Vegetable Stir Fry', 'Lentil Stuffed Pepper Plate'],
                'snack' => ['Edamame Snack Bowl'],
            ],
            'vegetarian' => [
                'breakfast' => ['Strawberry Mango Protein Yogurt Bowl', 'Protein Oatmeal Bowl', 'Greek Yogurt Fruit Bowl', 'Brown Yogurt Flatbread Kashkaval'],
                'lunch' => ['Halloumi Bulgur Salad', 'Lentil Quinoa Power Bowl', 'Protein Flatbread Cheese Melt'],
                'dinner' => ['Protein Flatbread Cheese Melt', 'Lentil Stuffed Pepper Plate', 'Greek Yogurt Fruit Bowl'],
                'snack' => ['Protein Pudding Cup', 'Rice Pop Peanut Butter Honey Snack', 'Kinder Maxi Bar'],
            ],
            'low fodmap' => [
                'breakfast' => ['Chocolate Protein Shake', 'Rice Flakes Berry Bowl', 'Sweet Potato Turkey Hash'],
                'lunch' => ['Chicken Rice Spinach Plate', 'Beef Zucchini Skillet', 'Herb Salmon Carrot Plate'],
                'dinner' => ['Baked Salmon Potato Tray', 'Lemon Chicken Veg Plate', 'Beef Meatballs Zucchini Plate'],
                'snack' => ['Protein Pudding Cup', 'Smoked Turkey Roll-Ups'],
            ],
            'intermittent fasting' => [
                'breakfast' => ['Chocolate Protein Shake', 'Protein Pudding Cup'],
                'lunch' => ['Charcoal Chicken Fattoush Plate', 'Herb Chicken Quinoa Plate', 'Chicken Mozzarella Pasta Bake', 'Salmon Sushi Combo'],
                'dinner' => ['Tuna Dill Pickle Bowl', 'Chicken Brown Pasta Cream Plate', 'Herb Salmon Carrot Plate', 'Chicken Caesar Salad Bowl'],
                'snack' => ['Smoked Turkey Roll-Ups', 'Protein Pudding Cup', 'Kinder Maxi Bar'],
            ],
        ];

        $pool = $pools[$dietKey][$mealType] ?? $pools['general'][$mealType] ?? [];

        return array_values(array_unique($pool));
    }

    private function foodIsAllowedForUser(Food $food, array $profile): bool
    {
        $allergens = collect($food->allergens ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $ingredients = collect($food->ingredients ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $name = $this->normalizeKey($food->name);

        foreach ($profile['allergies'] as $allergy) {
            if ($allergens->contains($allergy)) {
                return false;
            }

            if ($ingredients->contains(fn ($ingredient) => Str::contains($ingredient, $allergy))) {
                return false;
            }

            if (Str::contains($name, $allergy)) {
                return false;
            }
        }

        return true;
    }

    private function servingsForMeal(
        array $profile,
        string $mealType,
        CarbonImmutable $date,
        Food $food,
        int $slotIndex = 0,
    ): float
    {
        $base = match ($mealType) {
            'breakfast' => 1.0,
            'lunch', 'dinner' => 1.1,
            default => 0.9,
        };

        $goalAdjustment = match ($profile['goal_bucket']) {
            'loss' => -0.15,
            'gain' => 0.18,
            default => 0.0,
        };

        $scenarioAdjustment = match ($profile['scenario']) {
            'steady_progress' => 0.0,
            'plateau' => 0.05,
            'regression' => 0.12,
            'rebound' => $date->greaterThanOrEqualTo($this->today->subDays(7)) ? -0.05 : 0.08,
            default => 0.0,
        };

        if ($profile['diet_key'] === 'intermittent fasting' && in_array($mealType, ['lunch', 'dinner'], true)) {
            $base += 0.15;
        }

        if (($food->protein_g ?? 0) >= 45) {
            $base -= 0.05;
        }

        if ($slotIndex > 0) {
            $base *= 0.62;
        }

        return max(0.6, round($base + $goalAdjustment + $scenarioAdjustment, 2));
    }

    private function seedWorkoutHistory(User $user, array $profile): void
    {
        if ($profile['workout_days'] <= 0 || $profile['workout_start']->greaterThan($this->today)) {
            return;
        }

        $weekStart = $profile['workout_start']->startOfWeek();
        while ($weekStart->lessThanOrEqualTo($this->today)) {
            $desiredSessions = $this->desiredSessionsForWeek($profile);
            $sessionWeekdays = $this->sessionWeekdays($profile['workout_days']);
            $focuses = $this->sessionFocuses($profile['workout_days']);
            $weekEnd = $weekStart->endOfWeek();

            /** @var \Illuminate\Support\Collection<int,string> $existingDates */
            $existingDates = WorkoutLog::query()
                ->where('user_id', $user->id)
                ->whereBetween('performed_at', [$weekStart->startOfDay(), $weekEnd->endOfDay()])
                ->get(['performed_at'])
                ->toBase()
                ->map(fn ($log) => CarbonImmutable::parse($log->performed_at)->toDateString())
                ->unique()
                ->values();

            if ($existingDates->count() >= min($desiredSessions, $profile['workout_days'])) {
                $weekStart = $weekStart->addWeek();
                continue;
            }

            foreach ($sessionWeekdays as $weekdayIndex => $weekday) {
                $sessionDate = $weekStart->addDays($weekday - 1);
                if ($sessionDate->lessThan($profile['workout_start']) || $sessionDate->greaterThan($this->today)) {
                    continue;
                }

                if ($existingDates->contains($sessionDate->toDateString())) {
                    continue;
                }

                if ($existingDates->count() >= $desiredSessions) {
                    break;
                }

                $focus = $focuses[($weekdayIndex + $existingDates->count()) % count($focuses)];
                $exerciseNames = $this->exerciseNamesForFocus($profile, $focus);
                $exercises = collect($exerciseNames)
                    ->map(fn (string $name) => $this->exercisesByName->get($this->normalizeKey($name)))
                    ->filter(fn ($exercise) => $exercise instanceof Exercise)
                    ->filter(fn (Exercise $exercise) => $this->exerciseIsAllowedForUser($exercise, $profile))
                    ->take(4)
                    ->values();

                if ($exercises->isEmpty()) {
                    continue;
                }

                $log = WorkoutLog::query()->create([
                    'user_id' => $user->id,
                    'performed_at' => $sessionDate->setTime(18, 0),
                    'duration_min' => $this->durationForSession($profile, $focus, $sessionDate),
                    'mood' => $this->workoutMood($profile['scenario']),
                    'energy' => $this->workoutEnergy($profile['scenario']),
                    'notes' => 'Seeded '.$profile['scenario'].' session focused on '.$focus.'.',
                    'meta' => [
                        'seeded' => true,
                        'scenario' => $profile['scenario'],
                        'focus' => $focus,
                        'location' => $user->workout_location ?? 'unknown',
                    ],
                ]);

                foreach ($exercises as $exerciseOrder => $exercise) {
                    foreach (range(0, 2) as $setOrder) {
                        WorkoutLogSet::query()->create([
                            'workout_log_id' => $log->id,
                            'exercise_id' => $exercise->id,
                            'order_index' => $setOrder,
                            'weight_kg' => $this->weightForExercise($profile, $exercise, $setOrder, $exerciseOrder),
                            'reps' => $this->repsForExercise($profile, $exercise, $setOrder),
                            'duration_sec' => $this->durationForExercise($exercise),
                            'is_warmup' => $setOrder === 0 && $exerciseOrder === 0,
                            'notes' => $setOrder === 0 && $exerciseOrder === 0 ? 'Seeded warm-up set.' : null,
                            'meta' => [
                                'seeded' => true,
                                'scenario' => $profile['scenario'],
                            ],
                        ]);
                    }
                }

                $existingDates->push($sessionDate->toDateString());
            }

            $weekStart = $weekStart->addWeek();
        }
    }

    private function durationForSession(array $profile, string $focus, CarbonImmutable $date): int
    {
        $base = match ($focus) {
            'conditioning' => 42,
            'full_body' => 48,
            default => 44,
        };

        $scenarioOffset = match ($profile['scenario']) {
            'steady_progress' => 6,
            'plateau' => 2,
            'regression' => -5,
            default => 0,
        };

        $weekendOffset = $date->isWeekend() ? -3 : 0;

        return (int) max(24, min(70, $base + $scenarioOffset + $weekendOffset));
    }

    private function desiredSessionsForWeek(array $profile): int
    {
        $limit = $profile['workout_days'];

        return match ($profile['scenario']) {
            'steady_progress' => max(1, min($limit, $limit - ($limit >= 5 ? 1 : 0))),
            'plateau' => max(1, min($limit, (int) ceil($limit * 0.7))),
            'regression' => max(1, min($limit, (int) floor($limit * 0.5))),
            'rebound' => max(1, min($limit, (int) ceil($limit * 0.75))),
            default => max(1, $limit),
        };
    }

    private function sessionWeekdays(int $count): array
    {
        return match ($count) {
            1 => [3],
            2 => [2, 5],
            3 => [1, 3, 5],
            4 => [1, 2, 4, 6],
            5 => [1, 2, 3, 5, 6],
            6 => [1, 2, 3, 4, 5, 6],
            default => [1, 2, 3, 4, 5, 6, 7],
        };
    }

    private function sessionFocuses(int $workoutDays): array
    {
        return match (true) {
            $workoutDays <= 1 => ['full_body'],
            $workoutDays === 2 => ['upper', 'lower'],
            $workoutDays === 3 => ['push', 'pull', 'legs'],
            $workoutDays === 4 => ['upper', 'lower', 'full_body', 'conditioning'],
            default => ['push', 'pull', 'legs', 'upper', 'conditioning', 'lower', 'full_body'],
        };
    }

    private function exerciseNamesForFocus(array $profile, string $focus): array
    {
        $home = [
            'push' => ['Incline Push-Up', 'Dumbbell Floor Press', 'Standing Resistance Band Chest Fly', 'Band Pull-Apart', 'Dumbbell Hammer Curl'],
            'pull' => ['Band Pull-Apart', 'Dumbbell Curl', 'Concentration Curl', 'Band External Shoulder Rotation', 'Dumbbell Hammer Curl'],
            'legs' => ['Chair Squat', 'Air Squat', 'Bodyweight Leg Curl', 'Towel Calf Stretch', 'Knee-to-Chest Stretch'],
            'conditioning' => ['Shadow Boxing', 'Chair Step-Ups', 'Jumping Jack', 'High Knees (Running in Place)', 'Child\'s Pose'],
            'upper' => ['Dumbbell Floor Press', 'Band Pull-Apart', 'Dumbbell Curl', 'Standing Resistance Band Chest Fly', 'Band External Shoulder Rotation'],
            'lower' => ['Chair Squat', 'Air Squat', 'Bodyweight Leg Curl', 'Towel Calf Stretch', 'Child\'s Pose'],
            'full_body' => ['Dumbbell Floor Press', 'Chair Squat', 'Band Pull-Apart', 'Dumbbell Curl', 'Shadow Boxing'],
        ];

        $gym = [
            'push' => ['Cable Chest Press', 'Smith Machine Bench Press', 'Cable Pushdown With Rope', 'Cable Curl With Rope', 'Machine Bicep Curl'],
            'pull' => ['Cable Curl With Rope', 'Cable Hammer Curl With Rope', 'Machine Bicep Curl', 'Band Pull-Apart', 'Band External Shoulder Rotation'],
            'legs' => ['Belt Squat', 'Lying Leg Curl', 'Leg Press Calf Raise', 'Chair Squat', 'Child\'s Pose'],
            'conditioning' => ['Shadow Boxing', 'Chair Step-Ups', 'Jumping Jack', 'High Knees (Running in Place)', 'Child\'s Pose'],
            'upper' => ['Cable Chest Press', 'Machine Bicep Curl', 'Cable Pushdown With Rope', 'Band Pull-Apart', 'Band External Shoulder Rotation'],
            'lower' => ['Belt Squat', 'Lying Leg Curl', 'Leg Press Calf Raise', 'Child\'s Pose', 'Towel Calf Stretch'],
            'full_body' => ['Cable Chest Press', 'Belt Squat', 'Machine Bicep Curl', 'Leg Press Calf Raise', 'Shadow Boxing'],
        ];

        return match ($profile['workout_location']) {
            'gym' => $gym[$focus] ?? [],
            'both' => array_values(array_unique(array_merge($gym[$focus] ?? [], $home[$focus] ?? []))),
            default => $home[$focus] ?? [],
        };
    }

    private function exerciseIsAllowedForUser(Exercise $exercise, array $profile): bool
    {
        $conditions = collect($exercise->conditions ?? [])->map(fn ($value) => $this->normalizeKey((string) $value));
        $stress = collect($exercise->joint_stress ?? [])->mapWithKeys(fn ($value, $key) => [$this->normalizeKey((string) $key) => $this->normalizeKey((string) $value)]);
        $issues = collect($profile['issues'])->map(fn ($issue) => $this->normalizeKey($issue['label']))->all();

        foreach ($issues as $issue) {
            if (Str::contains($issue, 'shoulder') && ($conditions->contains('shoulder impingement caution') || $stress->get('shoulders') === 'high')) {
                return false;
            }

            if (Str::contains($issue, ['ankle', 'knee']) && ($conditions->contains('knee pain caution') || in_array($stress->get('ankles'), ['high', 'medium'], true) || in_array($stress->get('knees'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, 'wrist') && ($conditions->contains('wrist pain caution') || in_array($stress->get('wrists'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, ['lower back', 'postpartum']) && ($conditions->contains('lower back caution') || in_array($stress->get('lower back'), ['high', 'medium'], true))) {
                return false;
            }

            if (Str::contains($issue, ['asthma', 'high blood pressure', 'hypertension', 'migraine', 'sleep apnea']) && Str::contains($this->normalizeKey($exercise->name), ['jump', 'high knees', 'burpee'])) {
                return false;
            }
        }

        return true;
    }

    private function workoutMood(string $scenario): string
    {
        return match ($scenario) {
            'steady_progress' => 'focused',
            'plateau' => 'steady',
            'regression' => 'tired',
            default => 'motivated',
        };
    }

    private function workoutEnergy(string $scenario): string
    {
        return match ($scenario) {
            'steady_progress' => 'high',
            'plateau' => 'moderate',
            'regression' => 'low',
            default => 'moderate-high',
        };
    }

    private function weightForExercise(array $profile, Exercise $exercise, int $setOrder, int $exerciseOrder): ?float
    {
        $name = $this->normalizeKey($exercise->name);
        if (Str::contains($name, ['push-up', 'squat', 'stretch', 'boxing', 'jack', 'high knees', 'chair step-ups'])) {
            return null;
        }

        $base = match (true) {
            Str::contains($name, ['belt squat']) => $profile['weight_kg'] * 0.32,
            Str::contains($name, ['bench', 'chest press', 'floor press']) => $profile['weight_kg'] * 0.18,
            Str::contains($name, ['curl']) => $profile['weight_kg'] * 0.08,
            Str::contains($name, ['pushdown', 'kickback']) => $profile['weight_kg'] * 0.09,
            Str::contains($name, ['leg curl', 'calf']) => $profile['weight_kg'] * 0.15,
            default => $profile['weight_kg'] * 0.12,
        };

        $scenarioMultiplier = match ($profile['scenario']) {
            'steady_progress' => 1.05,
            'plateau' => 1.0,
            'regression' => 0.9,
            default => 0.97,
        };

        return round(max(4, $base * $scenarioMultiplier) + $exerciseOrder + ($setOrder * 0.5), 1);
    }

    private function repsForExercise(array $profile, Exercise $exercise, int $setOrder): int
    {
        $name = $this->normalizeKey($exercise->name);

        if (Str::contains($name, ['stretch'])) {
            return 1;
        }

        if (Str::contains($name, ['boxing', 'jack', 'high knees'])) {
            return 20 + ($setOrder * 5);
        }

        $base = match ($profile['scenario']) {
            'steady_progress' => 10,
            'plateau' => 11,
            'regression' => 8,
            default => 9,
        };

        if (Str::contains($name, ['push-up', 'squat'])) {
            $base += 2;
        }

        return $base + $setOrder;
    }

    private function durationForExercise(Exercise $exercise): ?int
    {
        $name = $this->normalizeKey($exercise->name);

        return match (true) {
            Str::contains($name, ['stretch']) => 30,
            Str::contains($name, ['boxing', 'jack', 'high knees']) => 45,
            default => null,
        };
    }

    private function seedMeasurementHistory(User $user, array $profile): void
    {
        if ($profile['measurement_start']->greaterThan($this->today)) {
            return;
        }

        $dates = $this->measurementDates($profile['measurement_start']);
        $existingByDate = Measurement::query()
            ->where('user_id', $user->id)
            ->whereBetween('measured_at', [$profile['measurement_start']->toDateString(), $this->today->toDateString()])
            ->orderBy('measured_at')
            ->get()
            ->keyBy(fn (Measurement $measurement) => CarbonImmutable::parse($measurement->measured_at)->toDateString());

        $targetWeight = $existingByDate->last()?->weight_kg !== null
            ? (float) $existingByDate->last()->weight_kg
            : $profile['weight_kg'];
        $startWeight = $this->startingWeightForScenario($targetWeight, $profile, count($dates));
        $tracksHeight = $this->shouldTrackHeight($user);
        $heightAnchor = $profile['height_cm'] ?? $this->inferredHeightForUser($user);
        $latestWeight = $targetWeight;

        foreach ($dates as $index => $date) {
            $dateKey = $date->toDateString();
            $expectedWeight = $this->weightForMeasurement($startWeight, $targetWeight, $profile, $index, count($dates));
            $expectedHeight = $tracksHeight ? $this->heightForDate($heightAnchor, $user, $date, $profile['measurement_start']) : null;

            if ($existingByDate->has($dateKey)) {
                /** @var Measurement $existing */
                $existing = $existingByDate->get($dateKey);

                if ($existing->weight_kg !== null) {
                    $latestWeight = (float) $existing->weight_kg;
                }

                if ($tracksHeight && $expectedHeight !== null && $existing->height_cm === null) {
                    $existing->forceFill([
                        'height_cm' => $expectedHeight,
                        'notes' => trim(((string) $existing->notes).' Height snapshot added by append-only history seeder.'),
                    ])->save();
                }

                continue;
            }

            $measurement = Measurement::query()->create([
                'user_id' => $user->id,
                'measured_at' => $dateKey,
                'weight_kg' => $expectedWeight,
                'height_cm' => $expectedHeight,
                'notes' => 'Seeded weekly check-in for '.$profile['scenario'].'.',
            ]);

            $latestWeight = (float) $measurement->weight_kg;
        }

        if ($user->weight_kg === null || abs((float) $user->weight_kg - $latestWeight) > 0.01) {
            $user->forceFill(['weight_kg' => round($latestWeight, 2)])->save();
        }

        if ($user->height_cm === null && $heightAnchor !== null) {
            $user->forceFill(['height_cm' => $heightAnchor])->save();
        }
    }

    private function measurementDates(CarbonImmutable $start): array
    {
        $dates = [];
        $cursor = $start;
        while ($cursor->lessThanOrEqualTo($this->today)) {
            $dates[] = $cursor;
            $cursor = $cursor->addWeek();
        }

        if (! collect($dates)->contains(fn (CarbonImmutable $date) => $date->isSameDay($this->today))) {
            $dates[] = $this->today;
        }

        return $dates;
    }

    private function startingWeightForScenario(float $targetWeight, array $profile, int $points): float
    {
        $weeks = max(1, $points - 1);

        return match ($profile['goal_bucket']) {
            'loss' => match ($profile['scenario']) {
                'steady_progress' => $targetWeight + ($weeks * 0.55),
                'plateau' => $targetWeight + ($weeks * 0.18),
                'regression' => $targetWeight - ($weeks * 0.22),
                default => $targetWeight + ($weeks * 0.35),
            },
            'gain' => match ($profile['scenario']) {
                'steady_progress' => $targetWeight - ($weeks * 0.32),
                'plateau' => $targetWeight - ($weeks * 0.12),
                'regression' => $targetWeight + ($weeks * 0.20),
                default => $targetWeight - ($weeks * 0.18),
            },
            default => match ($profile['scenario']) {
                'steady_progress' => $targetWeight + ($weeks * 0.08),
                'plateau' => $targetWeight + ($weeks * 0.04),
                'regression' => $targetWeight + ($weeks * 0.18),
                default => $targetWeight + ($weeks * 0.1),
            },
        };
    }

    private function weightForMeasurement(float $startWeight, float $targetWeight, array $profile, int $index, int $count): float
    {
        $progress = $count <= 1 ? 1.0 : $index / ($count - 1);
        $weight = $startWeight + (($targetWeight - $startWeight) * $progress);

        if ($profile['scenario'] === 'rebound' && $index < ($count - 1)) {
            $weight += 0.2;
        }

        if ($profile['scenario'] === 'regression' && $index > 0 && $index < ($count - 1)) {
            $weight += 0.1;
        }

        return round($weight, 2);
    }

    private function normalizeKey(string $value): string
    {
        return trim(Str::of($value)->lower()->replace(['_', '/', ','], ' ')->squish()->toString());
    }

    private function shouldTrackHeight(User $user): bool
    {
        if (($user->age ?? 0) > 0 && (int) $user->age <= 20) {
            return true;
        }

        return $user->id % 3 === 0;
    }

    private function inferredHeightForUser(User $user): ?int
    {
        if ($user->height_cm !== null) {
            return (int) $user->height_cm;
        }

        $base = $this->normalizeKey((string) $user->gender) === 'female' ? 162 : 174;
        $offset = (($user->id * 3) % 11) - 5;

        return (int) max(148, min(198, $base + $offset));
    }

    private function heightForDate(
        int $heightAnchor,
        User $user,
        CarbonImmutable $date,
        CarbonImmutable $startDate,
    ): ?int {
        $weeksFromStart = (int) floor($startDate->diffInDays($date) / 7);

        if ($weeksFromStart === 0) {
            return $heightAnchor;
        }

        if (($user->age ?? 0) > 0 && (int) $user->age <= 20 && $weeksFromStart >= 8) {
            return min(205, $heightAnchor + 1);
        }

        if ($user->id % 5 === 0 && $weeksFromStart % 12 === 0) {
            return $heightAnchor;
        }

        return null;
    }
}
