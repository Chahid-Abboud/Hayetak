<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Http\Controllers\Auth\RegisterWizardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\WaterIntakeController;
use App\Http\Controllers\PlacesController;
use App\Http\Controllers\TrackMealsController;
use App\Http\Controllers\FoodController;
use App\Http\Controllers\MealEntryController;
use App\Http\Controllers\Workout\WorkoutPlanController;
use App\Http\Controllers\Workout\WorkoutLogController;
use App\Http\Controllers\PlacesLocalController;

/*
|--------------------------------------------------------------------------
| Public landing (render-only)
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => Inertia::render('welcome'))->name('landing');

/*
|--------------------------------------------------------------------------
| Registration (guest only)
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/register', [RegisterWizardController::class, 'create'])->name('register.start');
    Route::post('/register', [RegisterWizardController::class, 'store'])->name('register.store');
});

/*
|--------------------------------------------------------------------------
| Auth scaffolding (login/logout/two-factor)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| Authenticated area (no guests)
| Keep 'verified' only if you use email verification.
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [HomeController::class, 'index'])->name('dashboard');
    Route::get('/home', fn () => redirect()->route('dashboard'))->name('home');

    /*
    |--------------------------------------------------------------------------
    | App pages (private)
    |--------------------------------------------------------------------------
    */

    // ✅ Meal tracking pages now routed through the controller (loads entries + totals)
    Route::get('/track-meals', [TrackMealsController::class, 'index'])->name('track-meals.index');
    Route::get('/meal-tracker', [TrackMealsController::class, 'index'])->name('meal.tracker');

    // Planner (future use)
    Route::get('/planner', fn () => Inertia::render('planner'))->name('planner');

    // Places pages (Mapbox etc.)
    Route::get('/places', fn () => Inertia::render('Places'))->name('places');
    Route::get('/nearby', fn () => Inertia::render('Places'))->name('nearby');

    /*
    |--------------------------------------------------------------------------
    | Workouts
    |--------------------------------------------------------------------------
    */
    Route::get('/workouts/log', [WorkoutLogController::class, 'index'])->name('workouts.log');
    Route::post('/workouts/log/start', [WorkoutLogController::class, 'start'])->name('workouts.log.start');
    Route::post('/workouts/log/{log}/add-set', [WorkoutLogController::class, 'addSet'])->name('workouts.log.addSet');
    Route::post('/workouts/log/{log}/finish', [WorkoutLogController::class, 'finish'])->name('workouts.log.finish');
    Route::get('/workouts/plan', [WorkoutPlanController::class, 'index'])->name('workouts.plan');
    Route::get('/workouts/progress', [WorkoutLogController::class, 'progress'])->name('workouts.progress');

    /*
    |--------------------------------------------------------------------------
    | Data mutations (POST/DELETE)
    |--------------------------------------------------------------------------
    */
    Route::post('/water', [WaterIntakeController::class, 'store'])->name('water.store');

    // Meals & diet logs
    Route::post('/track-meals/diet', [TrackMealsController::class, 'storeDiet'])->name('track-meals.diet.store');
    Route::post('/track-meals/log', [TrackMealsController::class, 'storeLog'])->name('track-meals.log.store');

    // Individual meal entries (React frontend)
    Route::post('/meal-entries', [MealEntryController::class, 'store'])->name('meal.entries.store');
    Route::delete('/meal-entries/{entry}', [MealEntryController::class, 'destroy'])->name('meal.entries.destroy');

    /*
    |--------------------------------------------------------------------------
    | Profile (render-only)
    |--------------------------------------------------------------------------
    */
    Route::get('/profile', fn () => Inertia::render('settings/profile'))->name('profile.show');

    // Uncomment these if you later re-enable ProfileController endpoints
    // Route::post('/profile/update', [ProfileController::class, 'updateProfileBasic'])->name('profile.update.basic');
    // Route::post('/profile/prefs', [ProfileController::class, 'updatePrefs'])->name('profile.prefs');
    // Route::post('/profile/measurements', [ProfileController::class, 'addMeasurement'])->name('profile.measurements.add');
});

/*
|--------------------------------------------------------------------------
| Public APIs (safe to expose; throttle where needed)
|--------------------------------------------------------------------------
*/
Route::get('/api/places', [PlacesController::class, 'index'])
    ->middleware('throttle:60,1')
    ->name('api.places');

Route::get('/api/places-local', [PlacesLocalController::class, 'index'])->name('api.places.local');
Route::get('/api/foods/search', [FoodController::class, 'search'])->name('foods.search');

/*
|--------------------------------------------------------------------------
| Settings routes (2FA setup page etc.)
|--------------------------------------------------------------------------
*/
require __DIR__ . '/settings.php';

/*
|--------------------------------------------------------------------------
| Fallback
|--------------------------------------------------------------------------
*/
Route::fallback(fn () => Inertia::render('welcome'));
