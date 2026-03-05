<?php

// database/migrations/2025_10_12_000001_tune_exercises_schema.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            // columns your seeder writes to
            if (! Schema::hasColumn('exercises', 'primary_muscle')) {
                $table->string('primary_muscle')->nullable();
            }
            if (! Schema::hasColumn('exercises', 'equipment')) {
                $table->string('equipment')->nullable();
            }
            if (! Schema::hasColumn('exercises', 'difficulty')) {
                $table->string('difficulty')->nullable();
            }
            if (! Schema::hasColumn('exercises', 'demo_video')) {
                $table->text('demo_video')->nullable();
            }
            if (! Schema::hasColumn('exercises', 'tags')) {
                $table->jsonb('tags')->nullable();
            }        // Postgres jsonb
            if (! Schema::hasColumn('exercises', 'conditions')) {
                $table->jsonb('conditions')->nullable();
            }  // Postgres jsonb

            // unique key for upsert
            $table->unique(['name', 'equipment'], 'exercises_name_equipment_unique');
        });
    }

    public function down(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            $table->dropUnique('exercises_name_equipment_unique');
            // (leave columns in place; drop only if you really want to)
        });
    }
};
