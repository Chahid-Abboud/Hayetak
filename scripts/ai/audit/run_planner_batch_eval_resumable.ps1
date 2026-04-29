param(
    [string]$OutDir = "tmp",
    [string]$StateFile = "planner_batch_eval_resumable_state.json",
    [string]$Roles = "all",
    [string]$Days = "14,21,28",
    [int]$BatchMinutes = 45,
    [int]$SleepMs = 0,
    [int]$Limit = 0,
    [int]$FromUserId = 0,
    [int]$ToUserId = 0,
    [int]$PauseBetweenBatchesSeconds = 10,
    [switch]$Reset,
    [switch]$Continuous
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $projectRoot

if ([System.IO.Path]::IsPathRooted($OutDir)) {
    throw "Please pass OutDir as a project-relative path (example: tmp)."
}

$outDirAbs = Join-Path $projectRoot $OutDir
New-Item -ItemType Directory -Path $outDirAbs -Force | Out-Null
$statePath = Join-Path $outDirAbs $StateFile

function Invoke-Batch {
    param([bool]$DoReset)

    $args = @(
        "ai:planner-batch-eval-resumable",
        "--out-dir=$OutDir",
        "--state-file=$StateFile",
        "--roles=$Roles",
        "--days=$Days",
        "--batch-minutes=$BatchMinutes",
        "--sleep-ms=$SleepMs",
        "--limit=$Limit",
        "--from-user-id=$FromUserId",
        "--to-user-id=$ToUserId"
    )
    if ($DoReset) {
        $args += "--reset=1"
    }

    Write-Host ""
    Write-Host "Running planner batch..."
    & php artisan @args
    if ($LASTEXITCODE -ne 0) {
        throw "Planner batch command failed with exit code $LASTEXITCODE"
    }
}

$isFirst = $true
do {
    Invoke-Batch -DoReset:($Reset.IsPresent -and $isFirst)
    $isFirst = $false

    if (-not (Test-Path -LiteralPath $statePath)) {
        throw "State file not found after run: $statePath"
    }

    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $completed = [bool]$state.completed
    $runsTotal = [int]$state.stats.runs_total
    $runsSuccess = [int]$state.stats.runs_success
    $runsFailed = [int]$state.stats.runs_failed
    $cursorUser = [int]$state.cursor.user_index
    $cursorDay = [int]$state.cursor.day_index

    Write-Host ("Progress: completed={0}, runs_total={1}, success={2}, failed={3}, cursor=({4},{5})" -f $completed, $runsTotal, $runsSuccess, $runsFailed, $cursorUser, $cursorDay)
    Write-Host ("State: {0}" -f $statePath)
    Write-Host ("Summary: {0}" -f $state.files.summary_json)

    if ($completed) {
        Write-Host "Planner resumable audit is complete."
        break
    }

    if (-not $Continuous.IsPresent) {
        Write-Host "Batch finished. Re-run this script later to resume."
        break
    }

    Write-Host "Sleeping $PauseBetweenBatchesSeconds seconds before next batch..."
    Start-Sleep -Seconds ([Math]::Max(1, $PauseBetweenBatchesSeconds))
} while ($true)

