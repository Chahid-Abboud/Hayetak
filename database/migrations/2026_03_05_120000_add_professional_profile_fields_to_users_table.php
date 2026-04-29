<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'professional_bio')) {
                $table->text('professional_bio')->nullable();
            }
            if (! Schema::hasColumn('users', 'specialties')) {
                $table->json('specialties')->nullable();
            }
            if (! Schema::hasColumn('users', 'city')) {
                $table->string('city', 120)->nullable();
            }
            if (! Schema::hasColumn('users', 'contact_display')) {
                $table->string('contact_display', 160)->nullable();
            }
            if (! Schema::hasColumn('users', 'profile_lat')) {
                $table->decimal('profile_lat', 10, 6)->nullable();
            }
            if (! Schema::hasColumn('users', 'profile_lng')) {
                $table->decimal('profile_lng', 10, 6)->nullable();
            }
            if (! Schema::hasColumn('users', 'availability_text')) {
                $table->string('availability_text', 191)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'availability_text',
                'profile_lng',
                'profile_lat',
                'contact_display',
                'city',
                'specialties',
                'professional_bio',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
