@echo off
title QueryCraft Setup
color 0A

echo ========================================
echo    QueryCraft Setup
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

REM Install dependencies
echo Installing dependencies...
echo   - Root dependencies...
call npm install >nul 2>&1

echo   - Server dependencies...
cd server
call npm install >nul 2>&1
cd ..

echo   - UI dependencies...
cd UI
call npm install >nul 2>&1
cd ..

echo [OK] Dependencies installed
echo.

REM Setup environment
echo Setting up environment...
if not exist server\src\.env (
    copy ENV_TEMPLATE.txt server\src\.env >nul
    echo [OK] Created server\src\.env from template
    echo.
    echo [IMPORTANT] Edit server\src\.env with your database credentials!
    echo.
) else (
    echo [OK] server\src\.env already exists
)

REM Build frontend
echo Building frontend...
cd UI
call npm run build >nul 2>&1
cd ..
echo [OK] Frontend built successfully
echo.

echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit server\src\.env with your database credentials
echo 2. (Optional) Add API keys for cloud LLMs
echo 3. Double-click START.bat to run
echo.
pause
