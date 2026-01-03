<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Models\Food;
use App\Models\MealEntry;

// controllers for nearby
use App\Http\Controllers\PlacesController;
use App\Http\Controllers\PlacesLocalController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Here is where you can register API routes for your application.
| These routes are loaded by the RouteServiceProvider and all of them
| will be assigned to the "api" middleware group. Make something great!
|
*/

// ---------------- Existing meal-tracker endpoints ----------------

Route::get('/foods/search', function (Request $request) {
    $q = trim((string) $request->query('q', ''));
    $perPage = (int) $request->query('per_page', 10);

    $query = Food::query()
        ->select(['id','name','brand','nationality','calories','protein_g','carbs_g','fat_g'])
        ->when($q !== '', fn ($qq) => $qq->where('name', 'ILIKE', "%{$q}%"))
        ->orderBy('name');

    $page = $query->paginate($perPage);

    $page->getCollection()->transform(function ($f) {
        $servingUnit = 'g';
        $servingSize = 100;
        return [
            'id'            => (int) $f->id,
            'name'          => (string) $f->name,
            'serving_unit'  => $servingUnit,
            'serving_size'  => $servingSize,
            'calories'      => (int) round((float) $f->calories),
            'calories_kcal' => (int) round((float) $f->calories),
            'protein'       => (int) round((float) $f->protein_g),
            'protein_g'     => (int) round((float) $f->protein_g),
            'carbs'         => (int) round((float) $f->carbs_g),
            'carbs_g'       => (int) round((float) $f->carbs_g),
            'fat'           => (int) round((float) $f->fat_g),
            'fat_g'         => (int) round((float) $f->fat_g),
        ];
    });

    return response()->json($page);
});

// create meal entry
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

// delete meal entry
Route::delete('/meal-entries/{mealEntry}', function (MealEntry $mealEntry) {
    abort_unless(Auth::id() === $mealEntry->user_id, 403);
    $mealEntry->delete();
    return response()->json(['ok' => true]);
})->middleware('auth');

// ---------------- Nearby places (both sources) ----------------

// Overpass / OSM-powered nearby search
// this is what NearbyMap.tsx fetches as:  GET /api/places?lat=..&lng=..&radius=..&types=..
Route::get('/places', [PlacesController::class, 'index']);

// Your own DB table places_local
// this is what we added in NearbyMap.tsx as the 2nd fetch: GET /api/places-local?...
Route::get('/places-local', [PlacesLocalController::class, 'index']);
