<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // ← link to users table
            $table->string('name', 120);
            $table->timestamps();

            $table->unique(['user_id']); // optional, one diet per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diets');
    }
};
