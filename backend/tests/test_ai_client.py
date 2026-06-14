import pytest
from unittest.mock import patch, AsyncMock
from backend.ai_client import AIClient

@pytest.mark.asyncio
@patch("backend.ai_client.AIClient._call_provider")
async def test_ai_generate_success(mock_call_provider):
    mock_call_provider.return_value = "AIML response"
    client = AIClient()
    
    provider, response = await client.generate_response("Test prompt")
    
    assert provider == "aiml"
    assert response == "AIML response"
    mock_call_provider.assert_called_once()
    await client.close()

@pytest.mark.asyncio
@patch("backend.ai_client.AIClient._call_provider")
async def test_ai_generate_fallback(mock_call_provider):
    # First call fails, second call succeeds
    mock_call_provider.side_effect = [Exception("API Down"), "Featherless response"]
    
    client = AIClient()
    provider, response = await client.generate_response("Test prompt")
    
    assert provider == "featherless"
    assert response == "Featherless response"
    assert mock_call_provider.call_count == 2
    await client.close()

@pytest.mark.asyncio
@patch("backend.ai_client.AIClient._call_provider")
async def test_ai_generate_both_fail(mock_call_provider):
    # Both calls fail
    mock_call_provider.side_effect = [Exception("AIML Down"), Exception("Featherless Down")]
    
    client = AIClient()
    with pytest.raises(Exception, match="Both AI providers failed"):
        await client.generate_response("Test prompt")
        
    assert mock_call_provider.call_count == 2
    await client.close()
