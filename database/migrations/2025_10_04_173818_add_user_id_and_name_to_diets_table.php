<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diets', function (Blueprint $table) {
            // add columns
            $table->foreignId('user_id')->after('id')->constrained()->cascadeOnDelete();
            $table->string('name', 120)->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('diets', function (Blueprint $table) {
            // rollback cleanly
            $table->dropConstrainedForeignId('user_id'); // drops FK + column in one go (Laravel 9+)
            $table->dropColumn('name');
        });
    }
};
