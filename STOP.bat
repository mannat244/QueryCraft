@echo off
title QueryCraft - Stopping...
color 0C

echo ========================================
echo    Stopping QueryCraft...
echo ========================================
echo.

REM Kill Node.js processes
taskkill /F /IM node.exe /T >nul 2>&1

echo QueryCraft stopped!
echo.
pause
