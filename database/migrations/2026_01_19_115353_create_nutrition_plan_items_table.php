<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nutrition_plan_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('nutrition_plan_meal_id')->constrained('nutrition_plan_meals')->cascadeOnDelete();
            $table->foreignId('food_id')->constrained('foods')->restrictOnDelete();

            $table->decimal('servings', 8, 2)->nullable();
            $table->decimal('grams', 10, 2)->nullable();

            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['nutrition_plan_meal_id']);
            $table->index(['food_id']);
        });

        // Postgres: require at least one of servings or grams.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE nutrition_plan_items
                ADD CONSTRAINT nutrition_plan_items_servings_or_grams_chk
                CHECK (servings IS NOT NULL OR grams IS NOT NULL)
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                ALTER TABLE nutrition_plan_items
                DROP CONSTRAINT IF EXISTS nutrition_plan_items_servings_or_grams_chk
            ");
        }

        Schema::dropIfExists('nutrition_plan_items');
    }
};
