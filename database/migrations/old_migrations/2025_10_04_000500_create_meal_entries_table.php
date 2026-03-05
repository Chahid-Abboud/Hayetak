<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('meal_id')->constrained('meals')->cascadeOnDelete();
            $table->foreignId('food_id')->constrained('foods')->restrictOnDelete();

            // quantity eaten (grams/ml)
            $table->decimal('quantity', 8, 2)->default(0);

            // macro snapshot at log time
            $table->unsignedSmallInteger('calories')->nullable();
            $table->decimal('protein_g', 6, 2)->nullable();
            $table->decimal('carbs_g', 6, 2)->nullable();
            $table->decimal('fat_g', 6, 2)->nullable();
            $table->decimal('fiber_g', 6, 2)->nullable();
            $table->decimal('sugar_g', 6, 2)->nullable();
            $table->unsignedSmallInteger('sodium_mg')->nullable();

            $table->timestamps();

            $table->index(['meal_id', 'food_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_entries');
    }
};
