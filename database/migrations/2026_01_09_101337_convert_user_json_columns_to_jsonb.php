<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE users ALTER COLUMN allergies TYPE jsonb USING allergies::jsonb');
        DB::statement('ALTER TABLE users ALTER COLUMN diet_failure_reasons TYPE jsonb USING diet_failure_reasons::jsonb');

        DB::statement('CREATE INDEX IF NOT EXISTS users_allergies_gin_idx ON users USING GIN (allergies)');
        DB::statement('CREATE INDEX IF NOT EXISTS users_diet_failure_reasons_gin_idx ON users USING GIN (diet_failure_reasons)');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS users_allergies_gin_idx');
        DB::statement('DROP INDEX IF EXISTS users_diet_failure_reasons_gin_idx');

        DB::statement('ALTER TABLE users ALTER COLUMN allergies TYPE json USING allergies::json');
        DB::statement('ALTER TABLE users ALTER COLUMN diet_failure_reasons TYPE json USING diet_failure_reasons::json');
    }
};
