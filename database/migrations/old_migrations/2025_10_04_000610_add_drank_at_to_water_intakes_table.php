<?php

// database/migrations/2025_10_04_000001_add_drank_at_to_water_intakes_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('water_intakes', function (Blueprint $table) {
            // Use timestampTz for Postgres; index for date-based queries
            $table->timestampTz('drank_at')->nullable()->index()->after('ml');
        });

        // Backfill existing rows with created_at
        DB::table('water_intakes')
            ->whereNull('drank_at')
            ->update(['drank_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('water_intakes', function (Blueprint $table) {
            $table->dropColumn('drank_at');
        });
    }
};
