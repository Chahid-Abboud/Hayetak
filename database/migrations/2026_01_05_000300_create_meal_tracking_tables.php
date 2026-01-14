<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Roll-up table (optional, but you already have a Meal model)
        Schema::create('meals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->timestampTz('logged_at');
            $table->string('meal_type', 10); // breakfast|lunch|dinner|snack|drink
            $table->string('name', 191)->nullable();
            $table->text('notes')->nullable();

            // Optional totals (can be computed, but helpful for caching)
            $table->unsignedInteger('tot_calories')->nullable();
            $table->decimal('tot_protein_g', 8, 2)->nullable();
            $table->decimal('tot_carbs_g', 8, 2)->nullable();
            $table->decimal('tot_fat_g', 8, 2)->nullable();

            $table->timestampsTz();

            $table->index(['user_id', 'logged_at']);
            $table->index(['user_id', 'meal_type', 'logged_at']);
        });

        // Primary tracker used by controllers: MealEntry + Food
        Schema::create('meal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('food_id')->constrained('foods')->restrictOnDelete();

            $table->string('meal_type', 10); // breakfast|lunch|dinner|snack|drink
            $table->decimal('servings', 8, 2)->default(1.00);

            // You store day-level entries; keep it as DATE for simple queries
            $table->date('eaten_at');

            $table->timestampsTz();

            $table->index(['user_id', 'eaten_at']);
            $table->index(['user_id', 'meal_type', 'eaten_at']);
            $table->index('food_id');
        });

        // Manual/photo log fallback (still referenced by TrackMealsController)
        Schema::create('meal_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->date('consumed_at');
            $table->text('other_notes')->nullable();
            $table->string('photo_path', 191)->nullable();

            $table->timestampsTz();

            $table->unique(['user_id', 'consumed_at']);
            $table->index(['user_id', 'consumed_at']);
        });

        Schema::create('meal_log_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meal_log_id')->constrained('meal_logs')->cascadeOnDelete();

            $table->string('category', 10); // breakfast|lunch|dinner|snack|drink
            $table->string('label', 191);
            $table->decimal('quantity', 8, 2)->nullable();
            $table->string('unit', 32)->nullable();

            // Optional macros (safe for future)
            $table->unsignedInteger('calories')->nullable();
            $table->decimal('protein', 8, 2)->nullable();
            $table->decimal('carbs', 8, 2)->nullable();
            $table->decimal('fat', 8, 2)->nullable();

            $table->timestampsTz();

            $table->index(['meal_log_id', 'category']);
        });

        Schema::create('meal_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meal_log_id')->constrained('meal_logs')->cascadeOnDelete();

            $table->string('category', 10);
            $table->string('label', 191);
            $table->decimal('quantity', 8, 2)->nullable();
            $table->string('unit', 32)->nullable();

            $table->timestampsTz();

            $table->index(['meal_log_id', 'category']);
        });

        // Postgres: enforce allowed values
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE meals ADD CONSTRAINT meals_meal_type_chk CHECK (meal_type IN ('breakfast','lunch','dinner','snack','drink'))");
            DB::statement("ALTER TABLE meal_entries ADD CONSTRAINT meal_entries_meal_type_chk CHECK (meal_type IN ('breakfast','lunch','dinner','snack','drink'))");
            DB::statement("ALTER TABLE meal_log_items ADD CONSTRAINT meal_log_items_category_chk CHECK (category IN ('breakfast','lunch','dinner','snack','drink'))");
            DB::statement("ALTER TABLE meal_selections ADD CONSTRAINT meal_selections_category_chk CHECK (category IN ('breakfast','lunch','dinner','snack','drink'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE meal_selections DROP CONSTRAINT IF EXISTS meal_selections_category_chk');
            DB::statement('ALTER TABLE meal_log_items DROP CONSTRAINT IF EXISTS meal_log_items_category_chk');
            DB::statement('ALTER TABLE meal_entries DROP CONSTRAINT IF EXISTS meal_entries_meal_type_chk');
            DB::statement('ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_meal_type_chk');
        }

        Schema::dropIfExists('meal_selections');
        Schema::dropIfExists('meal_log_items');
        Schema::dropIfExists('meal_logs');
        Schema::dropIfExists('meal_entries');
        Schema::dropIfExists('meals');
    }
};
