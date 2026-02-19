<?php

namespace App\Http\Controllers;

use App\Models\Food;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FoodController extends Controller
{
    public function search(Request $request)
    {
        // ✅ Intelephense-friendly: $request is typed, user is known
        $user = $request->user(); // or Auth::user()

        $q = trim((string) $request->query('q', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = 15;

        // Optional filters: meal type (breakfast, lunch, dinner, snack, drink)
        $mealType = $request->query('meal_type') ?? $request->query('category') ?? $request->query('mealType');
        $mealType = is_string($mealType) ? strtolower(trim($mealType)) : null;
        $validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
        $mealType = in_array($mealType, $validMealTypes, true) ? $mealType : null;

        $excludeAllergens = (bool) $request->boolean('exclude_allergens', false);
        $userAllergens = [];
        if ($excludeAllergens && $user) {
            $userAllergens = (array) ($user->allergies ?? []);
        }

        $query = Food::query()
            ->select([
                'id', 'name', 'category', 'serving_size', 'serving_unit',
                'calories', 'protein_g', 'carbs_g', 'fat_g', 'allergens', 'meal_types',
            ])
            ->when($q !== '', fn ($qq) => $qq->where('name', 'ilike', "%{$q}%"))
            ->when($mealType, function ($qq) use ($mealType) {
                // Works for text[] and mealtypeenum[]: unnest and compare as text
                $qq->whereRaw('? IN (SELECT unnest(meal_types)::text)', [$mealType]);
            });

        // Exclude foods that contain any of the user's allergens
        if ($excludeAllergens && !empty($userAllergens)) {
            foreach ($userAllergens as $allergen) {
                $query->whereJsonDoesntContain('allergens', $allergen);
            }
        }

        $foods = $query
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);

        $items = collect($foods->items())->map(function ($f) {
            $arr = $f->toArray();
            $mt = $arr['meal_types'] ?? null;
            if (is_string($mt)) {
                $arr['meal_types'] = array_values(array_filter(array_map('trim', preg_split('/[,\s{}]+/', trim($mt, '{}')))));
            } elseif (!is_array($mt)) {
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
        ]);
    }
}
