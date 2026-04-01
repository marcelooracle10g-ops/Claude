@echo off
chcp 65001 >nul 2>&1
title Cosmeticos App - Servidor

echo ============================================
echo   Cosmeticos App - Servidor
echo   White Bull ^& Kings Cosmeticos
echo ============================================
echo.
echo   Acesse no navegador:
echo     http://localhost:3001
echo.
echo   No celular (mesma rede Wi-Fi):

:: Mostrar IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo     http://%%b:3001
)

echo.
echo   Login Admin: admin@cosmeticos.com / admin123
echo   Login Rep:   carlos@cosmeticos.com / rep123
echo.
echo   Pressione Ctrl+C para parar o servidor
echo ============================================
echo.

node backend\src\server.js

pause
