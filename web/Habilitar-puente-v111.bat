@echo off
chcp 65001 >nul
title Epopeyas v1.11 - Puente privado (leo / juego)
cd /d "%~dp0"

echo.
echo ============================================================
echo   Epopeyas Argentinas v1.11
echo   Servidor privado (leo / juego) en puerto 3460
echo ============================================================
echo.
echo   Usuario: leo
echo   Clave:   juego
echo.
echo   Local:   http://localhost:3460
echo   Remoto:  la URL https://....trycloudflare.com aparecera abajo
echo.
echo   Mejor: Instalar-agente-online.bat (queda automatico, sin esta ventana).
echo   Deja esta ventana ABIERTA solo si NO usas el agente online.
echo   Ctrl+C cierra el tunel. Cerra tambien la ventana del servidor.
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro Node.js. Instala Node y vuelve a intentar.
  pause
  exit /b 1
)

echo [1/2] Iniciando servidor privado (leo / juego) en puerto 3460...
start "Epopeyas-v111-Server-3460" cmd /k "cd /d "%~dp0" && node server.js"
timeout /t 3 /nobreak >nul

echo [2/2] Habilitando puente Cloudflare...
echo       Cuando veas la URL trycloudflare.com, usa esa desde otra red.
echo.
npx --yes cloudflared tunnel --url http://localhost:3460

echo.
echo Puente cerrado.
pause
