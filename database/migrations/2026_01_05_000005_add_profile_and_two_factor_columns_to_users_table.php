<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Assumes Laravel's default users table migration already ran (0001_01_01_000000_create_users_table.php).
        Schema::table('users', function (Blueprint $table) {
            // Fortify 2FA columns (add only if missing)
            if (!Schema::hasColumn('users', 'two_factor_secret')) {
                $table->text('two_factor_secret')->nullable();
            }
            if (!Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable();
            }
            if (!Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestampTz('two_factor_confirmed_at')->nullable();
            }

            // Profile fields
            if (!Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name', 40)->nullable();
            }
            if (!Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name', 40)->nullable();
            }
            if (!Schema::hasColumn('users', 'username')) {
                $table->string('username', 24)->nullable();
            }
            if (!Schema::hasColumn('users', 'gender')) {
                $table->string('gender', 10)->nullable();
            }
            if (!Schema::hasColumn('users', 'age')) {
                $table->smallInteger('age')->nullable();
            }
            if (!Schema::hasColumn('users', 'height_cm')) {
                $table->smallInteger('height_cm')->nullable();
            }
            if (!Schema::hasColumn('users', 'weight_kg')) {
                $table->decimal('weight_kg', 6, 2)->nullable();
            }

            if (!Schema::hasColumn('users', 'has_medical_history')) {
                $table->boolean('has_medical_history')->default(false);
            }
            if (!Schema::hasColumn('users', 'medical_history')) {
                $table->text('medical_history')->nullable();
            }

            if (!Schema::hasColumn('users', 'dietary_goal')) {
                $table->string('dietary_goal', 80)->nullable();
            }
            if (!Schema::hasColumn('users', 'fitness_goal')) {
                $table->string('fitness_goal', 80)->nullable();
            }
            if (!Schema::hasColumn('users', 'diet_name')) {
                $table->string('diet_name', 80)->nullable();
            }

            if (!Schema::hasColumn('users', 'allergies')) {
                $table->json('allergies')->nullable();
            }

            if (!Schema::hasColumn('users', 'activity_level')) {
                $table->string('activity_level', 24)->nullable();
            }
            if (!Schema::hasColumn('users', 'workout_days_per_week')) {
                $table->smallInteger('workout_days_per_week')->nullable();
            }
            if (!Schema::hasColumn('users', 'workout_location')) {
                $table->string('workout_location', 8)->nullable(); // home/gym
            }

            if (!Schema::hasColumn('users', 'tried_diet_before')) {
                $table->boolean('tried_diet_before')->nullable();
            }
            if (!Schema::hasColumn('users', 'diet_failure_reasons')) {
                $table->json('diet_failure_reasons')->nullable();
            }
            if (!Schema::hasColumn('users', 'diet_failure_other')) {
                $table->string('diet_failure_other', 120)->nullable();
            }
        });

        // Optional but recommended: unique username (nullable in Postgres allows multiple NULLs)
        // Use a safe "IF NOT EXISTS" create index statement for PostgreSQL.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username) WHERE username IS NOT NULL');
    }

    public function down(): void
    {
        // We intentionally keep this conservative (do not drop columns in down).
        // Dropping columns can be destructive in mixed dev/real data environments.
        DB::statement('DROP INDEX IF EXISTS users_username_unique');
    }
};
