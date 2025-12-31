@echo off
setlocal enabledelayedexpansion
title QueryCraft - Master Launcher
color 1F

:: --- CONFIGURATION ---
set MIN_NODE_VERSION=18
set SERVER_DIR=server
set ENV_FILE=server\src\.env
set TEMPLATE_FILE=ENV_TEMPLATE.txt
set MODELS_DIR=server\src\localLLM\models
set FRONTEND_PORT=3000
set BACKEND_PORT=4000

:: --- HEADER ---
echo.
echo  ===================================================================
echo   Q U E R Y C R A F T   A I   -   M A S T E R   L A U N C H E R
echo  ===================================================================
echo.

:: ==========================================
:: STEP 1: SYSTEM & DEPENDENCY CHECKS
:: ==========================================
echo [INIT] Checking System Requirements...

:: 1.1 Check Node.js
where node >nul 2>nul
if %errorlevel% NEQ 0 goto NODE_MISSING

:: 1.2 Check Node Version
for /f "tokens=1 delims=." %%v in ('node -v') do set NODE_VER_STR=%%v
set NODE_VER=%NODE_VER_STR:v=%
if %NODE_VER% LSS %MIN_NODE_VERSION% goto NODE_OLD

echo [OK] Node.js v%NODE_VER% detected.
goto CHECK_NPM_DEPS

:NODE_MISSING
color 4F
echo.
echo [CRITICAL] Node.js is NOT installed.
echo QueryCraft requires Node.js to run.
echo.
echo [ACTION] Opening download page...
start https://nodejs.org/en/download/
pause
exit

:NODE_OLD
color 6F
echo.
echo [WARNING] Your Node.js version is too old (%NODE_VER%).
echo QueryCraft requires v%MIN_NODE_VERSION%+.
echo.
echo [ACTION] Opening download page to upgrade...
start https://nodejs.org/en/download/
pause
exit

:CHECK_NPM_DEPS
:: 1.3 Install Dependencies (Root & Server)
if exist node_modules goto CHECK_SERVER_DEPS
echo.
echo [UPDATE] Installing Root Dependencies (Frontend)...
call npm install --no-audit --no-fund --loglevel=error

:CHECK_SERVER_DEPS
if exist "%SERVER_DIR%\node_modules" goto CHECK_PORTS
echo.
echo [UPDATE] Installing Server Dependencies (Backend)...
cd %SERVER_DIR%
call npm install --no-audit --no-fund --loglevel=error
cd ..

:: ==========================================
:: STEP 2: PORT MANAGEMENT
:: ==========================================
:CHECK_PORTS
echo [INIT] Checking Ports...

netstat -ano | findstr :%BACKEND_PORT% >nul
if %errorlevel% EQU 0 (
    echo [INFO] Port %BACKEND_PORT% is busy. Clearing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
)

netstat -ano | findstr :%FRONTEND_PORT% >nul
if %errorlevel% EQU 0 (
    echo [INFO] Port %FRONTEND_PORT% is busy. Clearing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
)

:: ==========================================
:: STEP 3: ENVIRONMENT & API SETUP
:: ==========================================
:SETUP_ENV
if exist "%ENV_FILE%" (
    echo [INFO] Environment config found.
    set /p RECONFIG="[?] Reconfigure API Keys? (y/N): "
    if /i "!RECONFIG!"=="Y" goto CONFIG_KEYS
    goto CHECK_MODEL_DIR
)

echo [SETUP] Creating .env file...
copy "%TEMPLATE_FILE%" "%ENV_FILE%" >nul

:CONFIG_KEYS
echo.
echo -------------------------------------------------------------------
echo  API CONFIGURATION (Press Enter to skip)
echo -------------------------------------------------------------------

:: --- GROQ SETUP ---
set /p GROQ_KEY=">> Enter Groq API Key (Recommended): "
if "%GROQ_KEY%" NEQ "" powershell -Command "(Get-Content '%ENV_FILE%') -replace 'GROQ_API_KEY=.*', 'GROQ_API_KEY=%GROQ_KEY%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"

:: --- AZURE SETUP ---
echo.
set /p AZ_USE=">> Use Azure OpenAI? (y/N): "
if /i "%AZ_USE%" NEQ "Y" goto CONFIG_GEMINI

set /p AZ_END="   Endpoint (https://...): "
set /p AZ_KEY="   API Key: "
set /p AZ_DEP="   Deployment Name (e.g. o3-mini): "

if "%AZ_END%" NEQ "" powershell -Command "(Get-Content '%ENV_FILE%') -replace 'AZURE_ENDPOINT=.*', 'AZURE_ENDPOINT=%AZ_END%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"
if "%AZ_KEY%" NEQ "" powershell -Command "(Get-Content '%ENV_FILE%') -replace 'AZURE_APIKEY=.*', 'AZURE_APIKEY=%AZ_KEY%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"
if "%AZ_DEP%" NEQ "" powershell -Command "(Get-Content '%ENV_FILE%') -replace 'AZURE_DEPLOYMENT=.*', 'AZURE_DEPLOYMENT=%AZ_DEP%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"

:CONFIG_GEMINI
:: --- GEMINI SETUP ---
echo.
set /p GEM_KEY=">> Enter Gemini API Key (Optional): "
if "%GEM_KEY%" NEQ "" powershell -Command "(Get-Content '%ENV_FILE%') -replace 'GEMINI_API_KEY=.*', 'GEMINI_API_KEY=%GEM_KEY%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"

:: --- OLLAMA SETUP ---
echo.
set /p OLL_USE=">> Use Local Ollama? (y/N): "
if /i "%OLL_USE%" NEQ "Y" goto CONFIG_LLAMACPP

set /p OLL_MODEL="   Model Name (default: gemma3:4b): "
if "%OLL_MODEL%"=="" set OLL_MODEL=gemma3:4b
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'LOCAL_MODEL=.*', 'LOCAL_MODEL=%OLL_MODEL%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"

:: --- LLAMA.CPP SETUP ---
:CONFIG_LLAMACPP
echo.
set /p LCP_USE=">> Use Local Llama.cpp (CPU)? (y/N): "
if /i "%LCP_USE%" NEQ "Y" goto SELECT_MODE

set /p LCP_MODEL="   Model Filename (e.g. gemma-3-4b-it.gguf): "
if "%LCP_MODEL%"=="" set LCP_MODEL=gemma-3-4b-it.gguf
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'LLAMA_CPP_MODEL=.*', 'LLAMA_CPP_MODEL=%LCP_MODEL%' | Set-Content -Encoding UTF8 '%ENV_FILE%'"

goto CHECK_MODEL_DIR

:: ==========================================
:: STEP 4: MODEL FILE CHECK (If Llama.cpp used)
:: ==========================================
:CHECK_MODEL_DIR
:: Only verify folder if user enabled Llama.cpp in previous step or config
findstr /C:"LLAMA_CPP_MODEL=" "%ENV_FILE%" >nul
if %errorlevel% NEQ 0 goto SELECT_MODE

:: Check if models directory exists
if not exist "%MODELS_DIR%" mkdir "%MODELS_DIR%"

:: Check if any .gguf file exists
if exist "%MODELS_DIR%\*.gguf" goto SELECT_MODE

color 6F
echo.
echo ===================================================================
echo  [ACTION REQUIRED] NO GGUF MODELS FOUND!
echo ===================================================================
echo.
echo You configured Llama.cpp, but the 'models' folder is empty.
echo.
echo 1. I am opening the models folder for you.
echo 2. I am opening HuggingFace so you can download one.
echo.
echo [INSTRUCTIONS]
echo   - Download a model (e.g., '%LCP_MODEL%').
echo   - Drag and drop it into the folder I just opened.
echo.

:: Open Folder & Website
start "" "%MODELS_DIR%"
start https://huggingface.co/models?search=gguf

echo When you have placed the .gguf file in the folder...
pause
goto SELECT_MODE

:: ==========================================
:: STEP 5: PRODUCTION VS DEV MODE
:: ==========================================
:SELECT_MODE
color 1F
echo.
echo -------------------------------------------------------------------
echo  SELECT RUN MODE
echo -------------------------------------------------------------------
echo  [1] Production (Faster, Optimized, requires build step)
echo  [2] Development (Slower, Hot-Reload, good for editing code)
echo.
set /p MODE_CHOICE=">> Choose [1] or [2] (Default 1): "

if "%MODE_CHOICE%"=="2" goto RUN_DEV

:RUN_PROD
:: Production Build Logic
echo.
if exist .next\BUILD_ID (
    set /p REBUILD="[?] Found existing build. Rebuild? (y/N): "
    if /i "!REBUILD!"=="Y" goto DO_BUILD
    goto LAUNCH_PROD
)

:DO_BUILD
echo [BUILD] Building Frontend for Production...
call npm run build
if %errorlevel% NEQ 0 (
    echo [ERROR] Build failed. Falling back to Dev mode.
    pause
    goto RUN_DEV
)

:LAUNCH_PROD
set FRONT_CMD=npm run start
set BACK_CMD=node src/index.js
echo [MODE] Production
goto LAUNCH_ALL

:RUN_DEV
set FRONT_CMD=npm run dev
set BACK_CMD=npx nodemon src/index.js
echo [MODE] Development
goto LAUNCH_ALL

:: ==========================================
:: STEP 6: LAUNCH SERVICES
:: ==========================================
:LAUNCH_ALL
echo.
echo [LAUNCH] Starting Backend (%BACKEND_PORT%)...
start "QueryCraft Backend" cmd /k "cd %SERVER_DIR% && %BACK_CMD%"

timeout /t 4 /nobreak >nul

echo [LAUNCH] Starting Frontend (%FRONTEND_PORT%)...
start "QueryCraft Frontend" cmd /k "%FRONT_CMD%"

echo.
echo [SUCCESS] Opening Dashboard...
timeout /t 4 /nobreak >nul
start http://localhost:%FRONTEND_PORT%

echo.
echo ===================================================================
echo  SYSTEM IS LIVE
echo ===================================================================
echo  - Don't close the black windows (Backend/Frontend).
echo  - Press any key here to STOP EVERYTHING and exit.
echo.
pause >nul

:: Cleanup
taskkill /FI "WINDOWTITLE eq QueryCraft Backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq QueryCraft Frontend*" /T /F >nul 2>nul
exit