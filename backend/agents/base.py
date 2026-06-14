from typing import Any, Optional
from backend.models import WorkflowContext
from backend.band_client import BandClient
from backend.ai_client import AIClient
from backend.utils.logger import logger

class BaseAgent:
    name = "BaseAgent"
    
    def __init__(self, band_client: BandClient, ai_client: Optional[AIClient] = None):
        self.band_client = band_client
        self.ai_client = ai_client

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        """
        Main execution logic for the agent.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement execute()")

    async def log_to_band(self, room_id: str, message_type: str, payload: dict) -> None:
        """
        Helper function to log structured JSON messages to Band context cleanly.
        """
        if room_id:
            try:
                import json
                structured_msg = {
                    "agent": self.name,
                    "type": message_type,
                    "data": payload
                }
                await self.band_client.send_message(room_id, json.dumps(structured_msg))
            except Exception as e:
                logger.error(f"Failed to log to Band in {self.name}: {e}")
        else:
            logger.warning(f"No Band room_id to log structured message: {message_type}")
