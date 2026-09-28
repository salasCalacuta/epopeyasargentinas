@echo off
cd /d "%~dp0"
echo Iniciando servidor privado (leo / juego) en puerto 3460...
start "Epopeyas-Server" cmd /c "node server.js"
timeout /t 2 /nobreak >nul
echo Abriendo tunel Cloudflare (URL publica privada con login)...
npx --yes cloudflared tunnel --url http://localhost:3460
pause
