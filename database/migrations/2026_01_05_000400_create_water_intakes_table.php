<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('water_intakes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->date('for_day');
            $table->unsignedInteger('ml');
            $table->timestampTz('drank_at')->nullable();

            $table->timestampsTz();

            $table->index(['user_id', 'for_day']);
            $table->index(['user_id', 'drank_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('water_intakes');
    }
};
