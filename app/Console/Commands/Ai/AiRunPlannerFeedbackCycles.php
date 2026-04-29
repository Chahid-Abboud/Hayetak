<?php

namespace App\Console\Commands\Ai;

use App\Jobs\Ai\GeneratePlansForUser;
use App\Models\Ai\AiRequest;
use App\Models\Notification;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class AiRunPlannerFeedbackCycles extends Command
{
    protected $signature = 'ai:run-planner-feedback-cycles
        {--start-date=2026-01-01 : Start date used for cycle tracking (YYYY-MM-DD)}
        {--anchor-date=2026-01-01 : Anchor date for 21-day cycles (YYYY-MM-DD)}
        {--interval-days=21 : Cycle interval in days}
        {--plan-days=21 : Horizon days passed to planner generation}
        {--role=client : User role filter}
        {--user-ids= : Optional comma-separated user IDs}
        {--limit-users=0 : Optional max users to scan}
        {--dry-run=0 : Show actions without dispatching jobs or notifications}
    ';

    protected $description = 'Run 21-day planner feedback cycle checks, queue plan regenerations, and send day 19-23 weight check reminders.';

    public function handle(): int
    {
        if (! (bool) config('ai.planner.feedback_cycle.enabled', true)) {
            $this->warn('Planner feedback cycle is disabled in config(ai.planner.feedback_cycle.enabled).');

            return self::SUCCESS;
        }

        $startDate = $this->parseDate((string) $this->option('start-date'));
        $anchorDate = $this->parseDate((string) $this->option('anchor-date'));
        $intervalDays = max(1, (int) $this->option('interval-days'));
        $planDays = $this->normalizePlanDays((int) $this->option('plan-days'));
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $today = CarbonImmutable::today('UTC');
        $currentCycleIndex = $this->cycleIndex($anchorDate, $today, $intervalDays);

        $users = $this->resolveUsers(
            (string) $this->option('user-ids'),
            (string) $this->option('role'),
            max(0, (int) $this->option('limit-users'))
        );

        if ($users === []) {
            $this->warn('No users matched filters.');

            return self::SUCCESS;
        }

        $queued = 0;
        $reminders = 0;
        $skippedPending = 0;
        $scanned = 0;

        foreach ($users as $user) {
            $scanned++;
            $latestCompleted = AiRequest::query()
                ->where('user_id', $user->id)
                ->where('type', 'plan_generator')
                ->where('status', 'completed')
                ->whereDate('created_at', '>=', $startDate->toDateString())
                ->latest('created_at')
                ->latest('id')
                ->first(['id', 'created_at']);

            $hasPending = AiRequest::query()
                ->where('user_id', $user->id)
                ->where('type', 'plan_generator')
                ->whereIn('status', ['queued', 'running'])
                ->exists();

            $needsGeneration = false;
            $reason = null;

            if (! $latestCompleted) {
                $needsGeneration = true;
                $reason = 'feedback_cycle_bootstrap';
            } else {
                $lastDate = CarbonImmutable::parse((string) $latestCompleted->created_at)->startOfDay();
                $lastCycle = $this->cycleIndex($anchorDate, $lastDate, $intervalDays);
                if ($lastCycle < $currentCycleIndex) {
                    $needsGeneration = true;
                    $reason = 'feedback_cycle_regen_c'.$currentCycleIndex;
                }

                if ((bool) config('ai.planner.feedback_cycle.day_19_to_23_checkin_reminder_enabled', true)) {
                    $daySince = $lastDate->diffInDays($today) + 1;
                    if ($daySince >= 19 && $daySince <= 23) {
                        if ($this->sendCheckInReminder($user, $latestCompleted->id, $daySince, $dryRun)) {
                            $reminders++;
                        }
                    }
                }
            }

            if (! $needsGeneration) {
                continue;
            }
            if ($hasPending) {
                $skippedPending++;

                continue;
            }

            if (! $dryRun) {
                GeneratePlansForUser::dispatch(
                    userId: (int) $user->id,
                    days: $planDays,
                    regenerate: true,
                    reason: $reason
                );
            }
            $queued++;
        }

        $this->info('Planner feedback cycle run complete.');
        $this->line('- Date: '.$today->toDateString());
        $this->line('- Start date: '.$startDate->toDateString());
        $this->line('- Anchor date: '.$anchorDate->toDateString());
        $this->line('- Cycle interval days: '.$intervalDays);
        $this->line('- Users scanned: '.$scanned);
        $this->line('- Regenerations queued: '.$queued);
        $this->line('- Reminders sent: '.$reminders);
        $this->line('- Skipped due to pending planner job: '.$skippedPending);
        $this->line('- Dry run: '.($dryRun ? 'yes' : 'no'));

        return self::SUCCESS;
    }

    /**
     * @return array<int, User>
     */
    private function resolveUsers(string $userIdsRaw, string $role, int $limitUsers): array
    {
        $ids = collect(preg_split('/[\s,;]+/', trim($userIdsRaw)) ?: [])
            ->map(static fn ($value): int => (int) $value)
            ->filter(static fn (int $id): bool => $id > 0)
            ->unique()
            ->values()
            ->all();

        $query = User::query()->orderBy('id');

        if ($ids !== []) {
            $query->whereIn('id', $ids);
        } elseif (trim($role) !== '') {
            $query->where('role', trim($role));
        }

        if ($limitUsers > 0) {
            $query->limit($limitUsers);
        }

        return $query->get()->all();
    }

    private function sendCheckInReminder(User $user, int $requestId, int $daySince, bool $dryRun): bool
    {
        $title = 'Weight Check-In Reminder';
        $body = sprintf(
            'Cycle day %d: please log your weight today so your next 21-day plan can adapt accurately.',
            $daySince
        );

        $alreadySentToday = Notification::query()
            ->where('target_user_id', $user->id)
            ->where('title', $title)
            ->whereDate('created_at', now()->toDateString())
            ->exists();

        if ($alreadySentToday) {
            return false;
        }

        if (! $dryRun) {
            Notification::query()->create([
                'target_user_id' => $user->id,
                'created_by' => $user->id,
                'title' => $title,
                'body' => $body.' (ref: ai_request #'.$requestId.')',
            ]);
        }

        return true;
    }

    private function normalizePlanDays(int $days): int
    {
        if ($days <= 14) {
            return 14;
        }
        if ($days <= 21) {
            return 21;
        }

        return 28;
    }

    private function parseDate(string $value): CarbonImmutable
    {
        $v = trim($value);
        if ($v === '') {
            return CarbonImmutable::today('UTC')->startOfDay();
        }

        return CarbonImmutable::parse($v, 'UTC')->startOfDay();
    }

    private function cycleIndex(CarbonImmutable $anchorDate, CarbonImmutable $date, int $intervalDays): int
    {
        $days = $anchorDate->diffInDays($date, false);
        if ($days < 0) {
            return -1;
        }

        return (int) floor($days / $intervalDays);
    }
}
