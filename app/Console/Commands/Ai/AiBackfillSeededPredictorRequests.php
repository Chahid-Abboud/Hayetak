<?php

namespace App\Console\Commands\Ai;

use App\Models\Ai\AiRequest;
use App\Models\User;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AiBackfillSeededPredictorRequests extends Command
{
    protected $signature = 'ai:backfill-seeded-predictor-requests
        {--dry-run=0 : Preview changes without saving them}
    ';

    protected $description = 'Backdate seeded non-admin planner requests so predictor exports have realistic labeled outcome windows.';

    public function handle(ProgressLabelReadinessService $readiness): int
    {
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $updated = 0;
        $skippedUsers = 0;

        /** @var Collection<int, User> $users */
        $users = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->orderBy('id')
            ->get(['id', 'email', 'role']);

        foreach ($users as $user) {
            if (! $this->isSeededDemoUser((string) $user->email)) {
                continue;
            }

            $latestMeasurementDate = DB::table('measurements')
                ->where('user_id', $user->id)
                ->whereNotNull('weight_kg')
                ->orderByDesc('measured_at')
                ->value('measured_at');

            if (! is_string($latestMeasurementDate) || trim($latestMeasurementDate) === '') {
                $skippedUsers++;
                continue;
            }

            $latestMeasurement = CarbonImmutable::parse($latestMeasurementDate)->startOfDay();
            $requests = $this->requestsByHorizon($user, $readiness);

            foreach ([14 => 0, 21 => 5, 28 => 10] as $horizon => $endOffsetDays) {
                /** @var AiRequest|null $request */
                $request = $requests->get($horizon);
                if (! $request) {
                    continue;
                }

                $targetEnd = $latestMeasurement->subDays($endOffsetDays);
                $targetCreatedAt = $targetEnd
                    ->subDays($horizon - 1)
                    ->setTime(9, 0);

                if ($dryRun) {
                    $this->line(sprintf(
                        'Would backdate user #%d request #%d (%d days) to %s.',
                        $user->id,
                        $request->id,
                        $horizon,
                        $targetCreatedAt->toDateTimeString()
                    ));
                    continue;
                }

                $request->forceFill([
                    'created_at' => $targetCreatedAt,
                    'updated_at' => $targetCreatedAt,
                ])->save();

                $updated++;
            }
        }

        $this->info(sprintf(
            '%s %d seeded planner requests.',
            $dryRun ? 'Reviewed' : 'Backdated',
            $updated
        ));
        $this->line(sprintf('Skipped users without usable measurements: %d', $skippedUsers));

        return self::SUCCESS;
    }

    /**
     * @return Collection<int, AiRequest>
     */
    private function requestsByHorizon(User $user, ProgressLabelReadinessService $readiness): Collection
    {
        /** @var Collection<int, AiRequest> $rows */
        $rows = AiRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_generator')
            ->where('status', 'completed')
            ->whereNotNull('input_context_json')
            ->whereNotNull('output_json')
            ->latest('id')
            ->get();

        return $rows
            ->mapWithKeys(function (AiRequest $request) use ($readiness): array {
                $context = $this->decodeArray($request->input_context_json);
                $output = $this->decodeArray($request->output_json);
                $horizon = $readiness->resolveHorizonDays($context, $output);

                return [$horizon => $request];
            });
    }

    private function isSeededDemoUser(string $email): bool
    {
        $email = strtolower(trim($email));

        return $email !== '' && (
            str_contains($email, 'hayetak.local')
            || str_contains($email, '@clients.')
            || str_contains($email, 'example.')
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }
}
