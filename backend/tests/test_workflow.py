import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.models import AgentIdentity, WorkflowContext
from backend.orchestrator import Orchestrator
from backend.band_client import BandClient
from backend.ai_client import AIClient
import json

@pytest.fixture
def mock_band_client():
    client = MagicMock(spec=BandClient)
    client.create_room = AsyncMock(return_value={"id": "mock_room_123"})
    client.send_message = AsyncMock(return_value={"status": "sent"})
    return client

@pytest.fixture
def mock_ai_client():
    client = MagicMock(spec=AIClient)
    
    # We will mock the `generate_response` based on the prompt it receives.
    async def mock_generate_response(prompt):
        if "Security Agent" in prompt:
            return "aiml", '{"pii_detected": false, "severity": "LOW", "findings": ["None"], "recommendation": "Pass", "confidence": 0.99}'
        elif "Compliance Agent" in prompt:
            return "aiml", '{"status": "PASS", "violations": [], "frameworks_checked": ["GDPR"], "confidence": 0.98, "policy_refs": []}'
        elif "Risk Agent" in prompt:
            # Check if this is the escalation test based on some marker in the prompt
            if "malicious" in prompt:
                return "aiml", '{"risk_score": 95, "severity": "CRITICAL", "findings": ["High risk detected"], "recommendation": "BLOCK", "rationale": "Testing escalation"}'
            else:
                return "aiml", '{"risk_score": 10, "severity": "LOW", "findings": [], "recommendation": "PROCEED", "rationale": "All good"}'
        elif "Audit Agent" in prompt:
            return "aiml", '{"governance_summary": "All checks passed.", "decision_chain": ["Registry passed", "Risk low"], "participating_agents": ["Meta", "Registry", "Security", "Compliance", "Risk"], "final_outcome": "APPROVED"}'
        
        return "aiml", "{}"
        
    client.generate_response = AsyncMock(side_effect=mock_generate_response)
    return client

@pytest.mark.asyncio
async def test_full_workflow_success(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)
    
    identity = AgentIdentity(
        agent_id="agent_123",
        owner="user_123",
        model="gpt-4o",
        purpose="Data analysis"
    )
    context = WorkflowContext(workflow_id="wf_001", identity=identity)
    
    final_context = await orchestrator.run_workflow(context)
    
    assert final_context.status == "completed"
    assert final_context.band_room_id == "mock_room_123"
    
    # Verify Registry
    assert final_context.registry is not None
    assert final_context.registry.is_valid is True
    
    # Verify Security
    assert final_context.security is not None
    assert final_context.security.pii_detected is False
    
    # Verify Compliance
    assert final_context.compliance is not None
    assert final_context.compliance.status == "PASS"
    
    # Verify Risk
    assert final_context.risk is not None
    assert final_context.risk.risk_score == 10
    
    # Verify Escalation
    assert final_context.escalation is not None
    assert final_context.escalation.escalated is False
    
    # Verify Audit
    assert final_context.audit is not None
    assert final_context.audit.final_outcome == "APPROVED"

@pytest.mark.asyncio
async def test_workflow_escalation(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)
    
    identity = AgentIdentity(
        agent_id="malicious_but_valid_for_escalation_test",
        owner="user_123",
        model="gpt-4o",
        purpose="malicious" # This keyword triggers the mock to return risk_score=95
    )
    context = WorkflowContext(workflow_id="wf_002", identity=identity)
    
    final_context = await orchestrator.run_workflow(context)
    
    assert final_context.status == "completed"
    assert final_context.risk.risk_score == 95
    assert final_context.escalation.escalated is True
    assert final_context.escalation.priority == "P1"
    assert final_context.escalation.recommended_action == "BLOCK"

@pytest.mark.asyncio
async def test_workflow_registry_failure(mock_band_client, mock_ai_client):
    orchestrator = Orchestrator(mock_band_client, mock_ai_client)
    
    identity = AgentIdentity(
        agent_id="malicious_agent", # Triggers registry blocklist
        owner="user_123",
        model="gpt-4o",
        purpose="Data extraction"
    )
    context = WorkflowContext(workflow_id="wf_003", identity=identity)
    
    final_context = await orchestrator.run_workflow(context)
    
    assert final_context.status == "failed"
    assert final_context.registry.is_valid is False
    assert final_context.security is None # Pipeline should halt
