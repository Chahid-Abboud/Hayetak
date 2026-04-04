<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_plans', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_plans', 'ai_request_id')) {
                $table->foreignId('ai_request_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('ai_requests')
                    ->nullOnDelete();

                $table->index(['user_id', 'ai_request_id']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_plans', function (Blueprint $table) {
            if (Schema::hasColumn('ai_plans', 'ai_request_id')) {
                $table->dropForeign(['ai_request_id']);
                $table->dropIndex(['user_id', 'ai_request_id']);
                $table->dropColumn('ai_request_id');
            }
        });
    }
};
