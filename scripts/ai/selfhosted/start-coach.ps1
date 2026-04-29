$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
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
    Write-Host "Trying the Docker Ollama service first..."
    docker compose -f "$root\docker-compose.selfhosted-ai.yml" up -d ollama

    if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:11434/api/tags' -Attempts 10 -DelaySeconds 3)) {
        if (-not (Test-Path $ollamaExe)) {
            throw "Ollama did not start from Docker and no local Ollama install was found. Run .\scripts\ai\selfhosted\setup-selfhosted-ai.ps1 once, or install Ollama from https://ollama.com/download/windows."
        }

        Write-Host "Starting local Ollama..."
        Start-Process -FilePath $ollamaExe | Out-Null

        if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:11434/api/tags')) {
            throw "Ollama did not become ready on 127.0.0.1:11434. Start it manually and try again."
        }
    }
}

Write-Host "Starting Qdrant..."
docker compose -f "$root\docker-compose.selfhosted-ai.yml" up -d qdrant

if (-not (Wait-ForEndpoint -Url 'http://127.0.0.1:6333/collections')) {
    throw "Qdrant did not become ready on 127.0.0.1:6333."
}

Write-Host "Refreshing Laravel config..."
$env:PHP_CLI_SERVER_WORKERS = '1'
php -d xdebug.mode=off "$root\artisan" config:clear

Write-Host "Syncing coach context..."
php -d xdebug.mode=off "$root\artisan" ai:setup-self-hosted-chat --sync-existing=1

Write-Host "Starting Laravel on http://127.0.0.1:8000 ..."
php -d xdebug.mode=off "$root\artisan" serve --host=127.0.0.1 --port=8000
