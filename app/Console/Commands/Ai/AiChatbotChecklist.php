<?php

namespace App\Console\Commands\Ai;

use App\Models\AiConversation;
use App\Models\User;
use App\Services\Ai\Chat\ChatOrchestrator;
use App\Services\Ai\Evaluation\ChatChecklistQualityScorer;
use App\Services\Ai\Runtime\FeatureConfigResolver;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AiChatbotChecklist extends Command
{
    protected $signature = 'ai:chatbot-checklist
        {userId : User ID to run checklist against}
        {--include-last-7-days=1 : Include last 7 days context (1/0)}
        {--screen-context=coach : Runtime screen_context}
        {--out-dir=tmp : Output directory for markdown/json reports}';

    protected $description = 'Run the chatbot mode checklist and export JSON + Markdown results.';

    public function handle(ChatOrchestrator $orchestrator, ChatChecklistQualityScorer $scorer): int
    {
        $userId = (int) $this->argument('userId');
        $user = User::query()->find($userId);

        if (! $user) {
            $this->error("User #{$userId} not found.");

            return self::FAILURE;
        }

        $includeLast7Days = (bool) ((int) $this->option('include-last-7-days'));
        $screenContext = (string) $this->option('screen-context');
        $outDir = base_path((string) $this->option('out-dir'));
        File::ensureDirectoryExists($outDir);

        $startedAt = CarbonImmutable::now('UTC');
        $stamp = $startedAt->format('Ymd_His');
        $prefix = "chatbot_checklist_results_user{$user->id}_{$stamp}";
        $jsonPath = $outDir.DIRECTORY_SEPARATOR.$prefix.'.json';
        $mdPath = $outDir.DIRECTORY_SEPARATOR.$prefix.'.md';

        $sections = $this->questions();
        $results = [];

        foreach ($sections as $sectionKey => $questions) {
            $this->line("Running section: {$sectionKey}");
            $sectionResults = [];

            $threadConversation = null;
            if ($sectionKey === 'thread_context') {
                $threadConversation = AiConversation::query()->create([
                    'user_id' => $user->id,
                    'title' => 'Checklist thread context',
                    'last_message_at' => now(),
                ]);
            }

            foreach ($questions as $index => $question) {
                $runtimeContext = [
                    'screen_context' => $screenContext,
                    'include_last_7_days' => $includeLast7Days,
                ];

                $conversation = $sectionKey === 'thread_context' ? $threadConversation : null;
                $result = $orchestrator->handle($user, $question, $runtimeContext, $conversation);

                $sectionResults[] = [
                    'index' => $index + 1,
                    'question' => $question,
                    'answer' => (string) data_get($result, 'assistant_message.content', ''),
                    'intent' => (string) ($result['intent'] ?? ''),
                    'feature' => (string) ($result['feature'] ?? ''),
                    'provider' => (string) ($result['provider'] ?? ''),
                    'model' => (string) ($result['model'] ?? ''),
                    'warnings' => array_values($result['warnings'] ?? []),
                    'used_context_keys' => array_values($result['used_context_keys'] ?? []),
                    'conversation_id' => data_get($result, 'conversation.id'),
                ];
            }

            $results[$sectionKey] = $sectionResults;
        }

        $quality = $scorer->score($user, $results);
        $results = $quality['sections'];
        $qualitySummary = $quality['summary'];

        $payload = [
            'ran_at' => $startedAt->toIso8601String(),
            'user_id' => $user->id,
            'user_email' => $user->email,
            'chat_provider' => app(FeatureConfigResolver::class)->provider(FeatureConfigResolver::FEATURE_CHAT),
            'sections' => $results,
            'quality_summary' => $qualitySummary,
        ];

        File::put($jsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        File::put($mdPath, $this->renderMarkdown($payload));

        $this->info("JSON report: {$jsonPath}");
        $this->info("Markdown report: {$mdPath}");

        return self::SUCCESS;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function questions(): array
    {
        return [
            'personalized' => [
                'What weight do you have saved for me?',
                'Recalculate my daily protein intake based on my weight.',
                'What protein target does my current weight suggest?',
                'How much protein do I still need today?',
                'Based on my meals today, what should I eat next?',
                'What do my meals today look like so far?',
                'Summarize my last 7 days of meals.',
                'Have I been consistent this week?',
                'Can I train today based on my recent workouts?',
                'What should I do today if I trained legs yesterday?',
                'Suggest a dinner that fits my goal and allergies.',
                'Suggest a snack that fits my Mediterranean diet.',
                'What foods should I avoid based on my saved allergies?',
                'What are my allergies?',
                'What diet type do you have saved for me?',
                'What injuries or medical conditions do you have saved for me?',
                'Is avocado safe for me?',
                'Give me a high-protein dessert that avoids my allergies.',
                'I hate Greek yogurt, give me alternatives that still fit my goal.',
                'Give me the macros for the recipe you just suggested.',
                'Make that recipe lower carb.',
                'Give me another dinner option with chicken.',
                'Suggest a taouk chicken dinner that fits my goal.',
                'Based on my recent progress, should I adjust calories?',
                'Why is my plan not showing on the dashboard?',
                'What app settings should I check if my data looks stale?',
                'Explain my current goal and how my meals match it.',
                'Based on my meals today, am I low on protein?',
                'Based on my saved profile, what should my breakfast look like?',
                'What nearby support would fit my goal?',
            ],
            'general_guidance' => [
                'What are good recovery tips after a hard workout?',
                'What is a balanced dinner?',
                'What are healthy high-protein snacks?',
                'What are good pre-workout meals?',
                'What are good post-workout meals?',
                'How much protein do people generally need?',
                'What are signs of dehydration?',
                'How can I improve sleep for recovery?',
                'What causes muscle soreness?',
                'What does a balanced plate look like?',
                'What are healthy breakfast ideas?',
                'What are high-fiber foods?',
                'What are good lean protein sources?',
                'What are good vegetarian protein sources?',
                'What are healthy Mediterranean meal ideas?',
                'What are healthy low-calorie snack ideas?',
                'What are good habits for fat loss?',
                'What are good habits for muscle gain?',
                'What is progressive overload?',
                'How often should someone train in a week?',
                'What is the difference between protein, carbs, and fat?',
                'What are some meal prep tips?',
                'What is a rest day?',
                'Why is hydration important?',
                'What are good stretches after training?',
                'What should someone eat before cardio?',
                'What makes a good recovery snack?',
                'How do I stay consistent with meal planning?',
                'How do I build a simple workout routine?',
                'How do I update my profile in the app?',
            ],
            'out_of_scope' => [
                'What is the weather today?',
                'Explain nihilism.',
                'What is the capital of France?',
                'Who won the last election?',
                'What is Bitcoin?',
                'Translate this sentence into Spanish.',
                'Recommend a movie.',
                'Write me a poem.',
                'Explain quantum physics.',
                'Summarize world history.',
                'What happened in the news today?',
                "Who won last night's football game?",
                'Help me code a website.',
                'Tell me song lyrics.',
                'Write my resume.',
            ],
            'restrictions_safety' => [
                'What are my allergies?',
                'Suggest a snack that avoids my allergies.',
                'What about avocado toast?',
                'Give me a safe alternative to avocado toast.',
                'Suggest a dessert that matches my goal and avoids my allergies.',
                'Give me the macros for that safe recipe.',
                'Just give me the recipe and macros.',
                'I hate the taste of Greek yogurt, give me alternatives.',
                'Suggest a dinner that fits my goal and diet type.',
                'What foods should I avoid based on my saved profile?',
            ],
            'thread_context' => [
                'suggest a high-protein snack with Greek yogurt',
                'give me the full recipe and macros',
                'any alternatives if I hate Greek yogurt?',
                'make it lower carb',
                'give me another one for dinner instead',
                'any dinner meal that contains taouk chicken?',
                'give me the total macros for the whole meal',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderMarkdown(array $payload): string
    {
        $lines = [];
        $lines[] = '# Chatbot Checklist Results';
        $lines[] = '';
        $lines[] = '- Ran at: '.(string) ($payload['ran_at'] ?? '');
        $lines[] = '- User: '.(string) ($payload['user_email'] ?? '').' (ID '.(string) ($payload['user_id'] ?? '').')';
        $lines[] = '- Chat provider: '.(string) ($payload['chat_provider'] ?? '');
        $overallQuality = data_get($payload, 'quality_summary.overall.quality_percentage');
        if (is_numeric($overallQuality)) {
            $lines[] = '- Overall quality: '.number_format((float) $overallQuality, 2).'%';
        }

        $sectionTitles = [
            'personalized' => 'Personalized',
            'general_guidance' => 'General guidance',
            'out_of_scope' => 'Out of scope',
            'restrictions_safety' => 'Restrictions safety',
            'thread_context' => 'Thread context',
        ];

        foreach ((array) ($payload['sections'] ?? []) as $sectionKey => $entries) {
            $lines[] = '';
            $lines[] = '## '.($sectionTitles[$sectionKey] ?? (string) $sectionKey);
            $sectionQuality = data_get($payload, "quality_summary.by_section.{$sectionKey}.quality_percentage");
            if (is_numeric($sectionQuality)) {
                $lines[] = '';
                $lines[] = '- Section quality: '.number_format((float) $sectionQuality, 2).'%';
            }

            foreach ((array) $entries as $entry) {
                $idx = (int) ($entry['index'] ?? 0);
                $question = (string) ($entry['question'] ?? '');
                $answer = (string) ($entry['answer'] ?? '');
                $intent = (string) ($entry['intent'] ?? '');
                $model = (string) ($entry['model'] ?? '');
                $quality = data_get($entry, 'quality.quality_percentage');

                $lines[] = '';
                $lines[] = "### {$sectionKey} #{$idx}";
                $lines[] = '';
                $lines[] = '**Q:** '.$question;
                $lines[] = '';
                $lines[] = '**A:**';
                $lines[] = '';
                $lines[] = $answer !== '' ? $answer : '(empty)';
                $lines[] = '';
                $lines[] = "- Intent: `{$intent}`";
                $lines[] = "- Model: `{$model}`";
                if (is_numeric($quality)) {
                    $lines[] = '- Quality: `'.number_format((float) $quality, 2).'%`';
                }
            }
        }

        return implode("\n", $lines)."\n";
    }
}
