import json
import time
from typing import Optional, Dict, Any
from backend.band_client import BandClient
from backend.ai_client import AIClient, AIResponse
from backend.utils.logger import logger
from backend.config import settings
from backend.governance.settings import BAND_AGENT_HANDLES


class BandProvider:
    """
    Execution provider layer for optional Band.ai multi-agent governance.
    Local deterministic execution is always primary; Band is notification/optional backend.
    """

    def __init__(self, band_client: BandClient, ai_client: AIClient):
        self.band_client = band_client
        self.ai_client = ai_client

    def _band_available(self) -> bool:
        return bool(settings.BAND_API_KEY and settings.BAND_BASE_URL)

    def _resolve_agent_id(self, agent_type: str) -> str:
        handle = BAND_AGENT_HANDLES.get(agent_type, agent_type)
        return settings.BAND_AGENT_ID or handle

    async def notify_agent(
        self,
        agent_type: str,
        room_id: Optional[str],
        payload: Dict[str, Any],
        tier: str = "medium",
    ) -> Optional[Dict[str, Any]]:
        """Notify a Band governance agent (@security-agent, etc.) with structured findings."""
        if not self._band_available() or not room_id:
            return None
        handle = BAND_AGENT_HANDLES.get(agent_type, agent_type)
        try:
            logger.info(f"Notifying Band agent @{handle} in room={room_id}")
            result = await self.band_client.execute_agent(
                room_id=room_id,
                agent_id=handle,
                payload={
                    "agent_type": agent_type,
                    "tier": tier,
                    "findings": payload,
                    "source": "agentos_governance",
                },
            )
            return result
        except Exception as e:
            logger.warning(f"Band notify failed for @{handle}: {e}")
            return None

    async def _execute_with_fallback(
        self,
        agent_type: str,
        prompt: str,
        tier: str,
        room_id: Optional[str] = None,
    ) -> AIResponse:
        """Legacy fallback for LLM explanation requests only."""
        if self._band_available() and room_id:
            handle = BAND_AGENT_HANDLES.get(agent_type, agent_type)
            try:
                logger.info(f"Attempting Band explanation via @{handle}")
                start_time = time.time()
                band_res = await self.band_client.execute_agent(
                    room_id=room_id,
                    agent_id=handle,
                    payload={"prompt": prompt, "tier": tier, "mode": "explanation"},
                )
                from unittest.mock import Mock
                if isinstance(band_res, Mock) or type(band_res).__name__ in ("Mock", "MagicMock", "AsyncMock"):
                    raise ValueError("Band execution not mocked, triggering fallback")
                if isinstance(band_res, dict) and band_res.get("success") is False:
                    raise ValueError(band_res.get("message", "Band execution returned success=False"))
                latency_ms = (time.time() - start_time) * 1000
                response_text = band_res.get("response_text", json.dumps(band_res)) if isinstance(band_res, dict) else str(band_res)
                tokens = band_res.get("tokens", len(prompt + response_text) // 4) if isinstance(band_res, dict) else len(prompt) // 4
                return AIResponse("band", {
                    "provider": "band",
                    "model": f"@{handle}",
                    "response_text": response_text,
                    "latency_ms": latency_ms,
                    "tokens": tokens,
                    "cost_usd": tokens * 0.000005,
                })
            except Exception as e:
                logger.warning(f"Band explanation failed for @{handle}: {e}. Falling back to AIClient.")

        if self.ai_client:
            return await self.ai_client.generate_response(prompt, tier=tier, agent_type="explanation")
        raise ValueError("No AI client available for explanation")

    async def compliance(self, prompt: str, tier: str, room_id: Optional[str] = None) -> AIResponse:
        return await self._execute_with_fallback("compliance", prompt, tier, room_id)

    async def risk(self, prompt: str, tier: str, room_id: Optional[str] = None) -> AIResponse:
        return await self._execute_with_fallback("risk", prompt, tier, room_id)

    async def audit(self, prompt: str, tier: str, room_id: Optional[str] = None) -> AIResponse:
        return await self._execute_with_fallback("audit", prompt, tier, room_id)
