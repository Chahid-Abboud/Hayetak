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
            $table->string('name', 120)->default('My Plan');
            $table->unsignedTinyInteger('days_per_week')->default(3); // 1..7
            $table->json('meta')->nullable(); // split info etc.
            $table->timestamps();
            $table->index('user_id');
        });

        Schema::create('workout_plan_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_plan_id')->constrained('workout_plans')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1=Mon .. 7=Sun
            $table->string('title', 120)->nullable();   // e.g., Push, Legs
            $table->timestamps();

            $table->unique(['workout_plan_id','day_of_week'], 'uniq_plan_day');
        });

        Schema::create('workout_plan_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workout_plan_day_id')->constrained('workout_plan_days')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->restrictOnDelete();

            $table->unsignedTinyInteger('order')->default(1);
            $table->unsignedTinyInteger('sets')->default(3);
            $table->unsignedSmallInteger('reps')->nullable();
            $table->unsignedSmallInteger('rest_sec')->nullable();
            $table->string('tempo', 20)->nullable();
            $table->string('notes', 255)->nullable();

            $table->timestamps();

            $table->unique(['workout_plan_day_id','order'], 'uniq_plan_day_order');
            $table->index(['workout_plan_day_id','exercise_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workout_plan_exercises');
        Schema::dropIfExists('workout_plan_days');
        Schema::dropIfExists('workout_plans');
    }
};
