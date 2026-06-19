#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " AgentOS Setup  (Linux / macOS)"
echo "============================================================"

# ── 1. Python ────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "[-] ERROR: python3 is not installed."
    exit 1
fi
PYTHON_OK=$(python3 -c "import sys; print(int(sys.version_info >= (3,8)))")
if [ "$PYTHON_OK" != "1" ]; then
    echo "[-] ERROR: Python 3.8+ is required."
    exit 1
fi
echo "[+] Python version check passed."

# ── 2. Node.js ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "[-] ERROR: Node.js is not installed. Install Node 18+ from https://nodejs.org"
    exit 1
fi
echo "[+] Node.js found."

# ── 3. .env ──────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[+] Created .env from .env.example"
    echo "[!] IMPORTANT: Open .env and fill in your API keys before running."
else
    echo "[+] .env already exists."
fi

# ── 4. Virtual environment ───────────────────────────────────
if [ ! -d .venv ]; then
    echo "[*] Creating virtual environment ..."
    python3 -m venv .venv
    echo "[+] Virtual environment created."
else
    echo "[+] Virtual environment already exists."
fi

# ── 5. Activate & install Python deps ────────────────────────
echo "[*] Activating virtual environment ..."
source .venv/bin/activate

echo "[*] Upgrading pip ..."
pip install --upgrade pip -q

echo "[*] Installing Python dependencies ..."
pip install -r backend/requirements.txt
echo "[+] Python dependencies installed."

# ── 6. Frontend deps ────────────────────────────────────────
echo "[*] Installing frontend dependencies ..."
(cd frontend && npm install)
echo "[+] Frontend dependencies installed."

# ── 7. Preflight ─────────────────────────────────────────────
echo "[*] Running preflight checks ..."
python backend/preflight.py || echo "[!] WARNING: Preflight reported issues."

echo ""
echo "============================================================"
echo " Setup complete!  Run './run.sh' to start AgentOS."
echo "============================================================"
