<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 30);
            $table->string('full_legal_name', 160);
            $table->string('license_number', 120);
            $table->string('authority', 160);
            $table->string('country_state', 160);
            $table->date('expiry_date');
            $table->json('documents')->nullable();
            $table->string('review_status', 30)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['role', 'review_status']);
            $table->index(['user_id', 'review_status']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE professional_verifications ADD CONSTRAINT professional_verifications_role_chk CHECK (role IN ('trainer','nutritionist'))");
            DB::statement("ALTER TABLE professional_verifications ADD CONSTRAINT professional_verifications_review_status_chk CHECK (review_status IN ('pending','approved','rejected','needs_info'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE professional_verifications DROP CONSTRAINT IF EXISTS professional_verifications_review_status_chk');
            DB::statement('ALTER TABLE professional_verifications DROP CONSTRAINT IF EXISTS professional_verifications_role_chk');
        }

        Schema::dropIfExists('professional_verifications');
    }
};

