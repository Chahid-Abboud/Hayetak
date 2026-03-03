<?php

namespace App\Services;

use App\Models\AdminActionLog;
use Illuminate\Database\Eloquent\Model;

class AdminActionLogger
{
    public function log(int $adminId, string $action, ?Model $target = null, array $metadata = []): void
    {
        AdminActionLog::query()->create([
            'admin_id' => $adminId,
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }
}

