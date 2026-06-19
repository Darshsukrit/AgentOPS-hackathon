@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo  AgentOS Setup Wizard  (Windows)
echo ============================================================

:: ── 1. Python ────────────────────────────────────────────────
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] ERROR: Python is not installed or not in PATH.
    echo     Install Python 3.8+ from https://python.org
    exit /b 1
)
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)"
if %errorlevel% neq 0 (
    echo [-] ERROR: Python 3.8 or higher is required.
    exit /b 1
)
echo [+] Python version check passed.

:: ── 2. Node.js ───────────────────────────────────────────────
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] ERROR: Node.js is not installed or not in PATH.
    echo     Install Node.js 18+ from https://nodejs.org
    exit /b 1
)
echo [+] Node.js found.

:: ── 3. .env file ─────────────────────────────────────────────
if not exist .env (
    echo [*] Creating .env from .env.example ...
    copy .env.example .env >nul
    echo [+] .env created.
    echo [!] IMPORTANT: Open .env and fill in your API keys before running.
) else (
    echo [+] .env file already exists.
)

:: ── 4. Python virtual-env ────────────────────────────────────
if not exist .venv (
    echo [*] Creating virtual environment (.venv) ...
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo [-] ERROR: Failed to create venv.
        exit /b 1
    )
    echo [+] Virtual environment created.
) else (
    echo [+] Virtual environment already exists.
)

:: ── 5. Activate venv ^& install Python deps ──────────────────
echo [*] Activating virtual environment ...
call .venv\Scripts\activate
if !errorlevel! neq 0 (
    echo [-] ERROR: Could not activate venv.
    exit /b 1
)

echo [*] Upgrading pip ...
python -m pip install --upgrade pip >nul 2>nul

echo [*] Installing Python dependencies ...
pip install -r backend/requirements.txt
if !errorlevel! neq 0 (
    echo [-] ERROR: pip install failed.
    exit /b 1
)
echo [+] Python dependencies installed.

:: ── 6. Install frontend deps ─────────────────────────────────
echo [*] Installing frontend dependencies ...
pushd frontend
call npm install
if !errorlevel! neq 0 (
    echo [-] ERROR: npm install failed.
    popd
    exit /b 1
)
popd
echo [+] Frontend dependencies installed.

:: ── 7. Preflight check ──────────────────────────────────────
echo [*] Running preflight checks ...
python backend/preflight.py
if !errorlevel! neq 0 (
    echo [!] WARNING: Preflight reported issues — see above.
) else (
    echo [+] Preflight checks passed.
)

echo.
echo ============================================================
echo  Setup complete!  Run "run.bat" to start AgentOS.
echo ============================================================
