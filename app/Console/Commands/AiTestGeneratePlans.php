<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Ai\PlannerHealthService;
use App\Services\Ai\PlannerService;
use Illuminate\Console\Command;

class AiTestGeneratePlans extends Command
{
    /**
     * Run:
     *   php artisan ai:test-generate-plans 1 --days=7 --timeout=90
     */
    protected $signature = 'ai:test-generate-plans {userId} {--days=7} {--timeout=90}';

    protected $description = 'End-to-end test for the structured AI planner pipeline.';

    public function handle(PlannerService $planner, PlannerHealthService $health): int
    {
        $userId = (int) $this->argument('userId');
        $days = max(3, min(14, (int) $this->option('days')));
        $timeout = max(30, min(180, (int) $this->option('timeout')));

        $user = User::query()->find($userId);
        if (! $user) {
            $this->error("User #{$userId} not found.");

            return self::FAILURE;
        }

        $this->info("Running AI planner test for user #{$userId} ({$user->email}) with {$days} planned diet days.");
        $this->line("Planner timeout budget for this run: {$timeout}s.");

        $healthSnapshot = $health->snapshot();
        $primaryProvider = (string) ($healthSnapshot['primary_provider'] ?? 'unknown');
        $ready = (bool) ($healthSnapshot['ready'] ?? false);

        if (! $ready) {
            $recommendation = (string) ($healthSnapshot['recommendation'] ?? 'Planner provider is not ready.');
            $this->error("Planner provider is not ready (primary={$primaryProvider}). {$recommendation}");

            return self::FAILURE;
        }

        if (
            $primaryProvider === 'ollama' &&
            ! (bool) data_get($healthSnapshot, 'checks.ollama.reachable', false)
        ) {
            if ((bool) data_get($healthSnapshot, 'checks.ollama_only.enabled', false)) {
                $this->warn('Planner is in Ollama-only mode and Ollama is not reachable.');
            } else {
                $this->warn('Primary Ollama planner is not reachable; fallback may be attempted when enabled.');
            }
        }

        if ($primaryProvider === 'ollama') {
            config()->set('ai.planner.ollama.timeout', $timeout);
        }

        try {
            $result = $planner->generate($user, [
                'regenerate' => true,
                'reason' => 'console_test_generation',
                'created_by' => $user->id,
                'plan_horizon_days' => $days,
            ]);
        } catch (\Throwable $e) {
            $message = trim((string) $e->getMessage());
            if (
                str_contains(strtolower($message), 'cURL error 28') ||
                str_contains(strtolower($message), 'timed out')
            ) {
                $this->error('Planner generation timed out while calling the model provider.');
                $this->line('Recommendation: verify Ollama is responsive, confirm the planner model is pulled, and tune AI_PLANNER_OLLAMA_TIMEOUT / AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS for your hardware.');
            }

            $this->error('Planner generation failed: '.$message);

            return self::FAILURE;
        }

        $providerUsed = (string) ($result['provider'] ?? 'unknown');
        $this->info("SUCCESS: ai_requests.id={$result['ai_request_id']} version={$result['version']} generation_id={$result['generation_id']} provider={$providerUsed}");
        $this->line('Stored output includes the traced AI request, split ai_plans rows, and normalized active workout/nutrition plan records.');

        return self::SUCCESS;
    }
}
