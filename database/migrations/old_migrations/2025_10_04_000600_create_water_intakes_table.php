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
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('for_day')->index();
            $table->unsignedInteger('ml'); // single addition
            $table->timestamps();

            $table->index(['user_id', 'for_day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('water_intakes');
    }
};
