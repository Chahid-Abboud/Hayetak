<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_plan_meals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('nutrition_plan_day_id')->constrained('nutrition_plan_days')->cascadeOnDelete();

            $table->string('meal_type', 20); // breakfast|lunch|dinner|snack
            $table->unsignedSmallInteger('order')->default(1); // allow multiple snacks, etc.
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['nutrition_plan_day_id', 'meal_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_plan_meals');
    }
};
