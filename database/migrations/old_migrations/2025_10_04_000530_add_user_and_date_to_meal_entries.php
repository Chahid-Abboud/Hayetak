<?php

// database/migrations/2025_10_04_000000_add_user_and_date_to_meal_entries.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meal_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('meal_entries', 'user_id')) {
                $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
            }
            if (! Schema::hasColumn('meal_entries', 'consumed_at')) {
                $table->timestamp('consumed_at')->nullable()->after('user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('meal_entries', function (Blueprint $table) {
            if (Schema::hasColumn('meal_entries', 'consumed_at')) {
                $table->dropColumn('consumed_at');
            }
            if (Schema::hasColumn('meal_entries', 'user_id')) {
                $table->dropConstrainedForeignId('user_id');
            }
        });
    }
};
