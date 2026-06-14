import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from backend.schemas import TestAIRequest, TestBandRequest

@pytest.mark.asyncio
async def test_root(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AgentOS Backend Running"}

@pytest.mark.asyncio
async def test_health(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "config_loaded" in data

@pytest.mark.asyncio
@patch("backend.ai_client.AIClient.generate_response")
async def test_test_ai(mock_generate, async_client: AsyncClient):
    mock_generate.return_value = ("aiml", "Test response")
    
    response = await async_client.post("/test-ai", json={"prompt": "Hello"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["provider"] == "aiml"
    assert data["response"] == "Test response"

@pytest.mark.asyncio
@patch("backend.band_client.BandClient.create_room")
async def test_test_band_create_room(mock_create_room, async_client: AsyncClient):
    mock_create_room.return_value = {"id": "room_123"}
    
    response = await async_client.post("/test-band", json={"action": "create_room", "room_name": "Test Room"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["id"] == "room_123"

@pytest.mark.asyncio
async def test_test_band_invalid_action(async_client: AsyncClient):
    response = await async_client.post("/test-band", json={"action": "invalid", "room_name": "Test"})
    assert response.status_code == 400
    assert "Invalid action" in response.json()["detail"]
