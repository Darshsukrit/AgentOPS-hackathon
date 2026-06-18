import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from backend.providers.band_provider import BandProvider
from backend.band_client import BandClient
from backend.ai_client import AIClient, AIResponse


@pytest.fixture
def mock_band_client():
    client = MagicMock(spec=BandClient)
    client.execute_agent = AsyncMock()
    return client


@pytest.fixture
def mock_ai_client():
    client = MagicMock(spec=AIClient)
    client.generate_response = AsyncMock()
    return client


@pytest.mark.asyncio
async def test_band_compliance_success(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.return_value = {
        "response_text": "Compliance explanation from Band agent.",
        "tokens": 50,
    }

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.compliance("Test prompt", tier="high", room_id="room_123")

        assert result.provider == "band"
        assert result["model"] == "@compliance-agent"
        mock_band_client.execute_agent.assert_called_once_with(
            room_id="room_123",
            agent_id="compliance-agent",
            payload={"prompt": "Test prompt", "tier": "high", "mode": "explanation"},
        )
        mock_ai_client.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_band_compliance_fallback(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.side_effect = Exception("Band offline")
    mock_ai_client.generate_response.return_value = AIResponse("aiml", {
        "response_text": "Fallback explanation",
        "latency_ms": 100.0,
        "tokens": 50,
        "cost_usd": 0.00025,
        "model": "fallback-gpt-3.5-turbo",
    })

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.compliance("Test prompt", tier="high", room_id="room_123")

        assert result.provider == "aiml"
        mock_ai_client.generate_response.assert_called_once_with(
            "Test prompt", tier="high", agent_type="explanation"
        )


@pytest.mark.asyncio
async def test_band_risk_success(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.return_value = {
        "response_text": "Risk explanation from Band agent.",
    }

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.risk("Test prompt", tier="medium", room_id="room_123")

        assert result.provider == "band"
        assert result["model"] == "@risk-agent"
        mock_ai_client.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_band_risk_fallback(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.return_value = {"success": False, "message": "unreachable"}
    mock_ai_client.generate_response.return_value = AIResponse("aiml", {
        "response_text": "Fallback risk explanation",
        "latency_ms": 50.0,
        "tokens": 40,
        "cost_usd": 0.0002,
        "model": "fallback-gpt-3.5-turbo",
    })

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.risk("Test prompt", tier="medium", room_id="room_123")

        assert result.provider == "aiml"
        mock_ai_client.generate_response.assert_called_once_with(
            "Test prompt", tier="medium", agent_type="explanation"
        )


@pytest.mark.asyncio
async def test_band_audit_success(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.return_value = {
        "response_text": "Audit summary from Band agent.",
    }

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.audit("Test prompt", tier="high", room_id="room_123")

        assert result.provider == "band"
        assert result["model"] == "@audit-agent"
        mock_ai_client.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_band_audit_fallback(mock_band_client, mock_ai_client):
    mock_band_client.execute_agent.side_effect = Exception("HTTP 500")
    mock_ai_client.generate_response.return_value = AIResponse("aiml", {
        "response_text": "Fallback audit summary",
        "latency_ms": 200.0,
        "tokens": 80,
        "cost_usd": 0.0004,
        "model": "fallback-gpt-3.5-turbo",
    })

    provider = BandProvider(mock_band_client, mock_ai_client)

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"), \
         patch("backend.config.settings.BAND_AGENT_ID", "test_agent_id"):

        result = await provider.audit("Test prompt", tier="high", room_id="room_123")

        assert result.provider == "aiml"
        mock_ai_client.generate_response.assert_called_once_with(
            "Test prompt", tier="high", agent_type="explanation"
        )


@pytest.mark.asyncio
async def test_notify_agent(mock_band_client, mock_ai_client):
    provider = BandProvider(mock_band_client, mock_ai_client)
    mock_band_client.execute_agent.return_value = {"success": True}

    with patch("backend.config.settings.BAND_API_KEY", "test_key"), \
         patch("backend.config.settings.BAND_BASE_URL", "http://test_url"):

        result = await provider.notify_agent(
            "security", room_id="room_1", payload={"pii_detected": True}, tier="high"
        )

        assert result is not None
        mock_band_client.execute_agent.assert_called_once()
        call_kwargs = mock_band_client.execute_agent.call_args.kwargs
        assert call_kwargs["agent_id"] == "security-agent"
