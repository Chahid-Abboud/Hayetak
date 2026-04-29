param(
    [string]$OutDir = "tmp/ai_deep_audit_safe_run"
)

$ErrorActionPreference = "Stop"

function Get-FirstLine([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) {
        return ""
    }

    $lines = $text -split "`r?`n"
    if ($lines.Length -eq 0) {
        return ""
    }

    return $lines[0].Trim()
}

function Test-ServiceUrl([string]$url, [int]$timeoutSeconds = 4) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec $timeoutSeconds -UseBasicParsing

        return @{
            ok = $true
            status_code = [int]$response.StatusCode
        }
    } catch {
        return @{
            ok = $false
            error = $_.Exception.Message
        }
    }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $projectRoot

# Prevent xdebug startup warnings from interrupting preflight output parsing.
$env:XDEBUG_MODE = "off"

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $OutDir "logs") -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDirAbs = (Resolve-Path $OutDir).Path

$phpVersionRaw = (& php -v 2>&1 | Out-String)
$pythonVersionRaw = (& python --version 2>&1 | Out-String)
$artisanListRaw = (& php artisan list --raw 2>&1 | Out-String)

$requiredCommands = @(
    "ai:deep-audit",
    "ai:planner-batch-eval",
    "ai:test-generate-plans",
    "ai:export-progress-prediction-data"
)

$commandChecks = @{}
foreach ($command in $requiredCommands) {
    $pattern = "(?m)^" + [regex]::Escape($command) + "\s+"
    $commandChecks[$command] = $artisanListRaw -match $pattern
}

$ollamaCheck = Test-ServiceUrl -url "http://127.0.0.1:11434/api/tags" -timeoutSeconds 4
$qdrantCheck = Test-ServiceUrl -url "http://127.0.0.1:6333/collections" -timeoutSeconds 4

$predictorDir = Join-Path $projectRoot "storage/app/ai/models/progress_predictor_v1_real_only"
$predictorManifest = Join-Path $predictorDir "manifest.json"
$weightModel = Join-Path $predictorDir "weight_change_model.joblib"
$strengthModel = Join-Path $predictorDir "strength_progress_model.joblib"

$readinessPath = Join-Path $projectRoot "tmp/ai_deep_audit_safe_run/planner_dataset_readiness_latest.json"
$readiness = $null
$readinessSummary = $null
if (Test-Path -LiteralPath $readinessPath) {
    try {
        $readiness = Get-Content -LiteralPath $readinessPath -Raw | ConvertFrom-Json
        $targets = $readiness.targets
        $actuals = $readiness.actuals
        $gaps = $readiness.gaps

        if ($null -ne $targets -and $null -ne $actuals) {
            $readinessSummary = @{
                plan_cycles = @{
                    actual = [int]$actuals.plan_cycles
                    target = [int]$targets.plan_cycles
                    missing = [int]$gaps.plan_cycles_missing
                }
                day14 = @{
                    actual = [int]$actuals.day14
                    target = [int]$targets.day14
                    missing = [int]$gaps.day14_missing
                }
                day21 = @{
                    actual = [int]$actuals.day21
                    target = [int]$targets.day21
                    missing = [int]$gaps.day21_missing
                }
                day28 = @{
                    actual = [int]$actuals.day28
                    target = [int]$targets.day28
                    missing = [int]$gaps.day28_missing
                }
                all_targets_met = (
                    [int]$gaps.plan_cycles_missing -le 0 -and
                    [int]$gaps.day14_missing -le 0 -and
                    [int]$gaps.day21_missing -le 0 -and
                    [int]$gaps.day28_missing -le 0
                )
            }
        }
    } catch {
        $readiness = @{
            parse_error = $_.Exception.Message
        }
    }
}

$gpuInfo = @{
    nvidia_smi_available = $false
}

$nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($null -ne $nvidiaSmi) {
    $gpuInfo.nvidia_smi_available = $true
    try {
        $gpuRaw = (& nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>&1 | Out-String).Trim()
        $gpuInfo.snapshot = $gpuRaw
    } catch {
        $gpuInfo.snapshot_error = $_.Exception.Message
    }
}

$report = @{
    run_id = $stamp
    generated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    project_root = $projectRoot.Path
    out_dir = $outDirAbs
    runtime = @{
        php = Get-FirstLine $phpVersionRaw
        python = (Get-FirstLine $pythonVersionRaw)
    }
    command_checks = $commandChecks
    services = @{
        ollama = $ollamaCheck
        qdrant = $qdrantCheck
    }
    predictor_artifacts = @{
        model_dir_exists = (Test-Path -LiteralPath $predictorDir)
        manifest_exists = (Test-Path -LiteralPath $predictorManifest)
        weight_model_exists = (Test-Path -LiteralPath $weightModel)
        strength_model_exists = (Test-Path -LiteralPath $strengthModel)
    }
    dataset_readiness = $readiness
    dataset_readiness_summary = $readinessSummary
    gpu = $gpuInfo
    safe_defaults = @{
        max_accounts = 3
        questions_per_category = 100
        chat_full_users = 1
        chat_secondary_per_category = 30
        chat_batch_size = 3
        chat_batch_break_seconds = 15
        chat_category_break_seconds = 25
        planner_horizon = 21
        planner_break_seconds = 30
        planner_eval_sleep_ms = 4000
        predictor_holdout = 0
    }
}

$reportJson = $report | ConvertTo-Json -Depth 40
$reportPath = Join-Path $outDirAbs "preflight_low_gpu_$stamp.json"
$latestPath = Join-Path $outDirAbs "preflight_low_gpu_latest.json"

Set-Content -LiteralPath $reportPath -Value $reportJson -Encoding UTF8
Set-Content -LiteralPath $latestPath -Value $reportJson -Encoding UTF8

Write-Host "Preflight report saved: $reportPath"
Write-Host "Preflight latest saved: $latestPath"
Write-Host "Commands ready: $(($requiredCommands | Where-Object { $commandChecks[$_] }).Count)/$($requiredCommands.Count)"
Write-Host "Ollama reachable: $($ollamaCheck.ok)"
Write-Host "Qdrant reachable: $($qdrantCheck.ok)"
Write-Host "Predictor manifest exists: $($report.predictor_artifacts.manifest_exists)"
