<?php

namespace App\Console\Commands\Ai;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\Ai\Training\ProgressLabelReadinessService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AiBackfillSeededPredictorRequests extends Command
{
    protected $signature = 'ai:backfill-seeded-predictor-requests
        {--anchor-date=2026-05-11 : Shared seeded planner baseline date (YYYY-MM-DD)}
        {--dry-run=0 : Preview changes without saving them}
    ';

    protected $description = 'Backdate seeded non-admin planner requests so predictor exports have realistic labeled outcome windows.';

    public function handle(ProgressLabelReadinessService $readiness): int
    {
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $anchorDate = CarbonImmutable::parse(
            trim((string) $this->option('anchor-date')),
            config('app.timezone', 'UTC')
        )->startOfDay();
        $updated = 0;
        $skippedUsers = 0;

        /** @var Collection<int, User> $users */
        $users = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->orderBy('id')
            ->get(['id', 'email', 'role', 'data_origin']);

        foreach ($users as $user) {
            if (! $this->isSeededDemoUser($user)) {
                continue;
            }
            if ($this->isImportedPlannerDatasetUser((int) $user->id)) {
                continue;
            }

            $hasMeasurement = DB::table('measurements')
                ->where('user_id', $user->id)
                ->whereNotNull('weight_kg')
                ->exists();

            if (! $hasMeasurement) {
                $skippedUsers++;

                continue;
            }

            $requests = $this->requestsByHorizon($user, $readiness);

            foreach ([14, 21, 28] as $horizon) {
                /** @var AiRequest|null $request */
                $request = $requests->get($horizon);
                if (! $request) {
                    continue;
                }

                $targetCreatedAt = $anchorDate->setTime(9, 0);

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

    private function isSeededDemoUser(User $user): bool
    {
        $origin = strtolower(trim((string) ($user->data_origin ?? '')));
        if ($origin !== '') {
            return in_array($origin, [
                User::DATA_ORIGIN_SEEDED_DEMO,
                User::DATA_ORIGIN_TEST,
            ], true);
        }

        $email = strtolower(trim((string) $user->email));

        return $email !== '' && (
            str_contains($email, 'hayetak.local')
            || str_contains($email, '@clients.')
            || str_contains($email, 'example.')
        );
    }

    private function isImportedPlannerDatasetUser(int $userId): bool
    {
        $settings = DB::table('user_prefs')
            ->where('user_id', $userId)
            ->value('settings');

        if (is_array($settings)) {
            $decoded = $settings;
        } elseif (is_string($settings)) {
            $decoded = json_decode($settings, true);
        } else {
            $decoded = null;
        }

        $importSource = is_array($decoded) ? trim((string) ($decoded['import_source'] ?? '')) : '';

        return $importSource !== '';
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
