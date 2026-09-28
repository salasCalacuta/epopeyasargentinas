@echo off
cd /d "%~dp0"
if not exist ".agente" mkdir ".agente"
start "" /MIN wscript.exe "%~dp0Arrancar-tunel.vbs"
exit /b 0
