<?php

namespace App\Services\Ai\Prompts;

use RuntimeException;

class PromptTemplateRepository
{
    /**
     * @var array<string, string>
     */
    private static array $cache = [];

    public function load(string $feature, string $template): string
    {
        $path = resource_path(sprintf('ai/prompts/%s/%s.md', trim($feature, '/'), trim($template, '/')));

        if (! is_file($path)) {
            throw new RuntimeException("Prompt template not found: {$path}");
        }

        if (! array_key_exists($path, self::$cache)) {
            $contents = file_get_contents($path);
            if ($contents === false) {
                throw new RuntimeException("Prompt template could not be read: {$path}");
            }

            self::$cache[$path] = trim($contents);
        }

        return self::$cache[$path];
    }

    public function render(string $feature, string $template, array $variables = []): string
    {
        $contents = $this->load($feature, $template);

        foreach ($variables as $key => $value) {
            $contents = str_replace('{{'.$key.'}}', (string) $value, $contents);
        }

        return trim($contents);
    }
}
