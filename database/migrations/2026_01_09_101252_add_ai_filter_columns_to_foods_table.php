<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('foods', function (Blueprint $table) {
            // JSONB arrays for deterministic filtering
            $table->jsonb('allergens')->nullable();      // e.g. ["dairy","nuts","gluten"]
            $table->jsonb('diets_allowed')->nullable();  // e.g. ["vegan","pescetarian","keto"]
            $table->jsonb('ingredients')->nullable();    // optional, later useful for recipe logic

            // Optional but useful for better filtering later:
            // $table->string('food_group', 60)->nullable(); // e.g. "protein", "carb", "fat", "vegetable"
        });

        // Good practice: convert tags from json -> jsonb for better indexing (you already have tags json)
        DB::statement('ALTER TABLE foods ALTER COLUMN tags TYPE jsonb USING tags::jsonb');

        // Add GIN indexes (Postgres) for fast filtering
        DB::statement('CREATE INDEX IF NOT EXISTS foods_allergens_gin_idx ON foods USING GIN (allergens)');
        DB::statement('CREATE INDEX IF NOT EXISTS foods_diets_allowed_gin_idx ON foods USING GIN (diets_allowed)');
        DB::statement('CREATE INDEX IF NOT EXISTS foods_tags_gin_idx ON foods USING GIN (tags)');
    }

    public function down(): void
    {
        // Drop indexes first
        DB::statement('DROP INDEX IF EXISTS foods_allergens_gin_idx');
        DB::statement('DROP INDEX IF EXISTS foods_diets_allowed_gin_idx');
        DB::statement('DROP INDEX IF EXISTS foods_tags_gin_idx');

        // Revert tags back to json (optional—skip if you don’t care about rollback strictness)
        DB::statement('ALTER TABLE foods ALTER COLUMN tags TYPE json USING tags::json');

        Schema::table('foods', function (Blueprint $table) {
            $table->dropColumn(['allergens', 'diets_allowed', 'ingredients']);
        });
    }
};
