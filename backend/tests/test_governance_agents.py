import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

REQUIRED_AGENTS = [
    "MetaAgent",
    "RegistryAgent",
    "SecurityAgent",
    "ComplianceAgent",
    "RiskAgent",
    "EscalationAgent",
    "AuditAgent",
]

BAND_AGENTS = ["ComplianceAgent", "RiskAgent", "AuditAgent"]

PROVIDER_MAP = {
    "MetaAgent": "local",
    "RegistryAgent": "local",
    "SecurityAgent": "aiml",
    "ComplianceAgent": "band",
    "RiskAgent": "band",
    "AuditAgent": "band",
    "EscalationAgent": "local",
}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# Test A: Endpoint exists and returns 200
@pytest.mark.asyncio
async def test_governance_endpoint_exists(client):
    resp = await client.get("/agents/governance")
    assert resp.status_code == 200


# Test B: Exactly 7 agents returned
@pytest.mark.asyncio
async def test_governance_returns_7_agents(client):
    resp = await client.get("/agents/governance")
    data = resp.json()
    assert len(data) == 7, f"Expected 7 agents, got {len(data)}"


# Test C: All required governance agents exist
@pytest.mark.asyncio
async def test_governance_all_required_agents(client):
    resp = await client.get("/agents/governance")
    data = resp.json()
    agent_ids = [a["agent_id"] for a in data]
    for name in REQUIRED_AGENTS:
        assert name in agent_ids, f"Missing governance agent: {name}"


# Test D: Band agents exist
@pytest.mark.asyncio
async def test_governance_band_agents(client):
    resp = await client.get("/agents/governance")
    data = resp.json()
    agent_ids = [a["agent_id"] for a in data]
    for name in BAND_AGENTS:
        assert name in agent_ids, f"Missing Band agent: {name}"
    band_agents_in_response = [a for a in data if a["agent_id"] in BAND_AGENTS]
    for a in band_agents_in_response:
        assert a["provider"] == "band", f"{a['agent_id']} should have provider='band', got '{a['provider']}'"


# Test E: Provider mapping is correct
@pytest.mark.asyncio
async def test_governance_provider_mapping(client):
    resp = await client.get("/agents/governance")
    data = resp.json()
    for agent in data:
        expected_provider = PROVIDER_MAP.get(agent["agent_id"])
        assert expected_provider is not None, f"Unknown agent: {agent['agent_id']}"
        assert agent["provider"] == expected_provider, (
            f"{agent['agent_id']}: expected provider='{expected_provider}', got '{agent['provider']}'"
        )
