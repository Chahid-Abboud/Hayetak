<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_prefs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // UI preferences
            $table->string('units', 10)->default('metric'); // metric|imperial
            $table->string('theme', 10)->default('system'); // light|dark|system
            $table->string('home_gym', 191)->nullable();
            $table->boolean('is_public')->default(false);

            // Energy + activity
            $table->integer('bmr_kcal')->nullable();
            $table->integer('tdee_kcal')->nullable();
            $table->decimal('activity_factor', 4, 2)->nullable();

            // Daily targets
            $table->integer('daily_goal_calories')->nullable();
            $table->decimal('daily_goal_protein_g', 6, 1)->nullable();
            $table->decimal('daily_goal_carbs_g', 6, 1)->nullable();
            $table->decimal('daily_goal_fat_g', 6, 1)->nullable();
            $table->unsignedSmallInteger('water_cups_per_day')->nullable();
            $table->unsignedTinyInteger('workout_days_target')->nullable();

            // Flexible json blobs
            $table->json('notifications')->nullable();
            $table->json('settings')->nullable();

            $table->timestampsTz();

            $table->unique('user_id');
        });

        // Enforce allowed values on Postgres (keeps MySQL/SQLite happy)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE user_prefs ADD CONSTRAINT user_prefs_units_chk CHECK (units IN ('metric','imperial'))");
            DB::statement("ALTER TABLE user_prefs ADD CONSTRAINT user_prefs_theme_chk CHECK (theme IN ('light','dark','system'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE user_prefs DROP CONSTRAINT IF EXISTS user_prefs_units_chk');
            DB::statement('ALTER TABLE user_prefs DROP CONSTRAINT IF EXISTS user_prefs_theme_chk');
        }

        Schema::dropIfExists('user_prefs');
    }
};
