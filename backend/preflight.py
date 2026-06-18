import os
import sys
import socket
from urllib.parse import urlparse

# 1. Python version check
MIN_PYTHON = (3, 8)
current_python = sys.version_info
if current_python < MIN_PYTHON:
    print(f"[-] ERROR: Python version {sys.version.split()[0]} is too old. Minimum required: {MIN_PYTHON[0]}.{MIN_PYTHON[1]}")
    sys.exit(1)
else:
    print(f"[+] Python version: {sys.version.split()[0]} (Ok)")

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

demo_mode = os.getenv("DEMO_MODE", "True").lower() in ("true", "1", "yes")
print(f"[*] DEMO_MODE = {demo_mode}")

# Helper for socket TCP check
def check_tcp_port(url_str, default_port):
    if not url_str:
        return False, "Not configured"
    try:
        # Check if URL starts with protocol (e.g. redis:// or postgresql://)
        if "://" not in url_str:
            url_str = "protocol://" + url_str
        parsed = urlparse(url_str)
        host = parsed.hostname or "localhost"
        port = parsed.port or default_port
        
        # Resolve hostname and connect
        with socket.create_connection((host, port), timeout=3.0):
            return True, f"Connected to {host}:{port}"
    except Exception as e:
        return False, f"Could not connect: {str(e)}"

# 2. Check Environment Variables
missing_vars = []
critical_vars = ["AIML_API_KEY", "FEATHERLESS_API_KEY", "BAND_API_KEY", "REDIS_URL"]
if not demo_mode:
    critical_vars.append("DATABASE_URL")

for var in critical_vars:
    val = os.getenv(var)
    if not val or val.strip() == "" or "placeholder" in val.lower() or "your_" in val.lower():
        missing_vars.append(var)

if missing_vars:
    print(f"[!] WARNING: The following critical environment variables are missing or use placeholder values:")
    for var in missing_vars:
        print(f"    - {var}")
    if not demo_mode:
        print("[-] ERROR: Cannot run in Production mode without all critical variables configured. Please set them in .env")
        # Do not exit immediately, check others first, but will exit 1 at end
else:
    print("[+] Environment variables check passed.")

# 3. Check Redis
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_ok, redis_msg = check_tcp_port(redis_url, 6379)
if redis_ok:
    print(f"[+] Redis connectivity: Ok ({redis_msg})")
else:
    print(f"[!] WARNING: Redis is offline or unavailable: {redis_msg}")
    print("    Application will use in-memory transient state fallback.")

# 4. Check PostgreSQL
if not demo_mode:
    db_url = os.getenv("DATABASE_URL")
    db_ok, db_msg = check_tcp_port(db_url, 5432)
    if db_ok:
        print(f"[+] PostgreSQL connectivity: Ok ({db_msg})")
    else:
        print(f"[-] ERROR: PostgreSQL is unreachable: {db_msg}")
        sys.exit(1)
else:
    print("[*] Demo Mode: skipping PostgreSQL check, using SQLite.")

# 5. Check Band / External APIs
band_url = os.getenv("BAND_BASE_URL", "https://app.band.ai/api/v1")
band_host = urlparse(band_url).hostname or "app.band.ai"
try:
    socket.gethostbyname(band_host)
    print(f"[+] External API DNS resolve: {band_host} is reachable (Ok)")
except socket.gaierror:
    print(f"[!] WARNING: Could not resolve host {band_host}. Please check your internet connection.")

# Summary of status
if not demo_mode and missing_vars:
    print("[-] Preflight check FAILED: Missing production environment variables.")
    sys.exit(1)

print("[+] Preflight checks completed successfully!")
sys.exit(0)
