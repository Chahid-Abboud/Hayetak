<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('foods', function (Blueprint $table) {
            // JSON arrays for deterministic filtering.
            $table->jsonb('allergens')->nullable();
            $table->jsonb('diets_allowed')->nullable();
            $table->jsonb('ingredients')->nullable();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE foods ALTER COLUMN tags TYPE jsonb USING tags::jsonb');
            DB::statement('CREATE INDEX IF NOT EXISTS foods_allergens_gin_idx ON foods USING GIN (allergens)');
            DB::statement('CREATE INDEX IF NOT EXISTS foods_diets_allowed_gin_idx ON foods USING GIN (diets_allowed)');
            DB::statement('CREATE INDEX IF NOT EXISTS foods_tags_gin_idx ON foods USING GIN (tags)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS foods_allergens_gin_idx');
            DB::statement('DROP INDEX IF EXISTS foods_diets_allowed_gin_idx');
            DB::statement('DROP INDEX IF EXISTS foods_tags_gin_idx');
            DB::statement('ALTER TABLE foods ALTER COLUMN tags TYPE json USING tags::json');
        }

        Schema::table('foods', function (Blueprint $table) {
            $table->dropColumn(['allergens', 'diets_allowed', 'ingredients']);
        });
    }
};
