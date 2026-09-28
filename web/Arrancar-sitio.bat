@echo off
cd /d "%~dp0"
echo ========================================
echo  Epopeyas - arranque / verificacion
echo ========================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verificar-sitio.ps1"
echo.
if exist "%~dp0url-publica.txt" (
  echo URL actual:
  type "%~dp0url-publica.txt"
  echo.
  echo Login juego: leo / juego
  echo Admin:   URL/tefi
) else (
  echo Aun no hay URL. Si usas tunel rapido, espera 10s y volve a ejecutar.
)
echo.
echo Tip URL FIJA: edita agente-online-config.json
echo   tunel.modo = "token"
echo   tunel.token = "(token de Cloudflare Zero Trust)"
echo   tunel.hostname = "tu-dominio.ejemplo.com"
echo.
pause
