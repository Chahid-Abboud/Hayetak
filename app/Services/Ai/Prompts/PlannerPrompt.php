<?php

namespace App\Services\Ai\Prompts;

use App\Services\Ai\Runtime\FeatureConfigResolver;

class PlannerPrompt
{
    public function __construct(
        private readonly PromptTemplateRepository $templates,
        private readonly FeatureConfigResolver $features,
    ) {}

    public function system(): string
    {
        return $this->templates->render($this->features->promptDirectory(FeatureConfigResolver::FEATURE_PLANNER), 'system', [
            'prompt_version' => $this->features->promptVersion(FeatureConfigResolver::FEATURE_PLANNER),
            'schema_version' => $this->features->schemaVersion(FeatureConfigResolver::FEATURE_PLANNER),
        ]);
    }

    public function user(array $context): string
    {
        return $this->templates->render($this->features->promptDirectory(FeatureConfigResolver::FEATURE_PLANNER), 'user', [
            'context_json' => json_encode($context, JSON_UNESCAPED_SLASHES),
        ]);
    }
}
