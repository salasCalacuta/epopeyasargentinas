@echo off
chcp 65001 >nul
title Instalar agente online - Epopeyas
cd /d "%~dp0"
echo Instalando agente online (servidor + tunel automaticos)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar-agente-online.ps1"
if errorlevel 1 (
  echo Hubo un error al instalar.
  pause
  exit /b 1
)
echo.
echo Listo. Ya no hace falta abrir Habilitar-puente-v111.bat.
echo Poné tu mail en agente-online-config.json (campo emailAviso).
echo.
pause
