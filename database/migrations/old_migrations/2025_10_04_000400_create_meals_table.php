<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('meals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('eaten_on')->index();
            $table->enum('type', ['breakfast','lunch','dinner','snack'])->index();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->unique(['user_id','eaten_on','type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meals');
    }
};
