@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instalalo desde https://nodejs.org ^(LTS^).
  pause
  exit /b 1
)

REM Abre el admin unos segundos despues de arrancar Node ^(sin bloquear esta ventana^)
start "" cmd /c "ping -n 3 127.0.0.1 >nul && start http://127.0.0.1:8787/admin-interlinear.html"

echo.
echo  Servidor: http://127.0.0.1:8787/admin-interlinear.html
echo  Los guardados van directo a IdiomaORIGEN\interlinear-snapshot\chapters\
echo  Detener: Ctrl+C en esta ventana
echo.

node scripts\admin-interlinear-local-server.js
if errorlevel 1 pause
