<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create table if it doesn't exist (safe on fresh DBs)
        if (! Schema::hasTable('foods')) {
            Schema::create('foods', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('name');
                $table->string('brand')->nullable();

                // Keep both since your JSON has both; UI can choose which to show
                $table->string('nationality')->nullable();
                $table->string('cuisine')->nullable();

                $table->unsignedInteger('calories')->nullable();

                // Use decimals for grams, mg as integers
                $table->decimal('protein_g', 8, 2)->nullable();
                $table->decimal('carbs_g', 8, 2)->nullable();
                $table->decimal('fat_g', 8, 2)->nullable();
                $table->decimal('fiber_g', 8, 2)->nullable();
                $table->decimal('sugar_g', 8, 2)->nullable();

                $table->unsignedInteger('sodium_mg')->nullable();
                $table->unsignedInteger('cholesterol_mg')->nullable();

                // Postgres jsonb; MySQL will use json transparently
                $table->json('tags')->nullable();

                $table->string('category')->nullable();

                // Serving size/unit
                $table->decimal('serving_size', 8, 2)->nullable();
                $table->string('serving_unit', 32)->nullable();

                $table->timestamps();
            });

            return;
        }

        // Otherwise, ensure columns exist with the right names
        Schema::table('foods', function (Blueprint $table) {
            foreach ([
                ['name', fn() => $table->string('name')->nullable()],
                ['brand', fn() => $table->string('brand')->nullable()],
                ['nationality', fn() => $table->string('nationality')->nullable()],
                ['cuisine', fn() => $table->string('cuisine')->nullable()],
                ['calories', fn() => $table->unsignedInteger('calories')->nullable()],
                ['protein_g', fn() => $table->decimal('protein_g', 8, 2)->nullable()],
                ['carbs_g', fn() => $table->decimal('carbs_g', 8, 2)->nullable()],
                ['fat_g', fn() => $table->decimal('fat_g', 8, 2)->nullable()],
                ['fiber_g', fn() => $table->decimal('fiber_g', 8, 2)->nullable()],
                ['sugar_g', fn() => $table->decimal('sugar_g', 8, 2)->nullable()],
                ['sodium_mg', fn() => $table->unsignedInteger('sodium_mg')->nullable()],
                ['cholesterol_mg', fn() => $table->unsignedInteger('cholesterol_mg')->nullable()],
                ['tags', fn() => $table->json('tags')->nullable()],
                ['category', fn() => $table->string('category')->nullable()],
                ['serving_size', fn() => $table->decimal('serving_size', 8, 2)->nullable()],
                ['serving_unit', fn() => $table->string('serving_unit', 32)->nullable()],
            ] as [$col, $adder]) {
                if (! Schema::hasColumn('foods', $col)) {
                    $adder();
                }
            }
        });
    }

    public function down(): void
    {
        // If you want a clean rollback that just removes the added columns (not the table):
        Schema::table('foods', function (Blueprint $table) {
            foreach ([
                'brand','nationality','cuisine','calories','protein_g','carbs_g','fat_g',
                'fiber_g','sugar_g','sodium_mg','cholesterol_mg','tags','category',
                'serving_size','serving_unit'
            ] as $col) {
                if (Schema::hasColumn('foods', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
