<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('workout_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100)->default('My Plan');
            $table->unsignedTinyInteger('days_per_week')->default(3);
            $table->timestamps();
        });

        Schema::create('workout_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_index'); // 1..7
            $table->string('title', 100)->nullable();
            $table->timestamps();

            $table->unique(['workout_plan_id','day_index']);
        });

        Schema::create('workout_day_exercise', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_day_id')->constrained('workout_days')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->cascadeOnDelete();
            $table->unsignedTinyInteger('target_sets')->default(3);
            $table->unsignedTinyInteger('target_reps')->default(10);
            $table->timestamps();

            $table->unique(['workout_day_id','exercise_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workout_day_exercise');
        Schema::dropIfExists('workout_days');
        Schema::dropIfExists('workout_plans');
    }
};
