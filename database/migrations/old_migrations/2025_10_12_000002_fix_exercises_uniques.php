<?php

// database/migrations/2025_10_12_000003_fix_exercises_uniques_v2.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Drop every UNIQUE that is only on (name)
        DB::statement(<<<'SQL'
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM   pg_constraint c
    WHERE  c.contype = 'u'
       AND c.conrelid = 'exercises'::regclass
       AND (
             SELECT array_agg(a.attname ORDER BY ord)
             FROM   unnest(c.conkey) WITH ORDINALITY AS k(attnum,ord)
             JOIN   pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
           ) = ARRAY['name']
  LOOP
    EXECUTE format('ALTER TABLE exercises DROP CONSTRAINT %I', r.conname);
  END LOOP;
END$$;
SQL);

        // 2) Ensure composite UNIQUE(name, equipment) exists
        DB::statement(<<<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'exercises'::regclass
      AND contype  = 'u'
      AND conname  = 'exercises_name_equipment_unique'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_name_equipment_unique UNIQUE (name, equipment);
  END IF;
END$$;
SQL);
    }

    public function down(): void
    {
        // Remove the composite unique if present, and (optionally) restore UNIQUE(name)
        DB::statement('ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_equipment_unique');
        DB::statement('ALTER TABLE exercises ADD CONSTRAINT exercises_name_unique UNIQUE (name)');
    }
};
