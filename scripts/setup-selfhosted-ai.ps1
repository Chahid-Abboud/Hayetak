$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting local Qdrant and Ollama services..."
docker compose -f "$root\docker-compose.selfhosted-ai.yml" up -d qdrant ollama

Write-Host "Pulling the local chat model..."
docker exec hayetak-ollama ollama pull llama3.1:8b

Write-Host "Pulling the local embedding model..."
docker exec hayetak-ollama ollama pull nomic-embed-text

Write-Host "Creating the Qdrant collection and indexing existing users..."
php "$root\artisan" ai:setup-self-hosted-chat --sync-existing=1

Write-Host ""
Write-Host "Self-hosted AI setup is complete."
Write-Host "Set AI_CHAT_PROVIDER=self_hosted in your .env before using /api/ai/chat."
