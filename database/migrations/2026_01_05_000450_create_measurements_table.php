<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('measurements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->date('measured_at');

            $table->decimal('weight_kg', 6, 2)->nullable();
            $table->decimal('body_fat_pct', 5, 2)->nullable();

            $table->decimal('neck_cm', 5, 1)->nullable();
            $table->decimal('chest_cm', 5, 1)->nullable();
            $table->decimal('waist_cm', 5, 1)->nullable();
            $table->decimal('hip_cm', 5, 1)->nullable();
            $table->decimal('arm_cm', 5, 1)->nullable();
            $table->decimal('thigh_cm', 5, 1)->nullable();
            $table->decimal('calf_cm', 5, 1)->nullable();

            $table->unsignedSmallInteger('resting_hr')->nullable();
            $table->unsignedSmallInteger('systolic_bp')->nullable();
            $table->unsignedSmallInteger('diastolic_bp')->nullable();

            $table->text('notes')->nullable();

            $table->timestampsTz();

            $table->unique(['user_id', 'measured_at']);
            $table->index(['user_id', 'measured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measurements');
    }
};
