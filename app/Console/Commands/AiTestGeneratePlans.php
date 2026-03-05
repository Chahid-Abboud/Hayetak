<?php

namespace App\Console\Commands;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\Ai\Plan\ExerciseSafetyFilter;
use App\Services\Ai\Plan\FoodSafetyFilter;
use App\Services\Ai\Plan\Model\DummyPlanModelClient;
use App\Services\Ai\Plan\Persistence\NutritionPlanPersister;
use App\Services\Ai\Plan\UserContextBuilder;
use App\Services\Ai\Plan\Validation\DietPlanValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class AiTestGeneratePlans extends Command
{
    /**
     * Run:
     *   php artisan ai:test-generate-plans 1 --days=1
     */
    protected $signature = 'ai:test-generate-plans {userId} {--days=1}';

    protected $description = 'End-to-end test: create ai_request -> build context -> dummy model -> validate -> persist nutrition plan';

    public function handle(): int
    {
        $userId = (int) $this->argument('userId');
        $days = max(1, (int) $this->option('days'));

        /** @var User|null $user */
        $user = User::query()->find($userId);
        if (! $user) {
            $this->error("User #{$userId} not found.");

            return self::FAILURE;
        }

        $this->info("Running Step-6 E2E test for user #{$userId} ({$user->email}) days={$days}");

        /** @var UserContextBuilder $contextBuilder */
        $contextBuilder = app(UserContextBuilder::class);

        /** @var FoodSafetyFilter $foodFilter */
        $foodFilter = app(FoodSafetyFilter::class);

        /** @var ExerciseSafetyFilter $exerciseFilter */
        $exerciseFilter = app(ExerciseSafetyFilter::class);

        /** @var DummyPlanModelClient $dummyClient */
        $dummyClient = app(DummyPlanModelClient::class);

        /** @var DietPlanValidator $dietValidator */
        $dietValidator = app(DietPlanValidator::class);

        /** @var NutritionPlanPersister $dietPersister */
        $dietPersister = app(NutritionPlanPersister::class);

        // ✅ IMPORTANT: Build context FIRST (because ai_requests.input_context_json is NOT NULL in your DB)
        $context = $contextBuilder->build($user);

        // ✅ Create ai_request with input_context_json already filled
        $aiRequest = new AiRequest;
        $aiRequest->user_id = $user->id;
        $aiRequest->type = 'plan_generator';
        $aiRequest->status = 'processing';
        $aiRequest->input_context_json = $context; // <-- NOT NULL column
        $aiRequest->save();

        try {
            // 1) Safety allow lists
            $food = $foodFilter->build($user);
            $ex = $exerciseFilter->build($user);

            $allowedFoodIds = $food['allowed_food_ids'] ?? [];
            $allowedExerciseIds = $ex['allowed_exercise_ids'] ?? [];

            if (count($allowedFoodIds) === 0) {
                throw new \RuntimeException('FoodSafetyFilter returned 0 allowed_food_ids. Cannot generate a valid diet plan.');
            }

            // 2) Dummy model output (fixed JSON using allowed IDs)
            $modelOutput = $dummyClient->generate([
                'days' => $days,
                'allowed_food_ids' => $allowedFoodIds,
                'allowed_exercise_ids' => $allowedExerciseIds,
                'context' => $context,
            ]);

            // Store raw output for debugging/training later
            $aiRequest->output_json = $modelOutput;
            $aiRequest->save();

            // 3) Validate diet plan output
            $dietPlan = $modelOutput['nutrition_plan'] ?? null;
            if (! $dietPlan) {
                throw new \RuntimeException('Dummy model did not return nutrition_plan.');
            }

            $validatedDiet = $dietValidator->validate($dietPlan, $allowedFoodIds);

            // 4) Persist validated output
            DB::transaction(function () use ($dietPersister, $user, $validatedDiet, $aiRequest) {
                $dietPersister->persist($user, $validatedDiet, $aiRequest->id);
            });

            // Finalize request
            $aiRequest->status = 'succeeded';
            $aiRequest->error_message = null;
            $aiRequest->save();

            $this->info("✅ SUCCESS: ai_requests.id={$aiRequest->id} generated and persisted.");

            $this->line('Verify in Tinker:');
            $this->line("  \\App\\Models\\AiRequest::find({$aiRequest->id});");
            $this->line("  \\App\\Models\\NutritionPlan::where('user_id', {$user->id})->latest('id')->first();");

            return self::SUCCESS;
        } catch (Throwable $e) {
            $aiRequest->status = 'failed';
            $aiRequest->error_message = $e->getMessage();
            $aiRequest->save();

            $this->error('❌ FAILED: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
