<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_client_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->string('professional_role', 30);
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->unique(['professional_id', 'client_id', 'professional_role'], 'assignments_unique');
            $table->index(['client_id', 'professional_role']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE professional_client_assignments ADD CONSTRAINT assignments_role_chk CHECK (professional_role IN ('nutritionist','trainer'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE professional_client_assignments DROP CONSTRAINT IF EXISTS assignments_role_chk');
        }

        Schema::dropIfExists('professional_client_assignments');
    }
};

