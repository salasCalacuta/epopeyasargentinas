# Crea/actualiza la tarea Epopeyas-Keepalive-Render (cada 10 minutos).
# Render free se duerme ~15 min sin tráfico: hay que pinguear más seguido.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Script = Join-Path $Root "keepalive-render.ps1"
$TaskName = "Epopeyas-Keepalive-Render"
$Ps = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $Script)) { throw "No está $Script" }

$Tr = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
cmd /c "schtasks /Create /TN `"$TaskName`" /TR `"$Tr`" /SC MINUTE /MO 10 /F" | Out-Host

Write-Host "Tarea instalada: $TaskName (cada 10 minutos)"
Write-Host "URL en keepalive-render-config.json → https://epopeyasargentinas.onrender.com"
Write-Host "Prueba: powershell -File `"$Script`""
