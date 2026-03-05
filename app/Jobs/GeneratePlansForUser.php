<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Ai\PlannerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GeneratePlansForUser implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public int $days = 7,
        public bool $regenerate = true,
        public ?string $reason = 'queued_generation',
    ) {}

    public function handle(PlannerService $service): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        $service->generate($user, $this->regenerate, $this->reason, $user->id);
    }
}
