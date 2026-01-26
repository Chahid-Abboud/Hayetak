<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nutrition_plan_days', function (Blueprint $table) {
            $table->id();

            $table->foreignId('nutrition_plan_id')->constrained('nutrition_plans')->cascadeOnDelete();

            $table->unsignedSmallInteger('day_index'); // 1..7
            $table->date('date')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->unique(['nutrition_plan_id', 'day_index']);
            $table->index(['nutrition_plan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_plan_days');
    }
};
