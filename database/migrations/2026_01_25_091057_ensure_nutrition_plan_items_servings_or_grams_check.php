<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'nutrition_plan_items_servings_or_grams_chk'
                ) THEN
                    ALTER TABLE nutrition_plan_items
                    ADD CONSTRAINT nutrition_plan_items_servings_or_grams_chk
                    CHECK (servings IS NOT NULL OR grams IS NOT NULL);
                END IF;
            END
            $$;
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('
            ALTER TABLE nutrition_plan_items
            DROP CONSTRAINT IF EXISTS nutrition_plan_items_servings_or_grams_chk
        ');
    }
};
