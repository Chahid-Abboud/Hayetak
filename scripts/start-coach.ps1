$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$ollamaExe = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'

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
        [int] $Attempts = 12,
        [int] $DelaySeconds = 2
    )

    for ($i = 0; $i -lt $Attempts; $i++) {
        if (Test-Endpoint -Url $Url) {
            return $true
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

Write-Host "Checking Ollama..."
if (-not (Test-Endpoint -Url 'http://127.0.0.1:11434/api/tags')) {
    if (-not (Test-Path $ollamaExe)) {
        throw "Ollama is not installed. Install it from https://ollama.com/download/windows first."
    }

    Write-Host "Starting Ollama..."
    Start-Process -FilePath $ollamaExe | Out-Null

    if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:11434/api/tags')) {
        throw "Ollama did not become ready on 127.0.0.1:11434. Start it manually and try again."
    }
}

Write-Host "Starting Qdrant..."
docker compose -f "$root\docker-compose.selfhosted-ai.yml" up -d qdrant

if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:6333/collections')) {
    throw "Qdrant did not become ready on 127.0.0.1:6333."
}

Write-Host "Refreshing Laravel config..."
php "$root\artisan" config:clear

Write-Host "Syncing coach context..."
php "$root\artisan" ai:setup-self-hosted-chat --sync-existing=1

Write-Host "Starting Laravel on http://127.0.0.1:8000 ..."
php "$root\artisan" serve
