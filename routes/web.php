<?php

use App\Http\Controllers\Admin\AdminActionLogController;
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AdminMealController;
use App\Http\Controllers\Admin\AdminPlaceLocalController;
use App\Http\Controllers\Admin\AdminProfessionalController;
use App\Http\Controllers\Admin\AdminProfessionalVerificationController;
use App\Http\Controllers\Admin\AdminProgressController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Ai\ChatController;
use App\Http\Controllers\Ai\PlanGenerationController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Auth\RegisterWizardController;
use App\Http\Controllers\Chat\ConversationController;
use App\Http\Controllers\Chat\MessageController;
use App\Http\Controllers\DietitianDiscoveryController;
use App\Http\Controllers\FoodController;
use App\Http\Controllers\FoodFavoriteController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MealEntryController;
use App\Http\Controllers\MealTrackerApiController;
use App\Http\Controllers\PlacesController;
use App\Http\Controllers\PlacesLocalController;
use App\Http\Controllers\Professional\AssignmentController;
use App\Http\Controllers\Professional\ProfessionalClientController;
use App\Http\Controllers\Professional\NutritionistDietPlanController;
use App\Http\Controllers\Professional\TrainerProgressNoteController;
use App\Http\Controllers\Professional\TrainerWorkoutPlanController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\UserNotificationController;
use App\Http\Controllers\WaterIntakeController;
use App\Http\Controllers\Workout\WorkoutLogController;
use App\Http\Controllers\Workout\WorkoutPlanController;
use Illuminate\Support\Facades\Route;
// ✅ ADD THIS
use Inertia\Inertia;

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
require __DIR__.'/auth.php';

/*
|--------------------------------------------------------------------------
| Authenticated area (no guests)
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
    Route::get('/track-meals', [MealEntryController::class, 'index'])->name('track-meals.index');
    Route::get('/meal-tracker', [MealEntryController::class, 'index'])->name('meal.tracker');

    Route::get('/planner', fn () => Inertia::render('workouts/planner'))->name('planner');
    Route::get('/coach', fn () => Inertia::render('ai/chat'))->name('coach');

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

    Route::post('/meal-entries', [MealEntryController::class, 'store'])->name('meal.entries.store');
    Route::delete('/meal-entries/{entry}', [MealEntryController::class, 'destroy'])->name('meal.entries.destroy');

    /*
    |--------------------------------------------------------------------------
    | Private APIs
    |--------------------------------------------------------------------------
    */
    Route::get('/api/foods/search', [FoodController::class, 'search'])->name('foods.search');

    Route::post('/api/foods/{food}/favorite', [FoodFavoriteController::class, 'toggle'])->name('foods.favorite.toggle');
    Route::get('/api/foods/favorites', [FoodFavoriteController::class, 'index'])->name('foods.favorites.index');

    Route::get('/api/meal-tracker/day', [MealTrackerApiController::class, 'day'])->name('meal.tracker.day');
    Route::get('/api/meal-tracker/month', [MealTrackerApiController::class, 'month'])->name('meal.tracker.month');
    Route::post('/api/meal-tracker/copy-day', [MealTrackerApiController::class, 'copyDay'])->name('meal.tracker.copyDay');

    /*
    |--------------------------------------------------------------------------
    | ✅ Profile (FIXED: use controller so props are passed)
    |--------------------------------------------------------------------------
    */
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.show');

    Route::get('/messages', fn () => Inertia::render('messages/index'))->name('messages.index');
    Route::get('/appointments', fn () => Inertia::render('appointments/index'))->name('appointments.index');
    Route::get('/trainer/clients', [ProfessionalClientController::class, 'trainer'])
        ->middleware(['role:trainer', 'professional.verified'])
        ->name('trainer.clients.index');
    Route::get('/dietitian/clients', [ProfessionalClientController::class, 'nutritionist'])
        ->middleware(['role:nutritionist', 'professional.verified'])
        ->name('dietitian.clients.index');

    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/users', fn () => Inertia::render('admin/users/index'))->name('admin.users.index');
        Route::get('/admin/users/{user}', fn ($user) => Inertia::render('admin/users/show', ['userId' => (int) $user]))->name('admin.users.show');
        Route::get('/admin/logs', fn () => Inertia::render('admin/logs/index'))->name('admin.logs.index');
        Route::get('/admin/notifications', fn () => Inertia::render('admin/notifications/index'))->name('admin.notifications.index');
        Route::get('/admin/professional-verifications', fn () => Inertia::render('admin/professional-verifications/index'))->name('admin.professional-verifications.index');
        Route::get('/admin/professionals', fn () => Inertia::render('admin/professionals/index'))->name('admin.professionals.index');
        Route::get('/admin/meals', fn () => Inertia::render('admin/meals/index'))->name('admin.meals.index');
        Route::get('/admin/places', fn () => Inertia::render('admin/places/index'))->name('admin.places.index');
        Route::get('/admin/progress', fn () => Inertia::render('admin/progress/index'))->name('admin.progress.index');
    });

    // RBAC APIs (session-authenticated)
    Route::prefix('/api')->group(function () {
        Route::get('/notifications', [UserNotificationController::class, 'index']);
        Route::post('/notifications/{notification}/read', [UserNotificationController::class, 'markRead']);
        Route::post('/notifications/{notification}/dismiss', [UserNotificationController::class, 'dismiss']);

        Route::get('/messages/conversations', [ConversationController::class, 'index']);
        Route::post('/messages/conversations', [ConversationController::class, 'store']);
        Route::get('/messages/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
        Route::post('/messages/conversations/{conversation}/messages', [MessageController::class, 'store']);

        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::post('/appointments', [AppointmentController::class, 'store']);
        Route::patch('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);

        Route::get('/assignments', [AssignmentController::class, 'index']);
        Route::post('/assignments', [AssignmentController::class, 'store'])->middleware('role:admin');
        Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy'])->middleware('role:admin');

        Route::get('/diet-plans', [NutritionistDietPlanController::class, 'index'])->middleware('professional.verified');
        Route::post('/diet-plans', [NutritionistDietPlanController::class, 'store'])->middleware(['role:admin,nutritionist', 'professional.verified']);
        Route::put('/diet-plans/{dietPlan}', [NutritionistDietPlanController::class, 'update'])->middleware(['role:admin,nutritionist', 'professional.verified']);

        Route::get('/trainer-workout-plans', [TrainerWorkoutPlanController::class, 'index'])->middleware('professional.verified');
        Route::post('/trainer-workout-plans', [TrainerWorkoutPlanController::class, 'store'])->middleware(['role:admin,trainer', 'professional.verified']);
        Route::put('/trainer-workout-plans/{trainerWorkoutPlan}', [TrainerWorkoutPlanController::class, 'update'])->middleware(['role:admin,trainer', 'professional.verified']);

        Route::get('/trainer-progress-notes', [TrainerProgressNoteController::class, 'index'])->middleware('professional.verified');
        Route::post('/trainer-progress-notes', [TrainerProgressNoteController::class, 'store'])->middleware(['role:admin,trainer', 'professional.verified']);

        Route::get('/dietitians', [DietitianDiscoveryController::class, 'index']);
        Route::get('/ai/conversations', [ChatController::class, 'index']);
        Route::get('/ai/conversations/{conversation}/messages', [ChatController::class, 'messages']);
        Route::post('/ai/chat', [ChatController::class, 'store']);

        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/users', [AdminUserController::class, 'index']);
            Route::get('/admin/users/{user}', [AdminUserController::class, 'show']);
            Route::put('/admin/users/{user}', [AdminUserController::class, 'update']);
            Route::patch('/admin/users/{user}/verification', [AdminUserController::class, 'toggleVerification']);
            Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy']);
            Route::get('/admin/notifications', [AdminNotificationController::class, 'index']);
            Route::post('/admin/notifications', [AdminNotificationController::class, 'store']);
            Route::get('/admin/action-logs', [AdminActionLogController::class, 'index']);
            Route::get('/admin/professional-verifications', [AdminProfessionalVerificationController::class, 'index']);
            Route::patch('/admin/professional-verifications/{professionalVerification}/review', [AdminProfessionalVerificationController::class, 'review']);

            Route::get('/admin/professionals', [AdminProfessionalController::class, 'index']);
            Route::get('/admin/professionals/{user}', [AdminProfessionalController::class, 'show']);
            Route::put('/admin/professionals/{user}', [AdminProfessionalController::class, 'update']);

            Route::get('/admin/foods', [AdminMealController::class, 'foods']);
            Route::post('/admin/foods', [AdminMealController::class, 'upsertFood']);
            Route::put('/admin/foods/{food}', [AdminMealController::class, 'upsertFood']);
            Route::delete('/admin/foods/{food}', [AdminMealController::class, 'destroyFood']);
            Route::get('/admin/meal-entries', [AdminMealController::class, 'mealEntries']);
            Route::put('/admin/meal-entries/{mealEntry}', [AdminMealController::class, 'updateMealEntry']);
            Route::delete('/admin/meal-entries/{mealEntry}', [AdminMealController::class, 'destroyMealEntry']);

            Route::get('/admin/places-local', [AdminPlaceLocalController::class, 'index']);
            Route::post('/admin/places-local', [AdminPlaceLocalController::class, 'store']);
            Route::put('/admin/places-local/{placeLocal}', [AdminPlaceLocalController::class, 'update']);
            Route::delete('/admin/places-local/{placeLocal}', [AdminPlaceLocalController::class, 'destroy']);

            Route::get('/admin/progress', [AdminProgressController::class, 'index']);
            Route::post('/admin/progress', [AdminProgressController::class, 'store']);
            Route::put('/admin/progress/{measurement}', [AdminProgressController::class, 'update']);
            Route::delete('/admin/progress/{measurement}', [AdminProgressController::class, 'destroy']);
        });
    });
});

/*
|--------------------------------------------------------------------------
| Public APIs
|--------------------------------------------------------------------------
*/
Route::get('/api/places', [PlacesController::class, 'index'])
    ->middleware('throttle:60,1')
    ->name('api.places');

Route::get('/api/places-local', [PlacesLocalController::class, 'index'])->name('api.places.local');
Route::middleware('auth:sanctum')->post('/ai/generate-plans', [PlanGenerationController::class, 'generate']);

/*
|--------------------------------------------------------------------------
| Settings routes (2FA setup page etc.)
|--------------------------------------------------------------------------
*/
require __DIR__.'/settings.php';

/*
|--------------------------------------------------------------------------
| Fallback
|--------------------------------------------------------------------------
*/
Route::fallback(fn () => Inertia::render('welcome'));
