<?php

namespace App\Services\Ai;

use App\Services\Ai\Runtime\FeatureConfigResolver;
use Illuminate\Support\Facades\Http;
use Throwable;

class PlannerHealthService
{
    public function __construct(private readonly FeatureConfigResolver $features) {}

    public function snapshot(): array
    {
        $provider = $this->features->provider(FeatureConfigResolver::FEATURE_PLANNER);
        $ollamaOnly = $this->features->ollamaOnly(FeatureConfigResolver::FEATURE_PLANNER);
        $localFallbackEnabled = $this->features->localFallbackEnabled(FeatureConfigResolver::FEATURE_PLANNER);

        $ollama = $this->checkOllama();

        $localFallbackReady = $provider === 'ollama' && $localFallbackEnabled;
        $primaryReady = (bool) ($ollama['reachable'] ?? false)
            && (bool) ($ollama['model_loaded'] ?? true);

        return [
            'ready' => $primaryReady || $localFallbackReady,
            'primary_provider' => $provider,
            'checks' => [
                'ollama' => $ollama,
                'local_fallback' => [
                    'enabled' => $localFallbackEnabled,
                    'ready' => $localFallbackReady,
                ],
                'ollama_only' => [
                    'enabled' => $ollamaOnly,
                ],
            ],
            'recommendation' => $this->recommendation($provider, $ollama, $localFallbackEnabled, $ollamaOnly),
        ];
    }

    private function checkOllama(): array
    {
        $settings = $this->features->ollamaChat(FeatureConfigResolver::FEATURE_PLANNER);
        $baseUrl = (string) $settings['base_url'];
        $model = (string) $settings['model'];

        $result = [
            'configured' => $baseUrl !== '' && $model !== '',
            'base_url' => $baseUrl,
            'model' => $model,
            'reachable' => false,
            'error' => null,
        ];

        if (! $result['configured']) {
            $result['error'] = 'Ollama base URL or model is missing.';

            return $result;
        }

        try {
            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->timeout(4)
                ->get('/api/tags')
                ->throw()
                ->json();

            $models = is_array($response['models'] ?? null) ? $response['models'] : [];
            $available = collect($models)->pluck('name')->filter()->values()->all();
            $hasModel = in_array($model, $available, true);

            $result['reachable'] = true;
            $result['model_loaded'] = $hasModel;

            if (! $hasModel) {
                $result['error'] = 'Ollama is reachable, but the configured planner model is not listed.';
            }
        } catch (Throwable $e) {
            $result['reachable'] = false;
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    private function recommendation(string $provider, array $ollama, bool $localFallbackEnabled, bool $ollamaOnly): string
    {
        if (
            $provider === 'ollama'
            && (
                ! ($ollama['reachable'] ?? false)
                || ! ($ollama['model_loaded'] ?? true)
            )
        ) {
            if ($ollamaOnly) {
                return 'Planner is locked to Ollama-only mode. Start Ollama and ensure the planner model is pulled.';
            }

            if ($localFallbackEnabled) {
                return 'Primary Ollama provider is down; deterministic local planner fallback is ready.';
            }

            return 'Start Ollama and make sure the configured model is pulled.';
        }

        return 'Planner provider is healthy.';
    }
}
