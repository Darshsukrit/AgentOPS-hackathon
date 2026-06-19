@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo  AgentOS — Starting Backend ^& Frontend
echo ============================================================

:: Activate Python venv
if not exist .venv\Scripts\activate (
    echo [-] ERROR: Virtual environment not found. Run setup.bat first.
    exit /b 1
)
call .venv\Scripts\activate

:: ── Start Backend (separate window) ─────────────────────────
echo [*] Starting backend on http://localhost:8001 ...
start "AgentOS Backend" cmd /c "call .venv\Scripts\activate && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload"

:: Give backend a moment to bind
timeout /t 4 /nobreak >nul

:: ── Start Frontend (separate window) ────────────────────────
echo [*] Starting frontend on http://localhost:5173 ...
start "AgentOS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Give Vite a moment to start
timeout /t 5 /nobreak >nul

:: ── Open in default browser ─────────────────────────────────
echo [*] Opening AgentOS in your browser ...
start "" "http://localhost:5173"

echo.
echo [+] AgentOS is running:
echo     Frontend  — http://localhost:5173
echo     Backend   — http://localhost:8001
echo     API Docs  — http://localhost:8001/docs
echo     Demo      — http://localhost:5173/demo
echo.
echo [*] Close the "AgentOS Backend" and "AgentOS Frontend" windows to stop servers.
