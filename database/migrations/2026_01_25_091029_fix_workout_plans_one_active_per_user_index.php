<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        // Drop the bad index if it exists (it blocks history: only one plan per user ever)
        DB::statement('DROP INDEX IF EXISTS workout_plans_one_active_per_user');

        // Create the correct partial unique index: only one ACTIVE plan per user
        if ($driver === 'sqlite') {
            DB::statement("
                CREATE UNIQUE INDEX workout_plans_one_active_per_user
                ON workout_plans (user_id)
                WHERE is_active = 1
            ");
        } else {
            DB::statement("
                CREATE UNIQUE INDEX workout_plans_one_active_per_user
                ON workout_plans (user_id)
                WHERE is_active = true
            ");
        }
    }

    public function down(): void
    {
        // Rollback: drop the partial index
        DB::statement('DROP INDEX IF EXISTS workout_plans_one_active_per_user');

        // Optional: recreate the old behavior (NOT recommended, but keeps down() symmetrical)
        DB::statement("
            CREATE UNIQUE INDEX workout_plans_one_active_per_user
            ON workout_plans (user_id)
        ");
    }
};
