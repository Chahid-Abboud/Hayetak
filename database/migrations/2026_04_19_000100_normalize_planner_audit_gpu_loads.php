<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('planner_audit_runs')) {
            return;
        }

        DB::table('planner_audit_runs')
            ->where('gpu_load', 'mid')
            ->update(['gpu_load' => 'medium']);

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE planner_audit_runs ALTER COLUMN gpu_load SET DEFAULT 'low'");
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE planner_audit_runs MODIFY gpu_load VARCHAR(10) NOT NULL DEFAULT 'low'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('planner_audit_runs')) {
            return;
        }

        DB::table('planner_audit_runs')
            ->where('gpu_load', 'medium')
            ->update(['gpu_load' => 'mid']);

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE planner_audit_runs ALTER COLUMN gpu_load SET DEFAULT 'mid'");
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE planner_audit_runs MODIFY gpu_load VARCHAR(10) NOT NULL DEFAULT 'mid'");
        }
    }
};
