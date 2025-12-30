@echo off
title QueryCraft - Starting...
color 0A

echo ========================================
echo    QueryCraft AI SQL Assistant
echo ========================================
echo.
echo Starting backend and frontend...
echo.

REM Start backend in a new window
start "QueryCraft Backend" cmd /k "cd server\src && node index.js"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend from UI folder
start "QueryCraft Frontend" cmd /k "cd UI && npm run dev"

echo.
echo ========================================
echo   QueryCraft is starting!
echo ========================================
echo.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Two windows will open:
echo   1. Backend Server (server/src - port 4000)
echo   2. Frontend Server (UI/ - port 3000)
echo.
echo Close this window or press any key...
pause >nul
