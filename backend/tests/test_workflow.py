import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.models import AgentIdentity, WorkflowContext
from backend.orchestrator import Orchestrator
from backend.band_client import BandClient
from backend.ai_client import AIClient
from backend.database import AsyncSessionLocal, init_db
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
    from backend.ai_client import AIResponse

    async def mock_generate_response(prompt, *args, **kwargs):
        return AIResponse("demo", {
            "response_text": "Deterministic findings confirmed by governance engine.",
            "latency_ms": 2.0,
            "tokens": 20,
            "cost_usd": 0.0001,
            "model": "demo-explanation",
        })

    client.generate_response = AsyncMock(side_effect=mock_generate_response)
    return client


@pytest.fixture(autouse=True)
async def setup_registry():
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_agent_registry(db)
        await db.commit()


@pytest.mark.asyncio
async def test_full_workflow_success(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)

    identity = AgentIdentity(
        agent_id="Healthcare Data Request",
        owner="Ann Kowalski",
        model="gpt-4o",
        purpose="Healthcare data review for quarterly audit report",
    )
    context = WorkflowContext(workflow_id="wf_001", identity=identity, tier="high")

    final_context = await orchestrator.run_workflow(context)

    assert final_context.status == "completed"
    assert final_context.band_room_id == "mock_room_123"
    assert final_context.registry is not None
    assert final_context.registry.is_valid is True
    assert final_context.security_findings is not None
    assert final_context.compliance_findings is not None
    assert final_context.risk_score is not None
    assert final_context.escalation_state is not None
    assert final_context.audit_record is not None
    assert final_context.audit is not None
    assert final_context.audit.audit_record_id is not None
    assert final_context.security.governance_intelligence is not None
    assert final_context.security.governance_intelligence.finding
    assert final_context.compliance.governance_intelligence is not None
    assert final_context.risk.governance_intelligence is not None
    assert final_context.audit.governance_intelligence is not None
    assert len(final_context.governance_report) >= 4
    assert all("governance_intelligence" in entry for entry in final_context.governance_report)


@pytest.mark.asyncio
async def test_workflow_escalation_with_pii(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)

    identity = AgentIdentity(
        agent_id="Healthcare Data Request",
        owner="Ann Kowalski",
        model="gpt-4o",
        purpose="Healthcare Data Governance Review - Patient: Sarah Jenkins, SSN: 411-992-0012, Medical Record: MRN-881902-X",
    )
    context = WorkflowContext(workflow_id="wf_002", identity=identity, tier="high")

    final_context = await orchestrator.run_workflow(context)

    assert final_context.status == "completed"
    assert final_context.security_findings.pii_detected is True
    assert final_context.risk_score.risk_score >= 30
    assert final_context.audit_record is not None
    assert "score=" not in " ".join(final_context.audit_record.decision_chain).lower()


@pytest.mark.asyncio
async def test_workflow_registry_failure(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)

    identity = AgentIdentity(
        agent_id="Suspicious Data Extractor",
        owner="Unknown",
        model="gpt-4o",
        purpose="Data extraction",
    )
    context = WorkflowContext(workflow_id="wf_003", identity=identity, tier="high")

    final_context = await orchestrator.run_workflow(context)

    assert final_context.status == "failed"
    assert final_context.registry.is_valid is False
    assert final_context.security is None


@pytest.mark.asyncio
async def test_unregistered_agent_blocked(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)

    identity = AgentIdentity(
        agent_id="unknown_agent_xyz",
        owner="hacker",
        model="gpt-4o",
        purpose="unauthorized access",
    )
    context = WorkflowContext(workflow_id="wf_004", identity=identity, tier="medium")

    final_context = await orchestrator.run_workflow(context)

    assert final_context.status == "failed"
    assert final_context.registry.is_valid is False
