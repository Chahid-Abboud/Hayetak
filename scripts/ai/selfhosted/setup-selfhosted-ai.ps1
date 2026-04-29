$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Key,
        [Parameter(Mandatory = $true)]
        [string] $DefaultValue
    )

    foreach ($path in @("$root\.env", "$root\.env.example")) {
        if (-not (Test-Path $path)) {
            continue
        }

        foreach ($line in Get-Content $path) {
            if ($line -match "^\s*$Key\s*=\s*(.*)\s*$") {
                $value = $Matches[1].Trim()

                if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
                    $value = $value.Substring(1, $value.Length - 2)
                }

                if ($value -ne '') {
                    return $value
                }
            }
        }
    }

    return $DefaultValue
}

function Test-Endpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Url
    )

    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Url,
        [int] $Attempts = 20,
        [int] $DelaySeconds = 3
    )

    for ($i = 0; $i -lt $Attempts; $i++) {
        if (Test-Endpoint -Url $Url) {
            return $true
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

$chatModel = Get-DotEnvValue -Key 'AI_SELF_HOSTED_LLM_MODEL' -DefaultValue 'llama3.1:8b'
$embeddingModel = Get-DotEnvValue -Key 'AI_SELF_HOSTED_EMBED_MODEL' -DefaultValue 'nomic-embed-text'

Write-Host "Starting local Qdrant and Ollama services..."
docker compose -f "$root\docker-compose.selfhosted-ai.yml" up -d qdrant ollama

if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:11434/api/tags')) {
    throw "Ollama did not become ready on 127.0.0.1:11434."
}

if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:6333/collections')) {
    throw "Qdrant did not become ready on 127.0.0.1:6333."
}

Write-Host "Pulling the configured local chat model: $chatModel"
docker exec hayetak-ollama ollama pull $chatModel

Write-Host "Pulling the configured local embedding model: $embeddingModel"
docker exec hayetak-ollama ollama pull $embeddingModel

Write-Host "Refreshing Laravel config..."
php "$root\artisan" config:clear

Write-Host "Creating the Qdrant collection and indexing existing users..."
php "$root\artisan" ai:setup-self-hosted-chat --sync-existing=1

Write-Host ""
Write-Host "Self-hosted AI setup is complete."
Write-Host "Chat model: $chatModel"
Write-Host "Embedding model: $embeddingModel"
Write-Host "Set AI_CHAT_PROVIDER=self_hosted in your .env before using /api/ai/chat."
