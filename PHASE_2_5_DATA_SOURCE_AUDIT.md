# Data Source Audit Report — AgentOS Phase 2.5

This document maps all visual components, their data sources, API endpoints, live status, and actions required to verify demo readiness.

---

## 1. Audit Table

| Page | Component | Data Source | API Endpoint | Live Status | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Command Center** | KPI Cards (Workflow count, pass rates) | Derived from workflows list | `GET /workflows` and `GET /integration/status` | **LIVE** | None. |
| **Command Center** | Recent Workflow Activity table | Workflow execution records | `GET /workflows` | **LIVE** | Clean test IDs from the displayed records. |
| **Command Center** | System Integration health status | Service connection states | `GET /integration/status`, `GET /health`, and `GET /band/status` | **LIVE** | None. |
| **Command Center** | Registered Agents snapshot | Governance Agents config | `GET /agents/governance` | **LIVE** | None. |
| **Agents Registry** | Main list of agents and details | Governance Agents config | `GET /agents/governance` | **LIVE** | Ensure `BAND` agents have premium animated badges. |
| **Investigation** | Trace Selector (Execution traces) | Execution record history | `GET /workflows` | **LIVE** | Sanitize all workflow and agent IDs. |
| **Investigation** | Audit Trail table | Governance decisions log | `GET /workflow/{id}/audit` | **LIVE** | Ensure standard governance agent names are rendered. |
| **Investigation** | Risk Assessment mitigation findings | Normalized risk evaluation findings | `GET /workflow/{id}/risk` | **LIVE** | Verify details rendering matches live risk agent output. |
| **Investigation** | Compliance & Governance panel | Static Empty State fallback | None | **EMPTY FALLBACK** | Confirm clean layout style matches design. |
| **Explainability** | Lineage Graph (React Flow nodes) | Graph structure & outcomes | `GET /workflow/{id}/lineage` | **LIVE** | Expand default visibility so graph occupies majority of screen. |
| **Audit Logs** | Activity logs table | Audited governance log events | `GET /workflow/{id}/audit` | **LIVE** | Enforce standard governance agent names. |
| **Risk Assessment** | Findings and scores card | Recorded risk log details | `GET /workflow/{id}/risk` | **LIVE** | Ensure correct rendering of risk severity badge. |
| **Performance** | Latency and LLM token usage details | Performance records joined with cost records | `GET /workflow/{id}/performance` and `GET /workflow/{id}/cost` | **PARTIAL** | Join endpoints and map correct token values and providers. |
| **Cost Tracking** | Cost ledger & token metrics | Financial cost logs | `GET /workflow/{id}/cost` | **PARTIAL** | Map `estimated_cost_usd` and `estimated_tokens` to frontend keys. |

---

## 2. Findings & Summary

- All primary platform pages fetch their data from live uvicorn routes.
- The **Performance** and **Cost** pages were displaying incomplete metric data (e.g. `0` tokens, `system` provider) due to mismatch between the SQLite DB columns (`estimated_tokens`, `estimated_cost_usd`) and the frontend expectations (`tokens_used`, `total_cost`).
- The database contains test IDs (`gov_test_high`, `seed_high_agent`, `test_agent`) which populate the dashboard recent workflow table and investigation lists.

---

## 3. Resolution Plan

- Map/translate database fields dynamically in [api.ts](file:///c:/Users/Darsh%20Sukrit/Desktop/AgentOPS_FINAL/AgentOPS-hackathon-main/frontend/src/services/api.ts).
- Clean all test identifiers at the API response boundary.
- Redevelop the Dashboard Hero and Timeline elements.
