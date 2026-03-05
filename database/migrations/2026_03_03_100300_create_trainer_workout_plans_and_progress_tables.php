<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainer_workout_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('trainer_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 160);
            $table->json('plan_json')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['client_id', 'created_at']);
            $table->index(['trainer_id', 'created_at']);
        });

        Schema::create('trainer_progress_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('trainer_id')->constrained('users')->cascadeOnDelete();
            $table->date('recorded_on');
            $table->json('metrics')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['client_id', 'recorded_on']);
            $table->index(['trainer_id', 'recorded_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainer_progress_notes');
        Schema::dropIfExists('trainer_workout_plans');
    }
};
