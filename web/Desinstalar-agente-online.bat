@echo off
chcp 65001 >nul
title Desinstalar agente online - Epopeyas
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$startup = [Environment]::GetFolderPath('Startup'); Remove-Item (Join-Path $startup 'Epopeyas-Agente-Online.vbs') -Force -ErrorAction SilentlyContinue; Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'EpopeyasAgenteOnline' -ErrorAction SilentlyContinue; cmd /c 'schtasks /Delete /TN Epopeyas-Agente-Online /F >nul 2>&1'; cmd /c 'schtasks /Delete /TN Epopeyas-Agente-Online-Keep /F >nul 2>&1'; Write-Host 'Agente online desinstalado.'"
echo.
pause
