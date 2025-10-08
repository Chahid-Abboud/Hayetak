<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Models\Food;
use App\Models\MealEntry;

/*
|--------------------------------------------------------------------------
| Minimal API used by Meal Tracker
|--------------------------------------------------------------------------
| GET    /api/foods/search?q=labneh&page=1
| POST   /api/meal-entries
| DELETE /api/meal-entries/{id}
|--------------------------------------------------------------------------
*/

Route::get('/foods/search', function (Request $request) {
    $q = trim((string) $request->query('q', ''));
    $perPage = (int) $request->query('per_page', 10);

    $query = Food::query()
        ->select([
            'id',
            'name',
            'brand',
            'nationality',
            'calories',
            'protein_g',
            'carbs_g',
            'fat_g',
        ])
        // Postgres case-insensitive search
        ->when($q !== '', fn ($qq) => $qq->where('name', 'ILIKE', "%{$q}%"))
        ->orderBy('name');

    $page = $query->paginate($perPage);

    // Transform to the shape the TS page expects
    $page->getCollection()->transform(function ($f) {
        // Defaults since your table has no serving_* columns
        $servingUnit = 'g';
        $servingSize = 100;

        $protein = (float) $f->protein_g;
        $carbs   = (float) $f->carbs_g;
        $fat     = (float) $f->fat_g;
        $kcal    = (float) $f->calories;

        return [
            'id'            => (int) $f->id,
            'name'          => (string) $f->name,
            'serving_unit'  => $servingUnit,         // default
            'serving_size'  => $servingSize,         // default
            'calories'      => (int) round($kcal),
            'calories_kcal' => (int) round($kcal),
            'protein'       => (int) round($protein),
            'protein_g'     => (int) round($protein),
            'carbs'         => (int) round($carbs),
            'carbs_g'       => (int) round($carbs),
            'fat'           => (int) round($fat),
            'fat_g'         => (int) round($fat),
            // Optional: pass through brand/nationality if you want to show them later
            // 'brand'         => $f->brand,
            // 'nationality'   => $f->nationality,
        ];
    });

    return response()->json($page);
});

// Create a meal entry (used by the “Add” dialog)
Route::post('/meal-entries', function (Request $request) {
    $data = $request->validate([
        'food_id'   => ['required', 'integer', 'exists:foods,id'],
        'meal_type' => ['required', 'in:breakfast,lunch,dinner,snack,drink'],
        'servings'  => ['required', 'numeric', 'min:0.01'],
        'eaten_at'  => ['required', 'date_format:Y-m-d'],
    ]);

    $entry = MealEntry::create([
        'user_id'   => Auth::id(),
        'food_id'   => $data['food_id'],
        'meal_type' => $data['meal_type'],
        'servings'  => $data['servings'],
        'eaten_at'  => $data['eaten_at'],
    ]);

    return response()->json(['ok' => true, 'id' => $entry->id], 201);
})->middleware('auth');

// Delete a meal entry
Route::delete('/meal-entries/{mealEntry}', function (MealEntry $mealEntry) {
    abort_unless(Auth::id() === $mealEntry->user_id, 403);
    $mealEntry->delete();
    return response()->json(['ok' => true]);
})->middleware('auth');
