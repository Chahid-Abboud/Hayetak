<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('type', 50); // e.g. plan_generator
            $table->string('status', 20)->default('queued'); // queued|running|completed|failed

            $table->jsonb('input_context_json');
            $table->jsonb('output_json')->nullable();

            $table->string('provider', 50)->nullable();      // openai|local|...
            $table->string('model', 100)->nullable();        // gpt-...|llama...
            $table->string('prompt_version', 50)->nullable();
            $table->string('schema_version', 50)->nullable();

            $table->jsonb('usage_json')->nullable();         // tokens, latency, etc.
            $table->jsonb('error_json')->nullable();         // error details if failed

            $table->timestamps();

            $table->index(['user_id', 'type', 'status']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_requests');
    }
};
