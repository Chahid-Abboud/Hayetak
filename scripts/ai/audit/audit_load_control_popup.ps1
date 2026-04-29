param(
    [Parameter(Mandatory = $true)]
    [string]$StateFile
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Write-State([string]$Profile) {
    $payload = @{
        profile = $Profile
        updated_at_local = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
    } | ConvertTo-Json

    $dir = Split-Path -Parent $StateFile
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Set-Content -LiteralPath $StateFile -Value $payload -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $StateFile)) {
    Write-State -Profile "low"
}

$current = "low"
try {
    $raw = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    if ($raw.profile) {
        $current = [string]$raw.profile
    }
} catch {
    $current = "low"
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Audit Load Control"
$form.Size = New-Object System.Drawing.Size(360, 200)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true

$title = New-Object System.Windows.Forms.Label
$title.Location = New-Object System.Drawing.Point(12, 12)
$title.Size = New-Object System.Drawing.Size(320, 40)
$title.Text = "Change load profile during run.`n(Profile change applies on next phase)"
$form.Controls.Add($title)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(12, 55)
$status.Size = New-Object System.Drawing.Size(320, 22)
$status.Text = "Current profile: $current"
$form.Controls.Add($status)

function New-ProfileButton([string]$Text, [int]$X, [int]$Y, [string]$Profile) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $Text
    $btn.Location = New-Object System.Drawing.Point($X, $Y)
    $btn.Size = New-Object System.Drawing.Size(95, 35)
    $btn.Add_Click({
        Write-State -Profile $Profile
        $status.Text = "Current profile: $Profile"
    })

    return $btn
}

$form.Controls.Add((New-ProfileButton -Text "Low" -X 12 -Y 90 -Profile "low"))
$form.Controls.Add((New-ProfileButton -Text "Mid" -X 125 -Y 90 -Profile "mid"))
$form.Controls.Add((New-ProfileButton -Text "High" -X 238 -Y 90 -Profile "high"))

$close = New-Object System.Windows.Forms.Button
$close.Text = "Close"
$close.Location = New-Object System.Drawing.Point(125, 132)
$close.Size = New-Object System.Drawing.Size(95, 30)
$close.Add_Click({ $form.Close() })
$form.Controls.Add($close)

[void]$form.ShowDialog()
