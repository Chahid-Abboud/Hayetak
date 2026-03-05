<?php

// database/migrations/2025_01_01_000000_create_foods_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foods', function (Blueprint $table) {
            $table->bigIncrements('id');             // from CSV "id"
            $table->string('name');                  // "name"
            $table->string('category')->nullable();  // "category"
            $table->string('cuisine')->nullable();   // "cuisine"
            $table->decimal('serving_size', 8, 1)->nullable(); // "serving_size"
            $table->string('serving_unit', 20)->nullable();    // "serving_unit"

            $table->decimal('calories', 8, 1)->nullable();   // "calories"
            $table->decimal('protein_g', 8, 1)->nullable();   // "protein_g"
            $table->decimal('carbs_g', 8, 1)->nullable();   // "carbs_g"
            $table->decimal('fat_g', 8, 1)->nullable();   // "fat_g"
            $table->decimal('fiber_g', 8, 1)->nullable();   // "fiber_g"
            $table->decimal('sugar_g', 8, 1)->nullable();   // "sugar_g"

            $table->unsignedSmallInteger('sodium_mg')->nullable();       // up to ~1600
            $table->unsignedSmallInteger('cholesterol_mg')->nullable();  // up to ~170

            $table->timestamps();

            $table->index('name'); // for ILIKE search
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foods');
    }
};
