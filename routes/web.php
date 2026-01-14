<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\Auth\RegisterWizardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\WaterIntakeController;
use App\Http\Controllers\PlacesController;
use App\Http\Controllers\FoodController;
use App\Http\Controllers\MealEntryController;
use App\Http\Controllers\Workout\WorkoutPlanController;
use App\Http\Controllers\Workout\WorkoutLogController;
use App\Http\Controllers\PlacesLocalController;

/**
 * ✅ NEW (Meal Tracker APIs + Favorites APIs)
 * Make sure these controllers exist (commands below).
 */
use App\Http\Controllers\MealTrackerApiController;
use App\Http\Controllers\FoodFavoriteController;

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

    /*
    |--------------------------------------------------------------------------
    | Dashboard / Home
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard', [HomeController::class, 'index'])->name('dashboard');
    Route::get('/home', fn () => redirect()->route('dashboard'))->name('home');

    /*
    |--------------------------------------------------------------------------
    | App pages (private)
    |--------------------------------------------------------------------------
    */

    // ✅ Meal tracking page (Inertia) - single source of truth
    Route::get('/track-meals', [MealEntryController::class, 'index'])->name('track-meals.index');

    // Optional alias route (same page)
    Route::get('/meal-tracker', [MealEntryController::class, 'index'])->name('meal.tracker');

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
    Route::get('/workouts', fn () => redirect()->route('workouts.plan'))->name('workouts.index');

    Route::get('/workouts/log', [WorkoutLogController::class, 'index'])->name('workouts.log');
    Route::post('/workouts/log/start', [WorkoutLogController::class, 'start'])->name('workouts.log.start');
    Route::post('/workouts/log/{log}/add-set', [WorkoutLogController::class, 'addSet'])->name('workouts.log.addSet');
    Route::post('/workouts/log/{log}/finish', [WorkoutLogController::class, 'finish'])->name('workouts.log.finish');

    Route::get('/workouts/plan', [WorkoutPlanController::class, 'index'])->name('workouts.plan');
    Route::post('/workouts/plan', [WorkoutPlanController::class, 'store'])->name('workouts.plan.store');

    Route::get('/workouts/progress', [WorkoutLogController::class, 'progress'])->name('workouts.progress');

    /*
    |--------------------------------------------------------------------------
    | Data mutations (POST/DELETE)
    |--------------------------------------------------------------------------
    */
    Route::post('/water', [WaterIntakeController::class, 'store'])->name('water.store');

    // Individual meal entries (React frontend uses these)
    Route::post('/meal-entries', [MealEntryController::class, 'store'])->name('meal.entries.store');
    Route::delete('/meal-entries/{entry}', [MealEntryController::class, 'destroy'])->name('meal.entries.destroy');

    /*
    |--------------------------------------------------------------------------
    | ✅ Private APIs (require auth)
    | Put these here so we can:
    | - filter foods by the logged-in user's allergies
    | - return favorite flags safely
    |--------------------------------------------------------------------------
    */

    /**
     * Smart food search
     * GET /api/foods/search?q=...&meal_type=breakfast&category=...&exclude_allergens=1&page=1
     */
    Route::get('/api/foods/search', [FoodController::class, 'search'])->name('foods.search');

    /**
     * Favorites
     * POST /api/foods/{food}/favorite  -> toggle favorite
     * GET  /api/foods/favorites        -> list favorites
     */
    Route::post('/api/foods/{food}/favorite', [FoodFavoriteController::class, 'toggle'])->name('foods.favorite.toggle');
    Route::get('/api/foods/favorites', [FoodFavoriteController::class, 'index'])->name('foods.favorites.index');

    /**
     * Meal tracker dynamic endpoints (calendar + day view + copy/reuse)
     * GET  /api/meal-tracker/day?date=YYYY-MM-DD&meal_type=breakfast
     * GET  /api/meal-tracker/month?month=YYYY-MM
     * POST /api/meal-tracker/copy-day {from_date,to_date,replace}
     */
    Route::get('/api/meal-tracker/day', [MealTrackerApiController::class, 'day'])->name('meal.tracker.day');
    Route::get('/api/meal-tracker/month', [MealTrackerApiController::class, 'month'])->name('meal.tracker.month');
    Route::post('/api/meal-tracker/copy-day', [MealTrackerApiController::class, 'copyDay'])->name('meal.tracker.copyDay');

    /*
    |--------------------------------------------------------------------------
    | Profile (render-only)
    |--------------------------------------------------------------------------
    */
    Route::get('/profile', fn () => Inertia::render('settings/profile'))->name('profile.show');
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
