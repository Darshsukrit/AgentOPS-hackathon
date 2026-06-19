# AgentOS — Enterprise AI Governance Layer

AgentOS is a production-hardened multi-agent governance platform for AI workflows. It validates agent identity, scans for PII/secrets, enforces HIPAA/GDPR/SOC2 policies, scores risk deterministically, escalates high-risk requests, and writes immutable audit records.

**Governance decisions are rule-based.** LLMs are used only for optional explanations and summaries — never as the source of truth for compliance, risk scores, or final outcomes.

---

## Quick Start (Windows)

```bat
setup.bat    :: first time only — installs deps, creates .env
run.bat      :: starts backend + frontend, opens browser
```

## Quick Start (macOS / Linux)

```bash
chmod +x setup.sh run.sh
./setup.sh   # first time only
./run.sh     # starts both servers, opens browser
```

---

## URLs

| Service | URL |
|---------|-----|
| **Dashboard (frontend)** | http://localhost:5173 |
| **Healthcare Demo Sandbox** | http://localhost:5173/demo |
| **Backend API** | http://localhost:8001 |
| **Swagger API docs** | http://localhost:8001/docs |
| **Health check** | http://localhost:8001/health |

The Vite dev server proxies `/api/*` → `http://localhost:8001/*` (see `frontend/vite.config.ts`).

---

## Manual Start

**Backend** (port 8001):

```bash
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend** (port 5173):

```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## Environment

Copy `.env.example` → `.env`. For local demo/hackathon use:

```env
DEMO_MODE=True
PORT=8001
```

`DEMO_MODE=True` uses in-memory SQLite and demo AI fallbacks — no PostgreSQL or live API keys required.

Optional integrations (fill in `.env` when ready):

- `AIML_API_KEY` / `FEATHERLESS_API_KEY` — LLM explanation layer
- `BAND_API_KEY` — Band.ai multi-agent room orchestration
- `DATABASE_URL` — PostgreSQL (`postgresql+asyncpg://...`) when `DEMO_MODE=False`
- `REDIS_URL` — transient workflow state (falls back to in-memory)

---

## Governance Pipeline

```
Request → MetaAgent → RegistryAgent → SecurityAgent → ComplianceAgent
       → RiskAgent → EscalationAgent → AuditAgent → Immutable Audit Record
```

| Agent | Engine | Role |
|-------|--------|------|
| RegistryAgent | DB registry + tool governance | Validates agent identity & tools |
| SecurityAgent | Regex/PII detectors | Detects PII & secrets |
| ComplianceAgent | HIPAA / GDPR / SOC2 policies | Deterministic compliance |
| RiskAgent | Weighted scorer (cap 100) | Risk score & severity |
| EscalationAgent | Threshold rules (76 / 91) | Escalate or block |
| AuditAgent | Immutable `audit_records` | Final governance decision |

---

## Demo Sandbox

1. Open http://localhost:5173/demo
2. Click **Run High-Tier Audit** with the pre-filled healthcare PII sample
3. Watch all 7 pipeline steps complete
4. Review validation logs and final decision (`DENIED` / `REVIEW_REQUIRED` expected for sensitive PHI)

Registered demo agents (seeded on startup): `Healthcare Data Request`, `Customer PII Analysis`, `Financial Audit Review`.

---

## Tests

```bash
.venv\Scripts\activate
python -m pytest backend/tests/ -v
```

51 tests cover detectors, policies, risk scoring, tool governance, Band provider, and full workflow integration.

---

## Project Structure

```
backend/
  agents/          # 7 governance agents
  security/        # PII & secret detectors
  policies/        # HIPAA, GDPR, SOC2 engine
  risk/            # Deterministic risk scorer
  governance/      # Settings, tool governance
  services/        # Registry & audit services
frontend/
  src/pages/       # Dashboard, Demo, Explainability, etc.
run.bat / run.sh   # One-command start + browser open
setup.bat / setup.sh
```

---

## License

See [LICENSE](LICENSE).
