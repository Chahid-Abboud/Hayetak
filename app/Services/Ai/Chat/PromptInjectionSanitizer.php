<?php

namespace App\Services\Ai\Chat;

class PromptInjectionSanitizer
{
    /**
     * Remove common model-control markers before user text is added to prompts or conversation history.
     */
    public function sanitize(string $message): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $message);

        $patterns = [
            '/<\|(?:system|developer|assistant|tool|user|end|im_start|im_end)\|>/i',
            '/<\/?(?:system|developer|assistant|tool|user)>/i',
            '/\[(?:\/?INST|SYS|\/SYS|SYSTEM|DEVELOPER|ASSISTANT|TOOL|USER)\]/i',
            '/^\s*(?:system|developer|assistant|tool)\s*:\s*/im',
            '/^\s*#+\s*(?:system|developer|assistant|tool)\s*$/im',
            '/ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?[^\n.]*/i',
            '/disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?[^\n.]*/i',
            '/reveal\s+(?:the\s+)?(?:system|developer)\s+prompt[^\n.]*/i',
        ];

        foreach ($patterns as $pattern) {
            $text = preg_replace($pattern, ' ', $text) ?? $text;
        }

        $text = preg_replace("/[ \t]+\n/", "\n", $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;
        $text = preg_replace('/[ \t]{2,}/', ' ', $text) ?? $text;

        return trim($text);
    }
}
