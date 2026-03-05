<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('places_local')) {
            Schema::table('places_local', function (Blueprint $table) {
                if (! Schema::hasColumn('places_local', 'description')) {
                    $table->text('description')->nullable();
                }
                if (! Schema::hasColumn('places_local', 'google_maps_link')) {
                    $table->text('google_maps_link')->nullable();
                }
                if (! Schema::hasColumn('places_local', 'google_place_id')) {
                    $table->string('google_place_id', 128)->nullable();
                }
                if (! Schema::hasColumn('places_local', 'last_verified_at')) {
                    $table->timestampTz('last_verified_at')->nullable();
                }
            });

            // Indexes
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS places_local_google_place_id_uidx ON places_local (google_place_id) WHERE google_place_id IS NOT NULL');
                DB::statement('CREATE INDEX IF NOT EXISTS places_local_last_verified_at_idx ON places_local (last_verified_at)');
                DB::statement('CREATE INDEX IF NOT EXISTS places_local_category_city_lower_name_idx ON places_local (category, city, lower(name))');

                // Data-quality constraints
                DB::statement("
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'places_local_description_len_chk'
                        ) THEN
                            ALTER TABLE places_local
                                ADD CONSTRAINT places_local_description_len_chk
                                CHECK (
                                    description IS NULL
                                    OR char_length(btrim(description)) BETWEEN 20 AND 1200
                                );
                        END IF;
                    END
                    $$;
                ");

                DB::statement("
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'places_local_google_maps_link_chk'
                        ) THEN
                            ALTER TABLE places_local
                                ADD CONSTRAINT places_local_google_maps_link_chk
                                CHECK (
                                    google_maps_link IS NULL
                                    OR google_maps_link ~* '^https?://((www\\.)?google\\.[^/]+/maps|maps\\.app\\.goo\\.gl/)'
                                );
                        END IF;
                    END
                    $$;
                ");
            } else {
                Schema::table('places_local', function (Blueprint $table) {
                    $table->unique('google_place_id', 'places_local_google_place_id_uidx');
                    $table->index('last_verified_at', 'places_local_last_verified_at_idx');
                    $table->index(['category', 'city', 'name'], 'places_local_category_city_name_idx');
                });
            }
        }

        if (! Schema::hasTable('places_local_images')) {
            Schema::create('places_local_images', function (Blueprint $table) {
                $table->id();
                $table->foreignId('place_local_id')->constrained('places_local')->cascadeOnDelete();
                $table->text('image_url');
                $table->string('alt_text', 180)->nullable();
                $table->smallInteger('sort_order')->default(0);
                $table->boolean('is_primary')->default(false);
                $table->timestampsTz();

                $table->unique(['place_local_id', 'image_url'], 'places_local_images_place_url_uidx');
                $table->index(['place_local_id', 'sort_order', 'id'], 'places_local_images_place_sort_idx');
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement("
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'places_local_images_sort_order_chk'
                        ) THEN
                            ALTER TABLE places_local_images
                                ADD CONSTRAINT places_local_images_sort_order_chk
                                CHECK (sort_order >= 0);
                        END IF;
                    END
                    $$;
                ");

                DB::statement("
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'places_local_images_image_url_chk'
                        ) THEN
                            ALTER TABLE places_local_images
                                ADD CONSTRAINT places_local_images_image_url_chk
                                CHECK (image_url ~* '^https?://');
                        END IF;
                    END
                    $$;
                ");
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('places_local_images')) {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE places_local_images DROP CONSTRAINT IF EXISTS places_local_images_sort_order_chk');
                DB::statement('ALTER TABLE places_local_images DROP CONSTRAINT IF EXISTS places_local_images_image_url_chk');
            }
            Schema::dropIfExists('places_local_images');
        }

        if (Schema::hasTable('places_local')) {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE places_local DROP CONSTRAINT IF EXISTS places_local_description_len_chk');
                DB::statement('ALTER TABLE places_local DROP CONSTRAINT IF EXISTS places_local_google_maps_link_chk');
                DB::statement('DROP INDEX IF EXISTS places_local_google_place_id_uidx');
                DB::statement('DROP INDEX IF EXISTS places_local_last_verified_at_idx');
                DB::statement('DROP INDEX IF EXISTS places_local_category_city_lower_name_idx');
            } else {
                Schema::table('places_local', function (Blueprint $table) {
                    $table->dropUnique('places_local_google_place_id_uidx');
                    $table->dropIndex('places_local_last_verified_at_idx');
                    $table->dropIndex('places_local_category_city_name_idx');
                });
            }

            Schema::table('places_local', function (Blueprint $table) {
                if (Schema::hasColumn('places_local', 'description')) {
                    $table->dropColumn('description');
                }
                if (Schema::hasColumn('places_local', 'google_maps_link')) {
                    $table->dropColumn('google_maps_link');
                }
                if (Schema::hasColumn('places_local', 'google_place_id')) {
                    $table->dropColumn('google_place_id');
                }
                if (Schema::hasColumn('places_local', 'last_verified_at')) {
                    $table->dropColumn('last_verified_at');
                }
            });
        }
    }
};
