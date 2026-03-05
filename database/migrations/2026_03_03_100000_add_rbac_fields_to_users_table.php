<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role', 30)->default('client')->index();
            }

            if (! Schema::hasColumn('users', 'verified')) {
                $table->boolean('verified')->default(false)->index();
            }

            if (! Schema::hasColumn('users', 'status')) {
                $table->string('status', 30)->nullable()->index();
            }

            if (! Schema::hasColumn('users', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'deleted_at')) {
                $table->dropSoftDeletes();
            }

            if (Schema::hasColumn('users', 'status')) {
                $table->dropColumn('status');
            }

            if (Schema::hasColumn('users', 'verified')) {
                $table->dropColumn('verified');
            }

            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }
        });
    }
};
