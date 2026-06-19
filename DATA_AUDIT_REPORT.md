# DATA AUDIT REPORT — AgentOS Frontend

This report outlines the data integration status for every page of the **AgentOS** frontend platform, distinguishing between live endpoints, mock structures, hardcoded states, and database-seeded/demo agents.

---

## 1. Page Audit Summary

### 1.1 Governance Command Center (Dashboard)
- **Live APIs**:
  - `GET /workflows` — fetches execution history and distribution metrics.
  - `GET /integration/status` — retrieves operational record counts and basic system connectivity.
  - `GET /health` — checks core container and backend database/redis statuses.
  - `POST /workflow/{tier}` — triggers a live governance pipeline run.
- **Seeded / Mock Data**:
  - The bottom right "Agents Registry" card and "Agent Activity" list previously consumed `GET /agents` (runtime database-seeded workflows), which contains developer testing and demo identities (e.g., `agent_demo_2`, `test_agent`, `debug_agent`).
- **Hardcoded States**:
  - The overall integration health status was hardcoded to `"Operational"` regardless of whether backend services were connected.

### 1.2 Agents Registry (`/agents`)
- **Live APIs**:
  - `GET /agents` — fetched the list of runtime database agents, which included all seeded, temporary, and test identities.
- **Seeded / Mock Data**:
  - Hardcoded model name defaults and temporary search placeholders.
  - Test/demo agents (`agent_demo_2`, `test_agent`, `debug_agent`, `seed_high_agent`, `seed_low_agent`, `final_test`) were visible in this list when fetched from runtime logs.

### 1.3 Workflow Investigation (`/investigation`)
- **Live APIs**:
  - `GET /workflows` — populates the left panel execution traces.
  - `GET /workflow/{id}` — returns execution metadata.
  - `GET /workflow/{id}/audit` — fetches step-by-step agent decisions.
  - `GET /workflow/{id}/risk` — fetches risk scoring and mitigation payloads.
- **Mock Data**:
  - Static EmptyState placeholders for compliance data and Band room details when none were present.

### 1.4 AI Explainability Center (`/explainability`)
- **Live APIs**:
  - `GET /workflows` — populates the active target picker.
  - `GET /workflow/{id}/lineage` — fetches the full React Flow nodes and edges graph directly representing the backend's agent lineage.
- **Mock Data**: None. Fully driven by backend lineage model objects.

### 1.5 Audit Log Center (`/audit`)
- **Live APIs**:
  - `GET /workflows` — workflow list.
  - `GET /workflow/{id}/audit` — full audit logs table for the selected workflow.
- **Mock Data**: None.

### 1.6 Risk Assessment (`/risk`)
- **Live APIs**:
  - `GET /workflows` — workflow list.
  - `GET /workflow/{id}/risk` — risk scores and mitigation findings.
- **Mock Data**: None.

### 1.7 Performance Analytics (`/performance`)
- **Live APIs**:
  - `GET /workflows` — workflow list.
  - `GET /workflow/{id}/performance` — agent-specific latency and token consumption metrics.
- **Mock Data**: None.

### 1.8 Cost Tracking (`/cost`)
- **Live APIs**:
  - `GET /workflows` — workflow list.
  - `GET /workflow/{id}/cost` — token costs and financial records.
- **Mock Data**: None.

---

## 2. Test / Demo Agents Inventory
The following test, demo, and temporary database-seeded agents must never appear in live or demo views:
- `agent_demo_2`
- `test_agent`
- `debug_agent`
- `seed_high_agent`
- `seed_low_agent`
- `final_test`

By switching the registry source from `GET /agents` to `GET /agents/governance`, these runtime test IDs are completely bypassed. The platform will exclusively report the 7 official system governance agents.
