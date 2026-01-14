<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('places_local', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('name');
            $table->string('category', 80)->nullable(); // gym|nutritionist|...

            $table->text('address')->nullable();
            $table->string('city', 120)->nullable();

            $table->decimal('lat', 10, 6);
            $table->decimal('lng', 10, 6);

            $table->json('meta')->nullable();

            $table->timestampsTz();

            $table->index(['user_id', 'category']);
            $table->index(['city', 'category']);
            $table->index(['lat', 'lng']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS places_local_meta_gin_idx ON places_local USING GIN ((meta::jsonb))');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS places_local_meta_gin_idx');
        }

        Schema::dropIfExists('places_local');
    }
};
