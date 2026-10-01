# Tarea Epopeyas-Renovar-Preguntas cada 3 días.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Script = Join-Path $Root "renovar-preguntas-ciclo.ps1"
$TaskName = "Epopeyas-Renovar-Preguntas"
$Ps = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $Script)) { throw "No está $Script" }

$Tr = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
cmd /c "schtasks /Create /TN `"$TaskName`" /TR `"$Tr`" /SC DAILY /MO 3 /F" | Out-Host

Write-Host "Tarea instalada: $TaskName (cada 3 días)"
Write-Host "El navegador también renueva el orden/preguntas hechas cada 3 días (localStorage)."
