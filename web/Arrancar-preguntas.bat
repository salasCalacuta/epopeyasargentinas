@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".agente" mkdir ".agente"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente-preguntas.ps1"
exit /b %ERRORLEVEL%
