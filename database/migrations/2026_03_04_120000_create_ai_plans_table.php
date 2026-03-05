<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // diet|workout
            $table->json('plan_json');
            $table->unsignedInteger('version')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('generation_id');
            $table->timestamps();

            $table->index(['user_id', 'type', 'version']);
            $table->index('generation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_plans');
    }
};

