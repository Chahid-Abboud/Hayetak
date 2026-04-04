<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meal_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('meal_entries', 'nutrition_plan_item_id')) {
                $table->foreignId('nutrition_plan_item_id')
                    ->nullable()
                    ->after('food_id')
                    ->constrained('nutrition_plan_items')
                    ->nullOnDelete();

                $table->index('nutrition_plan_item_id');
                $table->unique(
                    ['user_id', 'nutrition_plan_item_id', 'eaten_at'],
                    'meal_entries_user_plan_item_date_unique'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('meal_entries', function (Blueprint $table) {
            if (Schema::hasColumn('meal_entries', 'nutrition_plan_item_id')) {
                $table->dropUnique('meal_entries_user_plan_item_date_unique');
                $table->dropIndex(['nutrition_plan_item_id']);
                $table->dropForeign(['nutrition_plan_item_id']);
                $table->dropColumn('nutrition_plan_item_id');
            }
        });
    }
};
