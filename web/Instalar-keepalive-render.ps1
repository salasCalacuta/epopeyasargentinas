# Crea/actualiza la tarea programada Epopeyas-Keepalive-Render (cada 2 horas).
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Script = Join-Path $Root "keepalive-render.ps1"
$TaskName = "Epopeyas-Keepalive-Render"
$Ps = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $Script)) { throw "No está $Script" }

$Tr = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
cmd /c "schtasks /Create /TN `"$TaskName`" /TR `"$Tr`" /SC HOURLY /MO 2 /F" | Out-Host

Write-Host "Tarea instalada: $TaskName (cada 2 horas)"
Write-Host "Editá keepalive-render-config.json con la URL de Render y ejecutá una prueba:"
Write-Host "  powershell -File `"$Script`""
