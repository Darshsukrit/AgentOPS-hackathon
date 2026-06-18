import pytest
from unittest.mock import AsyncMock, MagicMock

from backend.agents.risk_agent import RiskAgent
from backend.ai_client import AIClient, AIResponse
from backend.band_client import BandClient
from backend.database import AsyncSessionLocal, init_db
from backend.models import (
    AgentIdentity,
    ComplianceFindings,
    ComplianceViolationItem,
    SecurityFindingItem,
    SecurityFindings,
    WorkflowContext,
)
from backend.orchestrator import Orchestrator
from backend.services.registry_service import seed_agent_registry


@pytest.fixture
def mock_band_client():
    client = MagicMock(spec=BandClient)
    client.create_room = AsyncMock(return_value={"id": "mock_room_123"})
    client.send_message = AsyncMock(return_value={"status": "sent"})
    client.execute_agent = AsyncMock(return_value={"response_text": "Band notification received", "success": True})
    return client


@pytest.fixture
def mock_ai_client():
    client = MagicMock(spec=AIClient)
    client.generate_response = AsyncMock(
        return_value=AIResponse("demo", {
            "response_text": "Deterministic findings confirmed by governance engine.",
            "latency_ms": 2.0,
            "tokens": 20,
            "cost_usd": 0.0001,
            "model": "demo-explanation",
        })
    )
    return client


@pytest.fixture(autouse=True)
async def setup_registry():
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_agent_registry(db)
        await db.commit()

@pytest.fixture
def risk_agent(mock_ai_client):
    band = MagicMock(spec=BandClient)
    return RiskAgent(band, mock_ai_client)


@pytest.fixture
def healthcare_context():
    identity = AgentIdentity(
        agent_id="Healthcare Data Request",
        owner="Ann Kowalski",
        model="gpt-4o",
        purpose=(
            "Healthcare Data Governance Review - Patient: Sarah Jenkins, "
            "SSN: 411-992-0012, Medical Record: MRN-881902-X, Insurance ID: INS-TX-99120"
        ),
    )
    context = WorkflowContext(workflow_id="wf_risk_test", identity=identity, tier="high")
    context.security_findings = SecurityFindings(
        findings=[
            SecurityFindingItem(
                category="PII",
                type="SSN",
                severity="CRITICAL",
                evidence="purpose: SSN pattern matched",
                masked_value="41***12",
            )
        ],
        pii_detected=True,
        secrets_detected=False,
        severity="CRITICAL",
        scanned_fields=["purpose"],
    )
    context.compliance_findings = ComplianceFindings(
        status="FAIL",
        violations=[
            ComplianceViolationItem(
                policy="HIPAA",
                violation="PHI detected in uncontrolled agent request context",
                evidence="Protected health information fields present",
                severity="HIGH",
            )
        ],
        frameworks_checked=["HIPAA", "GDPR", "SOC2"],
        policy_refs=["HIPAA: PHI detected"],
        evidence=["Healthcare/PHI context detected"],
        recommendation="Remediate PHI handling controls before proceeding",
    )
    return context


@pytest.mark.asyncio
async def test_risk_agent_deterministic_scoring(risk_agent, healthcare_context):
    result = await risk_agent.execute(healthcare_context)

    assert result.error is None
    assert result.risk_score is not None
    assert result.risk_score.risk_score >= 60
    assert result.risk is not None
    assert result.risk.recommendation in ("FLAG", "ESCALATE", "BLOCK")


@pytest.mark.asyncio
async def test_risk_agent_ignores_malformed_llm_json(risk_agent, healthcare_context, mock_ai_client):
    malformed = """Here is the assessment:
{
  "risk_score": 85,
  "severity": "HIGH",
  findings: broken json
}
"""
    mock_ai_client.generate_response.return_value = AIResponse("aiml", {
        "response_text": malformed,
        "tokens": 42,
        "cost_usd": 0.0002,
        "model": "test-model",
    })

    result = await risk_agent.execute(healthcare_context)

    assert result.error is None
    assert result.risk_score is not None
    assert "Analysis:" in result.risk.reasoning
    assert result.execution_metrics[-1].success is True


@pytest.mark.asyncio
async def test_risk_agent_survives_llm_failure(risk_agent, healthcare_context, mock_ai_client):
    mock_ai_client.generate_response.side_effect = Exception("Provider unavailable")

    result = await risk_agent.execute(healthcare_context)

    assert result.error is None
    assert result.risk_score.risk_score >= 60
    assert result.risk.reasoning.startswith("Deterministic risk score:")


@pytest.mark.asyncio
async def test_healthcare_demo_workflow_completes(mock_band_client, mock_ai_client):
    """End-to-end high-tier healthcare sandbox path must not fail on RiskAgent JSON."""
    mock_ai_client.generate_response = AsyncMock(
        return_value=AIResponse("demo", {
            "response_text": '{"risk_score": 99, "broken": json without quotes}',
            "tokens": 10,
            "cost_usd": 0.0001,
            "model": "demo-explanation",
        })
    )

    orchestrator = Orchestrator(mock_band_client, mock_ai_client)
    identity = AgentIdentity(
        agent_id="Healthcare Data Request",
        owner="Ann Kowalski",
        model="gpt-4o",
        purpose=(
            "Healthcare Data Governance Review - Patient: Sarah Jenkins, "
            "SSN: 411-992-0012, Medical Record: MRN-881902-X, Insurance ID: INS-TX-99120"
        ),
    )
    context = WorkflowContext(workflow_id="wf_healthcare_demo", identity=identity, tier="high")

    final = await orchestrator.run_workflow(context)

    assert final.status == "completed"
    assert final.error is None
    assert final.risk_score is not None
    assert final.audit_record is not None
