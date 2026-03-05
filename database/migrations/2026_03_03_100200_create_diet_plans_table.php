<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diet_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('nutritionist_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 160);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->json('plan_json')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['client_id', 'created_at']);
            $table->index(['nutritionist_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diet_plans');
    }
};
