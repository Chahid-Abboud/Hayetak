<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop the unique on user_id if present
        DB::statement('ALTER TABLE diets DROP CONSTRAINT IF EXISTS diets_user_id_unique;');

        // Optional: keep a plain index for lookups (safe if it already exists)
        Schema::table('diets', function (Blueprint $table) {
            try { $table->index('user_id', 'diets_user_id_index'); } catch (\Throwable $e) {}
        });
    }

    public function down(): void
    {
        // Recreate the unique if you roll back
        DB::statement('ALTER TABLE diets ADD CONSTRAINT diets_user_id_unique UNIQUE (user_id);');

        Schema::table('diets', function (Blueprint $table) {
            try { $table->dropIndex('diets_user_id_index'); } catch (\Throwable $e) {}
        });
    }
};
