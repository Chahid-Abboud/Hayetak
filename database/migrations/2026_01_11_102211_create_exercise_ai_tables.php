<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 120);
            $table->string('slug', 120)->unique();
            $table->timestamps();
        });

        Schema::create('exercise_variants', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('exercise_id');
            $table->unsignedBigInteger('equipment_id')->nullable();

            $table->string('variant_name', 120)->nullable(); // e.g. "Cable", "Incline"
            $table->text('demo_url')->nullable();
            $table->text('demo_video')->nullable();
            $table->jsonb('meta')->nullable();

            $table->timestamps();

            $table->foreign('exercise_id')
                ->references('id')->on('exercises')
                ->onDelete('cascade');

            $table->foreign('equipment_id')
                ->references('id')->on('equipments')
                ->onDelete('set null');

            $table->index(['exercise_id']);
            $table->index(['equipment_id']);
        });

        Schema::create('restrictions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('code', 80)->unique();   // asthma, heart, anemia...
            $table->string('label', 120);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('exercise_restrictions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('exercise_id');
            $table->unsignedBigInteger('restriction_id');

            $table->string('severity', 20)->default('caution'); // avoid|caution|ok
            $table->text('notes')->nullable();
            $table->jsonb('meta')->nullable();

            $table->timestamps();

            $table->foreign('exercise_id')
                ->references('id')->on('exercises')
                ->onDelete('cascade');

            $table->foreign('restriction_id')
                ->references('id')->on('restrictions')
                ->onDelete('cascade');

            $table->unique(['exercise_id', 'restriction_id']);
            $table->index(['restriction_id']);
        });

        Schema::create('exercise_substitutions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('exercise_id');
            $table->unsignedBigInteger('substitute_exercise_id');

            $table->string('reason', 120)->nullable(); // equipment, joint pain, beginner...
            $table->unsignedSmallInteger('priority')->default(5);

            $table->timestamps();

            $table->foreign('exercise_id')
                ->references('id')->on('exercises')
                ->onDelete('cascade');

            $table->foreign('substitute_exercise_id')
                ->references('id')->on('exercises')
                ->onDelete('cascade');

            $table->index(['exercise_id']);
            $table->index(['substitute_exercise_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_substitutions');
        Schema::dropIfExists('exercise_restrictions');
        Schema::dropIfExists('restrictions');
        Schema::dropIfExists('exercise_variants');
        Schema::dropIfExists('equipments');
    }
};
