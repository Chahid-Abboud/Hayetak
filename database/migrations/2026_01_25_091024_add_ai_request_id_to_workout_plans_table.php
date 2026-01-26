<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workout_plans', function (Blueprint $table) {
            // Add nullable FK to ai_requests so plans can be traced back to the generation request
            $table->foreignId('ai_request_id')
                ->nullable()
                ->after('user_id') // adjust if you want it elsewhere
                ->constrained('ai_requests')
                ->nullOnDelete();

            $table->index('ai_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('workout_plans', function (Blueprint $table) {
            // Drop FK first then column
            $table->dropForeign(['ai_request_id']);
            $table->dropIndex(['ai_request_id']);
            $table->dropColumn('ai_request_id');
        });
    }
};
