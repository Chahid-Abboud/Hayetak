<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            // Add nullable error_message for debugging + training logs
            if (!Schema::hasColumn('ai_requests', 'error_message')) {
                $table->text('error_message')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            if (Schema::hasColumn('ai_requests', 'error_message')) {
                $table->dropColumn('error_message');
            }
        });
    }
};
