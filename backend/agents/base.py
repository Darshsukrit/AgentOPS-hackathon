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
        raise NotImplementedError("Subclasses must implement execute()")

    async def log_to_band(self, room_id: str, message_type: str, payload: dict) -> None:
        if not room_id:
            logger.warning(f"No Band room_id to log structured message: {message_type}")
            return
        try:
            from backend.band_runtime import band_runtime
            if not getattr(band_runtime, "_connected", None) or not band_runtime._connected.is_set():
                logger.warning(f"Band runtime not connected; skipping log for {message_type}.")
                return
            structured_msg = {
                "agent": self.name,
                "type": message_type,
                "data": payload,
            }
            await band_runtime.send_event(
                topic=f"chat_room:{room_id}",
                event="new_msg",
                payload=structured_msg,
            )
        except Exception as e:
            logger.error(f"Failed to log to Band in {self.name}: {e}")

    async def invoke_band_agent(
        self,
        agent_type: str,
        context: WorkflowContext,
        payload: dict,
    ) -> None:
        """Optionally invoke a Band governance agent handle for multi-agent orchestration."""
        try:
            from backend.providers.band_provider import BandProvider
            provider = BandProvider(self.band_client, self.ai_client)
            await provider.notify_agent(
                agent_type=agent_type,
                room_id=context.band_room_id,
                payload=payload,
                tier=context.tier,
            )
        except Exception as e:
            logger.warning(f"Band agent notification skipped for {agent_type}: {e}")
        await self.log_to_band(context.band_room_id, "execution_result", payload)
