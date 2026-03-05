<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workout_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('workout_date');
            $table->foreignId('workout_plan_day_id')->nullable()->constrained('workout_plan_days')->nullOnDelete();
            $table->unsignedSmallInteger('duration_min')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'workout_date']);
        });

        Schema::create('workout_log_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_log_id')->constrained('workout_logs')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->restrictOnDelete();
            $table->unsignedTinyInteger('set_number');
            $table->decimal('weight', 6, 2)->nullable();
            $table->unsignedTinyInteger('reps')->nullable();
            $table->timestamps();

            $table->unique(['workout_log_id', 'set_number', 'exercise_id'], 'uniq_log_set');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workout_log_sets');
        Schema::dropIfExists('workout_logs');
    }
};
