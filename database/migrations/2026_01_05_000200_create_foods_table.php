<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foods', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('nationality')->nullable();
            $table->string('cuisine')->nullable();
            $table->string('category')->nullable();

            $table->decimal('serving_size', 8, 2)->nullable();
            $table->string('serving_unit', 32)->nullable();

            $table->unsignedInteger('calories')->nullable();

            $table->decimal('protein_g', 8, 2)->nullable();
            $table->decimal('carbs_g', 8, 2)->nullable();
            $table->decimal('fat_g', 8, 2)->nullable();
            $table->decimal('fiber_g', 8, 2)->nullable();
            $table->decimal('sugar_g', 8, 2)->nullable();

            $table->unsignedInteger('sodium_mg')->nullable();
            $table->unsignedInteger('cholesterol_mg')->nullable();

            $table->json('tags')->nullable();

            $table->timestampsTz();

            // Common query patterns
            $table->index('name');
            $table->index('category');
            $table->index('cuisine');
        });

        // Postgres-only: text[] column for meal_types (FoodController uses ANY(meal_types))
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE foods ADD COLUMN meal_types text[] NOT NULL DEFAULT ARRAY['breakfast','lunch','dinner','snack','drink']::text[]");

            // Allow only the known categories (subset check)
            DB::statement("ALTER TABLE foods ADD CONSTRAINT foods_meal_types_chk CHECK (meal_types <@ ARRAY['breakfast','lunch','dinner','snack','drink']::text[])");
            DB::statement('CREATE INDEX IF NOT EXISTS foods_meal_types_gin_idx ON foods USING GIN (meal_types)');

            // Fast JSON search on tags
            DB::statement('CREATE INDEX IF NOT EXISTS foods_tags_gin_idx ON foods USING GIN ((tags::jsonb))');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS foods_tags_gin_idx');
            DB::statement('DROP INDEX IF EXISTS foods_meal_types_gin_idx');
            DB::statement('ALTER TABLE foods DROP CONSTRAINT IF EXISTS foods_meal_types_chk');
        }

        Schema::dropIfExists('foods');
    }
};
