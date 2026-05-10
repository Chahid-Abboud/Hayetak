<?php

namespace App\Jobs\Ai;

use App\Models\User;
use App\Services\Ai\PlannerService;
use App\Services\AppNotificationService;
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
        public int $days = 14,
        public bool $regenerate = true,
        public ?string $reason = 'queued_generation',
        public bool $generateDiet = true,
        public bool $generateWorkout = true,
    ) {}

    public function handle(
        PlannerService $service,
        AppNotificationService $notifications
    ): void {
        $user = User::find($this->userId);

        if (! $user) {
            return;
        }

        $service->generate($user, [
            'regenerate' => $this->regenerate,
            'reason' => $this->reason,
            'created_by' => $user->id,
            'plan_horizon_days' => $this->days,
            'generate_diet' => $this->generateDiet,
            'generate_workout' => $this->generateWorkout,
        ]);

        $notifications->planGenerated(
            user: $user,
            dietGenerated: $this->generateDiet,
            workoutGenerated: $this->generateWorkout,
            days: $this->days,
        );
    }
}