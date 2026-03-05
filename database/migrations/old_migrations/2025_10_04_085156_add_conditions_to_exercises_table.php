<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            $table->json('conditions')->nullable()->after('tags'); // MySQL=JSON, Postgres=json
        });

        // Optional: fast search on conditions (Postgres only)
        if (DB::getDriverName() === 'pgsql') {
            // cast to jsonb so it works whether the column is json or jsonb
            DB::statement('CREATE INDEX IF NOT EXISTS exercises_conditions_gin_idx ON exercises USING GIN ((conditions::jsonb));');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS exercises_conditions_gin_idx;');
        }

        Schema::table('exercises', function (Blueprint $table) {
            $table->dropColumn('conditions');
        });
    }
};
