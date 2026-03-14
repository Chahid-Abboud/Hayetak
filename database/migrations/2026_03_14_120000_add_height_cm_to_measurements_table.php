<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('measurements') || Schema::hasColumn('measurements', 'height_cm')) {
            return;
        }

        Schema::table('measurements', function (Blueprint $table) {
            $table->unsignedSmallInteger('height_cm')->nullable()->after('weight_kg');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('measurements') || ! Schema::hasColumn('measurements', 'height_cm')) {
            return;
        }

        Schema::table('measurements', function (Blueprint $table) {
            $table->dropColumn('height_cm');
        });
    }
};
