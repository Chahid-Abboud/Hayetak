<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // ---- Basic profile (nullable for backward compatibility) ----
            if (! Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name', 40)->nullable()->after('name');
            }
            if (! Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name', 40)->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username', 24)->nullable()->unique()->after('last_name');
            }
            if (! Schema::hasColumn('users', 'gender')) {
                $table->string('gender', 10)->nullable()->after('username'); // male|female|other
            }
            if (! Schema::hasColumn('users', 'age')) {
                $table->unsignedSmallInteger('age')->nullable()->after('gender');
            }
            if (! Schema::hasColumn('users', 'height_cm')) {
                $table->unsignedSmallInteger('height_cm')->nullable()->after('age');
            }
            if (! Schema::hasColumn('users', 'weight_kg')) {
                $table->decimal('weight_kg', 6, 2)->nullable()->after('height_cm');
            }

            // ---- Medical ----
            if (! Schema::hasColumn('users', 'has_medical_history')) {
                $table->boolean('has_medical_history')->default(false)->after('weight_kg');
            }
            if (! Schema::hasColumn('users', 'medical_history')) {
                $table->text('medical_history')->nullable()->after('has_medical_history');
            }

            // ---- Goals / diet ----
            if (! Schema::hasColumn('users', 'dietary_goal')) {
                $table->string('dietary_goal', 60)->nullable()->after('medical_history');
            }
            if (! Schema::hasColumn('users', 'fitness_goal')) {
                $table->string('fitness_goal', 60)->nullable()->after('dietary_goal');
            }
            if (! Schema::hasColumn('users', 'diet_name')) {
                $table->string('diet_name', 60)->nullable()->after('fitness_goal');
            }
            if (! Schema::hasColumn('users', 'allergies')) {
                $table->json('allergies')->nullable()->after('diet_name');
            }

            // ---- Activity & training ----
            if (! Schema::hasColumn('users', 'activity_level')) {
                $table->string('activity_level', 24)->nullable()->after('allergies');
            }
            if (! Schema::hasColumn('users', 'workout_days_per_week')) {
                $table->unsignedTinyInteger('workout_days_per_week')->nullable()->after('activity_level');
            }
            if (! Schema::hasColumn('users', 'workout_location')) {
                $table->string('workout_location', 8)->nullable()->after('workout_days_per_week'); // home|gym|both
            }

            // ---- Diet experience ----
            if (! Schema::hasColumn('users', 'tried_diet_before')) {
                $table->boolean('tried_diet_before')->nullable()->after('workout_location');
            }
            if (! Schema::hasColumn('users', 'diet_failure_reasons')) {
                $table->json('diet_failure_reasons')->nullable()->after('tried_diet_before');
            }
            if (! Schema::hasColumn('users', 'diet_failure_other')) {
                $table->string('diet_failure_other', 120)->nullable()->after('diet_failure_reasons');
            }

            // Two-factor columns exist via your earlier migration (000200).
            // If not present in your DB for some reason, uncomment:
            /*
            if (!Schema::hasColumn('users', 'two_factor_secret')) {
                $table->text('two_factor_secret')->nullable()->after('remember_token');
            }
            if (!Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            }
            */
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop only if present (safe for multiple environments)
            foreach ([
                'first_name', 'last_name', 'username', 'gender', 'age', 'height_cm', 'weight_kg',
                'has_medical_history', 'medical_history',
                'dietary_goal', 'fitness_goal', 'diet_name', 'allergies',
                'activity_level', 'workout_days_per_week', 'workout_location',
                'tried_diet_before', 'diet_failure_reasons', 'diet_failure_other',
                // 'two_factor_secret','two_factor_recovery_codes',
            ] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
