<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name', 40)->nullable()->after('id');
            }
            if (! Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name', 40)->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username', 50)->nullable()->unique()->after('last_name');
            }
            if (! Schema::hasColumn('users', 'gender')) {
                $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('username');
            }
            if (! Schema::hasColumn('users', 'age')) {
                $table->unsignedTinyInteger('age')->nullable()->after('gender');
            }
            if (! Schema::hasColumn('users', 'height_cm')) {
                $table->unsignedSmallInteger('height_cm')->nullable()->after('age');
            }
            if (! Schema::hasColumn('users', 'weight_kg')) {
                $table->decimal('weight_kg', 5, 2)->nullable()->after('height_cm');
            }

            // goals & prefs
            if (! Schema::hasColumn('users', 'diet_goal')) {
                $table->string('diet_goal', 40)->nullable()->after('weight_kg');
            }
            if (! Schema::hasColumn('users', 'fitness_goal')) {
                $table->string('fitness_goal', 40)->nullable()->after('diet_goal');
            }
            if (! Schema::hasColumn('users', 'diet_type')) {
                $table->string('diet_type', 40)->nullable()->after('fitness_goal');
            }

            // multi-select + notes
            if (! Schema::hasColumn('users', 'allergies')) {
                $table->json('allergies')->nullable()->after('diet_type');
            }
            if (! Schema::hasColumn('users', 'medical_history')) {
                $table->text('medical_history')->nullable()->after('allergies');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'first_name', 'last_name', 'username', 'gender', 'age', 'height_cm', 'weight_kg',
                'diet_goal', 'fitness_goal', 'diet_type', 'allergies', 'medical_history',
            ] as $c) {
                if (Schema::hasColumn('users', $c)) {
                    $table->dropColumn($c);
                }
            }
        });
    }
};
