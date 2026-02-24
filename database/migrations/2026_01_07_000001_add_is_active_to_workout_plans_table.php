<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workout_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('workout_plans', 'is_active')) {
                $table->boolean('is_active')->default(false)->index();
            }
        });

        // Enforce: only one active plan per user.
        // Use per-driver SQL so tests on SQLite don't execute PostgreSQL-only syntax.
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_indexes
                        WHERE schemaname = ANY (current_schemas(false))
                          AND indexname = 'workout_plans_one_active_per_user'
                    ) THEN
                        CREATE UNIQUE INDEX workout_plans_one_active_per_user
                        ON workout_plans (user_id)
                        WHERE is_active = true;
                    END IF;
                END $$;
            ");
        } elseif ($driver === 'sqlite') {
            DB::statement("
                CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_one_active_per_user
                ON workout_plans (user_id)
                WHERE is_active = 1
            ");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_indexes
                        WHERE schemaname = ANY (current_schemas(false))
                          AND indexname = 'workout_plans_one_active_per_user'
                    ) THEN
                        DROP INDEX workout_plans_one_active_per_user;
                    END IF;
                END $$;
            ");
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS workout_plans_one_active_per_user');
        }

        Schema::table('workout_plans', function (Blueprint $table) {
            if (Schema::hasColumn('workout_plans', 'is_active')) {
                $table->dropIndex(['is_active']);
                $table->dropColumn('is_active');
            }
        });
    }
};
