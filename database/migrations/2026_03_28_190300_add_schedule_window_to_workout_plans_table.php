<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workout_plans', function (Blueprint $table) {
            if (! Schema::hasColumn('workout_plans', 'start_date')) {
                $table->date('start_date')->nullable()->after('goal');
            }

            if (! Schema::hasColumn('workout_plans', 'duration_days')) {
                $table->unsignedSmallInteger('duration_days')->default(7)->after('start_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('workout_plans', function (Blueprint $table) {
            if (Schema::hasColumn('workout_plans', 'duration_days')) {
                $table->dropColumn('duration_days');
            }

            if (Schema::hasColumn('workout_plans', 'start_date')) {
                $table->dropColumn('start_date');
            }
        });
    }
};
