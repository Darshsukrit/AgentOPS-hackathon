import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from backend.band_client import BandClient
import httpx

@pytest.fixture
def mock_httpx_post():
    with patch("httpx.AsyncClient.post") as mock:
        yield mock

@pytest.fixture
def mock_httpx_get():
    with patch("httpx.AsyncClient.get") as mock:
        yield mock

@pytest.fixture
def mock_httpx_delete():
    with patch("httpx.AsyncClient.delete") as mock:
        yield mock

@pytest.mark.asyncio
async def test_create_room(mock_httpx_post):
    mock_response = MagicMock()
    mock_response.json.return_value = {"id": "room_123", "name": "Test Room"}
    mock_response.raise_for_status = MagicMock()
    mock_httpx_post.return_value = mock_response

    client = BandClient()
    result = await client.create_room("Test Room")
    
    assert result["id"] == "room_123"
    mock_httpx_post.assert_called_once_with("/rooms", json={"name": "Test Room"})
    await client.close()

@pytest.mark.asyncio
async def test_send_message(mock_httpx_post):
    mock_response = MagicMock()
    mock_response.json.return_value = {"id": "msg_123", "text": "Hello"}
    mock_response.raise_for_status = MagicMock()
    mock_httpx_post.return_value = mock_response

    client = BandClient()
    result = await client.send_message("room_123", "Hello")
    
    assert result["text"] == "Hello"
    mock_httpx_post.assert_called_once_with("/rooms/room_123/messages", json={"text": "Hello"})
    await client.close()

@pytest.mark.asyncio
async def test_get_messages(mock_httpx_get):
    mock_response = MagicMock()
    mock_response.json.return_value = [{"id": "msg_123", "text": "Hello"}]
    mock_response.raise_for_status = MagicMock()
    mock_httpx_get.return_value = mock_response

    client = BandClient()
    result = await client.get_messages("room_123")
    
    assert len(result) == 1
    assert result[0]["text"] == "Hello"
    mock_httpx_get.assert_called_once_with("/rooms/room_123/messages")
    await client.close()

@pytest.mark.asyncio
async def test_close_room(mock_httpx_delete):
    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "closed"}
    mock_response.raise_for_status = MagicMock()
    mock_httpx_delete.return_value = mock_response

    client = BandClient()
    result = await client.close_room("room_123")
    
    assert result["status"] == "closed"
    mock_httpx_delete.assert_called_once_with("/rooms/room_123")
    await client.close()
