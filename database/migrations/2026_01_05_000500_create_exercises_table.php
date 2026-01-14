<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('primary_muscle', 120)->nullable();
            $table->string('equipment', 120)->nullable();
            $table->string('difficulty', 40)->nullable();

            // Videos
            $table->text('demo_video')->nullable();
            $table->text('demo_url')->nullable(); // referenced by WorkoutLogController

            // Optional metadata used by your CSV
            $table->text('intensity_level')->nullable();
            $table->text('description')->nullable();
            $table->text('condition')->nullable();

            // Flexible tags / conditions arrays
            $table->json('tags')->nullable();
            $table->json('conditions')->nullable();

            $table->timestampsTz();

            $table->index('name');
            $table->index('primary_muscle');
            $table->index('equipment');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_tags_gin_idx ON exercises USING GIN ((tags::jsonb))');
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_conditions_gin_idx ON exercises USING GIN ((conditions::jsonb))');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS exercises_conditions_gin_idx');
            DB::statement('DROP INDEX IF EXISTS exercises_tags_gin_idx');
        }

        Schema::dropIfExists('exercises');
    }
};
