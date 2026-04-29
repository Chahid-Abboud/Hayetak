param(
    [string]$OutDir = "tmp/ai_deep_audit_safe_run",
    [string]$UserIds = "",
    [int]$QuestionsPerCategory = 100,
    [int]$SecondaryPerCategory = 30,
    [int]$PlannerHorizon = 21,
    [int]$EtaUpdateMinutes = 5,
    [ValidateSet("low", "mid", "high")]
    [string]$InitialProfile = "mid",
    [switch]$IncludePredictorAudit,
    [switch]$DisablePopup,
    [switch]$DisableQdrantAutoStart,
    [switch]$DryRun
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

    $json = $Data | ConvertTo-Json -Depth 30
    Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

function Append-JsonLine {
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

    $line = $Data | ConvertTo-Json -Depth 20 -Compress
    Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Format-Duration {
    param([double]$Seconds)

    if ($Seconds -lt 0) {
        $Seconds = 0
    }

    $ts = [TimeSpan]::FromSeconds([int][Math]::Round($Seconds))
    return "{0:00}:{1:00}:{2:00}" -f $ts.Hours, $ts.Minutes, $ts.Seconds
}

function Parse-UserIdList {
    param([string]$Raw)

    $ids = @()
    foreach ($piece in ($Raw -split ",")) {
        $value = 0
        if ([int]::TryParse(($piece.Trim()), [ref]$value) -and $value -gt 0) {
            $ids += $value
        }
    }

    return @($ids | Select-Object -Unique)
}

function Resolve-UsersFromLatestAudit {
    param(
        [string]$SearchRoot,
        [int]$NeedCount
    )

    if (-not (Test-Path -LiteralPath $SearchRoot)) {
        return @()
    }

    $jsonFiles = Get-ChildItem -Path $SearchRoot -Filter "ai_deep_audit_*.json" -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object -Property LastWriteTime -Descending

    foreach ($file in $jsonFiles) {
        try {
            $payload = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            $users = @($payload.audited_users)
            if ($users.Count -eq 0) {
                continue
            }

            $ids = @()
            foreach ($u in $users) {
                if ($null -ne $u.id) {
                    $ids += [int]$u.id
                }
            }

            $ids = @($ids | Select-Object -Unique)
            if ($ids.Count -ge $NeedCount) {
                return @($ids | Select-Object -First $NeedCount)
            }
        } catch {
            continue
        }
    }

    return @()
}

function Read-LoadProfile {
    param(
        [string]$StateFile,
        [string]$Fallback = "mid"
    )

    if (-not (Test-Path -LiteralPath $StateFile)) {
        return $Fallback
    }

    try {
        $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
        $profile = [string]$state.profile
        if ($profile -in @("low", "mid", "high")) {
            return $profile
        }
    } catch {
    }

    return $Fallback
}

function Write-LoadProfile {
    param(
        [string]$StateFile,
        [ValidateSet("low", "mid", "high")]
        [string]$Profile
    )

    $payload = @{
        profile = $Profile
        updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    }
    Write-JsonFile -Path $StateFile -Data $payload
}

function Get-ProfileConfig {
    param(
        [ValidateSet("low", "mid", "high")]
        [string]$Profile
    )

    switch ($Profile) {
        "low" {
            return @{
                chat_batch_size = 2
                chat_batch_break_seconds = 18
                chat_category_break_seconds = 28
                planner_break_seconds = 35
                planner_tokens = 480
                coach_tokens = 650
                llm_temperature = "0.10"
                llm_timeout = 100
                planner_timeout = 100
                per_question_seconds = 8.5
                planner_phase_seconds = 420
                predictor_phase_seconds = 240
                process_priority = "Idle"
            }
        }
        "high" {
            return @{
                chat_batch_size = 6
                chat_batch_break_seconds = 5
                chat_category_break_seconds = 10
                planner_break_seconds = 12
                planner_tokens = 900
                coach_tokens = 1100
                llm_temperature = "0.20"
                llm_timeout = 70
                planner_timeout = 70
                per_question_seconds = 5.5
                planner_phase_seconds = 240
                predictor_phase_seconds = 120
                process_priority = "Normal"
            }
        }
        default {
            return @{
                chat_batch_size = 3
                chat_batch_break_seconds = 12
                chat_category_break_seconds = 20
                planner_break_seconds = 25
                planner_tokens = 650
                coach_tokens = 850
                llm_temperature = "0.15"
                llm_timeout = 85
                planner_timeout = 85
                per_question_seconds = 7.0
                planner_phase_seconds = 300
                predictor_phase_seconds = 170
                process_priority = "BelowNormal"
            }
        }
    }
}

function Test-QdrantHealth {
    param([int]$TimeoutSeconds = 4)

    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:6333/collections" -Method GET -TimeoutSec $TimeoutSeconds -UseBasicParsing
        return ([int]$response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Ensure-QdrantReady {
    param(
        [bool]$AutoStart = $true,
        [bool]$IsDryRun = $false
    )

    if ($IsDryRun) {
        return
    }

    if (Test-QdrantHealth) {
        return
    }

    if (-not $AutoStart) {
        throw "Qdrant is not reachable at http://127.0.0.1:6333 and auto-start is disabled."
    }

    Write-Host "Qdrant is not reachable. Attempting auto-start..."
    & docker compose -f docker-compose.selfhosted-ai.yml up -d qdrant | Out-Host

    for ($i = 1; $i -le 12; $i++) {
        Start-Sleep -Seconds 2
        if (Test-QdrantHealth) {
            Write-Host "Qdrant is ready."
            return
        }
    }

    throw "Qdrant did not become reachable after auto-start attempts."
}

function Update-TelemetryFromLine {
    param(
        [string]$Line,
        [hashtable]$Telemetry
    )

    if ([string]::IsNullOrWhiteSpace($Line)) {
        return
    }

    if ($Line -match '^\s*(personalized|general_guidance|out_of_scope):\s+(\d+)/(\d+)') {
        $cat = [string]$matches[1]
        $done = [int]$matches[2]
        $total = [int]$matches[3]

        if ($done -gt [int]$Telemetry.chat_done[$cat]) {
            $Telemetry.chat_done[$cat] = $done
        }
        if ($total -gt [int]$Telemetry.chat_total[$cat]) {
            $Telemetry.chat_total[$cat] = $total
        }
    }

    if ($Line -match 'Running planner regeneration and logic audit') {
        $Telemetry.planner_started = $true
    }
    if ($Line -match 'Planner run success:') {
        $Telemetry.planner_done = $true
    }
    if ($Line -match 'Running prediction model wiring, accuracy, and adaptation audit') {
        $Telemetry.predictor_started = $true
    }
    if ($Line -match 'Deep audit JSON:\s*(.+)$') {
        $Telemetry.json_path = $matches[1].Trim()
        $Telemetry.planner_done = $true
        $Telemetry.predictor_done = $true
    }
    if ($Line -match 'Deep audit Markdown:\s*(.+)$') {
        $Telemetry.md_path = $matches[1].Trim()
    }
}

function Get-PhaseProgressUnits {
    param(
        [hashtable]$Phase,
        [hashtable]$Telemetry
    )

    $chatDone = ([int]$Telemetry.chat_done.personalized) + ([int]$Telemetry.chat_done.general_guidance) + ([int]$Telemetry.chat_done.out_of_scope)
    if ($chatDone -gt [int]$Phase.expected_chat_questions) {
        $chatDone = [int]$Phase.expected_chat_questions
    }

    $plannerUnits = 0
    if ([bool]$Phase.run_planner) {
        if ([bool]$Telemetry.planner_done) {
            $plannerUnits = [int]$Phase.planner_weight_units
        } elseif ([bool]$Telemetry.planner_started) {
            $plannerUnits = [int][Math]::Round(([int]$Phase.planner_weight_units) * 0.5)
        }
    }

    $predictorUnits = 0
    if ([bool]$Phase.run_predictor) {
        if ([bool]$Telemetry.predictor_done) {
            $predictorUnits = [int]$Phase.predictor_weight_units
        } elseif ([bool]$Telemetry.predictor_started) {
            $predictorUnits = [int][Math]::Round(([int]$Phase.predictor_weight_units) * 0.5)
        }
    }

    return $chatDone + $plannerUnits + $predictorUnits
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $projectRoot

if ([System.IO.Path]::IsPathRooted($OutDir)) {
    throw "Please pass OutDir as a project-relative path (example: tmp/ai_deep_audit_safe_run)."
}

$EtaUpdateMinutes = [Math]::Max(1, $EtaUpdateMinutes)

$targetUserIds = Parse-UserIdList -Raw $UserIds
if ($targetUserIds.Count -lt 3) {
    $fallbackIds = Resolve-UsersFromLatestAudit -SearchRoot (Join-Path $projectRoot $OutDir) -NeedCount 3
    if ($fallbackIds.Count -ge 3) {
        $targetUserIds = $fallbackIds
    }
}
if ($targetUserIds.Count -lt 3) {
    throw 'Could not resolve 3 user IDs. Re-run with -UserIds "17,20,41" (or your preferred 3 IDs).'
}
$targetUserIds = @($targetUserIds | Select-Object -First 3)

$runStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runDirRel = Join-Path $OutDir ("adaptive_run_" + $runStamp)
$runDirAbs = Join-Path $projectRoot $runDirRel
$logsDirAbs = Join-Path $runDirAbs "logs"
$liveProgressPath = Join-Path $runDirAbs "live_progress.json"
$etaUpdatesPath = Join-Path $runDirAbs "eta_updates.jsonl"
$loadStatePath = Join-Path $runDirAbs "load_control_state.json"

New-Item -ItemType Directory -Path $logsDirAbs -Force | Out-Null
Write-LoadProfile -StateFile $loadStatePath -Profile $InitialProfile

$popupProcess = $null
if (-not $DisablePopup.IsPresent) {
    $popupScript = Join-Path $projectRoot "scripts/ai/audit/audit_load_control_popup.ps1"
    if (Test-Path -LiteralPath $popupScript) {
        $popupArgs = "-ExecutionPolicy Bypass -File `"$popupScript`" -StateFile `"$loadStatePath`""
        $popupProcess = Start-Process -FilePath "powershell" -ArgumentList $popupArgs -PassThru
    } else {
        Write-Host "Popup script not found at: $popupScript"
    }
}

$plannerWeightUnits = 45
$predictorWeightUnits = 30

$phases = @()
$phases += @{
    phase_index = 1
    phase_name = "user_$($targetUserIds[0])_full"
    user_ids = "$($targetUserIds[0])"
    max_accounts = 1
    chat_full_users = 1
    run_chat = $true
    run_planner = $true
    run_predictor = $false
    expected_chat_questions = 3 * $QuestionsPerCategory
    planner_weight_units = $plannerWeightUnits
    predictor_weight_units = 0
    out_dir_rel = (Join-Path $runDirRel "user_$($targetUserIds[0])_full")
}
$phases += @{
    phase_index = 2
    phase_name = "user_$($targetUserIds[1])_secondary"
    user_ids = "$($targetUserIds[1])"
    max_accounts = 1
    chat_full_users = 0
    run_chat = $true
    run_planner = $true
    run_predictor = $false
    expected_chat_questions = 3 * $SecondaryPerCategory
    planner_weight_units = $plannerWeightUnits
    predictor_weight_units = 0
    out_dir_rel = (Join-Path $runDirRel "user_$($targetUserIds[1])_secondary")
}
$phases += @{
    phase_index = 3
    phase_name = "user_$($targetUserIds[2])_secondary"
    user_ids = "$($targetUserIds[2])"
    max_accounts = 1
    chat_full_users = 0
    run_chat = $true
    run_planner = $true
    run_predictor = $false
    expected_chat_questions = 3 * $SecondaryPerCategory
    planner_weight_units = $plannerWeightUnits
    predictor_weight_units = 0
    out_dir_rel = (Join-Path $runDirRel "user_$($targetUserIds[2])_secondary")
}

if ($IncludePredictorAudit.IsPresent) {
    $phases += @{
        phase_index = 4
        phase_name = "predictor_only_all_users"
        user_ids = ($targetUserIds -join ",")
        max_accounts = $targetUserIds.Count
        chat_full_users = 0
        run_chat = $false
        run_planner = $false
        run_predictor = $true
        expected_chat_questions = 0
        planner_weight_units = 0
        predictor_weight_units = $predictorWeightUnits
        out_dir_rel = (Join-Path $runDirRel "predictor_only_all_users")
    }
}

$totalUnits = 0
foreach ($phase in $phases) {
    $totalUnits += [int]$phase.expected_chat_questions
    $totalUnits += [int]$phase.planner_weight_units
    $totalUnits += [int]$phase.predictor_weight_units
}
$totalUnits = [Math]::Max(1, $totalUnits)

$estimateSeconds = 0.0
foreach ($phase in $phases) {
    $profile = Read-LoadProfile -StateFile $loadStatePath -Fallback $InitialProfile
    $cfg = Get-ProfileConfig -Profile $profile
    $estimateSeconds += ([double]$phase.expected_chat_questions * [double]$cfg.per_question_seconds)
    if ([bool]$phase.run_planner) {
        $estimateSeconds += [double]$cfg.planner_phase_seconds
    }
    if ([bool]$phase.run_predictor) {
        $estimateSeconds += [double]$cfg.predictor_phase_seconds
    }
}

$runStarted = Get-Date

$runHeader = @{
    run_id = $runStamp
    started_at_local = $runStarted.ToString("yyyy-MM-dd HH:mm:ss zzz")
    out_dir = $runDirAbs
    logs_dir = $logsDirAbs
    live_progress_file = $liveProgressPath
    eta_updates_file = $etaUpdatesPath
    load_control_state_file = $loadStatePath
    selected_user_ids = $targetUserIds
    planned_phases = @($phases | ForEach-Object { $_.phase_name })
    initial_profile = $InitialProfile
    include_predictor_audit = [bool]$IncludePredictorAudit.IsPresent
    estimated_total_runtime = (Format-Duration -Seconds $estimateSeconds)
    notes = @(
        "Change load profile any time in the popup window.",
        "Profile changes apply fully on the next phase. During a phase, process priority is adjusted immediately.",
        "Progress bar and ETA are shown in this terminal.",
        "Live progress is written to live_progress.json.",
        "ETA snapshots are written every $EtaUpdateMinutes minute(s) to eta_updates.jsonl."
    )
}
Write-JsonFile -Path (Join-Path $runDirAbs "adaptive_run_header.json") -Data $runHeader

Write-Host ""
Write-Host "Adaptive deep-audit run will write to: $runDirAbs"
Write-Host "Live progress file: $liveProgressPath"
Write-Host "ETA snapshots file: $etaUpdatesPath"
Write-Host "Logs directory: $logsDirAbs"
Write-Host "Load control state: $loadStatePath"
Write-Host "Estimated total runtime: $(Format-Duration -Seconds $estimateSeconds)"
Write-Host "Target users: $($targetUserIds -join ', ')"
Write-Host ""

Ensure-QdrantReady -AutoStart:(-not $DisableQdrantAutoStart.IsPresent) -IsDryRun:$DryRun

$phaseResults = @()
$completedUnits = 0

for ($i = 0; $i -lt $phases.Count; $i++) {
    $phase = $phases[$i]
    $profile = Read-LoadProfile -StateFile $loadStatePath -Fallback $InitialProfile
    $cfg = Get-ProfileConfig -Profile $profile

    $phaseOutDirAbs = Join-Path $projectRoot $phase.out_dir_rel
    New-Item -ItemType Directory -Path $phaseOutDirAbs -Force | Out-Null

    $stdoutLog = Join-Path $logsDirAbs ("phase_{0}_{1}_stdout.log" -f ($i + 1), $phase.phase_name)
    $stderrLog = Join-Path $logsDirAbs ("phase_{0}_{1}_stderr.log" -f ($i + 1), $phase.phase_name)

    $phaseArgs = @(
        "artisan",
        "ai:deep-audit",
        "--user-ids=$($phase.user_ids)",
        "--max-accounts=$($phase.max_accounts)",
        "--questions-per-category=$QuestionsPerCategory",
        "--chat-full-users=$($phase.chat_full_users)",
        "--chat-secondary-per-category=$SecondaryPerCategory",
        "--chat-batch-size=$($cfg.chat_batch_size)",
        "--chat-batch-break-seconds=$($cfg.chat_batch_break_seconds)",
        "--chat-category-break-seconds=$($cfg.chat_category_break_seconds)",
        "--planner-horizon=$PlannerHorizon",
        "--planner-break-seconds=$($cfg.planner_break_seconds)",
        "--predictor-holdout=0",
        "--skip-chat=$([int](-not [bool]$phase.run_chat))",
        "--skip-planner=$([int](-not [bool]$phase.run_planner))",
        "--skip-predictor=$([int](-not [bool]$phase.run_predictor))",
        "--out-dir=$($phase.out_dir_rel)"
    )

    Write-Host ("[{0}/{1}] Phase '{2}' with profile '{3}' (batch={4}, break={5}s, category-break={6}s)" -f ($i + 1), $phases.Count, $phase.phase_name, $profile, $cfg.chat_batch_size, $cfg.chat_batch_break_seconds, $cfg.chat_category_break_seconds)

    $telemetry = @{
        chat_done = @{
            personalized = 0
            general_guidance = 0
            out_of_scope = 0
        }
        chat_total = @{
            personalized = 0
            general_guidance = 0
            out_of_scope = 0
        }
        planner_started = $false
        planner_done = $false
        predictor_started = $false
        predictor_done = $false
        json_path = $null
        md_path = $null
    }

    $phaseStart = Get-Date
    $exitCode = 0
    $rawExitCode = $null
    $exitCodeResolution = "direct"

    if ($DryRun) {
        Set-Content -LiteralPath $stdoutLog -Value ("[DryRun] " + ($phaseArgs -join " ")) -Encoding UTF8
        Set-Content -LiteralPath $stderrLog -Value "" -Encoding UTF8
    } else {
        $env:XDEBUG_MODE = "off"
        $env:AI_PLANNER_OLLAMA_MAX_OUTPUT_TOKENS = [string]$cfg.planner_tokens
        $env:AI_COACH_MAX_OUTPUT_TOKENS = [string]$cfg.coach_tokens
        $env:AI_SELF_HOSTED_TEMPERATURE = [string]$cfg.llm_temperature
        $env:AI_SELF_HOSTED_LLM_TIMEOUT = [string]$cfg.llm_timeout
        $env:AI_PLANNER_OLLAMA_TIMEOUT = [string]$cfg.planner_timeout

        $escapedArgs = @()
        foreach ($arg in $phaseArgs) {
            $text = [string]$arg
            if ($text -match '[\s"]') {
                $text = '"' + $text.Replace('"', '\"') + '"'
            }
            $escapedArgs += $text
        }
        $cmdLine = "php " + ($escapedArgs -join " ")
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmdLine) -WorkingDirectory $projectRoot -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
        try {
            $process.PriorityClass = $cfg.process_priority
        } catch {
        }

        $nextEtaAt = (Get-Date).AddMinutes($EtaUpdateMinutes)
        while (-not $process.HasExited) {
            $requestedProfile = Read-LoadProfile -StateFile $loadStatePath -Fallback $profile
            if ($requestedProfile -in @("low", "mid", "high")) {
                $runtimeCfg = Get-ProfileConfig -Profile $requestedProfile
                try {
                    $process.PriorityClass = $runtimeCfg.process_priority
                } catch {
                }
                $profile = $requestedProfile
            }

            foreach ($logPath in @($stdoutLog, $stderrLog)) {
                if (-not (Test-Path -LiteralPath $logPath)) {
                    continue
                }

                $tail = Get-Content -LiteralPath $logPath -Tail 250 -ErrorAction SilentlyContinue
                foreach ($line in $tail) {
                    Update-TelemetryFromLine -Line ([string]$line) -Telemetry $telemetry
                }
            }

            $phaseProgressUnits = Get-PhaseProgressUnits -Phase $phase -Telemetry $telemetry
            $overallDone = [Math]::Min($totalUnits, $completedUnits + $phaseProgressUnits)
            $percent = [Math]::Min(100, [Math]::Round(($overallDone / $totalUnits) * 100, 2))
            $elapsedSec = ((Get-Date) - $runStarted).TotalSeconds
            $etaSec = if ($overallDone -gt 0) { [Math]::Max(0, ($elapsedSec * $totalUnits / $overallDone) - $elapsedSec) } else { $estimateSeconds }

            $status = ("Phase {0}/{1} | {2} | profile={3} | {4}% | ETA {5}" -f ($i + 1), $phases.Count, $phase.phase_name, $profile, $percent, (Format-Duration -Seconds $etaSec))
            Write-Progress -Id 1 -Activity "Adaptive 3-user AI deep audit" -Status $status -PercentComplete $percent

            $now = Get-Date
            if ($now -ge $nextEtaAt) {
                $etaSnapshot = @{
                    run_id = $runStamp
                    phase_index = ($i + 1)
                    phase_total = $phases.Count
                    phase_name = $phase.phase_name
                    profile = $profile
                    updated_at_local = $now.ToString("yyyy-MM-dd HH:mm:ss zzz")
                    overall_percent = $percent
                    elapsed_seconds = [int][Math]::Round($elapsedSec)
                    eta_seconds = [int][Math]::Round($etaSec)
                    eta_hhmmss = (Format-Duration -Seconds $etaSec)
                }
                Append-JsonLine -Path $etaUpdatesPath -Data $etaSnapshot
                Write-Host ("ETA update [{0}] {1}% complete, ETA {2}, profile={3}" -f $now.ToString("HH:mm:ss"), $percent, (Format-Duration -Seconds $etaSec), $profile)
                $nextEtaAt = $now.AddMinutes($EtaUpdateMinutes)
            }

            $live = @{
                run_id = $runStamp
                updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
                phase_index = ($i + 1)
                phase_total = $phases.Count
                phase_name = $phase.phase_name
                profile = $profile
                overall_percent = $percent
                eta_seconds = [int][Math]::Round($etaSec)
                elapsed_seconds = [int][Math]::Round($elapsedSec)
                completed_units = [int]$overallDone
                total_units = [int]$totalUnits
                stdout_log = $stdoutLog
                stderr_log = $stderrLog
            }
            Write-JsonFile -Path $liveProgressPath -Data $live

            Start-Sleep -Seconds 2
        }

        foreach ($logPath in @($stdoutLog, $stderrLog)) {
            if (-not (Test-Path -LiteralPath $logPath)) {
                continue
            }

            $allLines = Get-Content -LiteralPath $logPath -ErrorAction SilentlyContinue
            foreach ($line in $allLines) {
                Update-TelemetryFromLine -Line ([string]$line) -Telemetry $telemetry
            }
        }

        try {
            $process.WaitForExit()
        } catch {
        }

        try {
            $rawExitCode = $process.ExitCode
        } catch {
            $rawExitCode = $null
        }
        $exitCode = $rawExitCode
    }

    $phaseSeconds = [int][Math]::Round(((Get-Date) - $phaseStart).TotalSeconds)

    $auditJsonPath = $telemetry.json_path
    if ([string]::IsNullOrWhiteSpace($auditJsonPath)) {
        $candidate = Get-ChildItem -Path $phaseOutDirAbs -Filter "ai_deep_audit_*.json" -File -ErrorAction SilentlyContinue |
            Sort-Object -Property LastWriteTime -Descending |
            Select-Object -First 1
        if ($null -ne $candidate) {
            $auditJsonPath = $candidate.FullName
        }
    }

    $auditMdPath = $telemetry.md_path
    if ([string]::IsNullOrWhiteSpace($auditMdPath)) {
        $candidate = Get-ChildItem -Path $phaseOutDirAbs -Filter "ai_deep_audit_*.md" -File -ErrorAction SilentlyContinue |
            Sort-Object -Property LastWriteTime -Descending |
            Select-Object -First 1
        if ($null -ne $candidate) {
            $auditMdPath = $candidate.FullName
        }
    }

    if (-not $DryRun -and $null -eq $exitCode) {
        $hasJson = (-not [string]::IsNullOrWhiteSpace($auditJsonPath)) -and (Test-Path -LiteralPath $auditJsonPath)
        $hasMd = (-not [string]::IsNullOrWhiteSpace($auditMdPath)) -and (Test-Path -LiteralPath $auditMdPath)
        if ($hasJson -and $hasMd) {
            $exitCode = 0
            $exitCodeResolution = "inferred_success_from_outputs"
        } else {
            $exitCode = 1
            $exitCodeResolution = "null_exitcode_without_outputs"
        }
    }

    if (-not $DryRun -and $exitCode -ne 0) {
        $errTail = ""
        $outTail = ""
        if (Test-Path -LiteralPath $stderrLog) {
            $errTail = ((Get-Content -LiteralPath $stderrLog -Tail 60 -ErrorAction SilentlyContinue) -join "`n")
        }
        if (Test-Path -LiteralPath $stdoutLog) {
            $outTail = ((Get-Content -LiteralPath $stdoutLog -Tail 30 -ErrorAction SilentlyContinue) -join "`n")
        }
        throw "Phase '$($phase.phase_name)' failed with exit code $exitCode (resolution=$exitCodeResolution, raw=$rawExitCode).`nSTDERR:`n$errTail`nSTDOUT:`n$outTail"
    }

    $phaseResult = @{
        phase_index = ($i + 1)
        phase_name = $phase.phase_name
        profile_used = $profile
        started_at_local = $phaseStart.ToString("yyyy-MM-dd HH:mm:ss zzz")
        duration_seconds = $phaseSeconds
        exit_code = $exitCode
        raw_exit_code = $rawExitCode
        exit_code_resolution = $exitCodeResolution
        stdout_log = $stdoutLog
        stderr_log = $stderrLog
        audit_json = $auditJsonPath
        audit_md = $auditMdPath
        expected_chat_questions = [int]$phase.expected_chat_questions
    }
    $phaseResults += $phaseResult

    $completedUnits += [int]$phase.expected_chat_questions
    $completedUnits += [int]$phase.planner_weight_units
    $completedUnits += [int]$phase.predictor_weight_units
}

Write-Progress -Id 1 -Activity "Adaptive 3-user AI deep audit" -Status "Finalizing consolidated report..." -PercentComplete 100

$chatBuckets = @{
    great = 0
    good = 0
    bad = 0
    completely_wrong = 0
}
$chatQuestionsTotal = 0
$plannerUsersTotal = 0
$plannerUsersSuccess = 0
$plannerUsersFailed = 0
$sourceReports = @()

foreach ($phaseResult in $phaseResults) {
    $jsonPath = [string]$phaseResult.audit_json
    if ([string]::IsNullOrWhiteSpace($jsonPath) -or -not (Test-Path -LiteralPath $jsonPath)) {
        continue
    }

    try {
        $payload = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json
    } catch {
        continue
    }

    $sourceReports += @{
        phase = $phaseResult.phase_name
        path = $jsonPath
        run_id = [string]$payload.run.run_id
    }

    if ($null -ne $payload.chat -and $null -ne $payload.chat.summary) {
        $chatQuestionsTotal += [int]$payload.chat.summary.total_questions
        if ($null -ne $payload.chat.summary.bucket_counts) {
            $chatBuckets.great += [int]$payload.chat.summary.bucket_counts.great
            $chatBuckets.good += [int]$payload.chat.summary.bucket_counts.good
            $chatBuckets.bad += [int]$payload.chat.summary.bucket_counts.bad
            $chatBuckets.completely_wrong += [int]$payload.chat.summary.bucket_counts.completely_wrong
        }
    }

    if ($null -ne $payload.planner -and $null -ne $payload.planner.summary) {
        $plannerUsersTotal += [int]$payload.planner.summary.users_total
        $plannerUsersSuccess += [int]$payload.planner.summary.users_success
        $plannerUsersFailed += [int]$payload.planner.summary.users_failed
    }
}

$runFinished = Get-Date
$runDurationSeconds = [int][Math]::Round(($runFinished - $runStarted).TotalSeconds)

$consolidated = @{
    run_id = $runStamp
    started_at_local = $runStarted.ToString("yyyy-MM-dd HH:mm:ss zzz")
    finished_at_local = $runFinished.ToString("yyyy-MM-dd HH:mm:ss zzz")
    duration_seconds = $runDurationSeconds
    out_dir = $runDirAbs
    users = $targetUserIds
    phases = $phaseResults
    chat_summary = @{
        total_questions = $chatQuestionsTotal
        bucket_counts = $chatBuckets
        bucket_percentages = @{
            great = if ($chatQuestionsTotal -gt 0) { [Math]::Round(($chatBuckets.great / $chatQuestionsTotal) * 100, 2) } else { 0.0 }
            good = if ($chatQuestionsTotal -gt 0) { [Math]::Round(($chatBuckets.good / $chatQuestionsTotal) * 100, 2) } else { 0.0 }
            bad = if ($chatQuestionsTotal -gt 0) { [Math]::Round(($chatBuckets.bad / $chatQuestionsTotal) * 100, 2) } else { 0.0 }
            completely_wrong = if ($chatQuestionsTotal -gt 0) { [Math]::Round(($chatBuckets.completely_wrong / $chatQuestionsTotal) * 100, 2) } else { 0.0 }
        }
    }
    planner_summary = @{
        users_total = $plannerUsersTotal
        users_success = $plannerUsersSuccess
        users_failed = $plannerUsersFailed
    }
    source_reports = $sourceReports
}

$consolidatedJsonPath = Join-Path $runDirAbs ("ai_deep_audit_consolidated_" + $runStamp + ".json")
$consolidatedMdPath = Join-Path $runDirAbs ("ai_deep_audit_consolidated_" + $runStamp + ".md")

Write-JsonFile -Path $consolidatedJsonPath -Data $consolidated

$mdLines = @()
$mdLines += "# Adaptive Deep Audit Consolidated Report"
$mdLines += ""
$mdLines += ('- Run ID: `' + $runStamp + '`')
$mdLines += ('- Started: `' + $runStarted.ToString("yyyy-MM-dd HH:mm:ss zzz") + '`')
$mdLines += ('- Finished: `' + $runFinished.ToString("yyyy-MM-dd HH:mm:ss zzz") + '`')
$mdLines += ('- Duration: `' + (Format-Duration -Seconds $runDurationSeconds) + '`')
$mdLines += ('- Users: `' + ($targetUserIds -join ", ") + '`')
$mdLines += ""
$mdLines += "## Chat Summary"
$mdLines += ""
$mdLines += ('- Total questions: `' + $chatQuestionsTotal + '`')
$mdLines += ('- Great: `' + $chatBuckets.great + '`')
$mdLines += ('- Good: `' + $chatBuckets.good + '`')
$mdLines += ('- Bad: `' + $chatBuckets.bad + '`')
$mdLines += ('- Completely wrong: `' + $chatBuckets.completely_wrong + '`')
$mdLines += ""
$mdLines += "## Planner Summary"
$mdLines += ""
$mdLines += ('- Users total: `' + $plannerUsersTotal + '`')
$mdLines += ('- Users success: `' + $plannerUsersSuccess + '`')
$mdLines += ('- Users failed: `' + $plannerUsersFailed + '`')
$mdLines += ""
$mdLines += "## Phase Outputs"
$mdLines += ""
$mdLines += "| Phase | Profile | Duration (s) | JSON | Markdown |"
$mdLines += "|---|---|---:|---|---|"
foreach ($phaseResult in $phaseResults) {
    $mdLines += ("| {0} | {1} | {2} | {3} | {4} |" -f $phaseResult.phase_name, $phaseResult.profile_used, $phaseResult.duration_seconds, $phaseResult.audit_json, $phaseResult.audit_md)
}
$mdLines += ""
$mdLines += "## Runtime Files"
$mdLines += ""
$mdLines += ('- Live progress JSON: `' + $liveProgressPath + '`')
$mdLines += ('- Load control state JSON: `' + $loadStatePath + '`')
$mdLines += ('- Logs directory: `' + $logsDirAbs + '`')

Set-Content -LiteralPath $consolidatedMdPath -Value ($mdLines -join "`n") -Encoding UTF8

$finalProgress = @{
    run_id = $runStamp
    status = "completed"
    updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    overall_percent = 100
    eta_seconds = 0
    elapsed_seconds = $runDurationSeconds
    consolidated_json = $consolidatedJsonPath
    consolidated_md = $consolidatedMdPath
    eta_updates_file = $etaUpdatesPath
}
Write-JsonFile -Path $liveProgressPath -Data $finalProgress

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

Write-Progress -Id 1 -Activity "Adaptive 3-user AI deep audit" -Completed

Write-Host ""
Write-Host "Adaptive run completed."
Write-Host "Consolidated JSON: $consolidatedJsonPath"
Write-Host "Consolidated Markdown: $consolidatedMdPath"
Write-Host "Live progress JSON: $liveProgressPath"
Write-Host "Logs directory: $logsDirAbs"
