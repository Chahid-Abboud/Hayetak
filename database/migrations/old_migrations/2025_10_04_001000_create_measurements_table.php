<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('measurements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('type', ['weight', 'height', 'waist', 'hips', 'chest', 'arm', 'thigh']);
            $table->decimal('value', 8, 2); // in kg/cm
            $table->timestamps();

            $table->unique(['user_id', 'date', 'type'], 'uniq_user_date_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measurements');
    }
};
