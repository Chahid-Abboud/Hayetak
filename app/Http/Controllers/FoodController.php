<?php
// app/Http/Controllers/FoodController.php

namespace App\Http\Controllers;

use App\Models\Food;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FoodController extends Controller
{
    public function search(Request $request)
    {
        $q        = trim((string) $request->query('q', ''));
        $category = $request->query('category'); // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
        $page     = max(1, (int) $request->query('page', 1));
        $perPage  = 20;

        $foods = Food::query()
            // be explicit about columns we need
            ->select([
                'id',
                'name',
                'brand',
                'serving_size',
                'serving_unit',
                'calories',
                'protein_g',
                'carbs_g',
                'fat_g',
                'meal_types',
                'tags',
            ])
            // case-insensitive search for Postgres
            ->when($q !== '', fn ($qq) =>
                $qq->whereRaw('name ILIKE ?', ["%{$q}%"])
            )
            // filter by meal type if provided
            ->when(in_array($category, ['breakfast','lunch','dinner','snack','drink'], true), fn ($qq) =>
                $qq->whereRaw('? = ANY(meal_types)', [$category])
            )
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);

        // Map items to include aliases your TS accepts
        $foods->getCollection()->transform(function (Food $f) {
            // numbers (allow decimals for grams)
            $cal = (int)   ($f->calories ?? 0);
            $pro = (float) ($f->protein_g ?? 0);
            $car = (float) ($f->carbs_g   ?? 0);
            $fat = (float) ($f->fat_g     ?? 0);

            return [
                'id'            => (int) $f->id,
                'name'          => (string) $f->name,
                'serving_unit'  => (string) ($f->serving_unit ?? 'g'),
                'serving_size'  => (float)  ($f->serving_size ?? 100),

                // calories
                'calories'      => $cal,
                'calories_kcal' => $cal, // alias for the TS union type

                // macros — provide both *_g and plain names
                'protein_g'     => $pro,
                'protein'       => $pro,
                'carbs_g'       => $car,
                'carbs'         => $car,
                'fat_g'         => $fat,
                'fat'           => $fat,
            ];
        });

        return response()->json($foods);
    }
}
