<?php

use App\Http\Controllers\Admin\AdminActionLogController;
use App\Http\Controllers\Admin\AdminAssignmentController;
use App\Http\Controllers\Admin\AdminExerciseController;
use App\Http\Controllers\Admin\AdminMealController;
<<<<<<< HEAD
use App\Http\Controllers\Admin\AdminMessageModerationController;
=======
>>>>>>> origin/main
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AdminPlaceLocalController;
use App\Http\Controllers\Admin\AdminProfessionalController;
use App\Http\Controllers\Admin\AdminProfessionalVerificationController;
use App\Http\Controllers\Admin\AdminProgressController;
use App\Http\Controllers\Admin\AdminSafetyProfileController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Ai\ChatController;
use App\Http\Controllers\Ai\PlanGenerationController;
use App\Http\Controllers\Ai\PlannerAuditController;
use App\Http\Controllers\Ai\PlannerHealthController;
use App\Http\Controllers\Ai\PlannerPageController;
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
use App\Http\Controllers\Professional\NutritionistDietPlanController;
use App\Http\Controllers\Professional\ProfessionalClientController;
use App\Http\Controllers\Professional\TrainerProgressNoteController;
use App\Http\Controllers\Professional\TrainerWorkoutPlanController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\UserNotificationController;
use App\Http\Controllers\WaterIntakeController;
use App\Http\Controllers\Workout\WorkoutLogController;
use App\Http\Controllers\Workout\WorkoutPlanController;
use Illuminate\Support\Facades\Route;
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

    Route::get('/planner', fn () => redirect()->route('ai.planner'))->name('planner');
    Route::get('/ai/planner', [PlannerPageController::class, 'show'])->name('ai.planner');
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
    Route::post('/api/meal-tracker/planned-items/{nutritionPlanItem}/log', [MealTrackerApiController::class, 'logPlannedItem'])
        ->name('meal.tracker.planned.log');

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
        Route::get('/admin', fn () => Inertia::render('admin/overview/index'))->name('admin.overview.index');
<<<<<<< HEAD
        Route::get('/admin/verifications', fn () => Inertia::render('admin/professional-verifications/index'))->name('admin.verifications.index');
        Route::get('/admin/users', fn () => Inertia::render('admin/users/index'))->name('admin.users.index');
        Route::get('/admin/users/{user}', fn ($user) => Inertia::render('admin/users/show', ['userId' => (int) $user]))->name('admin.users.show');
        Route::get('/admin/logs', fn () => Inertia::render('admin/logs/index'))->name('admin.logs.index');
        Route::get('/admin/meal-logs', fn () => Inertia::render('admin/meal-logs/index'))->name('admin.meal-logs.index');
        Route::get('/admin/exercises', fn () => Inertia::render('admin/exercises/index'))->name('admin.exercises.index');
=======
        Route::get('/admin/people', fn () => Inertia::render('admin/people/index'))->name('admin.people.index');
        Route::get('/admin/verifications', fn () => Inertia::render('admin/professional-verifications/index'))->name('admin.verifications.index');
        Route::get('/admin/health-data', fn () => Inertia::render('admin/health-data/index'))->name('admin.health-data.index');
        Route::get('/admin/communications', fn () => Inertia::render('admin/communications/index'))->name('admin.communications.index');
        Route::get('/admin/ai-review', fn () => Inertia::render('admin/ai-review/index'))->name('admin.ai-review.index');
        Route::get('/admin/logs-diagnostics', fn () => Inertia::render('admin/logs-diagnostics/index'))->name('admin.logs-diagnostics.index');
        Route::get('/admin/settings', fn () => Inertia::render('admin/settings/index'))->name('admin.settings.index');
        Route::get('/admin/users', fn () => Inertia::render('admin/users/index'))->name('admin.users.index');
        Route::get('/admin/users/{user}', fn ($user) => Inertia::render('admin/users/show', ['userId' => (int) $user]))->name('admin.users.show');
        Route::get('/admin/logs', fn () => Inertia::render('admin/logs/index'))->name('admin.logs.index');
        Route::get('/admin/safety-profiles', fn () => Inertia::render('admin/safety-profiles/index'))->name('admin.safety-profiles.index');
        Route::get('/admin/meal-logs', fn () => Inertia::render('admin/meal-logs/index'))->name('admin.meal-logs.index');
        Route::get('/admin/exercises', fn () => Inertia::render('admin/exercises/index'))->name('admin.exercises.index');
        Route::get('/admin/diagnostics', fn () => Inertia::render('admin/diagnostics/index'))->name('admin.diagnostics.index');
        Route::get('/admin/safety-rules', fn () => Inertia::render('admin/safety-rules/index'))->name('admin.safety-rules.index');
        Route::get('/admin/assignments', fn () => Inertia::render('admin/assignments/index'))->name('admin.assignments.index');
        Route::get('/admin/support-cases', fn () => Inertia::render('admin/support-cases/index'))->name('admin.support-cases.index');
        Route::get('/admin/analytics', fn () => Inertia::render('admin/analytics/index'))->name('admin.analytics.index');
        Route::get('/admin/roles-permissions', fn () => Inertia::render('admin/roles-permissions/index'))->name('admin.roles-permissions.index');
        Route::get('/admin/privacy-compliance', fn () => Inertia::render('admin/privacy-compliance/index'))->name('admin.privacy-compliance.index');
        Route::get('/admin/settings-feature-flags', fn () => Inertia::render('admin/settings-feature-flags/index'))->name('admin.settings-feature-flags.index');
        Route::get('/admin/ai-rollouts', fn () => Inertia::render('admin/ai-rollouts/index'))->name('admin.ai-rollouts.index');
        Route::get('/admin/ai/planner', fn () => Inertia::render('admin/ai/planner/index'))->name('admin.ai.planner.index');
        Route::get('/admin/ai/coach', fn () => Inertia::render('admin/ai/coach/index'))->name('admin.ai.coach.index');
>>>>>>> origin/main
        Route::get('/admin/notifications', fn () => Inertia::render('admin/notifications/index'))->name('admin.notifications.index');
        Route::get('/admin/professional-verifications', fn () => Inertia::render('admin/professional-verifications/index'))->name('admin.professional-verifications.index');
        Route::get('/admin/professionals', fn () => Inertia::render('admin/professionals/index'))->name('admin.professionals.index');
        Route::get('/admin/meals', fn () => Inertia::render('admin/meals/index'))->name('admin.meals.index');
        Route::get('/admin/places', fn () => Inertia::render('admin/places/index'))->name('admin.places.index');
        Route::get('/admin/progress', fn () => Inertia::render('admin/progress/index'))->name('admin.progress.index');
<<<<<<< HEAD
        Route::get('/admin/message-moderations', fn () => Inertia::render('admin/message-moderations/index'))->name('admin.message-moderations.index');
=======
>>>>>>> origin/main
    });

    // RBAC APIs (session-authenticated)
    Route::prefix('/api')->group(function () {
        Route::get('/notifications', [UserNotificationController::class, 'index']);
        Route::post('/notifications/{notification}/read', [UserNotificationController::class, 'markRead']);
        Route::post('/notifications/{notification}/dismiss', [UserNotificationController::class, 'dismiss']);

        Route::get('/messages/conversations', [ConversationController::class, 'index']);
        Route::post('/messages/conversations', [ConversationController::class, 'store']);
        Route::get('/messages/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
        Route::get('/messages/conversations/{conversation}/context', [ConversationController::class, 'context']);
        Route::post('/messages/conversations/{conversation}/messages', [MessageController::class, 'store']);

        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::post('/appointments', [AppointmentController::class, 'store']);
        Route::patch('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
<<<<<<< HEAD
        Route::post('/appointments/{appointment}/request-checkup', [AppointmentController::class, 'requestCheckup']);
=======
>>>>>>> origin/main

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
        Route::middleware('role:admin')->group(function () {
            Route::post('/ai/planner-audits', [PlannerAuditController::class, 'store']);
            Route::get('/ai/planner-audits/latest', [PlannerAuditController::class, 'latest']);
            Route::get('/ai/planner-audits/{plannerAuditRun}', [PlannerAuditController::class, 'show']);
            Route::patch('/ai/planner-audits/{plannerAuditRun}', [PlannerAuditController::class, 'update']);
        });

        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/users', [AdminUserController::class, 'index']);
            Route::get('/admin/users/{user}', [AdminUserController::class, 'show']);
            Route::put('/admin/users/{user}', [AdminUserController::class, 'update']);
            Route::patch('/admin/users/{user}/verification', [AdminUserController::class, 'toggleVerification']);
            Route::post('/admin/users/bulk-update', [AdminUserController::class, 'bulkUpdate']);
            Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy']);
            Route::get('/admin/notifications', [AdminNotificationController::class, 'index']);
            Route::post('/admin/notifications', [AdminNotificationController::class, 'store']);
            Route::post('/admin/notifications/{adminActionLog}/resend-failed', [AdminNotificationController::class, 'resendFailed']);
            Route::get('/admin/action-logs', [AdminActionLogController::class, 'index']);
            Route::get('/admin/assignments', [AdminAssignmentController::class, 'index']);
            Route::post('/admin/assignments', [AdminAssignmentController::class, 'store']);
            Route::delete('/admin/assignments/{assignment}', [AdminAssignmentController::class, 'destroy']);
            Route::get('/admin/professional-verifications', [AdminProfessionalVerificationController::class, 'index']);
            Route::patch('/admin/professional-verifications/{professionalVerification}/review', [AdminProfessionalVerificationController::class, 'review']);

            Route::get('/admin/professionals', [AdminProfessionalController::class, 'index']);
            Route::get('/admin/professionals/{user}', [AdminProfessionalController::class, 'show']);
            Route::put('/admin/professionals/{user}', [AdminProfessionalController::class, 'update']);

            Route::get('/admin/foods', [AdminMealController::class, 'foods']);
            Route::post('/admin/foods', [AdminMealController::class, 'upsertFood']);
            Route::put('/admin/foods/{food}', [AdminMealController::class, 'upsertFood']);
            Route::patch('/admin/foods/{food}/hide', [AdminMealController::class, 'hideFood']);
            Route::post('/admin/foods/{food}/merge', [AdminMealController::class, 'mergeFood']);
            Route::delete('/admin/foods/{food}', [AdminMealController::class, 'destroyFood']);
            Route::get('/admin/meal-entries', [AdminMealController::class, 'mealEntries']);
            Route::put('/admin/meal-entries/{mealEntry}', [AdminMealController::class, 'updateMealEntry']);
            Route::delete('/admin/meal-entries/{mealEntry}', [AdminMealController::class, 'destroyMealEntry']);

            Route::get('/admin/exercises', [AdminExerciseController::class, 'index']);
            Route::post('/admin/exercises', [AdminExerciseController::class, 'upsert']);
            Route::put('/admin/exercises/{exercise}', [AdminExerciseController::class, 'upsert']);
            Route::patch('/admin/exercises/{exercise}/hide', [AdminExerciseController::class, 'hide']);
            Route::post('/admin/exercises/{exercise}/alternatives', [AdminExerciseController::class, 'addAlternative']);
            Route::post('/admin/exercises/{exercise}/restrictions', [AdminExerciseController::class, 'markUnsafe']);

            Route::get('/admin/places-local', [AdminPlaceLocalController::class, 'index']);
            Route::post('/admin/places-local', [AdminPlaceLocalController::class, 'store']);
            Route::put('/admin/places-local/{placeLocal}', [AdminPlaceLocalController::class, 'update']);
            Route::patch('/admin/places-local/{placeLocal}/hide', [AdminPlaceLocalController::class, 'hide']);
            Route::post('/admin/places-local/{placeLocal}/validate-coordinates', [AdminPlaceLocalController::class, 'validateCoordinates']);
            Route::delete('/admin/places-local/{placeLocal}', [AdminPlaceLocalController::class, 'destroy']);

            Route::get('/admin/progress', [AdminProgressController::class, 'index']);
            Route::post('/admin/progress', [AdminProgressController::class, 'store']);
            Route::put('/admin/progress/{measurement}', [AdminProgressController::class, 'update']);
            Route::post('/admin/progress/{measurement}/outlier', [AdminProgressController::class, 'markOutlier']);
            Route::delete('/admin/progress/{measurement}', [AdminProgressController::class, 'destroy']);

            Route::get('/admin/safety-profiles', [AdminSafetyProfileController::class, 'index']);
<<<<<<< HEAD
            Route::get('/admin/message-moderations', [AdminMessageModerationController::class, 'index']);
            Route::patch('/admin/message-moderations/{messageModeration}/resolve', [AdminMessageModerationController::class, 'resolve']);
=======
>>>>>>> origin/main
        });
    });
});

/*
|--------------------------------------------------------------------------
| Authenticated APIs Needed During Onboarding (Email Not Verified Yet)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('/api')->group(function () {
    Route::get('/ai/conversations', [ChatController::class, 'index']);
    Route::get('/ai/conversations/{conversation}/messages', [ChatController::class, 'messages']);

    Route::post('/ai/plan', [PlanGenerationController::class, 'store'])
        ->middleware('ai.rate_limit:plan');

    Route::post('/ai/plan/background', [PlanGenerationController::class, 'generate'])
        ->middleware('ai.rate_limit:plan');

    Route::get('/ai/plan/health', PlannerHealthController::class);

    Route::post('/ai/chat', [ChatController::class, 'store'])
        ->middleware('ai.rate_limit:chat');

    Route::post('/ai/chat/stream', [ChatController::class, 'stream'])
        ->middleware('ai.rate_limit:chat');
});

/*
|--------------------------------------------------------------------------
| Public APIs
|--------------------------------------------------------------------------
*/
Route::get('/csrf-token', fn () => response()->json([
    'csrf_token' => csrf_token(),
]))->name('csrf-token');

Route::get('/api/places', [PlacesController::class, 'index'])
    ->middleware('throttle:60,1')
    ->name('api.places');

Route::get('/api/places-local', [PlacesLocalController::class, 'index'])->name('api.places.local');

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
