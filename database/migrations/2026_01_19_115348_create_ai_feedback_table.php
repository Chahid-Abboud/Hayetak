<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_feedback', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ai_request_id')->constrained('ai_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('action', 20); // accepted|edited|rejected
            $table->unsignedTinyInteger('rating')->nullable(); // optional 1-5
            $table->jsonb('edited_output_json')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['ai_request_id']);
            $table->index(['user_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_feedback');
    }
};
