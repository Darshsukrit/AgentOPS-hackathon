import httpx
from typing import Dict, Any, List
from backend.config import settings
from backend.utils.logger import logger

class BandClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.BAND_BASE_URL,
            headers={"Authorization": f"Bearer {settings.BAND_API_KEY}"},
            timeout=10.0
        )

    async def create_chat(self, name: str) -> Dict[str, Any]:
        """Creates a chat room for the workflow."""
        logger.info(f"Band chat creation requested: {name}")
        response = await self.client.post("/rooms", json={"name": name})
        response.raise_for_status()
        data = response.json()
        logger.info(f"Band chat created: {data.get('id', 'unknown')}")
        return data

    async def send_message(self, room_id: str, message: str) -> Dict[str, Any]:
        """Sends a standard message to a chat room."""
        logger.info(f"Sending Band message to room {room_id}")
        response = await self.client.post(f"/rooms/{room_id}/messages", json={"text": message})
        response.raise_for_status()
        logger.info("Band message sent")
        return response.json()

    async def read_messages(self, room_id: str) -> List[Dict[str, Any]]:
        """Reads messages from a chat room."""
        logger.info(f"Fetching Band messages for room {room_id}")
        response = await self.client.get(f"/rooms/{room_id}/messages")
        response.raise_for_status()
        return response.json()
        
    async def list_messages(self, room_id: str) -> List[Dict[str, Any]]:
        """Alias for read_messages."""
        return await self.read_messages(room_id)

    async def execute_agent(self, room_id: str, agent_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a specific agent via Band natively."""
        logger.info(f"Executing Band Agent {agent_id} in room {room_id}")
        # Assuming the execution endpoint is /rooms/{room_id}/agents/{agent_id}/execute
        response = await self.client.post(
            f"/rooms/{room_id}/agents/{agent_id}/execute", 
            json=payload
        )
        response.raise_for_status()
        return response.json()

    async def get_execution(self, room_id: str, execution_id: str) -> Dict[str, Any]:
        """Fetches the result of an agent execution."""
        logger.info(f"Fetching execution {execution_id} for room {room_id}")
        response = await self.client.get(f"/rooms/{room_id}/executions/{execution_id}")
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()
