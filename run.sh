#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "============================================================"
echo " AgentOS — Starting Backend & Frontend"
echo "============================================================"

# Activate Python venv
if [ ! -f "$ROOT/.venv/bin/activate" ]; then
    echo "[-] ERROR: Virtual environment not found. Run ./setup.sh first."
    exit 1
fi
source "$ROOT/.venv/bin/activate"

# ── Start Backend (background) ──────────────────────────────
echo "[*] Starting backend on http://localhost:8001 ..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

sleep 3

# ── Start Frontend (background) ─────────────────────────────
echo "[*] Starting frontend on http://localhost:5173 ..."
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

sleep 5

# ── Open in default browser ─────────────────────────────────
echo "[*] Opening AgentOS in your browser ..."
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173"
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:5173"
else
    echo "[!] Could not detect a browser opener. Open http://localhost:5173 manually."
fi

echo
echo "[+] AgentOS is running:"
echo "    Frontend  — http://localhost:5173"
echo "    Backend   — http://localhost:8001"
echo "    API Docs  — http://localhost:8001/docs"
echo "    Demo      — http://localhost:5173/demo"
echo
echo "[*] Press Ctrl+C to stop both servers."

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT INT TERM
wait
