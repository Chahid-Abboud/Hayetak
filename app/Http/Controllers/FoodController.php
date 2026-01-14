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

        // Optional filters
        $category = $request->query('category'); // ex: "Breakfast"
        $mealType = $request->query('meal_type'); // ex: "breakfast"
        $excludeAllergens = (bool) $request->boolean('exclude_allergens', false);

        // Example: user allergies stored somewhere (adjust to your schema)
        // If you store allergies as json array: $user->allergies (or $user->prefs->allergies)
        $userAllergens = [];
        if ($excludeAllergens && $user) {
            // adjust these paths based on your DB
            $userAllergens = (array) ($user->allergies ?? []);
        }

        $query = Food::query()
            ->select([
                'id', 'name', 'category', 'serving_size', 'serving_unit',
                'calories', 'protein_g', 'carbs_g', 'fat_g', 'allergens',
            ])
            ->when($q !== '', fn ($qq) => $qq->where('name', 'ilike', "%{$q}%"))
            ->when($category, fn ($qq) => $qq->where('category', $category));

        // ✅ Exclude allergens (Postgres jsonb array or text)
        if ($excludeAllergens && !empty($userAllergens)) {
            // If allergens is jsonb array: ["milk","nuts"]
            // This excludes any food where allergens overlaps the user list
            $query->whereRaw('NOT (allergens ?| array[' . implode(',', array_fill(0, count($userAllergens), '?')) . '])', $userAllergens);
        }

        $foods = $query
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $foods->items(),
            'meta' => [
                'current_page' => $foods->currentPage(),
                'last_page' => $foods->lastPage(),
                'total' => $foods->total(),
            ],
        ]);
    }
}
