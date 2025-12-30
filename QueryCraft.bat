@echo off
setlocal enabledelayedexpansion
title QueryCraft - Unified Setup & Start
color 0A

echo ========================================
echo    QueryCraft AI SQL Assistant
echo ========================================
echo.

REM Port Checking
echo [CHECK] Checking for existing instances...
netstat -ano | findstr :4000 >nul
if %errorlevel% == 0 (
    echo [WARNING] Backend port 4000 is already in use.
    echo           Please close other QueryCraft windows first.
    pause
    exit /b
)
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo [WARNING] Frontend port 3000 is already in use.
    echo           Please close other QueryCraft windows first.
    pause
    exit /b
)

set ENV_FILE=server\src\.env
set TEMPLATE_FILE=ENV_TEMPLATE.txt
set FIRST_RUN=N

if not exist %ENV_FILE% (
    echo [SETUP] No environment file found. Let's configure one...
    copy %TEMPLATE_FILE% %ENV_FILE% >nul
    set FIRST_RUN=Y
)

if "%FIRST_RUN%"=="N" (
    echo [INFO] Settings detected. 
    set /p SKIP_SETUP=">> Press Enter for Fast Start, or 'R' to Reconfigure: "
    if "!SKIP_SETUP!"=="" goto START_APP
)

echo.
echo --- API Configuration ---
echo [Note: Press Enter to skip if you don't use a provider]

set /p AZ_USE="1) Do you want to use Azure OpenAI? (Y/N): "
if /i "%AZ_USE%"=="Y" (
    echo    [Hint] Get keys at: https://portal.azure.com
    set /p AZ_KEY="   Enter Azure API Key: "
    set /p AZ_END="   Enter Azure Endpoint: "
    powershell -Command "(gc %ENV_FILE%) -replace 'AZURE_APIKEY=.*', 'AZURE_APIKEY=!AZ_KEY!' | Out-File -encoding utf8 %ENV_FILE%"
    powershell -Command "(gc %ENV_FILE%) -replace 'AZURE_ENDPOINT=.*', 'AZURE_ENDPOINT=!AZ_END!' | Out-File -encoding utf8 %ENV_FILE%"
)

set /p GEM_USE="2) Do you want to use Google Gemini? (Y/N): "
if /i "%GEM_USE%"=="Y" (
    echo    [Hint] Get keys at: https://aistudio.google.com
    set /p GEM_KEY="   Enter Gemini API Key: "
    powershell -Command "(gc %ENV_FILE%) -replace 'GEMINI_API_KEY=.*', 'GEMINI_API_KEY=!GEM_KEY!' | Out-File -encoding utf8 %ENV_FILE%"
)

set /p GROQ_USE="3) Do you want to use Groq? (Y/N): "
if /i "%GROQ_USE%"=="Y" (
    echo    [Hint] Get keys at: https://console.groq.com
    set /p GROQ_KEY="   Enter Groq API Key: "
    powershell -Command "(gc %ENV_FILE%) -replace 'GROQ_API_KEY=.*', 'GROQ_API_KEY=!GROQ_KEY!' | Out-File -encoding utf8 %ENV_FILE%"
)

echo.
echo --- Local LLM Configuration ---
set /p OLL_USE="4) Do you want to use Ollama? (Y/N): "
if /i "%OLL_USE%"=="Y" (
    echo    [Hint] Install Ollama from: https://ollama.com
    set /p OLL_MODEL="   Enter Ollama Model Name (default gemma3:4b): "
    if "!OLL_MODEL!"=="" set OLL_MODEL=gemma3:4b
    powershell -Command "(gc %ENV_FILE%) -replace 'LOCAL_MODEL=.*', 'LOCAL_MODEL=!OLL_MODEL!' | Out-File -encoding utf8 %ENV_FILE%"
)

set /p LCP_USE="5) Do you want Local CPU-only inference (Llama.cpp)? (Y/N): "
if /i "%LCP_USE%"=="Y" (
    echo    [Hint] Download GGUF models from: https://huggingface.co/models?search=gguf
    set /p LCP_MODEL="   Enter GGUF Model filename (e.g. gemma-3-4b-it.gguf): "
    if "!LCP_MODEL!"=="" set LCP_MODEL=gemma-3-4b-it.gguf
    
    set MODEL_DIR=server\src\localLLM\models
    if not exist !MODEL_DIR! mkdir !MODEL_DIR!
    
    if not exist !MODEL_DIR!\!LCP_MODEL! (
        echo [INFO] Creating placeholder for Llama.cpp model...
        echo.model_placeholder > !MODEL_DIR!\!LCP_MODEL!
        echo [!] Please move your real !LCP_MODEL! file to: !MODEL_DIR!
    )
)

echo.
echo --- System Check ---
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
echo [OK] Node.js found

:START_APP
echo.
echo --- Dependency Verification ---
if exist server\.cache (
    echo [OK] MiniLM Embedding cache found.
) else (
    echo [INIT] MiniLM will be downloaded automatically on first run.
)

if exist server\data\vectra_index (
    echo [OK] Vectra index found.
) else (
    echo [INIT] Vectra index will be created during your first schema sync.
)

echo.
echo --- Deployment Mode ---

if not exist node_modules (
    echo [!] Dependencies missing. 
    set DO_INSTALL=Y
) else (
    set /p DO_INSTALL="Run 'npm install' to update dependencies? (y/N): "
)

if /i "!DO_INSTALL!"=="Y" (
    echo Installing Root dependencies...
    call npm install
    echo Installing Server dependencies...
    cd server && call npm install && cd ..
)

set /p PROD_MODE="Run in Production Mode (Faster UI, no warnings)? (y/N): "

if /i "%PROD_MODE%"=="Y" (
    echo.
    echo [BUILD] Building frontend for production...
    call npm run build
)

echo.
echo ========================================
echo    Starting QueryCraft Servers...
echo ========================================
echo.

REM Start backend
if /i "%PROD_MODE%"=="Y" (
    start "QueryCraft Backend" cmd /k "cd server && node src/index.js"
) else (
    start "QueryCraft Backend" cmd /k "cd server && npx nodemon src/index.js"
)

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend
if /i "%PROD_MODE%"=="Y" (
    start "QueryCraft Frontend" cmd /k "npm run start"
) else (
    start "QueryCraft Frontend" cmd /k "npm run dev"
)

echo.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo All services are starting in separate windows.
echo ! [TIP] Production mode removes development-only hydration warnings.
echo.

REM Auto-open browser
timeout /t 5 /nobreak >nul
echo [LAUNCH] Opening your browser...
start http://localhost:3000

pause
