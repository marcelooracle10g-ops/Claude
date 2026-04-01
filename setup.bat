@echo off
chcp 65001 >nul 2>&1
title Cosmeticos App - Setup

echo ============================================
echo   Cosmeticos App - Setup Automatico
echo   White Bull ^& Kings Cosmeticos
echo ============================================
echo.

:: Verificar Node.js
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Baixe e instale em: https://nodejs.org
    echo Escolha a versao LTS (recomendada)
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   Node.js encontrado: %%i
echo.

:: Instalar dependencias
echo [2/5] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERRO ao instalar dependencias!
    pause
    exit /b 1
)
echo   Dependencias instaladas com sucesso!
echo.

:: Configurar .env
echo [3/5] Configurando arquivo .env...
if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo   Arquivo backend\.env criado.
    echo   NOTA: Para integracao com Bling, edite backend\.env
) else (
    echo   Arquivo backend\.env ja existe. Mantendo configuracao atual.
)
echo.

:: Seed do banco de dados
echo [4/5] Criando banco de dados com dados de teste...
if exist data\cosmetics.db (
    echo   Banco ja existe. Deseja recriar? (S/N)
    set /p resposta=
    if /i "%resposta%"=="S" (
        del /f data\cosmetics.db
        node backend\src\seed.js
    ) else (
        echo   Mantendo banco existente.
    )
) else (
    node backend\src\seed.js
)
echo.

:: Build do frontend
echo [5/5] Compilando frontend (pode demorar alguns minutos)...
cd frontend
call npm run build
cd ..

if not exist frontend\build\index.html (
    echo ERRO ao compilar frontend!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SETUP COMPLETO!
echo ============================================
echo.
echo   Para iniciar, execute:
echo     iniciar.bat
echo.
echo   Ou manualmente:
echo     node backend\src\server.js
echo.
echo   Depois acesse no navegador:
echo     http://localhost:3001
echo.
echo   === CREDENCIAIS ===
echo   Admin:  admin@cosmeticos.com / admin123
echo   Rep:    carlos@cosmeticos.com / rep123
echo   Rep:    maria@cosmeticos.com / rep123
echo   Rep:    joao@cosmeticos.com / rep123
echo   Rep:    ana@cosmeticos.com / rep123
echo.
echo ============================================
echo.
pause
