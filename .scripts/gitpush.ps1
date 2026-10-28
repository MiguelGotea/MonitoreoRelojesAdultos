# PowerShell - Push rápido a GitHub (Monitoreo de relojes)
# Uso: .\.scripts\gitpush.ps1 ["mensaje opcional"]

# Mantiene salida legible en la consola de Windows.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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

# Nunca versionar una cuenta ni clave real en la plantilla pública.
if (Test-UnsafeEnvironmentTemplate) {
    Write-Host "❌ Se detectaron posibles credenciales en .env.example. No se hará commit." -ForegroundColor Red
    Write-Host "   Déjalas solamente en el archivo .env del VPS y restaura la plantilla antes de reintentar." -ForegroundColor Yellow
    exit 1
}

# Script Tanque v7, alineado con Herramientas_Personales.
git add .
$msg = $args[0]
if (-not $msg) { $msg = "MonitoreoRelojes Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }

git commit -m "$msg" 2>$null

Write-Host "🚀 Intentando sincronizar y subir cambios a GitHub..." -ForegroundColor Cyan
git pull origin main --rebase

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Conflicto detectado. Aplicando reparación de Hierro..." -ForegroundColor Yellow
    git rebase --abort 2>$null
    git pull origin main --no-rebase -X ours
    git add .
    git commit -m "$msg (Conflict Resolved)" 2>$null
}

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ¡Subida completada con éxito! El despliegue automático comenzará ahora." -ForegroundColor Green
} else {
    Write-Host "❌ Error en push." -ForegroundColor Red
    exit 1
}
