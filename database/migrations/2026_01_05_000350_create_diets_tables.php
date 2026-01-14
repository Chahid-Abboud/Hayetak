<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->timestampsTz();

            $table->unique(['user_id', 'name']);
            $table->index('user_id');
        });

        Schema::create('diet_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diet_id')->constrained('diets')->cascadeOnDelete();

            $table->string('category', 10); // breakfast|lunch|dinner|snack|drink
            $table->string('label', 191);
            $table->string('default_portion', 64)->nullable();
            $table->unsignedInteger('calories')->nullable();

            $table->timestampsTz();

            $table->index(['diet_id', 'category']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE diet_items ADD CONSTRAINT diet_items_category_chk CHECK (category IN ('breakfast','lunch','dinner','snack','drink'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE diet_items DROP CONSTRAINT IF EXISTS diet_items_category_chk');
        }

        Schema::dropIfExists('diet_items');
        Schema::dropIfExists('diets');
    }
};
