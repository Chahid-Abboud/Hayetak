<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            // Remove redundant text column (you have both condition + conditions)
            if (Schema::hasColumn('exercises', 'condition')) {
                $table->dropColumn('condition');
            }

            // AI-ready fields (non-breaking additions)
            if (!Schema::hasColumn('exercises', 'equipment_list')) {
                $table->json('equipment_list')->nullable(); // convert to jsonb below
            }
            if (!Schema::hasColumn('exercises', 'locations')) {
                $table->json('locations')->nullable(); // convert to jsonb below
            }
            if (!Schema::hasColumn('exercises', 'secondary_muscles')) {
                $table->json('secondary_muscles')->nullable(); // convert to jsonb below
            }

            if (!Schema::hasColumn('exercises', 'movement_pattern')) {
                $table->string('movement_pattern', 30)->nullable();
            }
            if (!Schema::hasColumn('exercises', 'exercise_type')) {
                $table->string('exercise_type', 20)->default('strength');
            }

            // IMPORTANT: your DB/app uses "mechanic" (singular), not "mechanics"
            if (!Schema::hasColumn('exercises', 'mechanic')) {
                $table->string('mechanic', 20)->nullable();
            }

            // Optional generator defaults
            if (!Schema::hasColumn('exercises', 'default_sets')) {
                $table->unsignedSmallInteger('default_sets')->nullable();
            }
            if (!Schema::hasColumn('exercises', 'reps_min')) {
                $table->unsignedSmallInteger('reps_min')->nullable();
            }
            if (!Schema::hasColumn('exercises', 'reps_max')) {
                $table->unsignedSmallInteger('reps_max')->nullable();
            }
            if (!Schema::hasColumn('exercises', 'rest_seconds_min')) {
                $table->unsignedSmallInteger('rest_seconds_min')->nullable();
            }
            if (!Schema::hasColumn('exercises', 'rest_seconds_max')) {
                $table->unsignedSmallInteger('rest_seconds_max')->nullable();
            }

            // Helpful indexes for filtering (create once)
            $table->index(['exercise_type']);
            $table->index(['movement_pattern']);
            $table->index(['mechanic']);
        });

        // Postgres: convert json -> jsonb + enforce defaults so frontend + AI never get null arrays
        if (DB::getDriverName() === 'pgsql') {
            // tags / conditions: json or jsonb -> jsonb (safe COALESCE)
            DB::statement("ALTER TABLE exercises ALTER COLUMN tags TYPE jsonb USING COALESCE(tags::jsonb, '[]'::jsonb)");
            DB::statement("ALTER TABLE exercises ALTER COLUMN conditions TYPE jsonb USING COALESCE(conditions::jsonb, '[]'::jsonb)");

            DB::statement("ALTER TABLE exercises ALTER COLUMN tags SET DEFAULT '[]'::jsonb");
            DB::statement("ALTER TABLE exercises ALTER COLUMN conditions SET DEFAULT '[]'::jsonb");
            DB::statement("ALTER TABLE exercises ALTER COLUMN tags SET NOT NULL");
            DB::statement("ALTER TABLE exercises ALTER COLUMN conditions SET NOT NULL");

            // new json columns -> jsonb with defaults
            DB::statement("ALTER TABLE exercises ALTER COLUMN equipment_list TYPE jsonb USING COALESCE(equipment_list::jsonb, '[]'::jsonb)");
            DB::statement("ALTER TABLE exercises ALTER COLUMN locations TYPE jsonb USING COALESCE(locations::jsonb, '[\"gym\"]'::jsonb)");
            DB::statement("ALTER TABLE exercises ALTER COLUMN secondary_muscles TYPE jsonb USING COALESCE(secondary_muscles::jsonb, '[]'::jsonb)");

            DB::statement("ALTER TABLE exercises ALTER COLUMN equipment_list SET DEFAULT '[]'::jsonb");
            DB::statement("ALTER TABLE exercises ALTER COLUMN locations SET DEFAULT '[\"gym\"]'::jsonb");
            DB::statement("ALTER TABLE exercises ALTER COLUMN secondary_muscles SET DEFAULT '[]'::jsonb");

            DB::statement("ALTER TABLE exercises ALTER COLUMN equipment_list SET NOT NULL");
            DB::statement("ALTER TABLE exercises ALTER COLUMN locations SET NOT NULL");
            DB::statement("ALTER TABLE exercises ALTER COLUMN secondary_muscles SET NOT NULL");

            // Better GIN indexes directly on jsonb
            DB::statement("CREATE INDEX IF NOT EXISTS exercises_tags_gin_idx ON exercises USING GIN (tags)");
            DB::statement("CREATE INDEX IF NOT EXISTS exercises_conditions_gin_idx ON exercises USING GIN (conditions)");
            DB::statement("CREATE INDEX IF NOT EXISTS exercises_equipment_list_gin_idx ON exercises USING GIN (equipment_list)");
            DB::statement("CREATE INDEX IF NOT EXISTS exercises_locations_gin_idx ON exercises USING GIN (locations)");
            DB::statement("CREATE INDEX IF NOT EXISTS exercises_secondary_muscles_gin_idx ON exercises USING GIN (secondary_muscles)");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop GIN indexes first
            DB::statement("DROP INDEX IF EXISTS exercises_tags_gin_idx");
            DB::statement("DROP INDEX IF EXISTS exercises_conditions_gin_idx");
            DB::statement("DROP INDEX IF EXISTS exercises_equipment_list_gin_idx");
            DB::statement("DROP INDEX IF EXISTS exercises_locations_gin_idx");
            DB::statement("DROP INDEX IF EXISTS exercises_secondary_muscles_gin_idx");

            // IMPORTANT: do NOT convert jsonb back to json (keeps rollback stable)
        }

        Schema::table('exercises', function (Blueprint $table) {
            // Drop columns this migration added (only if they exist)
            if (Schema::hasColumn('exercises', 'equipment_list')) $table->dropColumn('equipment_list');
            if (Schema::hasColumn('exercises', 'locations')) $table->dropColumn('locations');
            if (Schema::hasColumn('exercises', 'secondary_muscles')) $table->dropColumn('secondary_muscles');

            if (Schema::hasColumn('exercises', 'movement_pattern')) $table->dropColumn('movement_pattern');
            if (Schema::hasColumn('exercises', 'exercise_type')) $table->dropColumn('exercise_type');

            // mechanic (singular)
            if (Schema::hasColumn('exercises', 'mechanic')) $table->dropColumn('mechanic');

            if (Schema::hasColumn('exercises', 'default_sets')) $table->dropColumn('default_sets');
            if (Schema::hasColumn('exercises', 'reps_min')) $table->dropColumn('reps_min');
            if (Schema::hasColumn('exercises', 'reps_max')) $table->dropColumn('reps_max');
            if (Schema::hasColumn('exercises', 'rest_seconds_min')) $table->dropColumn('rest_seconds_min');
            if (Schema::hasColumn('exercises', 'rest_seconds_max')) $table->dropColumn('rest_seconds_max');
        });
    }
};
