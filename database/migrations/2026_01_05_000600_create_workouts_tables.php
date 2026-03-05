<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workout_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('name', 255);
            $table->string('goal', 255)->nullable();
            $table->text('notes')->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(false);

            $table->json('meta')->nullable();

            $table->timestampsTz();

            $table->index(['user_id', 'is_active']);
            $table->index(['user_id', 'is_public']);
        });

        Schema::create('workout_plan_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_plan_id')->constrained('workout_plans')->cascadeOnDelete();

            $table->unsignedTinyInteger('day_index')->nullable(); // 1..7 (nullable for templates)
            $table->string('name', 120)->nullable();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->timestampsTz();

            $table->unique(['workout_plan_id', 'day_index']);
            $table->index('workout_plan_id');
        });

        Schema::create('workout_plan_day_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_plan_day_id')->constrained('workout_plan_days')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->restrictOnDelete();

            $table->unsignedInteger('order_index')->default(0);

            $table->unsignedSmallInteger('sets')->nullable();
            $table->unsignedSmallInteger('reps_min')->nullable();
            $table->unsignedSmallInteger('reps_max')->nullable();
            $table->unsignedSmallInteger('rest_seconds')->nullable();

            $table->decimal('rpe_target', 4, 2)->nullable();
            $table->decimal('rir_target', 4, 2)->nullable();

            $table->text('notes')->nullable();

            $table->timestampsTz();

            $table->unique(['workout_plan_day_id', 'exercise_id']);
            $table->index(['workout_plan_day_id', 'order_index']);
            $table->index('exercise_id');
        });

        Schema::create('workout_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->timestampTz('performed_at');
            $table->unsignedSmallInteger('duration_min')->nullable();
            $table->string('mood', 40)->nullable();
            $table->string('energy', 40)->nullable();

            $table->foreignId('workout_plan_id')->nullable()->constrained('workout_plans')->nullOnDelete();
            $table->foreignId('workout_plan_day_id')->nullable()->constrained('workout_plan_days')->nullOnDelete();

            $table->json('meta')->nullable();
            $table->text('notes')->nullable();

            $table->timestampsTz();

            $table->index(['user_id', 'performed_at']);
            $table->index('workout_plan_id');
        });

        Schema::create('workout_log_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_log_id')->constrained('workout_logs')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->restrictOnDelete();

            $table->unsignedInteger('order_index')->default(0);

            $table->decimal('weight_kg', 7, 2)->nullable();
            $table->unsignedSmallInteger('reps')->nullable();
            $table->unsignedInteger('distance_m')->nullable();
            $table->unsignedInteger('duration_sec')->nullable();

            $table->string('side', 20)->nullable(); // left|right|both (optional)
            $table->boolean('is_warmup')->default(false);

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();

            $table->timestampsTz();

            $table->unique(['workout_log_id', 'exercise_id', 'order_index']);
            $table->index('workout_log_id');
            $table->index('exercise_id');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE workout_plan_days ADD CONSTRAINT workout_plan_days_day_index_chk CHECK (day_index IS NULL OR (day_index >= 1 AND day_index <= 7))');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE workout_plan_days DROP CONSTRAINT IF EXISTS workout_plan_days_day_index_chk');
        }

        Schema::dropIfExists('workout_log_sets');
        Schema::dropIfExists('workout_logs');
        Schema::dropIfExists('workout_plan_day_exercises');
        Schema::dropIfExists('workout_plan_days');
        Schema::dropIfExists('workout_plans');
    }
};
