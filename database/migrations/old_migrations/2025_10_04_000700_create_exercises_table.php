<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->enum('primary_muscle', [
                'chest', 'back', 'shoulders', 'legs', 'glutes', 'biceps', 'triceps', 'core', 'calves',
            ])->index();
            $table->string('equipment', 80)->nullable();   // barbell, dumbbell, machine, bodyweight
            $table->string('difficulty', 20)->nullable();  // beginner|intermediate|advanced
            $table->string('demo_video')->nullable();      // full YouTube URL
            $table->json('tags')->nullable();              // ["compound","push"]
            $table->timestamps();

            $table->unique(['name', 'equipment'], 'uniq_exercise');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercises');
    }
};
