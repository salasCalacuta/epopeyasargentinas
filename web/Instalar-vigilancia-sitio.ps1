# Instala vigilancia del sitio: al iniciar sesion + cada 5 minutos
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Verify = Join-Path $Root "verificar-sitio.ps1"
$Agent = Join-Path $Root "agente-online.ps1"
$Vbs = Join-Path $Root "Arrancar-agente-online.vbs"
$Startup = [Environment]::GetFolderPath("Startup")
$StartupVbs = Join-Path $Startup "Epopeyas-Agente-Online.vbs"
$Ps = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $Verify)) { throw "Falta $Verify" }

# Arranque al logon (usuario actual, sin admin)
if (Test-Path $Vbs) {
  Copy-Item $Vbs $StartupVbs -Force
  try {
    New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "EpopeyasAgenteOnline" -Value "wscript.exe `"$Vbs`"" -PropertyType String -Force | Out-Null
  } catch {}
}

$TrVerify = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Verify`""
$TrAgent = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Agent`""

cmd /c "schtasks /Create /TN `"Epopeyas-Verificar-Sitio`" /TR `"$TrVerify`" /SC MINUTE /MO 5 /F" | Out-Host
cmd /c "schtasks /Create /TN `"Epopeyas-Agente-Online`" /TR `"$TrAgent`" /SC ONLOGON /F" | Out-Host
cmd /c "schtasks /Create /TN `"Epopeyas-Agente-Online-Keep`" /TR `"$TrAgent`" /SC MINUTE /MO 15 /F" | Out-Host

# Primera verificacion ahora
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verify | Out-Host

Write-Host ""
Write-Host "Tareas instaladas:"
Write-Host "  - Epopeyas-Verificar-Sitio   (cada 5 min)"
Write-Host "  - Epopeyas-Agente-Online     (al iniciar sesion)"
Write-Host "  - Epopeyas-Agente-Online-Keep (cada 15 min)"
Write-Host ""
Write-Host "URL fija: configura tunel.token + tunel.hostname en agente-online-config.json"
Write-Host "Estado: panel admin /tefi -> pestana Sitio"
