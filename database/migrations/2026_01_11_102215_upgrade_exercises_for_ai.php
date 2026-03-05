<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Add new enrichment columns to exercises (all nullable => no breakage)
        Schema::table('exercises', function (Blueprint $table) {
            $table->string('movement_pattern', 40)->nullable()->after('difficulty');
            $table->string('exercise_type', 40)->nullable()->after('movement_pattern'); // compound/isolation
            $table->string('mechanic', 40)->nullable()->after('exercise_type');        // unilateral/bilateral
            $table->string('plane', 40)->nullable()->after('mechanic');               // sagittal/frontal/transverse
            $table->boolean('home_friendly')->nullable()->after('plane');

            $table->jsonb('joint_stress')->nullable()->after('home_friendly');        // {knee: high, shoulder: low}
            $table->jsonb('cues')->nullable()->after('joint_stress');                 // ["keep core tight", ...]
            $table->jsonb('common_mistakes')->nullable()->after('cues');              // ["shrugging shoulders", ...]

            $table->text('ai_summary')->nullable()->after('common_mistakes');

            $table->unsignedBigInteger('canonical_exercise_id')->nullable()->after('ai_summary');
            $table->foreign('canonical_exercise_id')
                ->references('id')->on('exercises')
                ->onDelete('set null');
        });

        if (DB::getDriverName() === 'pgsql') {
            // 2) Convert existing json columns to jsonb (tags, conditions)
            //    (safe even if null)
            DB::statement("
                ALTER TABLE exercises
                    ALTER COLUMN tags TYPE jsonb
                    USING COALESCE(tags::jsonb, '[]'::jsonb)
            ");

            DB::statement("
                ALTER TABLE exercises
                    ALTER COLUMN conditions TYPE jsonb
                    USING COALESCE(conditions::jsonb, '[]'::jsonb)
            ");
        }

        // 3) Optional: add exercise_variant_id to current plan/log tables (nullable => no breakage)
        Schema::table('workout_plan_day_exercises', function (Blueprint $table) {
            if (! Schema::hasColumn('workout_plan_day_exercises', 'exercise_variant_id')) {
                $table->unsignedBigInteger('exercise_variant_id')->nullable()->after('exercise_id');
                $table->foreign('exercise_variant_id')
                    ->references('id')->on('exercise_variants')
                    ->onDelete('set null');
                $table->index(['exercise_variant_id']);
            }
        });

        Schema::table('workout_log_sets', function (Blueprint $table) {
            if (! Schema::hasColumn('workout_log_sets', 'exercise_variant_id')) {
                $table->unsignedBigInteger('exercise_variant_id')->nullable()->after('exercise_id');
                $table->foreign('exercise_variant_id')
                    ->references('id')->on('exercise_variants')
                    ->onDelete('set null');
                $table->index(['exercise_variant_id']);
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            // 4) Indexes for AI search + filtering
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

            // fast fuzzy search on exercise name
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_name_trgm ON exercises USING GIN (name gin_trgm_ops);');

            // fast filtering on jsonb arrays/objects
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_tags_gin ON exercises USING GIN (tags);');
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_conditions_gin ON exercises USING GIN (conditions);');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop indexes created in up()
            DB::statement('DROP INDEX IF EXISTS exercises_conditions_gin;');
            DB::statement('DROP INDEX IF EXISTS exercises_tags_gin;');
            DB::statement('DROP INDEX IF EXISTS exercises_name_trgm;');
        }

        // Remove variant ids from existing tables (guarded)
        Schema::table('workout_log_sets', function (Blueprint $table) {
            if (Schema::hasColumn('workout_log_sets', 'exercise_variant_id')) {
                // foreign key name can vary; dropForeign(['col']) is safest
                $table->dropForeign(['exercise_variant_id']);
                $table->dropColumn('exercise_variant_id');
            }
        });

        Schema::table('workout_plan_day_exercises', function (Blueprint $table) {
            if (Schema::hasColumn('workout_plan_day_exercises', 'exercise_variant_id')) {
                $table->dropForeign(['exercise_variant_id']);
                $table->dropColumn('exercise_variant_id');
            }
        });

        // Remove added columns from exercises (guarded)
        Schema::table('exercises', function (Blueprint $table) {
            if (Schema::hasColumn('exercises', 'canonical_exercise_id')) {
                $table->dropForeign(['canonical_exercise_id']);
            }

            $cols = [
                'canonical_exercise_id',
                'ai_summary',
                'common_mistakes',
                'cues',
                'joint_stress',
                'home_friendly',
                'plane',
                'mechanic',
                'exercise_type',
                'movement_pattern',
            ];

            // Drop only columns that exist
            foreach ($cols as $col) {
                if (Schema::hasColumn('exercises', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        /**
         * IMPORTANT:
         * Do NOT convert jsonb back to json.
         * - Postgres json has no default GIN operator class
         * - It breaks rollback frequently
         * - jsonb is better for your app + AI anyway
         */
        // (intentionally no ALTER COLUMN ... TYPE json)
    }
};
