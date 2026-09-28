# Instala el agente online sin admin: arranque al iniciar sesion + loop permanente.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Script = Join-Path $Root "agente-online.ps1"
$Vbs = Join-Path $Root "Arrancar-agente-online.vbs"
$Startup = [Environment]::GetFolderPath("Startup")
$StartupVbs = Join-Path $Startup "Epopeyas-Agente-Online.vbs"
$RunName = "EpopeyasAgenteOnline"

if (-not (Test-Path $Script)) { throw "No se encontro $Script" }
if (-not (Test-Path $Vbs)) { throw "No se encontro $Vbs" }

Copy-Item $Vbs $StartupVbs -Force
Write-Host "Acceso directo de inicio: $StartupVbs"

try {
  New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name $RunName -Value "wscript.exe `"$Vbs`"" -PropertyType String -Force | Out-Null
  Write-Host "Registro HKCU Run: $RunName"
} catch {
  Write-Host "Aviso: no se pudo escribir HKCU Run ($($_.Exception.Message))"
}

# Intento extra de tarea programada (si hay permiso).
$Ps = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$Tr = "$Ps -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
cmd /c "schtasks /Create /TN `"Epopeyas-Agente-Online`" /TR `"$Tr`" /SC ONLOGON /F >nul 2>&1"
cmd /c "schtasks /Create /TN `"Epopeyas-Agente-Online-Keep`" /TR `"$Tr`" /SC MINUTE /MO 5 /F >nul 2>&1"

Start-Process -FilePath "wscript.exe" -ArgumentList "`"$Vbs`""
Write-Host "Agente online instalado y arrancado."
Write-Host "Edita emailAviso en agente-online-config.json para recibir avisos."
Write-Host "La URL publica se guarda en url-publica.txt y en el Escritorio."
