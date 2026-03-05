<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('body');
            $table->timestampTz('read_at')->nullable();
            $table->timestampTz('dismissed_at')->nullable();
            $table->timestampsTz();

            $table->index(['target_user_id', 'created_at']);
        });

        Schema::create('admin_action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 120);
            $table->string('target_type', 120)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['admin_id', 'created_at']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_action_logs');
        Schema::dropIfExists('notifications');
    }
};
