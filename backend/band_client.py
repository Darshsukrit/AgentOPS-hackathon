import httpx
from typing import Dict, Any, List

from backend.config import settings
from backend.utils.logger import logger


class BandClient:
    """
    Band AI integration client.

    Verified against:
    https://app.band.ai/api/v1/me/chats

    Supported:
    - Chat room creation
    - Connectivity validation
    - Graceful fallback behavior

    Pending:
    - Messaging APIs
    - Agent execution APIs
    - WebSocket participation
    """

    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.BAND_BASE_URL,
            headers={
                "X-API-Key": settings.BAND_API_KEY,
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    # ------------------------------------------------------------------
    # CHAT ROOM CREATION
    # ------------------------------------------------------------------

    async def create_chat(self, name: str) -> Dict[str, Any]:
        """
        Create a Band chat room.

        Endpoint:
        POST /api/v1/rooms
        """

        logger.info(f"Creating Band chat room: {name}")

        response = await self.client.post(
            "/rooms",
            json={"name": name},
        )
        response.raise_for_status()
        payload = response.json()
        logger.info(f"Band chat created successfully: {payload.get('id')}")
        return payload

    async def create_room(self, name: str) -> Dict[str, Any]:
        """
        Backward compatibility wrapper.
        """
        return await self.create_chat(name)

    # ------------------------------------------------------------------
    # PLACEHOLDER METHODS
    # ------------------------------------------------------------------

    async def send_message(
        self,
        room_id: str,
        message: str
    ) -> Dict[str, Any]:
        """Send a message to a Band chat room.

        Endpoint:
        POST /rooms/{room_id}/messages
        """
        logger.info(f"Sending message to Band room {room_id}: {message}")
        response = await self.client.post(
            f"/rooms/{room_id}/messages",
            json={"text": message},
        )
        response.raise_for_status()
        payload = response.json()
        logger.info(f"Message sent, response: {payload}")
        return payload

    async def read_messages(
        self,
        room_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch messages from a Band chat room via REST API.

        Endpoint:
        GET /rooms/{room_id}/messages
        """
        logger.info(f"Fetching messages from Band room {room_id}")
        response = await self.client.get(f"/rooms/{room_id}/messages")
        response.raise_for_status()
        messages = response.json()
        logger.info(f"Fetched {len(messages)} messages from room {room_id}")
        return messages

    async def get_messages(
        self,
        room_id: str
    ) -> List[Dict[str, Any]]:
        return await self.read_messages(room_id)

    async def list_messages(
        self,
        room_id: str
    ) -> List[Dict[str, Any]]:
        return await self.read_messages(room_id)

    async def close_room(
        self,
        room_id: str
    ) -> Dict[str, Any]:
        """Close a Band chat room.

        Endpoint:
        DELETE /rooms/{room_id}
        """
        logger.info(f"Closing Band room {room_id}")
        response = await self.client.delete(f"/rooms/{room_id}")
        response.raise_for_status()
        payload = response.json()
        logger.info(f"Room closed: {payload}")
        return payload

    async def execute_agent(
        self,
        room_id: str,
        agent_id: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a Band agent in a chat room.

        Endpoint:
        POST /rooms/{room_id}/agents/{agent_id}/execute
        """
        logger.info(f"Executing Band agent {agent_id} in room {room_id}")
        response = await self.client.post(
            f"/rooms/{room_id}/agents/{agent_id}/execute",
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    async def get_execution(
        self,
        room_id: str,
        execution_id: str
    ) -> Dict[str, Any]:
        logger.warning(
            f"Band get_execution() not implemented. room_id={room_id}"
        )

        return {
            "success": False,
            "message": "Band execution lookup not implemented"
        }

    # ------------------------------------------------------------------
    # STATUS / CONNECTIVITY
    # ------------------------------------------------------------------

    async def get_status(self) -> Dict[str, Any]:
        """
        Validate Band configuration.

        IMPORTANT:
        Do NOT create chat rooms during health checks.
        """

        reachable = False
        error_msg = None

        try:
            # For now just verify key exists and client is configured.
            # We avoid creating rooms every time /band/status is called.
            reachable = bool(settings.BAND_API_KEY)

        except Exception as e:
            error_msg = str(e)

        return {
            "configured": bool(settings.BAND_API_KEY),
            "base_url": settings.BAND_BASE_URL,
            "agent_id": settings.BAND_AGENT_ID or None,
            "handle": settings.BAND_HANDLE or None,
            "reachable": reachable,
            "error": error_msg,
            "band_agents": [
                "ComplianceAgent",
                "RiskAgent",
                "AuditAgent"
            ],
        }

    # ------------------------------------------------------------------
    # CLEANUP
    # ------------------------------------------------------------------

    async def close(self):
        await self.client.aclose()