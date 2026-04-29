param(
    [int]$Accounts = 10,
    [int]$SamplePercent = 30,
    [ValidateSet("low", "medium", "high")]
    [string]$InitialLoad = "medium",
    [string]$Csv = "tmp/chatbot_audit_bank_full.csv",
    [string]$OutDir = "tmp/chatbot_csv_audit_10_users_30pct_popup",
    [string]$SelectedDate = "",
    [switch]$ChunkByUser,
    [switch]$DisablePopup
)

$ErrorActionPreference = "Stop"

function Write-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [object]$Data
    )

    $dir = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Set-Content -LiteralPath $Path -Value ($Data | ConvertTo-Json -Depth 12) -Encoding UTF8
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $projectRoot
$env:XDEBUG_MODE = "off"

if ([System.IO.Path]::IsPathRooted($OutDir)) {
    throw "Please pass OutDir as a project-relative path, for example tmp/chatbot_csv_audit_10_users_30pct_popup."
}

$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDirRel = Join-Path $OutDir ("run_" + $runStamp)
$runDirAbs = Join-Path $projectRoot $runDirRel
$manifestPath = Join-Path $runDirAbs "selected_users.json"
$loadStatePath = Join-Path $runDirAbs "load_control_state.json"
New-Item -ItemType Directory -Path $runDirAbs -Force | Out-Null

Write-JsonFile -Path $loadStatePath -Data @{
    profile = $InitialLoad
    updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
}

$popupProcess = $null
if (-not $DisablePopup.IsPresent) {
    $popupScript = Join-Path $projectRoot "scripts/ai/audit/chatbot_audit_load_popup.ps1"
    if (Test-Path -LiteralPath $popupScript) {
        $popupArgs = "-ExecutionPolicy Bypass -File `"$popupScript`" -StateFile `"$loadStatePath`""
        $popupProcess = Start-Process -FilePath "powershell" -ArgumentList $popupArgs -PassThru
    } else {
        Write-Host "Popup script not found: $popupScript"
    }
}

Write-Host ""
Write-Host "Starting chatbot CSV audit."
Write-Host "Users: $Accounts"
Write-Host "Question sample: $SamplePercent percent from each group"
Write-Host "Initial load: $InitialLoad"
Write-Host "Load control file: $loadStatePath"
Write-Host "Output directory: $runDirAbs"
Write-Host "Chunk by user: $([bool]$ChunkByUser.IsPresent)"
Write-Host ""

try {
    if ($ChunkByUser.IsPresent) {
        $selectArgs = @(
            "artisan",
            "ai:chatbot-csv-audit",
            "--csv=$Csv",
            "--accounts=$Accounts",
            "--sample-percent=$SamplePercent",
            "--print-users-only",
            "--out-dir=$runDirRel"
        )
        if (-not [string]::IsNullOrWhiteSpace($SelectedDate)) {
            $selectArgs += "--selected-date=$SelectedDate"
        }

        $selectionOutput = & php @selectArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Could not select representative audit users. Output:`n$($selectionOutput -join "`n")"
        }

        $jsonLine = @($selectionOutput | Where-Object { [string]$_ -like "SELECTED_AUDIT_USERS_JSON=*" } | Select-Object -Last 1)
        if ($jsonLine.Count -eq 0) {
            throw "User selection output did not include SELECTED_AUDIT_USERS_JSON. Output:`n$($selectionOutput -join "`n")"
        }

        $selectedUsers = [string]$jsonLine[-1]
        $selectedUsers = $selectedUsers.Substring("SELECTED_AUDIT_USERS_JSON=".Length) | ConvertFrom-Json
        Write-JsonFile -Path $manifestPath -Data $selectedUsers
        Write-Host "Selected users manifest: $manifestPath"

        foreach ($selected in @($selectedUsers)) {
            $userId = [int]$selected.id
            $segment = [string]$selected.segment
            $userOutDirRel = Join-Path $runDirRel ("user_{0}_{1}" -f $userId, $segment)
            $userOutDirAbs = Join-Path $projectRoot $userOutDirRel
            New-Item -ItemType Directory -Path $userOutDirAbs -Force | Out-Null

            $existing = Get-ChildItem -Path $userOutDirAbs -Filter "chatbot_csv_audit_*.json" -File -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($null -ne $existing) {
                Write-Host "Skipping user $userId ($segment), existing output: $($existing.FullName)"
                continue
            }

            Write-Host ""
            Write-Host "Running user $userId ($segment)..."
            $userArgs = @(
                "artisan",
                "ai:chatbot-csv-audit",
                "--csv=$Csv",
                "--user-ids=$userId",
                "--sample-percent=$SamplePercent",
                "--gpu-load=$InitialLoad",
                "--load-control-file=$loadStatePath",
                "--out-dir=$userOutDirRel"
            )
            if (-not [string]::IsNullOrWhiteSpace($SelectedDate)) {
                $userArgs += "--selected-date=$SelectedDate"
            }

            & php @userArgs
            if ($LASTEXITCODE -ne 0) {
                throw "php artisan ai:chatbot-csv-audit failed for user $userId with code $LASTEXITCODE"
            }
        }
    } else {
        $artisanArgs = @(
            "artisan",
            "ai:chatbot-csv-audit",
            "--csv=$Csv",
            "--accounts=$Accounts",
            "--sample-percent=$SamplePercent",
            "--gpu-load=$InitialLoad",
            "--load-control-file=$loadStatePath",
            "--out-dir=$runDirRel"
        )

        if (-not [string]::IsNullOrWhiteSpace($SelectedDate)) {
            $artisanArgs += "--selected-date=$SelectedDate"
        }

        & php @artisanArgs
        if ($LASTEXITCODE -ne 0) {
            throw "php artisan ai:chatbot-csv-audit exited with code $LASTEXITCODE"
        }
    }
} finally {
    if ($null -ne $popupProcess -and -not $popupProcess.HasExited) {
        try {
            $null = $popupProcess.CloseMainWindow()
            Start-Sleep -Milliseconds 500
            if (-not $popupProcess.HasExited) {
                Stop-Process -Id $popupProcess.Id -Force
            }
        } catch {
        }
    }
}
