# PowerShell - Push rápido a GitHub (Monitoreo de relojes)
# Uso: .\.scripts\gitpush.ps1 ["mensaje opcional"]

# Auto-navegar a la raíz del proyecto.
Set-Location (Split-Path $PSScriptRoot -Parent)

function Test-UnsafeEnvironmentTemplate {
    $pending = git diff -- .env.example
    if (-not $pending) {
        return $false
    }

    foreach ($line in $pending) {
        if ($line -match '^\+(?:IGPS_(?:MAMA|PAPA)_(?:ACCOUNT|PASSWORD)|DASHBOARD_PASSWORD)=(.+)$') {
            $value = $Matches[1].Trim()
            if ($value -and $value -notmatch '^(replace-with-|your-|example|changeme)') {
                return $true
            }
        }
    }

    return $false
}

function Add-SafeChanges {
    $unsafeTemplate = Test-UnsafeEnvironmentTemplate
    git add .

    # .env.example is intentionally versioned; only its secret-free template belongs in Git.
    if ($unsafeTemplate) {
        git restore --staged -- .env.example
        Write-Host "NOTICE: .env.example contains possible credentials and was skipped." -ForegroundColor Yellow
        Write-Host "Keep real values only in the ignored .env file on the VPS." -ForegroundColor Yellow
    }
}

# Script Tanque v7, aligned with Herramientas_Personales.
Add-SafeChanges
$msg = $args[0]
if (-not $msg) { $msg = "MonitoreoRelojes Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }

git commit -m "$msg" 2>$null

Write-Host "Attempting to synchronize and push changes to GitHub..." -ForegroundColor Cyan
git pull origin main --rebase

if ($LASTEXITCODE -ne 0) {
    Write-Host "Conflict detected. Applying safe recovery..." -ForegroundColor Yellow
    git rebase --abort 2>$null
    git pull origin main --no-rebase -X ours
    Add-SafeChanges
    git commit -m "$msg (Conflict Resolved)" 2>$null
}

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push completed successfully. Automatic deployment will now begin." -ForegroundColor Green
} else {
    Write-Host "Push failed." -ForegroundColor Red
    exit 1
}
