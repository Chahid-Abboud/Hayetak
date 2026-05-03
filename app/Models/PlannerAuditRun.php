<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlannerAuditRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'requested_by',
        'status',
        'gpu_load',
        'horizon_days',
        'total_users',
        'total_runs',
        'completed_runs',
        'success_runs',
        'failed_runs',
        'current_user_id',
        'current_user_email',
        'current_horizon_days',
        'average_run_ms',
        'eta_seconds',
        'eta_updated_at',
        'started_at',
        'finished_at',
        'report_paths',
        'summary_json',
        'last_error',
    ];

    protected $casts = [
        'horizon_days' => 'array',
        'report_paths' => 'array',
        'summary_json' => 'array',
        'eta_updated_at' => 'datetime',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
