<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nutrition_plans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_request_id')->nullable()->constrained('ai_requests')->nullOnDelete();

            $table->string('name')->nullable();
            $table->string('goal', 50)->nullable(); // fat_loss|muscle_gain|maintenance etc (optional)
            $table->date('start_date')->nullable();
            $table->unsignedSmallInteger('duration_days')->default(7);
            $table->boolean('is_active')->default(false);

            $table->jsonb('targets_json')->nullable(); // calories/macros targets, notes
            $table->jsonb('meta')->nullable();         // extra info (prompt/model snapshot, etc.)

            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['ai_request_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_plans');
    }
};
