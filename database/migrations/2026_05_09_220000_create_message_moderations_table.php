<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_moderations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision', 20);
            $table->string('severity', 20)->default('low');
            $table->json('categories')->nullable();
            $table->json('matched_terms')->nullable();
            $table->text('original_body');
            $table->text('sanitized_body')->nullable();
            $table->text('reason')->nullable();
            $table->timestampTz('escalated_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->string('provider', 40)->default('local_rules');
            $table->timestampsTz();

            $table->index(['conversation_id', 'created_at']);
            $table->index(['sender_id', 'decision']);
            $table->index(['decision', 'escalated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_moderations');
    }
};
