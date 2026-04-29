<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planner_audit_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('queued');
            $table->string('gpu_load', 10)->default('low');
            $table->jsonb('horizon_days');
            $table->unsignedInteger('total_users')->default(0);
            $table->unsignedInteger('total_runs')->default(0);
            $table->unsignedInteger('completed_runs')->default(0);
            $table->unsignedInteger('success_runs')->default(0);
            $table->unsignedInteger('failed_runs')->default(0);
            $table->unsignedBigInteger('current_user_id')->nullable();
            $table->string('current_user_email')->nullable();
            $table->unsignedSmallInteger('current_horizon_days')->nullable();
            $table->unsignedInteger('average_run_ms')->nullable();
            $table->unsignedInteger('eta_seconds')->nullable();
            $table->timestampTz('eta_updated_at')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->jsonb('report_paths')->nullable();
            $table->jsonb('summary_json')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['requested_by', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planner_audit_runs');
    }
};
