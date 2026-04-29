param(
    [Parameter(Mandatory = $true)]
    [string]$StateFile
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Normalize-Profile {
    param([string]$Profile)

    $value = ([string]$Profile).Trim().ToLowerInvariant()
    if ($value -eq "mid") {
        return "medium"
    }
    if ($value -in @("low", "medium", "high")) {
        return $value
    }

    return "medium"
}

function Write-State {
    param([string]$Profile)

    $normalized = Normalize-Profile -Profile $Profile
    $payload = @{
        profile = $normalized
        updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    } | ConvertTo-Json

    $dir = Split-Path -Parent $StateFile
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Set-Content -LiteralPath $StateFile -Value $payload -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $StateFile)) {
    Write-State -Profile "medium"
}

$current = "medium"
try {
    $raw = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    if ($raw.profile) {
        $current = Normalize-Profile -Profile ([string]$raw.profile)
    }
} catch {
    $current = "medium"
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Chatbot Audit Load Control"
$form.Size = New-Object System.Drawing.Size(390, 205)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true

$title = New-Object System.Windows.Forms.Label
$title.Location = New-Object System.Drawing.Point(12, 12)
$title.Size = New-Object System.Drawing.Size(350, 42)
$title.Text = "Change chatbot audit load while it runs.`nChanges apply before the next audited question."
$form.Controls.Add($title)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(12, 58)
$status.Size = New-Object System.Drawing.Size(350, 24)
$status.Text = "Current profile: $current"
$form.Controls.Add($status)

function New-ProfileButton {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [string]$Profile
    )

    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $Text
    $btn.Location = New-Object System.Drawing.Point($X, $Y)
    $btn.Size = New-Object System.Drawing.Size(105, 36)
    $btn.Add_Click({
        Write-State -Profile $Profile
        $status.Text = "Current profile: $(Normalize-Profile -Profile $Profile)"
    })

    return $btn
}

$form.Controls.Add((New-ProfileButton -Text "Low" -X 12 -Y 94 -Profile "low"))
$form.Controls.Add((New-ProfileButton -Text "Medium" -X 137 -Y 94 -Profile "medium"))
$form.Controls.Add((New-ProfileButton -Text "High" -X 262 -Y 94 -Profile "high"))

$close = New-Object System.Windows.Forms.Button
$close.Text = "Close"
$close.Location = New-Object System.Drawing.Point(137, 138)
$close.Size = New-Object System.Drawing.Size(105, 30)
$close.Add_Click({ $form.Close() })
$form.Controls.Add($close)

[void]$form.ShowDialog()
