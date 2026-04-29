param(
    [string]$OutDir = "tmp/ai_deep_audit_safe_run",
    [int]$MaxAccounts = 3,
    [int]$QuestionsPerCategory = 100,
    [int]$ChatFullUsers = 1,
    [int]$ChatSecondaryPerCategory = 30,
    [int]$ChatBatchSize = 3,
    [int]$ChatBatchBreakSeconds = 15,
    [int]$ChatCategoryBreakSeconds = 25,
    [int]$PlannerHorizon = 21,
    [int]$PlannerBreakSeconds = 30,
    [int]$PlannerEvalSleepMs = 4000,
    [int]$PlannerEvalLimit = 0,
    [switch]$SkipDeepAudit,
    [switch]$SkipPlannerEval,
    [switch]$SkipPredictorAudit,
    [switch]$RunPredictorPipeline,
    [switch]$DisableQdrantAutoStart,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-GpuSnapshot {
    $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if ($null -eq $nvidiaSmi) {
        return "nvidia-smi not available"
    }

    try {
        return (& nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>&1 | Out-String).Trim()
    } catch {
        return "nvidia-smi query failed: $($_.Exception.Message)"
    }
}

function Wait-GpuCooldown([int]$MaxUtilPercent = 85, [int]$PauseSeconds = 20, [int]$MaxChecks = 12) {
    $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if ($null -eq $nvidiaSmi) {
        return
    }

    for ($i = 0; $i -lt $MaxChecks; $i++) {
        $raw = (& nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>$null | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return
        }

        $values = @()
        foreach ($line in ($raw -split "`r?`n")) {
            $lineTrim = $line.Trim()
            if ($lineTrim -match "^\d+$") {
                $values += [int]$lineTrim
            }
        }

        if ($values.Count -eq 0) {
            return
        }

        $maxObserved = ($values | Measure-Object -Maximum).Maximum
        if ($maxObserved -le $MaxUtilPercent) {
            return
        }

        Write-Host "GPU util is ${maxObserved}% (limit ${MaxUtilPercent}%). Cooling down for ${PauseSeconds}s..."
        Start-Sleep -Seconds $PauseSeconds
    }
}

function Test-QdrantHealth([int]$TimeoutSeconds = 4) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/collections" -Method GET -TimeoutSec $TimeoutSeconds -UseBasicParsing
        if ([int]$response.StatusCode -eq 200) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Ensure-QdrantReady([bool]$AutoStart = $true, [bool]$IsDryRun = $false) {
    if ($IsDryRun) {
        return @{
            status = "dry_run"
            healthy = $false
            message = "Dry run: qdrant check skipped."
        }
    }

    if (Test-QdrantHealth) {
        return @{
            status = "already_ready"
            healthy = $true
            message = "Qdrant is reachable."
        }
    }

    if (-not $AutoStart) {
        throw "Qdrant is not reachable at http://127.0.0.1:6333 and auto-start is disabled."
    }

    Write-Host "Qdrant is not reachable. Attempting to start it via docker compose..."
    & docker compose -f docker-compose.selfhosted-ai.yml up -d qdrant | Out-Host

    for ($i = 1; $i -le 12; $i++) {
        Start-Sleep -Seconds 2
        if (Test-QdrantHealth) {
            return @{
                status = "started"
                healthy = $true
                attempts = $i
                message = "Qdrant became reachable."
            }
        }
    }

    throw "Qdrant did not become reachable after auto-start attempts."
}

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$RunScript,
        [string]$LogPath,
        [bool]$IsDryRun
    )

    Write-Host ""
    Write-Host "==> $Name"
    Write-Host "GPU before: $(Get-GpuSnapshot)"

    if ($IsDryRun) {
        Write-Host "[DryRun] Skipped execution."
        return @{
            name = $Name
            status = "dry_run"
            log_path = $LogPath
        }
    }

    & $RunScript 2>&1 | Tee-Object -FilePath $LogPath | Out-Host
    $exitCode = $LASTEXITCODE
    $status = if ($exitCode -eq 0) { "ok" } else { "failed" }

    Write-Host "GPU after: $(Get-GpuSnapshot)"
    Wait-GpuCooldown

    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode (log: $LogPath)"
    }

    return @{
        name = $Name
        status = $status
        exit_code = $exitCode
        log_path = $LogPath
    }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $projectRoot

# Prevent xdebug startup warnings from interrupting CLI command streams.
$env:XDEBUG_MODE = "off"

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $OutDir "logs") -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDirAbs = (Resolve-Path $OutDir).Path
$logsDir = Join-Path $outDirAbs "logs"

# Process-local throttles to reduce model workload during this run.
$env:AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS = "500"
$env:AI_COACH_MAX_OUTPUT_TOKENS = "700"
$env:AI_SELF_HOSTED_TEMPERATURE = "0.15"
$env:AI_SELF_HOSTED_LLM_TIMEOUT = "90"
$env:AI_PLANNER_OLLAMA_TIMEOUT = "90"

$summary = [ordered]@{
    run_id = $stamp
    started_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    out_dir = $outDirAbs
    applied_env_overrides = @{
        AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS = $env:AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS
        AI_COACH_MAX_OUTPUT_TOKENS = $env:AI_COACH_MAX_OUTPUT_TOKENS
        AI_SELF_HOSTED_TEMPERATURE = $env:AI_SELF_HOSTED_TEMPERATURE
        AI_SELF_HOSTED_LLM_TIMEOUT = $env:AI_SELF_HOSTED_LLM_TIMEOUT
        AI_PLANNER_OLLAMA_TIMEOUT = $env:AI_PLANNER_OLLAMA_TIMEOUT
    }
    steps = @()
}

$preflightLog = Join-Path $logsDir "01_preflight_$stamp.log"
$preflightStep = Invoke-Step -Name "Preflight checks" -LogPath $preflightLog -IsDryRun:$DryRun -RunScript {
    & powershell -ExecutionPolicy Bypass -File scripts/ai/audit/prepare_ai_low_gpu_run.ps1 -OutDir $OutDir
}
$summary.steps += $preflightStep

if (-not $SkipDeepAudit) {
    $qdrantStatus = Ensure-QdrantReady -AutoStart:(-not $DisableQdrantAutoStart) -IsDryRun:$DryRun
    $summary.steps += @{
        name = "Qdrant readiness before deep audit"
        status = if ($qdrantStatus.healthy) { "ok" } else { "warning" }
        details = $qdrantStatus
    }

    Start-Sleep -Seconds 5
    $deepAuditLog = Join-Path $logsDir "02_deep_audit_$stamp.log"
    $skipPredictorValue = if ($SkipPredictorAudit.IsPresent) { 1 } else { 0 }
    $deepAuditStep = Invoke-Step -Name "Deep audit (low-GPU profile)" -LogPath $deepAuditLog -IsDryRun:$DryRun -RunScript {
        & php artisan ai:deep-audit `
            "--max-accounts=$MaxAccounts" `
            "--questions-per-category=$QuestionsPerCategory" `
            "--chat-full-users=$ChatFullUsers" `
            "--chat-secondary-per-category=$ChatSecondaryPerCategory" `
            "--chat-batch-size=$ChatBatchSize" `
            "--chat-batch-break-seconds=$ChatBatchBreakSeconds" `
            "--chat-category-break-seconds=$ChatCategoryBreakSeconds" `
            "--planner-horizon=$PlannerHorizon" `
            "--planner-break-seconds=$PlannerBreakSeconds" `
            "--predictor-holdout=0" `
            "--skip-predictor=$skipPredictorValue" `
            "--out-dir=$OutDir"
    }
    $summary.steps += $deepAuditStep
}

if (-not $SkipPlannerEval) {
    $qdrantStatus = Ensure-QdrantReady -AutoStart:(-not $DisableQdrantAutoStart) -IsDryRun:$DryRun
    $summary.steps += @{
        name = "Qdrant readiness before planner eval"
        status = if ($qdrantStatus.healthy) { "ok" } else { "warning" }
        details = $qdrantStatus
    }

    Start-Sleep -Seconds 10
    $plannerEvalLog = Join-Path $logsDir "03_planner_batch_eval_$stamp.log"
    $plannerEvalStep = Invoke-Step -Name "Planner batch evaluation (throttled)" -LogPath $plannerEvalLog -IsDryRun:$DryRun -RunScript {
        & php artisan ai:planner-batch-eval `
            "--roles=all" `
            "--days=14,21,28" `
            "--sleep-ms=$PlannerEvalSleepMs" `
            "--limit=$PlannerEvalLimit" `
            "--out-dir=$OutDir"
    }
    $summary.steps += $plannerEvalStep
}

if ($RunPredictorPipeline) {
    $qdrantStatus = Ensure-QdrantReady -AutoStart:(-not $DisableQdrantAutoStart) -IsDryRun:$DryRun
    $summary.steps += @{
        name = "Qdrant readiness before predictor pipeline"
        status = if ($qdrantStatus.healthy) { "ok" } else { "warning" }
        details = $qdrantStatus
    }

    Start-Sleep -Seconds 10
    $predictorLog = Join-Path $logsDir "04_predictor_pipeline_$stamp.log"
    $predictorStep = Invoke-Step -Name "Progress predictor weekly pipeline" -LogPath $predictorLog -IsDryRun:$DryRun -RunScript {
        & powershell -ExecutionPolicy Bypass -File scripts/ai/data/run_progress_predictor_weekly_pipeline.ps1
    }
    $summary.steps += $predictorStep
}

$summary.finished_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")

$summaryPath = Join-Path $outDirAbs "low_gpu_pipeline_summary_$stamp.json"
$latestPath = Join-Path $outDirAbs "low_gpu_pipeline_summary_latest.json"
$summaryJson = $summary | ConvertTo-Json -Depth 20

Set-Content -LiteralPath $summaryPath -Value $summaryJson -Encoding UTF8
Set-Content -LiteralPath $latestPath -Value $summaryJson -Encoding UTF8

Write-Host ""
Write-Host "Pipeline summary saved: $summaryPath"
Write-Host "Pipeline latest saved: $latestPath"
Write-Host "Logs directory: $logsDir"
