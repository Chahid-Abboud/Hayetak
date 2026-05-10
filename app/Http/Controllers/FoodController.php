<?php

namespace App\Http\Controllers;

use App\Models\Food;
use App\Models\NutritionPlanItem;
use App\Models\User;
use Illuminate\Http\Request;

class FoodController extends Controller
{
    public function search(Request $request)
    {
        $user = $request->user();
        $driver = Food::query()->getConnection()->getDriverName();

        $q = trim((string) $request->query('q', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = 15;

        $mealType = $request->query('meal_type') ?? $request->query('category') ?? $request->query('mealType');
        $mealType = is_string($mealType) ? strtolower(trim($mealType)) : null;
        $validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
        $mealType = in_array($mealType, $validMealTypes, true) ? $mealType : null;
        $context = trim((string) $request->query('context', ''));
        $plannedItemId = (int) $request->query('nutrition_plan_item_id', 0);
        $plannedItem = null;
        $plannedFood = null;

        $excludeAllergens = (bool) $request->boolean('exclude_allergens', false);
        $userAllergens = [];
        $clientId = (int) $request->query('client_id', 0);

        if ($excludeAllergens) {
            if ($clientId > 0) {
                $client = User::query()
                    ->with(['dietaryRestrictions' => fn ($q) => $q->where('kind', 'allergy')->where('is_active', true)])
                    ->find($clientId);

                if ($client) {
                    $userAllergens = array_unique(array_merge(
                        array_map('strtolower', (array) ($client->allergies ?? [])),
                        $client->dietaryRestrictions->pluck('value')->map(fn ($v) => strtolower($v))->toArray()
                    ));
                }
            } elseif ($user) {
                $userAllergens = (array) ($user->allergies ?? []);
            }
        }

        if ($context === 'plan_substitution' && $plannedItemId > 0) {
            $plannedItem = NutritionPlanItem::query()
                ->with(['meal.day.plan', 'food'])
                ->find($plannedItemId);

            abort_unless(
                $plannedItem?->meal?->day?->plan?->user_id === $user?->id,
                403
            );

            $plannedFood = $plannedItem?->food;
            $mealType = $plannedItem?->meal?->meal_type ?: $mealType;
            $excludeAllergens = true;
            if ($user) {
                $userAllergens = (array) ($user->allergies ?? []);
            }
        }

        $query = Food::query()
            ->select([
                'id', 'name', 'category', 'serving_size', 'serving_unit',
                'calories', 'protein_g', 'carbs_g', 'fat_g', 'allergens', 'meal_types', 'diets_allowed',
            ])
            ->when($q !== '', fn ($qq) => $qq->where('name', 'ilike', "%{$q}%"))
            ->when($mealType, function ($qq) use ($mealType) {
                $queryDriver = $qq->getModel()->getConnection()->getDriverName();

                if ($queryDriver === 'sqlite') {
                    $qq->whereRaw(
                        "EXISTS (
                            SELECT 1
                            FROM json_each(COALESCE(meal_types, '[]'))
                            WHERE lower(json_each.value) = lower(?)
                        )",
                        [$mealType]
                    );

                    return;
                }

                $qq->whereRaw('? IN (SELECT unnest(meal_types)::text)', [$mealType]);
            });

        if ($excludeAllergens && ! empty($userAllergens)) {
            foreach ($userAllergens as $allergen) {
                $query->where(function ($sub) use ($allergen) {
                    $sub->whereNull('allergens')->orWhereJsonDoesntContain('allergens', $allergen);
                });
            }
        }

        if ($context === 'plan_substitution' && $plannedItem && $plannedFood) {
            $query->where('id', '<>', $plannedFood->id);

            $dietName = $user?->diet_name ? strtolower(trim((string) $user->diet_name)) : null;
            if ($dietName) {
                $query->where(function ($sub) use ($dietName, $driver) {
                    $sub->whereNull('diets_allowed');

                    if ($driver === 'sqlite') {
                        $sub
                            ->orWhereRaw("json_array_length(COALESCE(diets_allowed, '[]')) = 0")
                            ->orWhereRaw(
                                "EXISTS (
                                    SELECT 1
                                    FROM json_each(COALESCE(diets_allowed, '[]'))
                                    WHERE lower(json_each.value) = lower(?)
                                )",
                                [$dietName]
                            );

                        return;
                    }

                    $sub
                        ->orWhereRaw("jsonb_array_length(COALESCE(diets_allowed, '[]'::jsonb)) = 0")
                        ->orWhereRaw(
                            "EXISTS (
                                SELECT 1
                                FROM jsonb_array_elements_text(COALESCE(diets_allowed, '[]'::jsonb)) AS d(val)
                                WHERE lower(d.val) = lower(?)
                            )",
                            [$dietName]
                        );
                });
            }

            $query->orderByRaw('CASE WHEN lower(coalesce(category, \'\')) = lower(?) THEN 0 ELSE 1 END', [
                (string) ($plannedFood->category ?? ''),
            ]);
            $query->orderByRaw(
                'ABS(COALESCE(protein_g, 0) - ?) + (ABS(COALESCE(calories, 0) - ?) / 25.0) + (ABS(COALESCE(carbs_g, 0) - ?) / 15.0)',
                [
                    (float) ($plannedFood->protein_g ?? 0),
                    (float) ($plannedFood->calories ?? 0),
                    (float) ($plannedFood->carbs_g ?? 0),
                ]
            );
        } else {
            $query->orderBy('name');
        }

        $foods = $query->paginate($perPage, ['*'], 'page', $page);

        $items = collect($foods->items())->map(function ($f) {
            $arr = $f->toArray();
            $mt = $arr['meal_types'] ?? null;
            if (is_string($mt)) {
                $arr['meal_types'] = array_values(array_filter(array_map('trim', preg_split('/[,\s{}]+/', trim($mt, '{}')))));
            } elseif (! is_array($mt)) {
                $arr['meal_types'] = [];
            }

            return $arr;
        });

        return response()->json([
            'data' => $items->all(),
            'meta' => [
                'current_page' => $foods->currentPage(),
                'last_page' => $foods->lastPage(),
                'total' => $foods->total(),
            ],
            'context' => $context ?: null,
        ]);
    }
}
