<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('places_local', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., gym/clinic name
            $table->enum('category', ['gym', 'nutritionist']);
            $table->decimal('lat', 10, 6);
            $table->decimal('lng', 10, 6);
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->json('meta')->nullable(); // anything else
            $table->timestamps();

            $table->index(['category', 'lat', 'lng']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('places_local');
    }
};
