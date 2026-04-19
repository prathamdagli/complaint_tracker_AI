@echo off
title ComplainTracker AI - Setup
color 0B

echo.
echo ============================================
echo    ComplainTracker AI - Dependency Setup
echo ============================================
echo.

:: ---- 1. Backend Setup ----
echo [1/3] Setting up Backend...
cd /d "%~dp0backend"
if exist node_modules (
    echo node_modules already exists. Updating dependencies...
) else (
    echo Installing backend dependencies...
)
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend installation failed.
    pause
    exit /b %ERRORLEVEL%
)
echo Backend setup complete.
echo.

:: ---- 2. Frontend Setup ----
echo [2/3] Setting up Frontend...
cd /d "%~dp0frontend"
if exist node_modules (
    echo node_modules already exists. Updating dependencies...
) else (
    echo Installing frontend dependencies...
)
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend installation failed.
    pause
    exit /b %ERRORLEVEL%
)
echo Frontend setup complete.
echo.

:: ---- 3. ML Engine Setup ----
echo [3/3] Setting up ML Engine...
cd /d "%~dp0ml_engine"
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

echo Activating virtual environment and installing packages...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo ERROR: ML Engine installation failed.
    pause
    exit /b %ERRORLEVEL%
)
echo ML Engine setup complete.
echo.

echo ============================================
echo    Setup completed successfully!
echo    You can now run start.bat to launch.
echo ============================================
echo.
pause
