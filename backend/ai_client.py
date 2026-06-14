import httpx
from typing import Tuple, Dict, Any
from backend.config import settings
from backend.utils.logger import logger

class AIClient:
    def __init__(self):
        self.aiml_client = httpx.AsyncClient(
            base_url=settings.AIML_BASE_URL,
            headers={"Authorization": f"Bearer {settings.AIML_API_KEY}"},
            timeout=10.0
        )
        self.featherless_client = httpx.AsyncClient(
            base_url=settings.FEATHERLESS_BASE_URL,
            headers={"Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}"},
            timeout=10.0
        )

    async def generate_response(self, prompt: str) -> Dict[str, Any]:
        """
        Attempts to generate a response using AIML API, falling back to Featherless AI.
        Returns a dict containing provider, response_text, latency_ms, tokens, and cost.
        """
        logger.info("AI request started")
        
        try:
            logger.info("Attempting AI/ML API")
            result = await self._call_provider(
                self.aiml_client, 
                settings.AIML_MODEL, 
                prompt
            )
            result["provider"] = "aiml"
            logger.info("AI request successful (AI/ML API)")
            return result
        except Exception as e:
            logger.warning(f"AI/ML API failed: {e}. Fallback activated.")
            
            try:
                logger.info("Attempting Featherless AI")
                result = await self._call_provider(
                    self.featherless_client, 
                    settings.FEATHERLESS_MODEL, 
                    prompt
                )
                result["provider"] = "featherless"
                logger.info("AI request successful (Featherless AI)")
                return result
            except Exception as fallback_error:
                logger.error(f"Fallback failed: {fallback_error}")
                raise Exception("Both AI providers failed") from fallback_error

    async def _call_provider(self, client: httpx.AsyncClient, model: str, prompt: str) -> Dict[str, Any]:
        import time
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        start_time = time.time()
        response = await client.post("/chat/completions", json=payload)
        latency_ms = (time.time() - start_time) * 1000
        
        response.raise_for_status()
        data = response.json()
        
        response_text = data["choices"][0]["message"]["content"]
        
        # Track tokens and cost
        usage = data.get("usage", {})
        tokens = usage.get("total_tokens", len(prompt + response_text) // 4)
        cost_usd = tokens * 0.000005 # Rough average placeholder cost
        
        return {
            "response_text": response_text,
            "latency_ms": latency_ms,
            "tokens": tokens,
            "cost_usd": cost_usd,
            "model": model
        }
        
    async def close(self):
        await self.aiml_client.aclose()
        await self.featherless_client.aclose()
